import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs'
import { AuthState } from '../types'
import { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs'

export type OnAuthStateChanged = AuthState

export type OnPostsChanged = Map<string, PostView>

export type OnProfilesChanged = Map<string, ProfileViewDetailed>
