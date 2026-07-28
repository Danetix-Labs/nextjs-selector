import { useCallback, useSyncExternalStore } from 'react'

import type { Store } from '../core/store.js'

/**
 * Subscribes to a slice of the store.
 *
 * The selector must return a primitive or a stable reference — returning a
 * fresh object on every call would loop. Keeping slices primitive is what lets
 * a single option re-render without touching the rest of the list.
 */
export function useStoreSlice<TState, TSlice>(
  store: Store<TState>,
  selector: (state: TState) => TSlice,
): TSlice {
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector])

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}
