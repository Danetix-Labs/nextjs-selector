import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { mergeProps, Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

describe('mergeProps', () => {
  it('составляет обработчики: сначала потребителя, потом наш', () => {
    const order: string[] = []
    const merged = mergeProps(
      { onClick: () => order.push('ours') },
      { onClick: () => order.push('theirs') },
    )

    ;(merged.onClick as () => void)()

    expect(order).toEqual(['theirs', 'ours'])
  })

  it('объединяет className и style', () => {
    const merged = mergeProps(
      { className: 'base', style: { color: 'red', margin: 0 } },
      { className: 'custom', style: { color: 'blue' } },
    )

    expect(merged.className).toBe('base custom')
    expect(merged.style).toEqual({ color: 'blue', margin: 0 })
  })

  it('не отдаёт ARIA, role, id и data-атрибуты на перезапись', () => {
    const merged = mergeProps(
      { role: 'option', 'aria-selected': true, 'data-part': 'option', id: 'ours' },
      { role: 'button', 'aria-selected': false, 'data-part': 'custom', id: 'theirs' },
    )

    expect(merged).toMatchObject({
      role: 'option',
      'aria-selected': true,
      'data-part': 'option',
      id: 'ours',
    })
  })

  it('обычные пропсы потребителя побеждают', () => {
    expect(mergeProps({ title: 'ours' }, { title: 'theirs' }).title).toBe('theirs')
  })
})

describe('asChild', () => {
  it('переносит поведение на элемент потребителя', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <Select.Root<string> options={options}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger asChild>
          <a href="#none" onClick={onClick}>
            Открыть
          </a>
        </Select.Trigger>
        <Select.List />
      </Select.Root>,
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger.tagName).toBe('A')

    await user.click(trigger)

    expect(onClick).toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('опция сохраняет роль и состояние на чужом элементе', async () => {
    const user = userEvent.setup()

    render(
      <Select.Root<string> options={options}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>Открыть</Select.Trigger>
        <Select.List>
          {(option, index) => (
            <Select.Item key={String(option.value)} option={option} index={index} asChild>
              <button type="button" className="my-item">
                {option.label}
              </button>
            </Select.Item>
          )}
        </Select.List>
      </Select.Root>,
    )

    await user.click(screen.getByRole('combobox'))
    const item = screen.getByRole('option', { name: 'Beta' })

    expect(item.tagName).toBe('BUTTON')
    expect(item).toHaveClass('my-item')

    await user.click(item)
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
  })
})
