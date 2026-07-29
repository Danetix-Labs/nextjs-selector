import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { initialState, reduce } from '../src/core/reducer.js'
import { matchPrefix } from '../src/core/typeahead.js'
import { computeWindow, toOffsets } from '../src/core/virtual.js'
import { MultiSelect, Select, type SelectContext, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

const ctx: SelectContext<string> = { options, multiple: true }
const activeLabel = () =>
  document.getElementById(screen.getByRole('combobox').getAttribute('aria-activedescendant') ?? '')
    ?.textContent

describe('бессмысленные значения настроек', () => {
  it('columns = 0 не должен ломать навигацию вниз', async () => {
    const user = userEvent.setup()
    render(
      <Select.Root<string> options={options} columns={0}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="—" />
        </Select.Trigger>
        <Select.Content>
          <Select.List />
        </Select.Content>
      </Select.Root>,
    )

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowDown}')

    // Шаг в ноль строк — не движение, а зависание списка.
    expect(activeLabel()).toBe('Beta')
  })

  it('max = 0 запрещает выбор, но не ломает виджет', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<MultiSelect options={options} label="Буквы" max={0} onValueChange={onValueChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Alpha' }))

    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false')
  })

  it('отрицательный max ведёт себя как ноль, а не как отсутствие лимита', () => {
    const state = reduce(
      { ...initialState<string>() },
      { type: 'select', value: 'a' },
      {
        ...ctx,
        max: -1,
      },
    )

    expect(state.selected).toEqual([])
  })

  it('нулевая высота строки не приводит к делению на ноль', () => {
    const window = computeWindow({
      count: 100,
      itemHeight: 0,
      viewportHeight: 300,
      scrollTop: 0,
      overscan: 2,
    })

    expect(Number.isFinite(window.end)).toBe(true)
    expect(window).toMatchObject({ start: 0, end: 0 })
  })
})

describe('испорченные данные', () => {
  it('дубликаты значений не выбираются дважды', () => {
    const dupes: readonly SelectOption[] = [
      { value: 'a', label: 'Первая' },
      { value: 'a', label: 'Вторая' },
    ]
    const state = reduce(
      { ...initialState<string>() },
      { type: 'select', value: 'a' },
      {
        options: dupes,
        multiple: true,
      },
    )

    expect(state.selected).toEqual(['a'])
  })

  it('закреплённое значение, которого нет в списке, не создаёт пустую строку', async () => {
    const user = userEvent.setup()
    render(<Select options={options} label="Буквы" pinned={['несуществующее']} />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('выбранное значение без опции показывается как есть, а не как пустота', () => {
    render(<MultiSelect options={options} label="Буквы" defaultValue={['призрак']} />)

    expect(screen.getByRole('combobox')).toHaveTextContent('призрак')
  })

  it('пустой список опций переживает выбор всего и навигацию', () => {
    const empty: SelectContext<string> = { options: [], multiple: true }
    const opened = reduce({ ...initialState<string>() }, { type: 'open' }, empty)

    expect(reduce(opened, { type: 'selectAll' }, empty).selected).toEqual([])
    expect(reduce(opened, { type: 'move', delta: 1 }, empty)).toBe(opened)
    expect(reduce(opened, { type: 'moveEdge', edge: 'last' }, empty)).toBe(opened)
  })

  it('список из одних отключённых опций не выбирается ничем', () => {
    const allDisabled: SelectContext<string> = {
      options: [{ value: 'x', label: 'X', disabled: true }],
      multiple: true,
    }
    const opened = reduce({ ...initialState<string>() }, { type: 'open' }, allDisabled)

    expect(reduce(opened, { type: 'selectActive' }, allDisabled).selected).toEqual([])
    expect(reduce(opened, { type: 'selectAll' }, allDisabled).selected).toEqual([])
  })
})

describe('операции с невозможными аргументами', () => {
  it('перестановка с NaN не портит выбор', () => {
    const state = { ...initialState<string>(['a', 'b']) }

    expect(reduce(state, { type: 'reorder', from: Number.NaN, to: 0 }, ctx)).toBe(state)
    expect(reduce(state, { type: 'reorder', from: 0, to: Number.NaN }, ctx)).toBe(state)
  })

  it('снятие несуществующего значения ничего не меняет', () => {
    const state = { ...initialState<string>(['a']) }

    expect(reduce(state, { type: 'remove', value: 'нет такого' }, ctx)).toBe(state)
  })

  it('активный индекс за границами не выбирает ничего', () => {
    const state = reduce({ ...initialState<string>() }, { type: 'setActive', index: 99 }, ctx)

    expect(reduce(state, { type: 'selectActive' }, ctx).selected).toEqual([])
  })

  it('поиск по пустому списку не находит совпадений', () => {
    expect(matchPrefix([], 'a', 0)).toBe(-1)
    expect(matchPrefix(options, 'a', 99)).toBeGreaterThanOrEqual(-1)
  })

  it('смещения для нулевого количества строк — единственный ноль', () => {
    expect(toOffsets(0, new Map(), 40)).toEqual([0])
    expect(toOffsets(-5, new Map(), 40)).toEqual([0])
  })
})

describe('неправильное использование API', () => {
  it('часть вне Root падает с внятным сообщением, а не с undefined', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Select.Trigger />)).toThrow(/внутри <Select.Root>/)

    consoleError.mockRestore()
  })
})
