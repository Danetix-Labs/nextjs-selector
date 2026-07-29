import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'
import { violations } from './a11y.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

function Picker(props: {
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  onValueChange?: (value: readonly string[]) => void
}) {
  return (
    <Select.Root<string> options={options} defaultValue={['a']} {...props}>
      <Select.Label>Буквы</Select.Label>
      <Select.Trigger>
        <Select.Value />
      </Select.Trigger>
      <Select.List />
    </Select.Root>
  )
}

describe('состояния', () => {
  it('disabled не открывается и не меняется', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Picker disabled onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('data-disabled', '')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(screen.getByRole('option', { name: 'Beta' }))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('readOnly открывается и навигирует, но не меняет выбор', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Picker readOnly onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-readonly', 'true')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{ArrowDown}')
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Beta' }).id,
    )

    await user.keyboard('{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })

  it('required и invalid объявляются в ARIA и в data-атрибутах', () => {
    render(<Picker required invalid />)

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-required', 'true')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAttribute('data-required', '')
    expect(trigger).toHaveAttribute('data-invalid', '')
  })

  it('обычное состояние не расставляет лишних атрибутов', () => {
    render(<Picker />)

    const trigger = screen.getByRole('combobox')
    expect(trigger).not.toHaveAttribute('aria-required')
    expect(trigger).not.toHaveAttribute('aria-invalid')
    expect(trigger).not.toHaveAttribute('data-disabled')
    expect(trigger).not.toBeDisabled()
  })

  it('состояния проходят аудит axe', async () => {
    const { container } = render(<Picker required invalid readOnly />)

    expect(await violations(container)).toEqual([])
  })
})
