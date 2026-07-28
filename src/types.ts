/** Single choice presented to the user. */
export interface SelectOption<TValue = string> {
  readonly value: TValue
  readonly label: string
  readonly disabled?: boolean
}

/** Everything the machine needs to know to answer a keystroke. */
export interface SelectContext<TValue> {
  readonly options: readonly SelectOption<TValue>[]
  readonly multiple: boolean
}

export interface SelectState<TValue> {
  readonly open: boolean
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
