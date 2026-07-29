import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { highlightMatches } from '../src/core/highlight.js'
import { MultiSelect, Select, type SelectOption } from '../src/index.js'

const many: readonly SelectOption[] = Array.from({ length: 30 }, (_, i) => ({
  value: `v${i}`,
  label: `Строка ${i}`,
}))

const few: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

const active = () => screen.getByRole('combobox').getAttribute('aria-activedescendant')
const labelOfActive = () => document.getElementById(active() ?? '')?.textContent

describe('подсветка: составные символы', () => {
  it('подсвечивает подпись целиком, когда нормализация меняет длину', () => {
    // «й» в разложенном виде — две кодовые точки, поэтому смещения из копии
    // в оригинале недействительны.
    const decomposed = 'Йогурт'.normalize('NFD')
    const segments = highlightMatches(decomposed, 'йог')

    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ matched: true })
    expect(segments[0]?.text).toBe(decomposed)
  })

  it('на промахе такая подпись остаётся неподсвеченной', () => {
    const decomposed = 'Йогурт'.normalize('NFD')

    expect(highlightMatches(decomposed, 'zzz')).toEqual([{ text: decomposed, matched: false }])
  })
})

describe('клавиатура: редкие пути', () => {
  it('PageDown и PageUp прыгают через страницу', async () => {
    const user = userEvent.setup()
    render(<Select options={many} label="Строки" />)

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{PageDown}')
    expect(labelOfActive()).toBe('Строка 10')

    await user.keyboard('{PageUp}')
    expect(labelOfActive()).toBe('Строка 0')
  })

  it('Tab закрывает список, не съедая переход фокуса', async () => {
    const user = userEvent.setup()
    render(<Select options={few} label="Буквы" />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.keyboard('{Tab}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('Escape на закрытом списке ничего не делает', async () => {
    const user = userEvent.setup()
    render(<Select options={few} label="Буквы" />)

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard('{Escape}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('пробел открывает список и выбирает активную опцию', async () => {
    const user = userEvent.setup()
    render(<Select options={few} label="Буквы" />)

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard(' ')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard(' ')
    expect(trigger).toHaveTextContent('Alpha')
  })

  it('Home и End в поле поиска двигают курсор, а не список', async () => {
    const user = userEvent.setup()
    render(<Select options={few} label="Буквы" searchable />)

    await user.click(screen.getByRole('combobox'))
    const search = screen.getByLabelText('Поиск')
    await user.type(search, 'be')

    const before = active()
    await user.keyboard('{Home}')

    // Запрос не пуст — Home принадлежит полю ввода.
    expect(active()).toBe(before)
  })

  it('модификаторы не запускают typeahead', async () => {
    const user = userEvent.setup()
    render(<Select options={few} label="Буквы" />)

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard('{Control>}b{/Control}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('typeahead молчит, когда ничего не совпало', async () => {
    const user = userEvent.setup()
    render(<Select options={few} label="Буквы" />)

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard('z')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('Backspace снимает последнее значение только в множественном режиме', async () => {
    const user = userEvent.setup()
    render(<MultiSelect options={few} label="Буквы" defaultValue={['a', 'b']} searchable />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByLabelText('Поиск'))
    await user.keyboard('{Backspace}')

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha')
  })
})

describe('виртуализация: измерения', () => {
  it('переживает отсутствие ResizeObserver', () => {
    const saved = globalThis.ResizeObserver
    Reflect.deleteProperty(globalThis, 'ResizeObserver')

    expect(() => render(<Select options={many} label="Строки" itemHeight={32} />)).not.toThrow()

    Object.assign(globalThis, { ResizeObserver: saved })
  })

  it('строки сообщают высоту в режиме оценки', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 200,
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 50,
    })
    const user = userEvent.setup()
    const { container } = render(
      <Select.Root<string> options={many}>
        <Select.Label>Строки</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="—" />
        </Select.Trigger>
        <Select.Content>
          <Select.Virtualized estimateHeight={40} />
        </Select.Content>
      </Select.Root>,
    )

    await user.click(screen.getByRole('combobox'))

    expect(container.querySelectorAll('[data-part="option"]').length).toBeGreaterThan(0)
    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
    Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight')
  })
})

describe('перетаскивание чипов', () => {
  it('перенос мышью меняет порядок', async () => {
    const onValueChange = vi.fn()
    render(
      <Select.Root<string>
        options={[...few, { value: 'c', label: 'Gamma' }]}
        multiple
        defaultValue={['a', 'b', 'c']}
        onValueChange={onValueChange}
      >
        <Select.Label>Буквы</Select.Label>
        <Select.Chips reorderable />
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
      </Select.Root>,
    )

    const chips = document.querySelectorAll('[data-part="chip"]')

    // Через fireEvent: нативное Event не доходит до синтетических
    // обработчиков React.
    fireEvent.dragStart(chips[2] as Element)
    fireEvent.drop(chips[0] as Element)

    expect(screen.getByRole('combobox')).toHaveTextContent('Gamma, Alpha, Beta')
  })
})
