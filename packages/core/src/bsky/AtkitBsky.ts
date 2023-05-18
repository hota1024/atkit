import {
  AppBskyActorDefs,
  AppBskyActorGetProfile,
  AppBskyActorGetSuggestions,
  AppBskyActorSearchActors,
  AppBskyFeedDefs,
  AppBskyFeedGetAuthorFeed,
  AppBskyFeedGetLikes,
  AppBskyFeedGetPostThread,
  AppBskyFeedGetPosts,
  AppBskyFeedGetRepostedBy,
  AppBskyFeedGetTimeline,
  AppBskyFeedPost,
  AppBskyGraphGetFollowers,
  AppBskyGraphGetFollows,
  AtpAgentLoginOpts,
  AtpAgentOpts,
  AtpSessionData,
  BskyAgent,
  ComAtprotoRepoUploadBlob,
} from '@atproto/api'
import { AuthState } from '../types'
import { EventController } from '../EventController'
import { OnAuthStateChanged, OnPostsChanged, OnProfilesChanged } from './events'
import {
  FeedViewPost,
  PostView,
} from '@atproto/api/dist/client/types/app/bsky/feed/defs'
import {
  ProfileViewDetailed,
  isProfileViewDetailed,
} from '@atproto/api/dist/client/types/app/bsky/actor/defs'

type AtkitBskyPostRecord = Parameters<BskyAgent['post']>[0]

type AtkitBskyUpsertProfileUpdateFn = Parameters<BskyAgent['upsertProfile']>[0]

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

  /**
   * stored post views.
   */
  get storedPostViews() {
    return this.#storedPostViews
  }

  /**
   * stored profiles.
   */
  get storedProfiles() {
    return this.#storedProfiles
  }

  /**
   * @param opts agent options.
   */
  constructor(opts: AtpAgentOpts)

  /**
   * @param agent BskyAgent instance.
   */
  constructor(agent: BskyAgent)

  constructor(optsOrAgent: AtpAgentOpts | BskyAgent) {
    if (optsOrAgent instanceof BskyAgent) {
      this.agent = optsOrAgent
    } else {
      this.agent = new BskyAgent(optsOrAgent)
    }
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
   * post.
   *
   * @param record record.
   */
  async post(record: AtkitBskyPostRecord) {
    const result = await this.agent.post(record)

    return result
  }

  /**
   * delete post by uri.
   *
   * @param postUri post uri.
   */
  async deletePost(postUri: string) {
    await this.agent.deletePost(postUri)

    this.#storedPostViews.delete(postUri)
    this.#setPostViews(this.#storedPostViews)
  }

  /**
   * like post by uri and cid.
   *
   * @param uri uri.
   * @param cid cid.
   */
  like(uri: string, cid: string): Promise<ReturnType<BskyAgent['like']>>

  /**
   * like post.
   *
   * @param post post view.
   */
  like(post: PostView): Promise<ReturnType<BskyAgent['like']>>

  async like(...args: unknown[]): Promise<ReturnType<BskyAgent['like']>> {
    let result: Awaited<ReturnType<BskyAgent['like']>>
    let postView: PostView | undefined

    if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      result = await this.agent.like(args[0], args[1])
      postView = this.#storedPostViews.get(args[0])
    } else if (AppBskyFeedDefs.isPostView(args[0])) {
      result = await this.agent.like(args[0].uri, args[0].cid)
      postView = this.#storedPostViews.get(args[0].uri)
    } else {
      throw new TypeError(
        `AtkitBsky#like: arguments should be (string, string) or (PostView)`
      )
    }

    if (postView) {
      postView.viewer = {
        ...postView.viewer,
        like: result.uri,
      }

      if (postView.likeCount) {
        postView.likeCount += 1
      } else {
        postView.likeCount = 1
      }

      this.#setPostViews(this.#storedPostViews)
    }

    return result
  }

  /**
   * delete like by like uri.
   *
   * @param likeUri like uri.
   */
  deleteLike(likeUri: string): Promise<void>

  /**
   * delete like of post view.
   *
   * @param post post view.
   */
  deleteLike(post: PostView): Promise<void>

  async deleteLike(...args: unknown[]) {
    if (typeof args[0] === 'string') {
      await this.agent.deleteLike(args[0])

      for (const postView of this.#storedPostViews.values()) {
        if (postView.viewer?.like === args[0]) {
          postView.viewer.like = undefined

          if (postView.likeCount) {
            postView.likeCount -= 1
          } else {
            postView.likeCount = 0
          }

          this.#setPostViews(this.#storedPostViews)

          break
        }
      }
    } else if (AppBskyFeedDefs.isPostView(args[0])) {
      if (args[0].viewer?.like) {
        await this.agent.deleteLike(args[0].viewer.like)

        const postView = this.#storedPostViews.get(args[0].uri)

        if (postView) {
          postView.viewer = {
            ...postView.viewer,
            like: undefined,
          }

          if (postView.likeCount) {
            postView.likeCount -= 1
          } else {
            postView.likeCount = 0
          }

          this.#setPostViews(this.#storedPostViews)
        }
      } else {
        throw new Error('AtkitBsky#deleteLike: post has no like')
      }
    } else {
      throw new TypeError(
        `AtkitBsky#deleteLike: arguments should be (string) or (PostView)`
      )
    }
  }

  /**
   * get likes of post.
   */
  async getLikes(
    params: AppBskyFeedGetLikes.QueryParams,
    opts?: AppBskyFeedGetLikes.CallOptions
  ) {
    const { data } = await this.agent.getLikes(params, opts)

    // TODO: update stored posts data.

    const profiles = data.likes.map((like) => like.actor)

    this.#mergeProfiles(profiles)

    return data
  }

  /**
   * repost post by uri and cid.
   *
   * @param uri uri.
   * @param cid cid.
   */
  repost(uri: string, cid: string): Promise<ReturnType<BskyAgent['repost']>>

  /**
   * repost post.
   *
   * @param post post view.
   */
  repost(post: PostView): Promise<ReturnType<BskyAgent['repost']>>

  async repost(...args: unknown[]): Promise<ReturnType<BskyAgent['repost']>> {
    let result: Awaited<ReturnType<BskyAgent['repost']>>
    let post: PostView | undefined

    if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      result = await this.agent.repost(args[0], args[1])
      post = this.#storedPostViews.get(args[0])
    } else if (AppBskyFeedDefs.isPostView(args[0])) {
      result = await this.agent.repost(args[0].uri, args[0].cid)
      post = this.#storedPostViews.get(args[0].uri)
    } else {
      throw new TypeError(
        `AtkitBsky#repost: arguments should be (string, string) or (PostView)`
      )
    }

    if (post) {
      post.repostCount = post.repostCount ? post.repostCount + 1 : 1
      this.#storedPostViews.set(post.uri, post)
      this.#setPostViews(this.#storedPostViews)
    }

    return result
  }

  /**
   * delete repost by repost uri.
   *
   * @param repostUri repost uri.
   */
  deleteRepost(repostUri: string): Promise<void>

  /**
   * delete repost of post view.
   *
   * @param post post view.
   */
  deleteRepost(post: PostView): Promise<void>

  async deleteRepost(...args: unknown[]) {
    if (typeof args[0] === 'string') {
      await this.agent.deleteRepost(args[0])

      for (const postView of this.#storedPostViews.values()) {
        if (postView.viewer?.repost === args[0]) {
          postView.viewer.repost = undefined

          if (postView.repostCount) {
            postView.repostCount -= 1
          } else {
            postView.repostCount = 0
          }

          this.#setPostViews(this.#storedPostViews)

          break
        }
      }
    } else if (AppBskyFeedDefs.isPostView(args[0])) {
      if (args[0].viewer?.repost) {
        await this.agent.deleteRepost(args[0].viewer.repost)

        const postView = this.#storedPostViews.get(args[0].uri)

        if (postView) {
          postView.viewer = {
            ...postView.viewer,
            repost: undefined,
          }

          if (postView.repostCount) {
            postView.repostCount -= 1
          } else {
            postView.repostCount = 0
          }

          this.#setPostViews(this.#storedPostViews)
        }
      } else {
        throw new Error('AtkitBsky#deleteRepost: post has no repost')
      }
    }

    throw new TypeError(
      `AtkitBsky#deleteRepost: arguments should be (string) or (PostView)`
    )
  }

  /**
   * upload blob.
   *
   * @param data data.
   * @param opts options.
   */
  async uploadBlob(
    data?: ComAtprotoRepoUploadBlob.InputSchema,
    opts?: ComAtprotoRepoUploadBlob.CallOptions
  ) {
    const result = await this.agent.uploadBlob(data, opts)

    return result.data
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

    this.#mergeProfiles([data.subject, ...data.followers])

    return data
  }

  /**
   * follow.
   *
   * @param did did.
   */
  follow(did: string): ReturnType<BskyAgent['follow']>

  /**
   * follow.
   *
   * @param profile profile view detailed.
   */
  follow(profile: ProfileViewDetailed): ReturnType<BskyAgent['follow']>

  async follow(...args: unknown[]): ReturnType<BskyAgent['follow']> {
    let result: Awaited<ReturnType<BskyAgent['follow']>>
    let profile: ProfileViewDetailed | undefined

    if (typeof args[0] === 'string') {
      result = await this.agent.follow(args[0])
      profile = this.#storedProfiles.get(args[0])
    } else if (AppBskyActorDefs.isProfileViewDetailed(args[0])) {
      result = await this.agent.follow(args[0].did)
      profile = this.#storedProfiles.get(args[0].did)
    } else {
      throw new TypeError(
        `AtkitBsky#follow: arguments should be (string) or (ProfileViewDetailed)`
      )
    }

    if (profile) {
      profile.followersCount = (profile.followersCount ?? 0) + 1
      profile.viewer = {
        ...profile.viewer,
        following: result.uri,
      }

      this.#setProfiles(this.#storedProfiles)
    }

    return result
  }

  deleteFollow(uri: string): ReturnType<BskyAgent['deleteFollow']>

  deleteFollow(
    profile: ProfileViewDetailed
  ): ReturnType<BskyAgent['deleteFollow']>

  async deleteFollow(
    ...args: unknown[]
  ): ReturnType<BskyAgent['deleteFollow']> {
    let result: Awaited<ReturnType<BskyAgent['deleteFollow']>>

    if (typeof args[0] === 'string') {
      result = await this.agent.deleteFollow(args[0])

      for (const profile of this.#storedProfiles.values()) {
        if (profile.viewer?.following === args[0]) {
          profile.followersCount = Math.max(
            (profile.followersCount ?? 0) - 1,
            0
          )
          profile.viewer.following = undefined

          this.#setProfiles(this.#storedProfiles)
          break
        }
      }
    } else if (AppBskyActorDefs.isProfileViewDetailed(args[0])) {
      const profile = this.#storedProfiles.get(args[0].did) ?? args[0]

      if (profile.viewer?.following) {
        result = await this.agent.deleteFollow(profile.viewer.following)

        profile.followersCount = Math.max((profile.followersCount ?? 0) - 1, 0)
        profile.viewer.following = undefined

        this.#storedProfiles.set(args[0].did, profile)
        this.#setProfiles(this.#storedProfiles)
      } else {
        throw new Error('AtkitBsky#deleteFollow: profile is not following')
      }
    }

    return result
  }

  /**
   * upsert profile.
   *
   * @param updateFn update function.
   */
  async upsertProfile(updateFn: AtkitBskyUpsertProfileUpdateFn) {
    await this.agent.upsertProfile(async (data) => {
      const updated = await updateFn(data)

      // TODO: merge profile

      return updated
    })
  }

  /**
   * get suggested actors.
   */
  async getSuggestions(
    params: AppBskyActorGetSuggestions.QueryParams,
    opts?: AppBskyActorGetSuggestions.CallOptions
  ) {
    const { data } = await this.agent.getSuggestions(params, opts)

    this.#mergeProfiles(data.actors)

    return data
  }

  /**
   * search actors.
   */
  async searchActors(
    params: AppBskyActorSearchActors.QueryParams,
    opts?: AppBskyActorSearchActors.CallOptions
  ) {
    const { data } = await this.agent.searchActors(params, opts)

    this.#mergeProfiles(data.actors)

    return data
  }

  /**
   * search actors.
   */
  async searchActorsTypeahead(
    params: AppBskyActorSearchActors.QueryParams,
    opts?: AppBskyActorSearchActors.CallOptions
  ) {
    const { data } = await this.agent.searchActorsTypeahead(params, opts)

    this.#mergeProfiles(data.actors)

    return data
  }

  /**
   * mute actor by did.
   *
   * @param did did.
   */
  mute(did: string): Promise<void>

  /**
   * mute actor by profile.
   *
   * @param profile
   */
  mute(profile: ProfileViewDetailed): Promise<void>

  async mute(...args: unknown[]): Promise<void> {
    let profile: ProfileViewDetailed | undefined

    if (typeof args[0] === 'string') {
      await this.agent.mute(args[0])
      profile = this.#storedProfiles.get(args[0])
    } else if (isProfileViewDetailed(args[0])) {
      await this.agent.mute(args[0].did)
      profile = this.#storedProfiles.get(args[0].did) ?? args[0]
    }

    if (profile) {
      profile.viewer = {
        ...profile.viewer,
        muted: true,
      }

      this.#setProfiles(this.#storedProfiles)
    }
  }

  /**
   * unmute actor by did.
   *
   * @param did did.
   */
  unmute(did: string): Promise<void>

  /**
   * unmute actor by profile.
   *
   * @param profile profile.
   */
  unmute(profile: ProfileViewDetailed): Promise<void>

  async unmute(...args: unknown[]) {
    let profile: ProfileViewDetailed | undefined

    if (typeof args[0] === 'string') {
      await this.agent.unmute(args[0])
      profile = this.#storedProfiles.get(args[0])
    } else if (isProfileViewDetailed(args[0])) {
      await this.agent.unmute(args[0].did)
      profile = this.#storedProfiles.get(args[0].did) ?? args[0]
    }

    if (profile) {
      profile.viewer = {
        ...profile.viewer,
        muted: false,
      }

      this.#setProfiles(this.#storedProfiles)
    }
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

    this.#setPostViews(merged)
    this.#mergeProfiles(profiles)
  }

  #mergePosts(posts: PostView[]) {
    const merged = new Map<string, PostView>([...this.storedPostViews])
    const profiles: ProfileViewDetailed[] = []

    for (const post of posts) {
      merged.set(post.uri, post)
      profiles.push(post.author)
    }

    this.#setPostViews(merged)
    this.#mergeProfiles(profiles)
  }

  #setPostViews(posts: Map<string, PostView>) {
    this.#storedPostViews = posts
    this.#eventPostsChanged.dispatch(posts)
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

    this.#setProfiles(merged)
  }

  #setProfiles(profiles: Map<string, ProfileViewDetailed>) {
    this.#storedProfiles = profiles
    this.#eventProfilesChanged.dispatch(profiles)
  }
}
