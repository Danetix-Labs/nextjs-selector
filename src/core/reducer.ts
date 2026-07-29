import type { SelectAction, SelectContext, SelectOption, SelectState } from '../types.js'

export const NO_ACTIVE = -1

export function initialState<TValue>(
  selected: readonly TValue[] = [],
  visible: readonly SelectOption<TValue>[] = [],
): SelectState<TValue> {
  return {
    open: false,
    status: 'idle',
    version: 0,
    visible,
    query: '',
    activeIndex: NO_ACTIVE,
    selected,
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
export function reduce<TValue>(
  state: SelectState<TValue>,
  action: SelectAction<TValue>,
  ctx: SelectContext<TValue>,
): SelectState<TValue> {
  const { options, multiple } = ctx

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

      const selected = state.selected.includes(action.value)
        ? state.selected.filter((value) => value !== action.value)
        : [...state.selected, action.value]

      return { ...state, selected }
    }

    case 'selectActive': {
      const option = options[state.activeIndex]
      return option && !option.disabled
        ? reduce(state, { type: 'select', value: option.value }, ctx)
        : state
    }

    case 'remove': {
      const selected = state.selected.filter((value) => value !== action.value)
      return selected.length === state.selected.length ? state : { ...state, selected }
    }

    case 'removeLast': {
      if (state.selected.length === 0) return state
      return { ...state, selected: state.selected.slice(0, -1) }
    }

    case 'clear':
      return state.selected.length === 0 ? state : { ...state, selected: [] }

    case 'setStatus':
      return action.status === state.status ? state : { ...state, status: action.status }

    case 'setVisible':
      return action.options === state.visible ? state : { ...state, visible: action.options }

    case 'optionsLoaded':
      return {
        ...state,
        status: 'idle',
        version: state.version + 1,
        activeIndex: state.open ? firstSelectable(options) : state.activeIndex,
      }
  }
}
