import {
  AppBskyFeedGetPosts,
  AtpAgentLoginOpts,
  AtpAgentOpts,
  AtpSessionData,
  BskyAgent,
} from '@atproto/api'
import { AuthState } from '../types'
import { EventController } from '../EventController'
import { OnAuthStateChanged, OnPostsChanged } from './events'
import {
  FeedViewPost,
  PostView,
} from '@atproto/api/dist/client/types/app/bsky/feed/defs'

export class AtkitBsky {
  #authState: AuthState = 'logged-out'

  #eventAuthStateChanged = new EventController<OnAuthStateChanged>()
  #eventPostsChanged = new EventController<OnPostsChanged>()

  #storedPostViews = new Map<string, PostView>()

  public readonly agent: BskyAgent

  /**
   * current auth state.
   */
  get authState() {
    return this.#authState
  }

  get storedPostViews() {
    return this.#storedPostViews
  }

  constructor(opts: AtpAgentOpts) {
    this.agent = new BskyAgent(opts)
  }

  /**
   * login.
   *
   * @param params login params.
   * @returns session data.
   */
  async login(params: AtpAgentLoginOpts) {
    try {
      this.#changeAuthState('logging-in')
      const { data } = await this.agent.login(params)
      this.#changeAuthState('logged-in')

      return data
    } catch (error) {
      if (this.agent.hasSession) {
        this.#changeAuthState('logged-in')
      } else {
        this.#changeAuthState('logged-out')
      }

      throw error
    }
  }

  /**
   * logout.
   */
  async logout() {
    this.#changeAuthState('logged-out')
  }

  /**
   * resume session.
   *
   * @param session session data.
   */
  async resumeSession(session: AtpSessionData) {
    try {
      this.#changeAuthState('logging-in')
      await this.agent.resumeSession(session)
      this.#changeAuthState('logged-in')
    } catch (error) {
      this.#changeAuthState('logged-out')
      throw error
    }
  }

  /**
   * get posts by uri.
   */
  async getPosts(
    params: AppBskyFeedGetPosts.QueryParams,
    opts?: AppBskyFeedGetPosts.CallOptions
  ) {
    const { data } = await this.agent.getPosts(params, opts)
    const { posts } = data

    this.#mergePosts(posts)

    return data
  }

  /**
   * subscribe to auth state changes.
   *
   * @param callback callback function.
   * @returns unsubscribe function.
   */
  onAuthStateChanged(callback: (state: AuthState) => void) {
    return this.#eventAuthStateChanged.subscribe(callback)
  }

  /**
   * subscribe to posts changes.
   *
   * @param callback callback function.
   * @returns unsubscribe function.
   */
  onPostsChanged(callback: (posts: Map<string, PostView>) => void) {
    return this.#eventPostsChanged.subscribe(callback)
  }

  #changeAuthState(state: AuthState) {
    this.#authState = state
    this.#eventAuthStateChanged.dispatch(state)
  }

  #mergePostsByFeed(feed: FeedViewPost[]) {
    const merged = new Map<string, PostView>([...this.storedPostViews])

    for (const { post, reply } of feed) {
      merged.set(post.uri, post)

      if (reply) {
        merged.set(reply.root.uri, reply.root)
        merged.set(reply.parent.uri, reply.parent)
      }
    }

    this.#storedPostViews = merged
    this.#eventPostsChanged.dispatch(merged)
  }

  #mergePosts(posts: PostView[]) {
    const merged = new Map<string, PostView>([...this.storedPostViews])

    for (const post of posts) {
      merged.set(post.uri, post)
    }

    this.#storedPostViews = merged
    this.#eventPostsChanged.dispatch(merged)
  }
}
