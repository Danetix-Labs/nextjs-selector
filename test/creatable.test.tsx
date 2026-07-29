import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { canCreate, withCreateOption } from '../src/core/creatable.js'
import { Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
]

describe('canCreate', () => {
  it('предлагает создание, когда точного совпадения нет', () => {
    expect(canCreate(options, 'Svelte')).toBe(true)
  })

  it('молчит при точном совпадении, игнорируя регистр и пробелы', () => {
    expect(canCreate(options, 'react')).toBe(false)
    expect(canCreate(options, '  React  ')).toBe(false)
  })

  it('молчит на пустом запросе', () => {
    expect(canCreate(options, '   ')).toBe(false)
  })
})

describe('withCreateOption', () => {
  it('добавляет запись последней', () => {
    const result = withCreateOption(options, 'Svelte', (q) => `Создать ${q}`)

    expect(result).toHaveLength(3)
    expect(result[2]?.label).toBe('Создать Svelte')
  })

  it('возвращает исходный список, когда создавать нечего', () => {
    expect(withCreateOption(options, 'React', (q) => q)).toBe(options)
  })
})

function Picker({ onCreate }: { onCreate: (label: string) => void }) {
  return (
    <Select.Root<string> options={options} creatable onCreate={onCreate}>
      <Select.Label>Технологии</Select.Label>
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

describe('создание опций', () => {
  it('показывает запись создания под введённый текст', async () => {
    const user = userEvent.setup()
    render(<Picker onCreate={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'Svelte')

    expect(screen.getByRole('option', { name: 'Создать «Svelte»' })).toBeInTheDocument()
  })

  it('не предлагает создание при точном совпадении', async () => {
    const user = userEvent.setup()
    render(<Picker onCreate={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'Vue')

    expect(screen.queryByRole('option', { name: /Создать/ })).not.toBeInTheDocument()
  })

  it('сообщает введённый текст и не меняет выбор', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<Picker onCreate={onCreate} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'Svelte')
    await user.click(screen.getByRole('option', { name: 'Создать «Svelte»' }))

    expect(onCreate).toHaveBeenCalledWith('Svelte')
    expect(screen.getByRole('combobox')).toHaveTextContent('Выберите')
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
  })

  it('запись создания достижима с клавиатуры', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<Picker onCreate={onCreate} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'Svelte')
    await user.keyboard('{Enter}')

    expect(onCreate).toHaveBeenCalledWith('Svelte')
  })
})
