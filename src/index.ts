'use client'

export { initialState, NO_ACTIVE, reduce } from './core/reducer.js'
export { createStore, type Listener, type Store } from './core/store.js'
export {
  appendToBuffer,
  emptyBuffer,
  matchPrefix,
  TYPEAHEAD_TIMEOUT_MS,
  type TypeaheadBuffer,
} from './core/typeahead.js'
export {
  supportsAnchorPositioning,
  supportsPopover,
  useAnchorStyle,
  usePopoverProps,
} from './popover.js'
export {
  type OptionPropsConfig,
  useIsOpen,
  useLabelProps,
  useListboxProps,
  useOptionProps,
  useQuery,
  useSearchProps,
  useSelectedValues,
  useTriggerProps,
} from './props.js'
export { useStoreSlice } from './react/useStoreSlice.js'
export type {
  SelectAction,
  SelectContext,
  SelectOption,
  SelectState,
} from './types.js'
export { type SelectApi, type SelectIds, type UseSelectConfig, useSelect } from './useSelect.js'
