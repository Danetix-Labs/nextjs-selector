export type Listener = () => void

export interface Store<TState> {
  getState: () => TState
  /** Skips notification when the reducer returns the same reference. */
  dispatch: (reduce: (state: TState) => TState) => void
  subscribe: (listener: Listener) => () => void
}

export function createStore<TState>(initial: TState): Store<TState> {
  let state = initial
  const listeners = new Set<Listener>()

  return {
    getState: () => state,

    dispatch(reduce) {
      const next = reduce(state)
      if (Object.is(next, state)) return

      state = next
      for (const listener of listeners) listener()
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
