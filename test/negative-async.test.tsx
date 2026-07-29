import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MultiSelect, Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

const consoleError = vi.spyOn(console, 'error')
afterEach(() => consoleError.mockClear())

function Async({ loadOptions }: { loadOptions: (q: string, c?: unknown) => Promise<never> }) {
  return (
    <Select.Root<string> options={[]} loadOptions={loadOptions as never} debounceMs={5}>
      <Select.Label>Строки</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="—" />
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск" />
        <Select.LoadError>Ошибка</Select.LoadError>
        <Select.Empty>Пусто</Select.Empty>
        <Select.List />
        <Select.LoadMore>Ещё</Select.LoadMore>
      </Select.Content>
    </Select.Root>
  )
}

describe('асинхронный источник: неправильные ответы', () => {
  it('ответ null объявляется ошибкой, а не тонет молча', async () => {
    render(<Async loadOptions={(async () => null) as never} />)

    // Раньше это был необработанный TypeError: виджет пустовал без объяснений.
    await waitFor(() => expect(screen.getByText('Ошибка')).toBeInTheDocument())
  })

  it('ответ без поля options тоже считается ошибкой', async () => {
    render(<Async loadOptions={(async () => ({ nextCursor: 1 })) as never} />)

    await waitFor(() => expect(screen.getByText('Ошибка')).toBeInTheDocument())
  })

  it('строка вместо списка не проходит за корректный ответ', async () => {
    render(<Async loadOptions={(async () => 'опции') as never} />)

    await waitFor(() => expect(screen.getByText('Ошибка')).toBeInTheDocument())
  })

  it('сбой посреди пагинации не оставляет вечную догрузку', async () => {
    const user = userEvent.setup()
    let call = 0
    const load = vi.fn(async () => {
      call += 1
      if (call > 1) throw new Error('сеть отпала')
      return { options: [{ value: 'a', label: 'Alpha' }], nextCursor: 1 }
    })

    render(<Async loadOptions={load as never} />)
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Ещё')).toBeInTheDocument())

    await user.click(screen.getByText('Ещё'))

    // Ошибка объявлена, и повторный клик по-прежнему возможен — не тупик.
    await waitFor(() => expect(screen.getByText('Ошибка')).toBeInTheDocument())
    expect(screen.getByText('Ещё')).toBeInTheDocument()
  })

  it('ответ, пришедший после размонтирования, не пишет в состояние', async () => {
    let release: (value: readonly SelectOption[]) => void = () => {}
    const load = () => new Promise<readonly SelectOption[]>((resolve) => (release = resolve))

    const { unmount } = render(<Async loadOptions={load as never} />)
    await new Promise((resolve) => setTimeout(resolve, 20))
    unmount()

    release(options)
    await new Promise((resolve) => setTimeout(resolve, 20))

    // React ругается в консоль, если обновить состояние снятого компонента.
    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('формы: недобрые значения', () => {
  const submit = (data: FormData) => data.getAll('field').map(String)

  function Form({
    values,
    onSubmit,
  }: {
    values: readonly SelectOption[]
    onSubmit: (v: string[]) => void
  }) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(submit(new FormData(event.currentTarget)))
        }}
      >
        <MultiSelect
          options={values}
          label="Поле"
          name="field"
          defaultValue={values.map((v) => v.value)}
        />
        <button type="submit">Отправить</button>
      </form>
    )
  }

  it('переносы строк и кавычки доходят до сервера неискажёнными', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const tricky: readonly SelectOption[] = [
      { value: 'строка\nвторая', label: 'С переносом' },
      { value: 'с "кавычками" и <тегами>', label: 'С кавычками' },
    ]

    render(<Form values={tricky} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(onSubmit).toHaveBeenCalledWith(['строка\nвторая', 'с "кавычками" и <тегами>'])
  })

  it('пустая строка как значение не теряется', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<Form values={[{ value: '', label: 'Пусто' }]} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(onSubmit).toHaveBeenCalledWith([''])
  })
})
