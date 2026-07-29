// Framework-free entry point: pure state machine, matching and geometry.
// Deliberately carries no 'use client' — this code runs anywhere, including
// inside Server Components.

export type {
  SelectAction,
  SelectContext,
  SelectOption,
  SelectState,
  SelectStatus,
} from '../types.js'
export { CREATE_VALUE, canCreate, isCreateOption, withCreateOption } from './creatable.js'
export { type GroupedOption, groupOptions, type OptionGroup } from './grouping.js'
export { highlightMatches, type LabelSegment } from './highlight.js'
export { initialState, NO_ACTIVE, reduce } from './reducer.js'
export { createStore, type Listener, type Store } from './store.js'
export {
  appendToBuffer,
  emptyBuffer,
  matchPrefix,
  TYPEAHEAD_TIMEOUT_MS,
  type TypeaheadBuffer,
} from './typeahead.js'
export {
  computeVariableWindow,
  computeWindow,
  scrollOffsetFor,
  toOffsets,
  type VariableWindowInput,
  type VirtualWindow,
  type VirtualWindowInput,
} from './virtual.js'
