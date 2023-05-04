export class EventController<T> {
  #listeners: ((data: T) => void)[] = []

  subscribe(listener: (data: T) => void) {
    this.#listeners.push(listener)

    return () => {
      this.#listeners = this.#listeners.filter((l) => l !== listener)
    }
  }

  dispatch(data: T) {
    this.#listeners.forEach((l) => l(data))
  }
}
