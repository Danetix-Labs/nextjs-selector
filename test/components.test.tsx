import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'
import { violations } from './a11y.js'

const options: readonly SelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte', disabled: true },
]

function Picker({
  multiple = false,
  name,
  onValueChange,
}: {
  multiple?: boolean
  name?: string
  onValueChange?: (value: readonly string[]) => void
}) {
  return (
    <Select.Root<string>
      options={options}
      multiple={multiple}
      name={name}
      onValueChange={onValueChange}
    >
      <Select.Label>Технологии</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск" />
        <Select.Empty>Ничего не найдено</Select.Empty>
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}

describe('составные компоненты', () => {
  it('собираются в рабочий комбобокс', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Picker onValueChange={onValueChange} />)

    expect(screen.getByRole('combobox')).toHaveAccessibleName('Технологии')
    expect(screen.getByText('Выберите')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Vue'))

    expect(onValueChange).toHaveBeenCalledWith(['vue'])
  })

  it('показывает выбранные значения вместо плейсхолдера', async () => {
    const user = userEvent.setup()
    render(<Picker multiple />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('React'))
    await user.click(screen.getByText('Vue'))

    expect(screen.getByRole('combobox')).toHaveTextContent('React, Vue')
  })

  it('сообщает о пустом результате поиска', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'zzz')

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('прокидывает выбор в форму под указанным именем', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(new FormData(event.currentTarget))
        }}
      >
        <Picker name="stack" />
        <button type="submit">Отправить</button>
      </form>,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('React'))
    await user.click(screen.getByText('Отправить'))

    expect(onSubmit.mock.calls[0]?.[0].get('stack')).toBe('react')
  })

  it('проходит аудит axe в закрытом состоянии', async () => {
    const { container } = render(<Picker />)

    expect(await violations(container)).toEqual([])
  })

  it('проходит аудит axe в открытом состоянии', async () => {
    const user = userEvent.setup()
    const { container } = render(<Picker multiple />)

    await user.click(screen.getByRole('combobox'))

    expect(await violations(container)).toEqual([])
  })
})
