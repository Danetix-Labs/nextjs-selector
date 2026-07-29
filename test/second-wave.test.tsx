import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { highlightMatches } from '../src/core/highlight.js'
import { MultiSelect, Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

describe('highlightMatches', () => {
  it('делит подпись на совпавшие и обычные куски', () => {
    expect(highlightMatches('Alpha', 'lph')).toEqual([
      { text: 'A', matched: false },
      { text: 'lph', matched: true },
      { text: 'a', matched: false },
    ])
  })

  it('сохраняет регистр и диакритику оригинала', () => {
    const segments = highlightMatches('Ёлка', 'ёл')

    expect(segments.map((segment) => segment.text).join('')).toBe('Ёлка')
    expect(segments[0]).toMatchObject({ matched: true })
  })

  it('находит все вхождения', () => {
    expect(highlightMatches('abab', 'ab').filter((s) => s.matched)).toHaveLength(2)
  })

  it('пустой запрос и промах оставляют подпись целой', () => {
    expect(highlightMatches('Alpha', '')).toEqual([{ text: 'Alpha', matched: false }])
    expect(highlightMatches('Alpha', 'zzz')).toEqual([{ text: 'Alpha', matched: false }])
  })
})

describe('подсветка в списке', () => {
  it('совпавший кусок обёрнут в mark', async () => {
    const user = userEvent.setup()
    const { container } = render(<Select options={options} label="Буквы" searchable />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'lph')

    const mark = container.querySelector('[data-part="match"]')
    expect(mark?.textContent).toBe('lph')
    // Подпись целиком не пострадала.
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
  })
})

describe('лимит выбора', () => {
  it('не даёт выбрать больше max', async () => {
    const user = userEvent.setup()
    render(<MultiSelect options={options} label="Буквы" max={2} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Alpha' }))
    await user.click(screen.getByRole('option', { name: 'Beta' }))
    await user.click(screen.getByRole('option', { name: 'Gamma' }))

    expect(screen.getByRole('option', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta')
  })

  it('на лимите снятие по-прежнему работает — пользователь не заперт', async () => {
    const user = userEvent.setup()
    render(<MultiSelect options={options} label="Буквы" max={1} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Alpha' }))
    await user.click(screen.getByRole('option', { name: 'Alpha' }))

    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false')
  })
})

describe('выбрать всё', () => {
  it('выбирает все доступные опции', async () => {
    const user = userEvent.setup()
    render(
      <MultiSelect
        options={[...options, { value: 'd', label: 'Delta', disabled: true }]}
        label="Буквы"
        footer={<Select.SelectAllButton>Выбрать всё</Select.SelectAllButton>}
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('button', { name: 'Выбрать всё' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta, Gamma')
    // Отключённая не попала в выбор.
    expect(screen.getByRole('option', { name: 'Delta' })).toHaveAttribute('aria-selected', 'false')
  })

  it('уважает лимит', async () => {
    const user = userEvent.setup()
    render(
      <MultiSelect
        options={options}
        label="Буквы"
        max={2}
        footer={<Select.SelectAllButton>Выбрать всё</Select.SelectAllButton>}
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('button', { name: 'Выбрать всё' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta')
  })
})

describe('закреплённые значения', () => {
  it('поднимаются наверх, не меняя порядок остальных', async () => {
    const user = userEvent.setup()
    render(<Select options={options} label="Буквы" pinned={['c']} />)

    await user.click(screen.getByRole('combobox'))

    const labels = screen.getAllByRole('option').map((option) => option.textContent)
    expect(labels).toEqual(['Gamma', 'Alpha', 'Beta'])
  })

  it('остаются наверху и после фильтрации', async () => {
    const user = userEvent.setup()
    render(<Select options={options} label="Буквы" searchable pinned={['c']} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'a')

    const labels = screen.getAllByRole('option').map((option) => option.textContent)
    expect(labels[0]).toBe('Gamma')
  })
})
