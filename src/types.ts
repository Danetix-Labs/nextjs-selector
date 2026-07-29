/** Single choice presented to the user. */
export interface SelectOption<TValue = string> {
  readonly value: TValue
  readonly label: string
  readonly disabled?: boolean
  /** Options sharing a group label are rendered together. */
  readonly group?: string
  /** Secondary line under the label. */
  readonly description?: string
}

/** Everything the machine needs to know to answer a keystroke. */
export interface SelectContext<TValue> {
  readonly options: readonly SelectOption<TValue>[]
  readonly multiple: boolean
}

/** Lifecycle of an async option load. */
export type SelectStatus = 'idle' | 'loading' | 'error'

export interface SelectState<TValue> {
  readonly open: boolean
  readonly status: SelectStatus
  /**
   * Bumped whenever the option source is replaced.
   *
   * Status alone cannot signal this: a promise that resolves in a microtask
   * collapses loading → idle before React reads a snapshot, so the change
   * becomes invisible. A counter always moves.
   */
  readonly version: number
  /**
   * Options currently on screen.
   *
   * Kept in the store rather than behind a ref: useSyncExternalStore renders
   * subscribers synchronously on notification, so a subscriber can run before
   * the owner has refreshed its refs and would read stale data.
   */
  readonly visible: readonly SelectOption<TValue>[]
  readonly query: string
  /** Index into the filtered options, or -1 when nothing is active. */
  readonly activeIndex: number
  readonly selected: readonly TValue[]
}

export type SelectAction<TValue> =
  | { readonly type: 'open' }
  | { readonly type: 'close' }
  | { readonly type: 'toggle' }
  | { readonly type: 'setQuery'; readonly query: string }
  | { readonly type: 'setActive'; readonly index: number }
  | { readonly type: 'move'; readonly delta: number }
  | { readonly type: 'moveEdge'; readonly edge: 'first' | 'last' }
  | { readonly type: 'select'; readonly value: TValue }
  | { readonly type: 'selectActive' }
  | { readonly type: 'remove'; readonly value: TValue }
  | { readonly type: 'removeLast' }
  | { readonly type: 'clear' }
  | { readonly type: 'setStatus'; readonly status: SelectStatus }
  | { readonly type: 'optionsLoaded' }
  | { readonly type: 'setVisible'; readonly options: readonly SelectOption<TValue>[] }
