'use client'

import type { KeyboardEvent } from 'react'
import { useCallback, useMemo, useRef } from 'react'

import { appendToBuffer, emptyBuffer, matchPrefix } from './core/typeahead.js'
import { useStoreSlice } from './react/useStoreSlice.js'
import type { SelectOption, SelectState } from './types.js'
import type { SelectApi } from './useSelect.js'

/** Present when true, absent when false — the shape CSS attribute selectors expect. */
type DataFlag = '' | undefined

const flag = (on: boolean): DataFlag => (on ? '' : undefined)

/** Options traversed by PageUp/PageDown. */
const PAGE_SIZE = 10

export function useIsOpen<TValue>(api: SelectApi<TValue>): boolean {
  return useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue>) => state.open, []),
  )
}

export function useSelectedValues<TValue>(api: SelectApi<TValue>): readonly TValue[] {
  return useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue>) => state.selected, []),
  )
}

export function useQuery<TValue>(api: SelectApi<TValue>): string {
  return useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue>) => state.query, []),
  )
}

/**
 * Visible options, with the subscription that keeps them fresh.
 *
 * `getVisibleOptions` reads a ref, so on its own it would go stale: a parent
 * re-render does not reach children whose element identity is unchanged.
 * Subscribing to the query here is what makes filtering reactive.
 */
export function useVisibleOptions<TValue>(api: SelectApi<TValue>): readonly SelectOption<TValue>[] {
  useQuery(api)

  return api.getVisibleOptions()
}

function useActiveIndex<TValue>(api: SelectApi<TValue>): number {
  return useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue>) => state.activeIndex, []),
  )
}

/**
 * Keyboard model shared by the trigger and the search input, per the APG
 * combobox pattern. `textEntry` tells us whether printable keys belong to the
 * user's query rather than to us.
 */
function useKeyDown<TValue>(api: SelectApi<TValue>, textEntry: boolean) {
  const buffer = useRef(emptyBuffer)

  return useCallback(
    (event: KeyboardEvent) => {
      const { dispatch, store, multiple } = api

      switch (event.key) {
        case 'PageDown':
          event.preventDefault()
          dispatch({ type: 'move', delta: PAGE_SIZE })
          return

        case 'PageUp':
          event.preventDefault()
          dispatch({ type: 'move', delta: -PAGE_SIZE })
          return

        case 'ArrowDown':
          event.preventDefault()
          dispatch({ type: 'move', delta: 1 })
          return

        case 'ArrowUp':
          event.preventDefault()
          dispatch({ type: 'move', delta: -1 })
          return

        case 'Home':
          if (textEntry && store.getState().query !== '') return
          event.preventDefault()
          dispatch({ type: 'moveEdge', edge: 'first' })
          return

        case 'End':
          if (textEntry && store.getState().query !== '') return
          event.preventDefault()
          dispatch({ type: 'moveEdge', edge: 'last' })
          return

        case 'Enter':
          if (!store.getState().open) {
            event.preventDefault()
            dispatch({ type: 'open' })
            return
          }
          event.preventDefault()
          dispatch({ type: 'selectActive' })
          return

        case 'Escape':
          if (!store.getState().open) return
          event.preventDefault()
          dispatch({ type: 'close' })
          return

        case ' ':
          if (textEntry) return
          event.preventDefault()
          dispatch(store.getState().open ? { type: 'selectActive' } : { type: 'open' })
          return

        case 'Backspace':
          if (!textEntry || !multiple || store.getState().query !== '') return
          dispatch({ type: 'removeLast' })
          return

        case 'Tab':
          if (store.getState().open) dispatch({ type: 'close' })
          return

        // Typeahead: printable keys jump to the matching option, the way a
        // native <select> behaves. In a text field they belong to the query.
        default: {
          if (textEntry || event.key.length !== 1) return
          if (event.ctrlKey || event.metaKey || event.altKey) return

          buffer.current = appendToBuffer(buffer.current, event.key, Date.now())

          const index = matchPrefix(
            api.getVisibleOptions(),
            buffer.current.text,
            store.getState().activeIndex,
          )
          if (index < 0) return

          event.preventDefault()
          if (!store.getState().open) dispatch({ type: 'open' })
          dispatch({ type: 'setActive', index })
        }
      }
    },
    [api, textEntry],
  )
}

export function useLabelProps<TValue>(api: SelectApi<TValue>) {
  const { ids } = api

  return useMemo(
    () => ({ id: ids.label, htmlFor: ids.trigger, 'data-part': 'label' }) as const,
    [ids],
  )
}

export function useTriggerProps<TValue>(api: SelectApi<TValue>) {
  const open = useIsOpen(api)
  const activeIndex = useActiveIndex(api)
  const onKeyDown = useKeyDown(api, false)

  const onClick = useCallback(() => api.dispatch({ type: 'toggle' }), [api])

  return useMemo(
    () =>
      ({
        id: api.ids.trigger,
        role: 'combobox',
        'aria-expanded': open,
        'aria-controls': api.ids.listbox,
        'aria-haspopup': 'listbox',
        'aria-labelledby': api.ids.label,
        'aria-activedescendant': open && activeIndex >= 0 ? api.ids.option(activeIndex) : undefined,
        'data-part': 'trigger',
        'data-state': open ? 'open' : 'closed',
        'data-multiple': flag(api.multiple),
        onClick,
        onKeyDown,
      }) as const,
    [api, open, activeIndex, onClick, onKeyDown],
  )
}

export function useSearchProps<TValue>(api: SelectApi<TValue>) {
  const query = useQuery(api)
  const onKeyDown = useKeyDown(api, true)

  const onChange = useCallback(
    (event: { currentTarget: { value: string } }) =>
      api.dispatch({ type: 'setQuery', query: event.currentTarget.value }),
    [api],
  )

  return useMemo(
    () =>
      ({
        value: query,
        type: 'text',
        role: 'searchbox',
        autoComplete: 'off',
        'aria-controls': api.ids.listbox,
        'data-part': 'search',
        onChange,
        onKeyDown,
      }) as const,
    [api, query, onChange, onKeyDown],
  )
}

export function useListboxProps<TValue>(api: SelectApi<TValue>) {
  const open = useIsOpen(api)

  return useMemo(
    () =>
      ({
        id: api.ids.listbox,
        role: 'listbox',
        'aria-multiselectable': api.multiple || undefined,
        'aria-labelledby': api.ids.label,
        'data-part': 'listbox',
        'data-state': open ? 'open' : 'closed',
      }) as const,
    [api, open],
  )
}

export interface OptionPropsConfig<TValue> {
  readonly index: number
  readonly value: TValue
  readonly disabled?: boolean
}

/**
 * Subscribes to two booleans only, so moving the highlight re-renders the
 * option leaving and the one arriving — never the whole list.
 */
export function useOptionProps<TValue>(api: SelectApi<TValue>, config: OptionPropsConfig<TValue>) {
  const { index, value, disabled = false } = config

  const active = useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue>) => state.activeIndex === index, [index]),
  )

  const selected = useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue>) => state.selected.includes(value), [value]),
  )

  const onClick = useCallback(() => {
    if (!disabled) api.dispatch({ type: 'select', value })
  }, [api, value, disabled])

  // Pointer moves drive the highlight; hover must not steal keyboard intent.
  const onPointerMove = useCallback(() => {
    if (!disabled) api.dispatch({ type: 'setActive', index })
  }, [api, index, disabled])

  return useMemo(
    () =>
      ({
        id: api.ids.option(index),
        role: 'option',
        'aria-selected': selected,
        'aria-disabled': disabled || undefined,
        'data-part': 'option',
        'data-highlighted': flag(active),
        'data-selected': flag(selected),
        'data-disabled': flag(disabled),
        onClick,
        onPointerMove,
      }) as const,
    [api, index, active, selected, disabled, onClick, onPointerMove],
  )
}
