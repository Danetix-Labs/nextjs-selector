import type { SelectAction, SelectContext, SelectOption, SelectState } from '../types.js'

export const NO_ACTIVE = -1

export function initialState<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>(
  selected: readonly TValue[] = [],
  visible: readonly TOption[] = [],
): SelectState<TValue, TOption> {
  return {
    open: false,
    status: 'idle',
    version: 0,
    visible,
    hasMore: false,
    query: '',
    activeIndex: NO_ACTIVE,
    selected,
    undo: null,
  }
}

/**
 * Nearest selectable index from `from`, walking by `step` and wrapping around.
 * Returns NO_ACTIVE when every option is disabled.
 */
function seek<TValue>(
  options: readonly SelectOption<TValue>[],
  from: number,
  step: 1 | -1,
): number {
  const { length } = options
  for (let i = 1; i <= length; i++) {
    const index = (((from + step * i) % length) + length) % length
    if (!options[index]?.disabled) return index
  }
  return NO_ACTIVE
}

function firstSelectable<TValue>(options: readonly SelectOption<TValue>[]): number {
  return seek(options, NO_ACTIVE, 1)
}

/**
 * Closest selectable index to `target`, preferring `step`'s direction.
 * Used by paging, which clamps at the edges instead of wrapping.
 */
function seekNearest<TValue>(
  options: readonly SelectOption<TValue>[],
  target: number,
  step: 1 | -1,
): number {
  if (options[target] && !options[target].disabled) return target

  for (const direction of [step, -step] as const) {
    for (let i = target + direction; i >= 0 && i < options.length; i += direction) {
      if (!options[i]?.disabled) return i
    }
  }

  return NO_ACTIVE
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max)
}

/**
 * Pure transition. Returns the *same* state reference on no-ops so the store
 * can skip notifying subscribers — this is what keeps renders off the table.
 */
export function reduce<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>(
  state: SelectState<TValue, TOption>,
  action: SelectAction<TValue, TOption>,
  ctx: SelectContext<TValue, TOption>,
): SelectState<TValue, TOption> {
  const { options, multiple, max } = ctx

  switch (action.type) {
    case 'open':
      return state.open ? state : { ...state, open: true, activeIndex: firstSelectable(options) }

    case 'close':
      return state.open ? { ...state, open: false, activeIndex: NO_ACTIVE, query: '' } : state

    case 'toggle':
      return reduce(state, { type: state.open ? 'close' : 'open' }, ctx)

    case 'setQuery':
      return action.query === state.query
        ? state
        : { ...state, open: true, query: action.query, activeIndex: firstSelectable(options) }

    case 'setActive':
      return action.index === state.activeIndex ? state : { ...state, activeIndex: action.index }

    case 'move': {
      const { length } = options
      if (length === 0) return state
      if (!state.open) return reduce(state, { type: 'open' }, ctx)

      const step = action.delta < 0 ? -1 : 1
      // Single steps wrap around; paging clamps at the edges.
      const index =
        Math.abs(action.delta) === 1
          ? seek(options, state.activeIndex, step)
          : seekNearest(options, clamp(state.activeIndex + action.delta, length - 1), step)

      return index === state.activeIndex || index === NO_ACTIVE
        ? state
        : { ...state, activeIndex: index }
    }

    case 'moveEdge': {
      if (options.length === 0) return state

      const index =
        action.edge === 'first' ? seek(options, NO_ACTIVE, 1) : seek(options, options.length, -1)
      return index === state.activeIndex ? state : { ...state, open: true, activeIndex: index }
    }

    case 'select': {
      if (!multiple) {
        return {
          ...state,
          selected: [action.value],
          open: false,
          query: '',
          activeIndex: NO_ACTIVE,
        }
      }

      if (state.selected.includes(action.value)) {
        return {
          ...state,
          selected: state.selected.filter((value) => value !== action.value),
          undo: { value: action.value, index: state.selected.indexOf(action.value) },
        }
      }

      // At the limit, adding is a no-op — removing still works, so the user is
      // never stuck.
      if (max !== undefined && state.selected.length >= max) return state

      return { ...state, selected: [...state.selected, action.value], undo: null }
    }

    case 'selectActive': {
      const option = options[state.activeIndex]
      return option && !option.disabled
        ? reduce(state, { type: 'select', value: option.value }, ctx)
        : state
    }

    case 'remove': {
      const index = state.selected.indexOf(action.value)
      if (index === -1) return state

      return {
        ...state,
        selected: state.selected.filter((value) => value !== action.value),
        undo: { value: action.value, index },
      }
    }

    case 'removeLast': {
      const last = state.selected[state.selected.length - 1]
      if (last === undefined) return state

      return {
        ...state,
        selected: state.selected.slice(0, -1),
        undo: { value: last, index: state.selected.length - 1 },
      }
    }

    case 'undoRemove': {
      if (!state.undo) return state

      const selected = [...state.selected]
      selected.splice(Math.min(state.undo.index, selected.length), 0, state.undo.value)

      return { ...state, selected, undo: null }
    }

    case 'reorder': {
      const { from, to } = action
      const { length } = state.selected
      if (from === to || from < 0 || to < 0 || from >= length || to >= length) return state

      const selected = [...state.selected]
      const [moved] = selected.splice(from, 1)
      if (moved === undefined) return state
      selected.splice(to, 0, moved)

      return { ...state, selected, undo: null }
    }

    case 'clear':
      return state.selected.length === 0 ? state : { ...state, selected: [] }

    case 'selectAll': {
      if (!multiple) return state

      const selectable = options.filter((option) => !option.disabled).map((option) => option.value)
      const room = max === undefined ? selectable.length : max
      const selected = [
        ...state.selected,
        ...selectable.filter((value) => !state.selected.includes(value)),
      ].slice(0, room)

      return selected.length === state.selected.length ? state : { ...state, selected }
    }

    case 'setStatus':
      return action.status === state.status ? state : { ...state, status: action.status }

    case 'setVisible':
      return action.options === state.visible ? state : { ...state, visible: action.options }

    case 'optionsLoaded':
      return {
        ...state,
        status: 'idle',
        version: state.version + 1,
        hasMore: action.hasMore,
        // A later page must not yank the highlight back to the top.
        activeIndex:
          state.open && state.activeIndex === NO_ACTIVE
            ? firstSelectable(options)
            : state.activeIndex,
      }
  }
}
