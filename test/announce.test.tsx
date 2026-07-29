import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { announce } from '../src/announce.js'
import { MultiSelect, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

const base = {
  open: true,
  query: 'a',
  visible: options,
  selected: [] as readonly string[],
  previousSelected: [] as readonly string[],
  labelOf: (value: string) => options.find((o) => o.value === value)?.label ?? value,
}

describe('announce', () => {
  it('сообщает число найденных вариантов', () => {
    expect(announce(base)).toBe('Найдено вариантов: 2')
    expect(announce({ ...base, visible: [] })).toBe('Ничего не найдено')
  })

  it('о выборе говорит вместо количества — это то, что сделал пользователь', () => {
    expect(announce({ ...base, selected: ['a'] })).toBe('Alpha выбрано')
  })

  it('сообщает о снятии', () => {
    expect(announce({ ...base, selected: [], previousSelected: ['b'] })).toBe('Beta снято')
  })

  it('молчит на закрытом списке и пустом запросе', () => {
    expect(announce({ ...base, open: false })).toBe('')
    expect(announce({ ...base, query: '' })).toBe('')
  })

  it('принимает свои формулировки', () => {
    const message = announce(base, {
      results: (count) => `${count} matches`,
      selected: (label) => `${label} on`,
      deselected: (label) => `${label} off`,
    })

    expect(message).toBe('2 matches')
  })
})

describe('живая область в виджете', () => {
  const live = () => document.querySelector('[data-part="announcer"]')

  it('присутствует, вежлива и скрыта визуально', () => {
    render(<MultiSelect options={options} label="Буквы" />)

    expect(live()).toHaveAttribute('aria-live', 'polite')
    expect(live()).toHaveAttribute('role', 'status')
    // Скрыт смещением, а не display:none — иначе скринридер его не прочтёт.
    expect(live()).toHaveStyle({ position: 'absolute', overflow: 'hidden' })
  })

  it('сообщает результаты поиска', async () => {
    const user = userEvent.setup()
    render(<MultiSelect options={options} label="Буквы" searchable />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'alph')

    await waitFor(() => expect(live()).toHaveTextContent('Найдено вариантов: 1'))
  })

  it('сообщает выбор и снятие', async () => {
    const user = userEvent.setup()
    render(<MultiSelect options={options} label="Буквы" />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Alpha' }))
    await waitFor(() => expect(live()).toHaveTextContent('Alpha выбрано'))

    await user.click(screen.getByRole('option', { name: 'Alpha' }))
    await waitFor(() => expect(live()).toHaveTextContent('Alpha снято'))
  })

  it('молчит, пока список закрыт', () => {
    render(<MultiSelect options={options} label="Буквы" />)

    expect(live()).toHaveTextContent('')
  })
})
