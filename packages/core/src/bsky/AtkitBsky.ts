import {
  AppBskyActorGetProfile,
  AppBskyFeedDefs,
  AppBskyFeedGetAuthorFeed,
  AppBskyFeedGetLikes,
  AppBskyFeedGetPostThread,
  AppBskyFeedGetPosts,
  AppBskyFeedGetRepostedBy,
  AppBskyFeedGetTimeline,
  AppBskyGraphGetFollowers,
  AppBskyGraphGetFollows,
  AtpAgentLoginOpts,
  AtpAgentOpts,
  AtpSessionData,
  BskyAgent,
} from '@atproto/api'
import { AuthState } from '../types'
import { EventController } from '../EventController'
import { OnAuthStateChanged, OnPostsChanged, OnProfilesChanged } from './events'
import {
  FeedViewPost,
  PostView,
} from '@atproto/api/dist/client/types/app/bsky/feed/defs'
import { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs'

export class AtkitBsky {
  #authState: AuthState = 'logged-out'

  #eventAuthStateChanged = new EventController<OnAuthStateChanged>()
  #eventPostsChanged = new EventController<OnPostsChanged>()
  #eventProfilesChanged = new EventController<OnProfilesChanged>()

  #storedPostViews = new Map<string, PostView>()
  #storedProfiles = new Map<string, ProfileViewDetailed>()

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

  get storedProfiles() {
    return this.#storedProfiles
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
   * get timeline.
   */
  async getTimeline(
    params: AppBskyFeedGetTimeline.QueryParams,
    opts?: AppBskyFeedGetTimeline.CallOptions
  ) {
    const { data } = await this.agent.getTimeline(params, opts)

    this.#mergePostsByFeed(data.feed)

    return data
  }

  /**
   * get author feed.
   */
  async getAuthorFeed(
    params: AppBskyFeedGetAuthorFeed.QueryParams,
    opts?: AppBskyFeedGetAuthorFeed.CallOptions
  ) {
    const { data } = await this.agent.getAuthorFeed(params, opts)

    this.#mergePostsByFeed(data.feed)

    return data
  }

  /**
   * get post thread.
   */
  async getPostThread(
    params: AppBskyFeedGetPostThread.QueryParams,
    opts?: AppBskyFeedGetPostThread.CallOptions
  ) {
    const { data } = await this.agent.getPostThread(params, opts)

    if (AppBskyFeedDefs.isThreadViewPost(data.thread)) {
      this.#mergePostsByFeed([data.thread])
    }

    return data
  }

  /**
   * get likes.
   */
  async getLikes(
    params: AppBskyFeedGetLikes.QueryParams,
    opts?: AppBskyFeedGetLikes.CallOptions
  ) {
    const { data } = await this.agent.getLikes(params, opts)

    const profiles = data.likes.map((like) => like.actor)

    this.#mergeProfiles(profiles)

    return data
  }

  /**
   * get reposted by.
   */
  async getRepostedBy(
    params: AppBskyFeedGetRepostedBy.QueryParams,
    opts?: AppBskyFeedGetRepostedBy.CallOptions
  ) {
    const { data } = await this.agent.getRepostedBy(params, opts)

    this.#mergeProfiles(data.repostedBy)

    return data
  }

  /**
   * get profile.
   */
  async getProfile(
    params: AppBskyActorGetProfile.QueryParams,
    opts?: AppBskyActorGetProfile.CallOptions
  ) {
    const { data } = await this.agent.getProfile(params, opts)

    this.#mergeProfiles([data])

    return data
  }

  /**
   * get follows.
   */
  async getFollows(
    params: AppBskyGraphGetFollows.QueryParams,
    opts?: AppBskyGraphGetFollows.CallOptions
  ) {
    const { data } = await this.agent.getFollows(params, opts)

    this.#mergeProfiles(data.follows)

    return data
  }

  /**
   * get followers.
   */
  async getFollowers(
    params: AppBskyGraphGetFollowers.QueryParams,
    opts?: AppBskyGraphGetFollowers.CallOptions
  ) {
    const { data } = await this.agent.getFollowers(params, opts)

    this.#mergeProfiles(data.followers)

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

  /**
   * subscribe to profiles changes.
   *
   * @param callback callback function.
   * @returns unsubscribe function.
   */
  onProfilesChanged(
    callback: (profiles: Map<string, ProfileViewDetailed>) => void
  ) {
    return this.#eventProfilesChanged.subscribe(callback)
  }

  #changeAuthState(state: AuthState) {
    this.#authState = state
    this.#eventAuthStateChanged.dispatch(state)
  }

  #mergePostsByFeed(feed: FeedViewPost[]) {
    const merged = new Map<string, PostView>([...this.storedPostViews])
    const profiles: ProfileViewDetailed[] = []

    for (const { post, reply } of feed) {
      merged.set(post.uri, post)
      profiles.push(post.author)

      if (reply) {
        merged.set(reply.root.uri, reply.root)
        merged.set(reply.parent.uri, reply.parent)

        profiles.push(reply.root.author)
        profiles.push(reply.parent.author)
      }
    }

    this.#storedPostViews = merged
    this.#eventPostsChanged.dispatch(merged)
    this.#mergeProfiles(profiles)
  }

  #mergePosts(posts: PostView[]) {
    const merged = new Map<string, PostView>([...this.storedPostViews])
    const profiles: ProfileViewDetailed[] = []

    for (const post of posts) {
      merged.set(post.uri, post)
      profiles.push(post.author)
    }

    this.#storedPostViews = merged
    this.#eventPostsChanged.dispatch(merged)
    this.#mergeProfiles(profiles)
  }

  #mergeProfiles(profiles: ProfileViewDetailed[]) {
    const merged = new Map<string, ProfileViewDetailed>([
      ...this.#storedProfiles,
    ])

    for (const profile of profiles) {
      const oldProfile = merged.get(profile.did)

      if (oldProfile) {
        merged.set(profile.did, {
          ...oldProfile,
          ...profile,
        })
      } else {
        merged.set(profile.did, profile)
      }
    }

    this.#storedProfiles = merged
    this.#eventProfilesChanged.dispatch(merged)
  }
}
