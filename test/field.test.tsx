import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MultiSelect, Select, type SelectOption } from '../src/index.js'
import { violations } from './a11y.js'

const options: readonly SelectOption[] = [
  { value: 'ru', label: 'Россия', group: 'Европа' },
  { value: 'jp', label: 'Япония', group: 'Азия' },
]

describe('Select как готовый компонент', () => {
  it('одного элемента достаточно для рабочего виджета', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Select
        options={options}
        label="Страны"
        placeholder="Выберите"
        onValueChange={onValueChange}
      />,
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAccessibleName('Страны')
    expect(trigger).toHaveTextContent('Выберите')

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Япония' }))

    expect(onValueChange).toHaveBeenCalledWith(['jp'])
  })

  it('поиск подключается флагом', async () => {
    const user = userEvent.setup()
    render(<Select options={options} label="Страны" searchable />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'япон')

    expect(screen.queryByRole('option', { name: 'Россия' })).not.toBeInTheDocument()
    // Имя поля поиска отличается от имени поля — иначе оба отзываются на одно.
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Страны')
  })

  it('MultiSelect включает множественный выбор и чипы', async () => {
    const user = userEvent.setup()
    const { container } = render(<MultiSelect options={options} label="Страны" />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Россия' }))

    expect(container.querySelectorAll('[data-part="chip"]')).toHaveLength(1)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
  })

  it('itemHeight переключает список на виртуализацию', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 320,
    })
    const user = userEvent.setup()
    const many = Array.from({ length: 2_000 }, (_, i) => ({ value: `v${i}`, label: `Строка ${i}` }))
    const { container } = render(<Select options={many} label="Много" itemHeight={32} />)

    await user.click(screen.getByRole('combobox'))

    expect(container.querySelectorAll('[data-part="option"]').length).toBeLessThan(25)
    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
  })

  it('составные части остаются доступны на том же имени', () => {
    render(
      <Select.Root<string> options={options}>
        <Select.Label>Своя раскладка</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="…" />
        </Select.Trigger>
        <Select.Content>
          <Select.List />
        </Select.Content>
      </Select.Root>,
    )

    expect(screen.getByRole('combobox')).toHaveAccessibleName('Своя раскладка')
  })

  it('готовый компонент проходит аудит axe', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MultiSelect options={options} label="Страны" searchable clearable />,
    )

    await user.click(screen.getByRole('combobox'))

    expect(await violations(container)).toEqual([])
  })
})
