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
  Item,
  ItemIndicator,
  type ItemProps,
  Label,
  List,
  type ListProps,
  LoadError,
  Loading,
  Root,
  type RootProps,
  Search,
  Select,
  Trigger,
  type TriggerProps,
  Value,
  type ValueProps,
  Virtualized,
  type VirtualizedProps,
} from './components.js'
export * from './headless.js'
export { mergeProps, Slot, type SlotProps } from './slot.js'
