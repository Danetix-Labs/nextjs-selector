'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { initialState, reduce } from './core/reducer.js'
import { createStore, type Store } from './core/store.js'
import { useStoreSlice } from './react/useStoreSlice.js'
import type { SelectAction, SelectContext, SelectOption, SelectState } from './types.js'

export interface SelectIds {
  readonly trigger: string
  readonly listbox: string
  readonly label: string
  /** Option id, needed for aria-activedescendant. */
  readonly option: (index: number) => string
  /** Per-instance CSS anchor name tying the listbox to the trigger. */
  readonly anchor: string
}

export interface UseSelectConfig<TValue> {
  readonly options: readonly SelectOption<TValue>[]
  readonly multiple?: boolean
  /** Controlled value. Omit to let the hook own the selection. */
  readonly value?: readonly TValue[]
  readonly defaultValue?: readonly TValue[]
  readonly onValueChange?: (value: readonly TValue[]) => void
  /**
   * Defaults to a case- and diacritic-insensitive substring match.
   * Memoize it, or filtering re-runs on every render.
   */
  readonly filter?: (option: SelectOption<TValue>, query: string) => boolean
  /** Inert: neither opens nor changes. */
  readonly disabled?: boolean
  /** Opens and navigates, but the selection cannot change. */
  readonly readOnly?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
}

export interface SelectFlags {
  readonly disabled: boolean
  readonly readOnly: boolean
  readonly required: boolean
  readonly invalid: boolean
}

/** Stable handle — no member changes identity across renders. */
export interface SelectApi<TValue> {
  readonly store: Store<SelectState<TValue>>
  readonly ids: SelectIds
  readonly multiple: boolean
  readonly dispatch: (action: SelectAction<TValue>) => void
  /** Options after filtering, exactly as keyboard navigation indexes them. */
  readonly getVisibleOptions: () => readonly SelectOption<TValue>[]
  /**
   * Every option, filtering ignored. Selected values must keep their labels
   * while a search narrows the list.
   */
  readonly getAllOptions: () => readonly SelectOption<TValue>[]
  readonly flags: SelectFlags
}

/** Actions that change the selection — blocked while read-only. */
const MUTATING: ReadonlySet<SelectAction<unknown>['type']> = new Set([
  'select',
  'selectActive',
  'remove',
  'removeLast',
  'clear',
])

const selectQuery = <TValue>(state: SelectState<TValue>): string => state.query

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function defaultFilter<TValue>(option: SelectOption<TValue>, query: string): boolean {
  return normalize(option.label).includes(normalize(query))
}

export function useSelect<TValue>(config: UseSelectConfig<TValue>): SelectApi<TValue> {
  const {
    options,
    multiple = false,
    value,
    defaultValue,
    onValueChange,
    filter = defaultFilter,
    disabled = false,
    readOnly = false,
    required = false,
    invalid = false,
  } = config

  const flags = useMemo<SelectFlags>(
    () => ({ disabled, readOnly, required, invalid }),
    [disabled, readOnly, required, invalid],
  )

  const id = useId()
  const [store] = useState(() => createStore(initialState<TValue>(value ?? defaultValue ?? [])))

  const query = useStoreSlice(store, selectQuery)

  const visibleOptions = useMemo(
    () => (query === '' ? options : options.filter((option) => filter(option, query))),
    [options, query, filter],
  )

  // Refs keep `dispatch` identity-stable while still reading fresh values.
  const ctxRef = useRef<SelectContext<TValue>>({ options: visibleOptions, multiple })
  ctxRef.current = { options: visibleOptions, multiple }

  const allOptionsRef = useRef(options)
  allOptionsRef.current = options

  const onValueChangeRef = useRef(onValueChange)
  onValueChangeRef.current = onValueChange

  const valueRef = useRef(value)
  valueRef.current = value

  const flagsRef = useRef(flags)
  flagsRef.current = flags

  const dispatch = useCallback(
    (action: SelectAction<TValue>) => {
      const { disabled: isDisabled, readOnly: isReadOnly } = flagsRef.current
      if (isDisabled) return
      if (isReadOnly && MUTATING.has(action.type)) return

      const state = store.getState()
      const next = reduce(state, action, ctxRef.current)
      const changed = next.selected !== state.selected

      if (changed) onValueChangeRef.current?.(next.selected)

      // Controlled: report the intent, but leave the value to the parent.
      // Everything else in the transition — open, query, highlight — applies
      // either way.
      const controlled = valueRef.current !== undefined
      store.dispatch(() => (controlled && changed ? { ...next, selected: state.selected } : next))
    },
    [store],
  )

  // Pick up values the parent changes on its own.
  useEffect(() => {
    if (!value) return

    store.dispatch((state) => (state.selected === value ? state : { ...state, selected: value }))
  }, [store, value])

  const ids = useMemo<SelectIds>(
    () => ({
      trigger: `${id}-trigger`,
      listbox: `${id}-listbox`,
      label: `${id}-label`,
      option: (index) => `${id}-option-${index}`,
      // Custom idents cannot contain the colons React puts in useId output.
      anchor: `--anchor-${id.replace(/[^\w-]/g, '')}`,
    }),
    [id],
  )

  const getVisibleOptions = useCallback(() => ctxRef.current.options, [])
  const getAllOptions = useCallback(() => allOptionsRef.current, [])

  return useMemo(
    () => ({ store, ids, multiple, dispatch, getVisibleOptions, getAllOptions, flags }),
    [store, ids, multiple, dispatch, getVisibleOptions, getAllOptions, flags],
  )
}
