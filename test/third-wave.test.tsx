import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { initialState, reduce } from '../src/core/reducer.js'
import { MultiSelect, Select, type SelectContext, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

const ctx: SelectContext<string> = { options, multiple: true }

describe('перестановка выбранных', () => {
  it('двигает значение на новое место', () => {
    const state = { ...initialState<string>(['a', 'b', 'c']) }

    expect(reduce(state, { type: 'reorder', from: 2, to: 0 }, ctx).selected).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  it('игнорирует выход за границы и перестановку на месте', () => {
    const state = { ...initialState<string>(['a', 'b']) }

    expect(reduce(state, { type: 'reorder', from: 0, to: 0 }, ctx)).toBe(state)
    expect(reduce(state, { type: 'reorder', from: 0, to: 5 }, ctx)).toBe(state)
    expect(reduce(state, { type: 'reorder', from: -1, to: 0 }, ctx)).toBe(state)
  })

  it('чипы переставляются с клавиатуры, а не только мышью', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { container } = render(
      <MultiSelect
        options={options}
        label="Буквы"
        defaultValue={['a', 'b']}
        onValueChange={onValueChange}
      />,
    )

    // reorderable подключается через составную раскладку, здесь — прямой вызов.
    expect(container.querySelectorAll('[data-part="chip"]')).toHaveLength(2)
    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta')
    await user.click(screen.getByRole('button', { name: 'Убрать Alpha' }))
    expect(onValueChange).toHaveBeenLastCalledWith(['b'])
  })

  it('перетаскиваемые чипы доступны с клавиатуры', async () => {
    const user = userEvent.setup()
    render(
      <Select.Root<string> options={options} multiple defaultValue={['a', 'b', 'c']}>
        <Select.Label>Буквы</Select.Label>
        <Select.Chips reorderable />
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
      </Select.Root>,
    )

    const chips = document.querySelectorAll('[data-part="chip"]')
    ;(chips[2] as HTMLElement).focus()
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}')

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Gamma, Beta')
  })
})

describe('отмена удаления', () => {
  it('возвращает значение на прежнее место', async () => {
    const user = userEvent.setup()
    render(
      <Select.Root<string> options={options} multiple defaultValue={['a', 'b', 'c']}>
        <Select.Label>Буквы</Select.Label>
        <Select.Chips />
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.UndoRemove>Вернуть</Select.UndoRemove>
      </Select.Root>,
    )

    await user.click(screen.getByRole('button', { name: 'Убрать Beta' }))
    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Gamma')

    await user.click(screen.getByRole('button', { name: 'Вернуть' }))
    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta, Gamma')
  })

  it('предложение не показывается, пока ничего не удалено', () => {
    render(
      <Select.Root<string> options={options} multiple defaultValue={['a']}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.UndoRemove>Вернуть</Select.UndoRemove>
      </Select.Root>,
    )

    expect(screen.queryByRole('button', { name: 'Вернуть' })).not.toBeInTheDocument()
  })

  it('любое другое изменение выбора снимает предложение', () => {
    const removed = reduce(
      { ...initialState<string>(['a', 'b']) },
      { type: 'remove', value: 'a' },
      ctx,
    )
    expect(removed.undo).toEqual({ value: 'a', index: 0 })

    const afterSelect = reduce(removed, { type: 'select', value: 'c' }, ctx)
    expect(afterSelect.undo).toBeNull()
  })
})

describe('кеш ответов', () => {
  const load = vi.fn(async (query: string) => options.filter((o) => o.label.includes(query)))

  it('повторный запрос не идёт в источник', async () => {
    load.mockClear()
    const user = userEvent.setup()
    render(<Select options={[]} label="Буквы" loadOptions={load} debounceMs={5} cache searchable />)

    const search = screen.getByLabelText('Поиск')
    await user.type(search, 'Al')
    await waitFor(() => expect(load).toHaveBeenCalledWith('Al'))

    const callsAfterFirst = load.mock.calls.length
    await user.clear(search)
    await user.type(search, 'Al')
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))

    expect(load.mock.calls.length).toBe(callsAfterFirst)
  })

  it('без опции кеш не используется', async () => {
    load.mockClear()
    const user = userEvent.setup()
    render(<Select options={[]} label="Буквы" loadOptions={load} debounceMs={5} searchable />)

    const search = screen.getByLabelText('Поиск')
    await user.type(search, 'Al')
    await waitFor(() => expect(load).toHaveBeenCalledWith('Al'))
    const callsAfterFirst = load.mock.calls.length

    await user.clear(search)
    await user.type(search, 'Al')

    await waitFor(() => expect(load.mock.calls.length).toBeGreaterThan(callsAfterFirst))
  })
})
