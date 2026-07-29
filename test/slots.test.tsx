import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MultiSelect, Select, type SelectOption, useSelectedCount } from '../src/index.js'
import { violations } from './a11y.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

function Counter() {
  return <span data-testid="counter">Выбрано: {useSelectedCount()}</span>
}

describe('слоты вокруг списка', () => {
  it('шапка и подвал рендерятся вне листбокса', async () => {
    const user = userEvent.setup()
    render(
      <MultiSelect
        options={options}
        label="Буквы"
        header={<Counter />}
        footer={<button type="button">Создать</button>}
      />,
    )

    await user.click(screen.getByRole('combobox'))

    const listbox = screen.getByRole('listbox')
    expect(listbox).not.toHaveTextContent('Выбрано')
    expect(listbox.querySelector('button')).toBeNull()
    expect(screen.getByTestId('counter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument()
  })

  it('счётчик в шапке следит за выбором', async () => {
    const user = userEvent.setup()
    render(<MultiSelect options={options} label="Буквы" header={<Counter />} />)

    await user.click(screen.getByRole('combobox'))
    expect(screen.getByTestId('counter')).toHaveTextContent('Выбрано: 0')

    await user.click(screen.getByRole('option', { name: 'Alpha' }))
    await user.click(screen.getByRole('option', { name: 'Beta' }))

    expect(screen.getByTestId('counter')).toHaveTextContent('Выбрано: 2')
  })

  it('действие в подвале работает и не выбирает опцию', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(
      <MultiSelect
        options={options}
        label="Буквы"
        footer={
          <button type="button" onClick={onCreate}>
            Создать
          </button>
        }
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('button', { name: 'Создать' }))

    expect(onCreate).toHaveBeenCalledOnce()
    // Клик по действию не должен задевать выбор.
    for (const name of ['Alpha', 'Beta', 'Gamma']) {
      expect(screen.getByRole('option', { name })).toHaveAttribute('aria-selected', 'false')
    }
  })

  it('слоты доступны и в составной раскладке', async () => {
    const user = userEvent.setup()
    render(
      <Select.Root<string> options={options}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="—" />
        </Select.Trigger>
        <Select.Content>
          <Select.Header>Заголовок</Select.Header>
          <Select.List />
          <Select.Footer>Подвал</Select.Footer>
        </Select.Content>
      </Select.Root>,
    )

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByText('Заголовок')).toBeInTheDocument()
    expect(screen.getByText('Подвал')).toBeInTheDocument()
  })

  it('со слотами аудит axe остаётся чистым', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MultiSelect
        options={options}
        label="Буквы"
        searchable
        header={<Counter />}
        footer={<button type="button">Создать</button>}
      />,
    )

    await user.click(screen.getByRole('combobox'))

    expect(await violations(container)).toEqual([])
  })
})
