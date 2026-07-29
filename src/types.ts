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

/**
 * Everything the machine needs to know to answer a keystroke.
 *
 * `TOption` carries whatever the consumer put on their options — icons,
 * avatars, prices — all the way through to the render callback.
 */
export interface SelectContext<
  TValue,
  TOption extends SelectOption<TValue> = SelectOption<TValue>,
> {
  readonly options: readonly TOption[]
  readonly multiple: boolean
}

/** Lifecycle of an async option load. */
export type SelectStatus = 'idle' | 'loading' | 'error'

export interface SelectState<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>> {
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
  readonly visible: readonly TOption[]
  /** Whether the async source says another page exists. */
  readonly hasMore: boolean
  readonly query: string
  /** Index into the filtered options, or -1 when nothing is active. */
  readonly activeIndex: number
  readonly selected: readonly TValue[]
}

export type SelectAction<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>> =
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
  | { readonly type: 'optionsLoaded'; readonly hasMore: boolean }
  | { readonly type: 'setVisible'; readonly options: readonly TOption[] }
