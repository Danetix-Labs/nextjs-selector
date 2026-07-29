import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { groupOptions } from '../src/core/grouping.js'
import { computeVariableWindow, computeWindow, toOffsets } from '../src/core/virtual.js'
import { Select, type SelectOption } from '../src/index.js'

const long: readonly SelectOption[] = Array.from({ length: 100 }, (_, i) => ({
  value: `v${i}`,
  label: `Строка ${i}`,
}))

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
})

describe('окно виртуализации при смене длины списка', () => {
  it('список внезапно короче прокрутки — окно не уходит за границы', () => {
    // Прокручены на 3000 px, а опций осталось на 400.
    const window = computeWindow({
      count: 10,
      itemHeight: 40,
      viewportHeight: 300,
      scrollTop: 3000,
      overscan: 2,
    })

    expect(window.start).toBeLessThanOrEqual(window.end)
    expect(window.end).toBeLessThanOrEqual(10)
    expect(window.paddingBottom).toBeGreaterThanOrEqual(0)
    expect(window.paddingTop).toBeLessThanOrEqual(window.totalHeight)
  })

  it('то же самое при переменной высоте', () => {
    const offsets = toOffsets(5, new Map([[0, 200]]), 40)
    const window = computeVariableWindow({
      offsets,
      viewportHeight: 300,
      scrollTop: 5000,
      overscan: 2,
    })

    expect(window.start).toBeLessThanOrEqual(window.end)
    expect(window.paddingBottom).toBeGreaterThanOrEqual(0)
  })

  it('устаревшие измерения не делают список длиннее, чем он есть', () => {
    // Высоты остались от прошлого, более длинного списка.
    const stale = new Map([
      [0, 50],
      [7, 50],
      [9, 50],
    ])
    const offsets = toOffsets(3, stale, 40)

    // Учитываются только строки, которые сейчас существуют.
    expect(offsets).toHaveLength(4)
    expect(offsets[3]).toBe(50 + 40 + 40)
  })

  it('прокрутка после сокращения списка не рвёт разметку', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 300,
    })
    const user = userEvent.setup()

    // Сокращаем набор опций у уже смонтированного и прокрученного виджета.
    const { rerender, container } = render(
      <Select.Root<string> options={long}>
        <Select.Label>Строки</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="—" />
        </Select.Trigger>
        <Select.Content>
          <Select.Virtualized itemHeight={40} />
        </Select.Content>
      </Select.Root>,
    )

    await user.click(screen.getByRole('combobox'))
    const listbox = screen.getByRole('listbox')
    listbox.scrollTop = 3000
    fireEvent.scroll(listbox)

    rerender(
      <Select.Root<string> options={long.slice(0, 3)}>
        <Select.Label>Строки</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="—" />
        </Select.Trigger>
        <Select.Content>
          <Select.Virtualized itemHeight={40} />
        </Select.Content>
      </Select.Root>,
    )

    // Виджет жив, а не показывает пустоту с гигантской распоркой.
    expect(container.querySelector('[data-part="listbox"]')).toBeInTheDocument()
  })
})

describe('группы, меняющиеся на лету', () => {
  it('смена группы у опции сохраняет её значение и индексы', () => {
    const before = groupOptions([
      { value: 'a', label: 'A', group: 'Первая' },
      { value: 'b', label: 'B', group: 'Вторая' },
    ])
    const after = groupOptions([
      { value: 'a', label: 'A', group: 'Вторая' },
      { value: 'b', label: 'B', group: 'Вторая' },
    ])

    expect(before).toHaveLength(2)
    expect(after).toHaveLength(1)
    // Плоские индексы не зависят от группировки.
    expect(after[0]?.options.map((entry) => entry.index)).toEqual([0, 1])
  })

  it('опция, потерявшая группу, попадает в безымянную корзину', () => {
    const groups = groupOptions([
      { value: 'a', label: 'A', group: 'Есть' },
      { value: 'b', label: 'B' },
    ])

    expect(groups.map((group) => group.label)).toEqual(['Есть', undefined])
  })
})

describe('шторка при смене условий', () => {
  it('переключение режима на открытом списке не теряет состояние', async () => {
    const listeners = new Set<() => void>()
    let matches = false

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        get matches() {
          return matches
        },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      })),
    })

    const user = userEvent.setup()
    render(<Select options={long.slice(0, 3)} label="Строки" sheet />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    expect(document.querySelector('[data-part="content"]')).toHaveAttribute('data-mode', 'dropdown')

    // Поворот экрана: условие стало истинным при открытом списке.
    matches = true
    for (const listener of listeners) listener()

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    Reflect.deleteProperty(window, 'matchMedia')
  })
})
