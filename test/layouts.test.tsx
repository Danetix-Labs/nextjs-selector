import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'
import { violations } from './a11y.js'

const statuses: readonly SelectOption[] = [
  { value: 'all', label: 'All statuses', description: 'Показывать всё' },
  { value: 'draft', label: 'Draft', description: 'Ещё не опубликовано' },
  { value: 'published', label: 'Published' },
]

const icons: readonly SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: `icon-${i}`,
  label: `Иконка ${i}`,
}))

describe('подписи под пунктом', () => {
  it('описание выводится рядом с названием', () => {
    render(<Select options={statuses} label="Статус" defaultValue={['all']} />)

    expect(screen.getByText('Показывать всё')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /All statuses/ })).toHaveTextContent('Показывать всё')
  })

  it('пункт без описания остаётся без лишней разметки', () => {
    const { container } = render(<Select options={statuses} label="Статус" />)
    const withoutDescription = screen.getByRole('option', { name: 'Published' })

    expect(withoutDescription.querySelector('[data-part="option-description"]')).toBeNull()
    expect(container.querySelectorAll('[data-part="option-description"]')).toHaveLength(2)
  })
})

describe('сетка', () => {
  function Grid() {
    return (
      <Select.Root<string> options={icons} columns={4}>
        <Select.Label>Иконка</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="Выберите" />
        </Select.Trigger>
        <Select.Content>
          <Select.List style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }} />
        </Select.Content>
      </Select.Root>
    )
  }

  it('вниз переходит на строку ниже, а не на соседний пункт', async () => {
    const user = userEvent.setup()
    render(<Grid />)

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowDown}')

    // Из «Иконка 0» вниз при четырёх столбцах — «Иконка 4».
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Иконка 4' }).id,
    )
  })

  it('вправо и влево ходят по одному', async () => {
    const user = userEvent.setup()
    render(<Grid />)

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowRight}{ArrowRight}')

    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Иконка 2' }).id,
    )

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Иконка 1' }).id,
    )
  })

  it('в обычном списке горизонтальные стрелки ничего не двигают', async () => {
    const user = userEvent.setup()
    render(<Select options={statuses} label="Статус" />)

    await user.click(screen.getByRole('combobox'))
    const before = screen.getByRole('combobox').getAttribute('aria-activedescendant')
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', before ?? '')
  })

  it('сетка проходит аудит axe', async () => {
    const user = userEvent.setup()
    const { container } = render(<Grid />)

    await user.click(screen.getByRole('combobox'))

    expect(await violations(container)).toEqual([])
  })
})
