import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MultiSelect, Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

const triggers = () => screen.getAllByRole('combobox')

describe('несколько виджетов на одной странице', () => {
  it('идентификаторы и якоря не сталкиваются', () => {
    render(
      <>
        <Select options={options} label="Первый" />
        <Select options={options} label="Второй" />
      </>,
    )

    const [first, second] = triggers()
    expect(first?.id).not.toBe(second?.id)
    expect(first?.getAttribute('aria-controls')).not.toBe(second?.getAttribute('aria-controls'))

    const anchors = Array.from(document.querySelectorAll('[data-part="trigger"]')).map((el) =>
      (el as HTMLElement).style.getPropertyValue('anchor-name'),
    )
    expect(new Set(anchors).size).toBe(anchors.length)
  })

  it('открытие одного не закрывает и не трогает другой', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Select options={options} label="Первый" />
        <Select options={options} label="Второй" />
      </>,
    )

    const [first, second] = triggers()
    await user.click(first as HTMLElement)
    expect(first).toHaveAttribute('aria-expanded', 'true')

    // Клик по второму триггеру — это клик вне первого: тот обязан закрыться.
    await user.click(second as HTMLElement)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveAttribute('aria-expanded', 'true')
  })

  it('выбор в одном не попадает в другой', async () => {
    const user = userEvent.setup()
    render(
      <>
        <MultiSelect options={options} label="Первый" />
        <MultiSelect options={options} label="Второй" />
      </>,
    )

    const [first, second] = triggers()
    await user.click(first as HTMLElement)
    await user.click(screen.getAllByRole('option', { name: 'Alpha' })[0] as HTMLElement)

    expect(first).toHaveTextContent('Alpha')
    expect(second).not.toHaveTextContent('Alpha')
  })

  it('живые области не смешиваются', async () => {
    const user = userEvent.setup()
    render(
      <>
        <MultiSelect options={options} label="Первый" />
        <MultiSelect options={options} label="Второй" />
      </>,
    )

    await user.click(triggers()[0] as HTMLElement)
    await user.click(screen.getAllByRole('option', { name: 'Beta' })[0] as HTMLElement)

    const announcers = document.querySelectorAll('[data-part="announcer"]')
    expect(announcers[0]).toHaveTextContent('Beta выбрано')
    expect(announcers[1]).toHaveTextContent('')
  })
})

describe('контролируемый режим вместе с прочим', () => {
  it('создание опции не меняет значение за спиной родителя', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    const onValueChange = vi.fn()

    render(
      <Select.Root<string>
        options={options}
        multiple
        value={['a']}
        creatable
        onCreate={onCreate}
        onValueChange={onValueChange}
      >
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Search aria-label="Поиск" />
          <Select.List />
        </Select.Content>
      </Select.Root>,
    )

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'Новое')
    await user.click(screen.getByRole('option', { name: /Создать/ }))

    expect(onCreate).toHaveBeenCalledWith('Новое')
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha')
  })

  it('закреплённые значения не подменяют контролируемое значение', async () => {
    const user = userEvent.setup()

    function Controlled() {
      const [value, setValue] = useState<readonly string[]>(['b'])
      return (
        <MultiSelect
          options={options}
          label="Буквы"
          pinned={['a']}
          value={value}
          onValueChange={setValue}
        />
      )
    }

    render(<Controlled />)
    await user.click(screen.getByRole('combobox'))

    // Закрепление меняет порядок показа, но не выбор.
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Alpha', 'Beta'])
    expect(screen.getByRole('combobox')).toHaveTextContent('Beta')
  })
})

describe('частые переключения', () => {
  it('десять открытий подряд оставляют согласованное состояние', async () => {
    const user = userEvent.setup()
    render(<Select options={options} label="Буквы" />)

    const trigger = screen.getByRole('combobox')
    for (let i = 0; i < 10; i++) await user.click(trigger)

    // Чётное число кликов — список закрыт.
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-activedescendant')
  })

  it('быстрый ввод и закрытие не оставляют запрос в состоянии', async () => {
    const user = userEvent.setup()
    render(<Select options={options} label="Буквы" searchable />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.type(screen.getByLabelText('Поиск'), 'bet')
    await user.keyboard('{Escape}')
    await user.click(trigger)

    // Закрытие сбрасывает запрос — список снова полный.
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.getByLabelText('Поиск')).toHaveValue('')
  })
})
