import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'
import { violations } from './a11y.js'

const options: readonly SelectOption[] = [
  { value: 'ru', label: 'Россия', group: 'Европа' },
  { value: 'de', label: 'Германия', group: 'Европа' },
  { value: 'jp', label: 'Япония', group: 'Азия' },
]

function Picker() {
  return (
    <Select.Root<string> options={options} multiple defaultValue={['ru']}>
      <Select.Label>Страны</Select.Label>
      <Select.Chips />
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск" />
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}

describe('чипы и группы', () => {
  it('показывает выбранные значения чипами', () => {
    const { container } = render(<Picker />)

    // Подпись встречается и в чипе, и в Select.Value — ищем именно чип.
    const chips = container.querySelectorAll('[data-part="chip"]')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveTextContent('Россия')
    expect(screen.getByRole('button', { name: 'Убрать Россия' })).toBeInTheDocument()
  })

  it('чип снимает своё значение', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('button', { name: 'Убрать Россия' }))

    expect(screen.queryByRole('button', { name: 'Убрать Россия' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Выберите')
  })

  it('чипы сохраняют подписи, когда поиск скрыл опцию', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'япон')

    // Россия отфильтрована из списка, но остаётся выбранной и подписанной.
    expect(screen.getByRole('button', { name: 'Убрать Россия' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Россия')
  })

  it('раскладывает опции по группам', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('combobox'))

    const groups = screen.getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAccessibleName('Европа')
    expect(groups[1]).toHaveAccessibleName('Азия')
  })

  it('группировка не ломает клавиатурную навигацию по плоскому списку', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowDown}{ArrowDown}')

    // Третья опция — из другой группы, индексы остаются сквозными.
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Япония' }).id,
    )
  })

  it('проходит аудит axe с чипами и группами', async () => {
    const user = userEvent.setup()
    const { container } = render(<Picker />)

    await user.click(screen.getByRole('combobox'))

    expect(await violations(container)).toEqual([])
  })
})
