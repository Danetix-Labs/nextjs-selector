'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { isCreateOption, withCreateOption } from './core/creatable.js'
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

export interface UseSelectConfig<
  TValue,
  TOption extends SelectOption<TValue> = SelectOption<TValue>,
> {
  readonly options: readonly TOption[]
  readonly multiple?: boolean
  /** Controlled value. Omit to let the hook own the selection. */
  readonly value?: readonly TValue[]
  readonly defaultValue?: readonly TValue[]
  readonly onValueChange?: (value: readonly TValue[]) => void
  /**
   * Defaults to a case- and diacritic-insensitive substring match.
   * Memoize it, or filtering re-runs on every render.
   */
  readonly filter?: (option: TOption, query: string) => boolean
  /** Inert: neither opens nor changes. */
  readonly disabled?: boolean
  /** Opens and navigates, but the selection cannot change. */
  readonly readOnly?: boolean
  readonly required?: boolean
  readonly invalid?: boolean
  /**
   * Fetches options for a query. When present, `options` seeds the initial
   * list and local filtering is skipped — the source is expected to have
   * filtered already.
   */
  readonly loadOptions?: (query: string, cursor?: unknown) => Promise<LoadResult<TOption>>
  /** Delay before an async load fires. Defaults to 300 ms. */
  readonly debounceMs?: number
  /** Offers the current query as a new option when nothing matches exactly. */
  readonly creatable?: boolean
  /** Label of the create entry. Defaults to `Создать «query»`. */
  readonly createLabel?: (query: string) => string
  /** Called instead of selecting when the create entry is chosen. */
  readonly onCreate?: (label: string) => void
  /** Upper bound on the selection in multiple mode. */
  readonly max?: number
  /**
   * Values pinned to the top of the list.
   *
   * Useful for recents or favourites: they keep their place while the rest of
   * the list is filtered or reordered.
   */
  readonly pinned?: readonly TValue[]
  /**
   * Remembers answers per query.
   *
   * Off by default: a cache that outlives the data it holds is worse than no
   * cache, and only the consumer knows how long their results stay true.
   */
  readonly cache?: boolean
  /**
   * Number of columns when the list is laid out as a grid.
   *
   * Only the keyboard needs to know: left and right step by one, up and down
   * step by a whole row. The grid itself is your CSS.
   */
  readonly columns?: number
}

/**
 * What an async source may return.
 *
 * A bare array means «that is everything». The object form carries a cursor,
 * and the absence of `nextCursor` is what ends the pagination.
 */
export type LoadResult<TOption> =
  | readonly TOption[]
  | { readonly options: readonly TOption[]; readonly nextCursor?: unknown }

function toPage<TOption>(result: LoadResult<TOption>): {
  options: readonly TOption[]
  nextCursor: unknown
} {
  return Array.isArray(result)
    ? { options: result, nextCursor: undefined }
    : {
        options: (result as { options: readonly TOption[] }).options,
        nextCursor: (result as { nextCursor?: unknown }).nextCursor,
      }
}

export interface SelectFlags {
  readonly disabled: boolean
  readonly readOnly: boolean
  readonly required: boolean
  readonly invalid: boolean
}

/** Stable handle — no member changes identity across renders. */
export interface SelectApi<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>> {
  readonly store: Store<SelectState<TValue, TOption>>
  readonly ids: SelectIds
  readonly multiple: boolean
  readonly dispatch: (action: SelectAction<TValue, TOption>) => void
  /** Options after filtering, exactly as keyboard navigation indexes them. */
  readonly getVisibleOptions: () => readonly TOption[]
  /**
   * Every option, filtering ignored. Selected values must keep their labels
   * while a search narrows the list.
   */
  readonly getAllOptions: () => readonly TOption[]
  readonly flags: SelectFlags
  /** Columns in the visual layout; 1 means a plain vertical list. */
  readonly columns: number
  /** Requests the next page from a paginated async source. */
  readonly loadMore: () => void
}

/** Actions that change the selection — blocked while read-only. */
const MUTATING: ReadonlySet<SelectAction<unknown>['type']> = new Set([
  'select',
  'selectActive',
  'remove',
  'removeLast',
  'clear',
])

const selectQuery = <TValue, TOption extends SelectOption<TValue>>(
  state: SelectState<TValue, TOption>,
): string => state.query

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function defaultFilter<TValue>(option: SelectOption<TValue>, query: string): boolean {
  return normalize(option.label).includes(normalize(query))
}

/** Keeps pinned values on top without disturbing the order of the rest. */
function hoistPinned<TValue, TOption extends SelectOption<TValue>>(
  options: readonly TOption[],
  pinned: readonly TValue[],
): readonly TOption[] {
  const isPinned = (option: TOption) => pinned.includes(option.value)
  const top = options.filter(isPinned)

  return top.length === 0 ? options : [...top, ...options.filter((o) => !isPinned(o))]
}

function defaultCreateLabel(query: string): string {
  return `Создать «${query}»`
}

export function useSelect<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>(
  config: UseSelectConfig<TValue, TOption>,
): SelectApi<TValue, TOption> {
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
    loadOptions,
    debounceMs = 300,
    creatable = false,
    createLabel = defaultCreateLabel,
    onCreate,
    columns = 1,
    max,
    pinned,
    cache = false,
  } = config

  const flags = useMemo<SelectFlags>(
    () => ({ disabled, readOnly, required, invalid }),
    [disabled, readOnly, required, invalid],
  )

  const id = useId()
  const [store] = useState(() =>
    createStore(initialState<TValue, TOption>(value ?? defaultValue ?? [], options)),
  )

  const query = useStoreSlice(store, selectQuery)
  const [loadedOptions, setLoadedOptions] = useState<readonly TOption[] | null>(null)

  const loadRef = useRef(loadOptions)
  loadRef.current = loadOptions

  const cursorRef = useRef<unknown>(undefined)
  const cacheRef = useRef(new Map<string, readonly TOption[]>())

  // Async source: debounce the query, drop results that arrive out of order.
  useEffect(() => {
    if (!loadRef.current) return

    let current = true

    const cached = cache ? cacheRef.current.get(query) : undefined
    if (cached) {
      setLoadedOptions(cached)
      store.dispatch((state) =>
        reduce(state, { type: 'optionsLoaded', hasMore: false }, ctxRef.current),
      )
      return
    }

    const timer = setTimeout(() => {
      store.dispatch((state) =>
        reduce(state, { type: 'setStatus', status: 'loading' }, ctxRef.current),
      )

      loadRef.current?.(query).then(
        (result) => {
          if (!current) return

          const page = toPage(result)
          cursorRef.current = page.nextCursor
          if (cache) cacheRef.current.set(query, page.options)
          setLoadedOptions(page.options)
          store.dispatch((state) =>
            reduce(
              state,
              { type: 'optionsLoaded', hasMore: page.nextCursor !== undefined },
              ctxRef.current,
            ),
          )
        },
        () => {
          if (!current) return
          store.dispatch((state) =>
            reduce(state, { type: 'setStatus', status: 'error' }, ctxRef.current),
          )
        },
      )
    }, debounceMs)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [query, debounceMs, store, cache])

  const isAsync = loadOptions !== undefined
  const sourceOptions = isAsync ? (loadedOptions ?? options) : options

  const visibleOptions = useMemo(() => {
    const matched =
      isAsync || query === ''
        ? sourceOptions
        : sourceOptions.filter((option) => filter(option, query))

    const withPinnedFirst = pinned === undefined ? matched : hoistPinned(matched, pinned)

    return creatable ? withCreateOption(withPinnedFirst, query, createLabel) : withPinnedFirst
  }, [sourceOptions, query, filter, isAsync, creatable, createLabel, pinned])

  // Refs keep `dispatch` identity-stable while still reading fresh values.
  const ctxRef = useRef<SelectContext<TValue, TOption>>({ options: visibleOptions, multiple, max })
  ctxRef.current = { options: visibleOptions, multiple, max }

  const allOptionsRef = useRef(sourceOptions)
  allOptionsRef.current = sourceOptions

  // Publish the visible list so subscribers read it from a single source.
  useEffect(() => {
    store.dispatch((state) =>
      reduce(state, { type: 'setVisible', options: visibleOptions }, ctxRef.current),
    )
  }, [visibleOptions, store])

  const onValueChangeRef = useRef(onValueChange)
  onValueChangeRef.current = onValueChange

  const valueRef = useRef(value)
  valueRef.current = value

  const flagsRef = useRef(flags)
  flagsRef.current = flags

  const onCreateRef = useRef(onCreate)
  onCreateRef.current = onCreate

  const dispatch = useCallback(
    (action: SelectAction<TValue, TOption>) => {
      const { disabled: isDisabled, readOnly: isReadOnly } = flagsRef.current
      if (isDisabled) return
      if (isReadOnly && MUTATING.has(action.type)) return

      const state = store.getState()

      // The create entry is not a real value: it reports the typed text and
      // leaves the selection alone.
      const target =
        action.type === 'select'
          ? ctxRef.current.options.find((option) => option.value === action.value)
          : action.type === 'selectActive'
            ? ctxRef.current.options[state.activeIndex]
            : undefined

      if (target && isCreateOption(target)) {
        onCreateRef.current?.(state.query.trim())
        store.dispatch((current) => reduce(current, { type: 'close' }, ctxRef.current))
        return
      }

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

  /**
   * Fetches the next page and appends it.
   *
   * Does nothing when there is no cursor left, when a request is already in
   * flight, or when the source is not paginated at all — so callers may fire
   * it freely on scroll.
   */
  const loadMore = useCallback(() => {
    const state = store.getState()
    if (!loadRef.current || !state.hasMore || state.status === 'loading') return

    const cursor = cursorRef.current
    store.dispatch((current) =>
      reduce(current, { type: 'setStatus', status: 'loading' }, ctxRef.current),
    )

    loadRef.current(store.getState().query, cursor).then(
      (result) => {
        const page = toPage(result)
        cursorRef.current = page.nextCursor
        setLoadedOptions((previous) => [...(previous ?? []), ...page.options])
        store.dispatch((current) =>
          reduce(
            current,
            { type: 'optionsLoaded', hasMore: page.nextCursor !== undefined },
            ctxRef.current,
          ),
        )
      },
      () => {
        store.dispatch((current) =>
          reduce(current, { type: 'setStatus', status: 'error' }, ctxRef.current),
        )
      },
    )
  }, [store])

  const getVisibleOptions = useCallback(() => ctxRef.current.options, [])
  const getAllOptions = useCallback(() => allOptionsRef.current, [])

  return useMemo(
    () => ({
      store,
      ids,
      multiple,
      dispatch,
      getVisibleOptions,
      getAllOptions,
      flags,
      columns,
      loadMore,
    }),
    [store, ids, multiple, dispatch, getVisibleOptions, getAllOptions, flags, columns, loadMore],
  )
}
