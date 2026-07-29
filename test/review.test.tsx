import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { initialState, reduce } from '../src/core/reducer.js'
import { scrollOffsetFor, toOffsets, variableScrollOffsetFor } from '../src/core/virtual.js'
import { MultiSelect, Select, type SelectContext, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

const ctx: SelectContext<string> = { options, multiple: true }

describe('readOnly должен запрещать любое изменение выбора', () => {
  it('не даёт выбрать всё', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Select.Root<string> options={options} multiple readOnly onValueChange={onValueChange}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="—" />
        </Select.Trigger>
        <Select.SelectAllButton>Выбрать всё</Select.SelectAllButton>
      </Select.Root>,
    )

    await user.click(screen.getByRole('button', { name: 'Выбрать всё' }))

    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveTextContent('—')
  })

  it('не даёт переставить чипы', async () => {
    const user = userEvent.setup()
    render(
      <Select.Root<string> options={options} multiple readOnly defaultValue={['a', 'b', 'c']}>
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

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta, Gamma')
  })

  it('не даёт вернуть удалённое', async () => {
    const user = userEvent.setup()
    // Удаление уже произошло до перевода в readOnly — предложение отмены
    // видно, но сработать не должно.
    const { rerender } = render(
      <Select.Root<string> options={options} multiple defaultValue={['a', 'b']}>
        <Select.Label>Буквы</Select.Label>
        <Select.Chips />
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.UndoRemove>Вернуть</Select.UndoRemove>
      </Select.Root>,
    )

    await user.click(screen.getByRole('button', { name: 'Убрать Alpha' }))

    rerender(
      <Select.Root<string> options={options} multiple defaultValue={['a', 'b']} readOnly>
        <Select.Label>Буквы</Select.Label>
        <Select.Chips />
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.UndoRemove>Вернуть</Select.UndoRemove>
      </Select.Root>,
    )

    await user.click(screen.getByRole('button', { name: 'Вернуть' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('Beta')
  })
})

describe('кеш не должен ломать пагинацию', () => {
  it('после повторного запроса страницы продолжают догружаться', async () => {
    const user = userEvent.setup()
    const load = vi.fn(async (query: string, cursor?: unknown) => {
      const start = typeof cursor === 'number' ? cursor : 0
      return {
        options: [{ value: `${query}-${start}`, label: `${query} страница ${start}` }],
        nextCursor: start < 2 ? start + 1 : undefined,
      }
    })

    render(
      <Select.Root<string> options={[]} loadOptions={load} debounceMs={5} cache>
        <Select.Label>Строки</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="—" />
        </Select.Trigger>
        <Select.Content>
          <Select.Search aria-label="Поиск" />
          <Select.List />
          <Select.LoadMore>Ещё</Select.LoadMore>
        </Select.Content>
      </Select.Root>,
    )

    const search = screen.getByLabelText('Поиск')
    await user.click(screen.getByRole('combobox'))
    await user.type(search, 'x')
    await waitFor(() => expect(screen.getByText('Ещё')).toBeInTheDocument())

    // Уходим на другой запрос и возвращаемся — ответ придёт из кеша.
    await user.clear(search)
    await user.type(search, 'y')
    await waitFor(() => expect(load).toHaveBeenCalledWith('y'))

    await user.clear(search)
    await user.type(search, 'x')

    // Ответ придёт из кеша; вместе с ним должен вернуться и курсор, иначе
    // кешированная страница выглядит последней и догрузка обрывается.
    await waitFor(() => expect(screen.getByText('Ещё')).toBeInTheDocument())
  })
})

describe('автоскролл при разной высоте строк', () => {
  it('считает смещение по накопленным высотам, а не по оценке', () => {
    const heights = new Map([
      [0, 20],
      [1, 200],
      [2, 20],
    ])
    const offsets = toOffsets(3, heights, 40)

    // Третья строка начинается на 220, а не на 80, как решила бы оценка.
    expect(offsets[2]).toBe(220)

    // Оценка промахивается: она считает, что строка начинается на 80.
    expect(scrollOffsetFor(2, 40, 100, 0)).toBe(20)
    // По накопленным высотам — верное смещение.
    expect(variableScrollOffsetFor(offsets, 2, 100, 0)).toBe(140)
  })
})
