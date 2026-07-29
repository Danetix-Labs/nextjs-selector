import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'

/** The consumer's own shape, carrying fields the library knows nothing about. */
interface User extends SelectOption<string> {
  readonly role: string
  readonly initials: string
}

const users: readonly User[] = [
  { value: 'ada', label: 'Ada Lovelace', role: 'Автор', initials: 'AL' },
  { value: 'alan', label: 'Alan Turing', role: 'Ревьюер', initials: 'AT' },
]

function People() {
  return (
    <Select.Root<string, User> options={users}>
      <Select.Label>Исполнитель</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
      </Select.Trigger>
      <Select.Content>
        <Select.List<string, User>>
          {(user, index) => (
            <Select.Item<string, User> key={user.value} option={user} index={index}>
              {/* Поля потребителя доходят сюда типизированными. */}
              <span data-part="avatar">{user.initials}</span>
              <span>{user.label}</span>
              <span data-part="role">{user.role}</span>
            </Select.Item>
          )}
        </Select.List>
      </Select.Content>
    </Select.Root>
  )
}

describe('свои поля в опциях', () => {
  it('доходят до функции-рендера', async () => {
    const user = userEvent.setup()
    render(<People />)

    await user.click(screen.getByRole('combobox'))

    const option = screen.getByRole('option', { name: /Ada Lovelace/ })
    expect(option).toHaveTextContent('AL')
    expect(option).toHaveTextContent('Автор')
  })

  it('выбор по-прежнему идёт по value', async () => {
    const user = userEvent.setup()
    render(<People />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: /Alan Turing/ }))

    expect(screen.getByRole('combobox')).toHaveTextContent('Alan Turing')
  })

  it('готовый компонент тоже принимает свой тип опции', async () => {
    const user = userEvent.setup()
    render(<Select<string, User> options={users} label="Исполнитель" searchable />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'alan')

    expect(screen.queryByRole('option', { name: /Ada/ })).not.toBeInTheDocument()
  })
})
