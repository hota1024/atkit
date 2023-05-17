# `@atkit/core`

Core library of `@atkit`.

## `AtkitBsky`

```ts
import { AtkitBsky } from '@atkit/core'

const bsky = new AtkitBsky({ service: 'https://example.com' })

# or

import { BskyAgent } from '@atproto/api'
const bsky = new AtkitBsky(new BskyAgent({ service: 'https://example.com' }))
```

### Wrapper methods

- Feeds and content
  - [x] agent.getTimeline(params, opts)
  - [x] agent.getAuthorFeed(params, opts)
  - [x] agent.getPostThread(params, opts)
  - [ ] agent.getPost(params)
  - [x] agent.getPosts(params, opts)
  - [x] agent.getLikes(params, opts)
  - [x] agent.getRepostedBy(params, opts)
  - [ ] agent.post(record)
  - [ ] agent.deletePost(postUri)
  - [ ] agent.like(uri, cid)
  - [ ] agent.deleteLike(likeUri)
  - [ ] agent.repost(uri, cid)
  - [ ] agent.deleteRepost(repostUri)
  - [ ] agent.uploadBlob(data, opts)
- Social graph
  - [x] agent.getFollows(params, opts)
  - [x] agent.getFollowers(params, opts)
  - [ ] agent.follow(did)
  - [ ] agent.deleteFollow(followUri)
- Actors
  - [x] agent.getProfile(params, opts)
  - [ ] agent.upsertProfile(updateFn)
  - [ ] agent.getProfiles(params, opts)
  - [ ] agent.getSuggestions(params, opts)
  - [ ] agent.searchActors(params, opts)
  - [ ] agent.searchActorsTypeahead(params, opts)
  - [ ] agent.mute(did)
  - [ ] agent.unmute(did)
- Notifications
  - [ ] agent.listNotifications(params, opts)
  - [ ] agent.countUnreadNotifications(params, opts)
  - [ ] agent.updateSeenNotifications()
- Identity
  - [ ] agent.resolveHandle(params, opts)
  - [ ] agent.updateHandle(params, opts)
- Session management
  - [ ] agent.createAccount(params)
  - [x] agent.login(params)
  - [x] agent.resumeSession(session)
