'use client'

// Full entry point: components plus everything the headless layer exposes.
// Reach for `nextjs-selector/headless` when you want no markup at all, or
// `nextjs-selector/core` for the framework-free state machine.

export {
  Chips,
  type ChipsProps,
  ClearButton,
  Content,
  type ContentProps,
  Empty,
  Footer,
  Header,
  Highlight,
  Item,
  ItemIndicator,
  type ItemProps,
  Label,
  List,
  type ListProps,
  LoadError,
  Loading,
  LoadMore,
  Root,
  type RootProps,
  Search,
  SelectAllButton,
  Trigger,
  type TriggerProps,
  useSelectedCount,
  Value,
  type ValueProps,
  Virtualized,
  type VirtualizedProps,
} from './components.js'
export { MultiSelect, SelectField, type SelectFieldProps } from './field.js'
export * from './headless.js'
export { useMediaQuery } from './react/useMediaQuery.js'
export { Select } from './select.js'
export { mergeProps, Slot, type SlotProps } from './slot.js'
