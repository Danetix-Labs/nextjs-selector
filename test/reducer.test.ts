import { describe, expect, it } from 'vitest'

import { initialState, NO_ACTIVE, reduce } from '../src/core/reducer.js'
import type { SelectContext, SelectOption, SelectState } from '../src/types.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', disabled: true },
  { value: 'c', label: 'Gamma' },
]

const single: SelectContext<string> = { options, multiple: false }
const multi: SelectContext<string> = { options, multiple: true }

const open = (ctx = single): SelectState<string> =>
  reduce(initialState<string>(), { type: 'open' }, ctx)

describe('reduce', () => {
  it('активирует первую доступную опцию при открытии', () => {
    expect(open()).toMatchObject({ open: true, activeIndex: 0 })
  })

  it('пропускает disabled при навигации', () => {
    const state = reduce(open(), { type: 'move', delta: 1 }, single)

    expect(state.activeIndex).toBe(2)
  })

  it('заворачивает навигацию по кругу', () => {
    const last = reduce(open(), { type: 'moveEdge', edge: 'last' }, single)

    expect(reduce(last, { type: 'move', delta: 1 }, single).activeIndex).toBe(0)
  })

  it('в одиночном режиме заменяет значение и закрывает список', () => {
    const state = reduce(open(), { type: 'select', value: 'c' }, single)

    expect(state).toMatchObject({ selected: ['c'], open: false, activeIndex: NO_ACTIVE })
  })

  it('в множественном режиме переключает значение и не закрывает список', () => {
    const added = reduce(open(multi), { type: 'select', value: 'a' }, multi)
    const removed = reduce(added, { type: 'select', value: 'a' }, multi)

    expect(added).toMatchObject({ selected: ['a'], open: true })
    expect(removed.selected).toEqual([])
  })

  it('не выбирает disabled опцию', () => {
    const onDisabled = reduce(open(), { type: 'setActive', index: 1 }, single)

    expect(reduce(onDisabled, { type: 'selectActive' }, single)).toBe(onDisabled)
  })

  it('сбрасывает запрос и подсветку при закрытии', () => {
    const searched = reduce(open(), { type: 'setQuery', query: 'ga' }, single)

    expect(reduce(searched, { type: 'close' }, single)).toMatchObject({
      query: '',
      activeIndex: NO_ACTIVE,
      open: false,
    })
  })

  it('снимает последнее значение по removeLast', () => {
    const state: SelectState<string> = { ...initialState<string>(['a', 'c']) }

    expect(reduce(state, { type: 'removeLast' }, multi).selected).toEqual(['a'])
  })

  it('возвращает ту же ссылку на no-op — иначе подписчики получат лишнее уведомление', () => {
    const state = open()

    expect(reduce(state, { type: 'open' }, single)).toBe(state)
    expect(reduce(state, { type: 'setActive', index: 0 }, single)).toBe(state)
    expect(reduce(state, { type: 'remove', value: 'missing' }, single)).toBe(state)
    expect(reduce(initialState<string>(), { type: 'clear' }, single)).toEqual(
      initialState<string>(),
    )
  })

  it('переживает список, состоящий только из disabled опций', () => {
    const ctx: SelectContext<string> = {
      options: [{ value: 'x', label: 'X', disabled: true }],
      multiple: false,
    }

    expect(reduce(initialState<string>(), { type: 'open' }, ctx).activeIndex).toBe(NO_ACTIVE)
  })
})

describe('постраничная навигация', () => {
  const many: readonly SelectOption[] = Array.from({ length: 25 }, (_, i) => ({
    value: `v${i}`,
    label: `Option ${i}`,
  }))
  const ctx: SelectContext<string> = { options: many, multiple: false }

  it('PageDown прыгает на страницу вперёд', () => {
    const state = reduce(initialState<string>(), { type: 'open' }, ctx)

    expect(reduce(state, { type: 'move', delta: 10 }, ctx).activeIndex).toBe(10)
  })

  it('упирается в границы вместо заворачивания', () => {
    const last = reduce(initialState<string>(), { type: 'moveEdge', edge: 'last' }, ctx)

    expect(reduce(last, { type: 'move', delta: 10 }, ctx)).toBe(last)
    expect(reduce(last, { type: 'move', delta: -10 }, ctx).activeIndex).toBe(14)
  })

  it('садится на ближайшую доступную опцию', () => {
    const withDisabled: SelectContext<string> = {
      options: many.map((o, i) => (i === 10 ? { ...o, disabled: true } : o)),
      multiple: false,
    }
    const state = reduce(initialState<string>(), { type: 'open' }, withDisabled)

    expect(reduce(state, { type: 'move', delta: 10 }, withDisabled).activeIndex).toBe(11)
  })
})
