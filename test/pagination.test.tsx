import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'

const PAGE = 3
const total = 8

/** Paginated source: hands back a cursor until the last page. */
function page(cursor?: unknown) {
  const start = typeof cursor === 'number' ? cursor : 0
  const options: SelectOption[] = Array.from({ length: Math.min(PAGE, total - start) }, (_, i) => ({
    value: `v${start + i}`,
    label: `Строка ${start + i}`,
  }))
  const next = start + PAGE

  return { options, nextCursor: next < total ? next : undefined }
}

function Picker({ loadOptions }: { loadOptions: (q: string, c?: unknown) => Promise<unknown> }) {
  return (
    <Select.Root<string> options={[]} debounceMs={5} loadOptions={loadOptions as never}>
      <Select.Label>Строки</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск" />
        <Select.List />
        <Select.LoadMore>Ещё</Select.LoadMore>
      </Select.Content>
    </Select.Root>
  )
}

describe('подгрузка страницами', () => {
  it('сначала показывает только первую страницу', async () => {
    render(<Picker loadOptions={async (_q, c) => page(c)} />)

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(PAGE))
    expect(screen.getByText('Ещё')).toBeInTheDocument()
  })

  it('дописывает следующую страницу к уже показанным', async () => {
    const user = userEvent.setup()
    render(<Picker loadOptions={async (_q, c) => page(c)} />)

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(PAGE))
    await user.click(screen.getByText('Ещё'))

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(PAGE * 2))
    // Первая страница на месте — страницы накапливаются, а не подменяются.
    expect(screen.getByRole('option', { name: 'Строка 0' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Строка 5' })).toBeInTheDocument()
  })

  it('на последней странице кнопка исчезает', async () => {
    const user = userEvent.setup()
    render(<Picker loadOptions={async (_q, c) => page(c)} />)

    await waitFor(() => expect(screen.getByText('Ещё')).toBeInTheDocument())
    await user.click(screen.getByText('Ещё'))
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(PAGE * 2))
    await user.click(screen.getByText('Ещё'))

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(total))
    expect(screen.queryByText('Ещё')).not.toBeInTheDocument()
  })

  it('источник без курсора считается непагинированным', async () => {
    render(<Picker loadOptions={async () => [{ value: 'a', label: 'Alpha' }]} />)

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.queryByText('Ещё')).not.toBeInTheDocument()
  })

  it('новый запрос начинает пагинацию заново', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn(async (_q: string, c?: unknown) => page(c))
    render(<Picker loadOptions={loadOptions} />)

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(PAGE))
    await user.click(screen.getByText('Ещё'))
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(PAGE * 2))

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'а')

    // Ответ на запрос заменяет накопленное, а не дописывается к нему.
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(PAGE))
  })
})
