import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'
import { violations } from './a11y.js'

const options: readonly SelectOption[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'he', label: 'עברית' },
]

function Picker() {
  return (
    <div dir="rtl">
      <Select.Root<string> options={options} multiple>
        <Select.Label>اللغات</Select.Label>
        <Select.Chips />
        <Select.Trigger>
          <Select.Value placeholder="اختر" />
        </Select.Trigger>
        <Select.Content>
          <Select.Search aria-label="بحث" />
          <Select.List />
        </Select.Content>
      </Select.Root>
    </div>
  )
}

describe('RTL', () => {
  it('клавиатура не зависит от направления письма', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('combobox'))
    // Вертикальная навигация листбокса одинакова в обоих направлениях.
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'עברית' }).id,
    )
  })

  it('выбор и чипы работают в правостороннем контексте', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'العربية' }))

    expect(screen.getByRole('button', { name: 'Убрать العربية' })).toBeInTheDocument()
  })

  it('проходит аудит axe при dir=rtl', async () => {
    const user = userEvent.setup()
    const { container } = render(<Picker />)

    await user.click(screen.getByRole('combobox'))

    expect(await violations(container)).toEqual([])
  })
})
