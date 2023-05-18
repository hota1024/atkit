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
  - [x] agent.post(record)
  - [x] agent.deletePost(postUri)
  - [x] agent.like(uri, cid)
  - [x] agent.deleteLike(likeUri)
  - [x] agent.repost(uri, cid)
  - [x] agent.deleteRepost(repostUri)
  - [x] agent.uploadBlob(data, opts)
- Social graph
  - [x] agent.getFollows(params, opts)
  - [x] agent.getFollowers(params, opts)
  - [x] agent.follow(did)
  - [x] agent.deleteFollow(followUri)
- Actors
  - [x] agent.getProfile(params, opts)
  - [x] agent.upsertProfile(updateFn)
  - [x] agent.getProfiles(params, opts)
  - [x] agent.getSuggestions(params, opts)
  - [x] agent.searchActors(params, opts)
  - [x] agent.searchActorsTypeahead(params, opts)
  - [x] agent.mute(did)
  - [x] agent.unmute(did)
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
