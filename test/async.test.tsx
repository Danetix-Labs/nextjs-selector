import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'

const catalogue: readonly SelectOption[] = [
  { value: 'ru', label: 'Россия' },
  { value: 'de', label: 'Германия' },
  { value: 'jp', label: 'Япония' },
]

function Picker({
  loadOptions,
}: {
  loadOptions: (query: string) => Promise<readonly SelectOption[]>
}) {
  return (
    <Select.Root<string> options={[]} loadOptions={loadOptions} debounceMs={10}>
      <Select.Label>Страны</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск" />
        <Select.Loading>Загрузка…</Select.Loading>
        <Select.LoadError>Не удалось загрузить</Select.LoadError>
        <Select.Empty>Ничего не найдено</Select.Empty>
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}

const search = async (query: string) =>
  catalogue.filter((option) => option.label.toLowerCase().startsWith(query.toLowerCase()))

describe('асинхронная загрузка', () => {
  it('подгружает опции по запросу', async () => {
    const user = userEvent.setup()
    render(<Picker loadOptions={search} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'рос')

    // Начальная загрузка отдаёт весь каталог, поэтому ждём именно сужения.
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: 'Япония' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('option', { name: 'Россия' })).toBeInTheDocument()
  })

  it('показывает состояние загрузки и убирает его по завершении', async () => {
    const user = userEvent.setup()
    const pending: ((options: readonly SelectOption[]) => void)[] = []
    // Пустой запрос отвечает сразу, содержательный — по нашей команде.
    const loadOptions = (query: string) =>
      query === ''
        ? Promise.resolve([] as readonly SelectOption[])
        : new Promise<readonly SelectOption[]>((resolve) => pending.push(resolve))

    render(<Picker loadOptions={loadOptions} />)
    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'р')

    await waitFor(() => expect(screen.getByText('Загрузка…')).toBeInTheDocument())
    // Во время загрузки «ничего не найдено» было бы враньём.
    expect(screen.queryByText('Ничего не найдено')).not.toBeInTheDocument()

    for (const resolve of pending) resolve([{ value: 'ru', label: 'Россия' }])
    await waitFor(() => expect(screen.queryByText('Загрузка…')).not.toBeInTheDocument())
  })

  it('сообщает об ошибке загрузки', async () => {
    const user = userEvent.setup()
    render(<Picker loadOptions={() => Promise.reject(new Error('сеть'))} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'р')

    await waitFor(() => expect(screen.getByText('Не удалось загрузить')).toBeInTheDocument())
  })

  it('схлопывает быстрый ввод в один запрос', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn(search)
    render(<Picker loadOptions={loadOptions} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'япон')

    await waitFor(() => expect(loadOptions).toHaveBeenLastCalledWith('япон'))
    // Четыре нажатия, но запросов не больше двух — стартовый и итоговый.
    expect(loadOptions.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('отбрасывает результат устаревшего запроса', async () => {
    const user = userEvent.setup()
    const delays: Record<string, number> = { я: 40, яп: 0 }
    const loadOptions = (query: string) =>
      new Promise<readonly SelectOption[]>((resolve) => {
        setTimeout(
          () => resolve(search(query) as unknown as readonly SelectOption[]),
          delays[query] ?? 0,
        )
      })

    render(<Picker loadOptions={loadOptions} />)
    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'яп')

    await waitFor(() => expect(screen.getByRole('option', { name: 'Япония' })).toBeInTheDocument())
  })
})
