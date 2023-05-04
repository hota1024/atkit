import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs'
import { AuthState } from '../types'

export type OnAuthStateChanged = AuthState

export type OnPostsChanged = Map<string, PostView>
