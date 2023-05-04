import {
  AtpAgentLoginOpts,
  AtpAgentOpts,
  AtpSessionData,
  BskyAgent,
} from '@atproto/api'
import { AuthState } from '../types'
import { EventController } from '../EventController'
import { OnAuthStateChanged } from './events'

export class AtkitBsky {
  #authState: AuthState = 'logged-out'

  #eventAuthStateChanged = new EventController<OnAuthStateChanged>()

  public readonly agent: BskyAgent

  /**
   * current auth state.
   */
  get authState() {
    return this.#authState
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
   * subscribe to auth state changes.
   *
   * @param callback callback function.
   * @returns unsubscribe function.
   */
  onAuthStateChanged(callback: (state: AuthState) => void) {
    return this.#eventAuthStateChanged.subscribe(callback)
  }

  #changeAuthState(state: AuthState) {
    this.#authState = state
    this.#eventAuthStateChanged.dispatch(state)
  }
}
