import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  type SelectApi,
  type SelectOption,
  useFormFields,
  useOptionProps,
  useSelect,
  useTriggerProps,
} from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

function Row({
  api,
  index,
  option,
}: {
  api: SelectApi<string>
  index: number
  option: SelectOption
}) {
  return <li {...useOptionProps(api, { index, value: option.value })}>{option.label}</li>
}

function Form({
  multiple = false,
  onSubmit,
}: {
  multiple?: boolean
  onSubmit: (data: FormData) => void
}) {
  const api = useSelect({ options, multiple })
  const fields = useFormFields(api, { name: 'letters' })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(new FormData(event.currentTarget))
      }}
    >
      <button type="button" {...useTriggerProps(api)}>
        Выбрать
      </button>
      <ul>
        {options.map((option, index) => (
          <Row key={option.value} api={api} index={index} option={option} />
        ))}
      </ul>
      {fields.map(({ key, ...props }) => (
        <input key={key} {...props} />
      ))}
      <button type="submit">Отправить</button>
    </form>
  )
}

describe('интеграция с формой', () => {
  it('одиночный выбор попадает в FormData', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Form onSubmit={onSubmit} />)

    await user.click(screen.getByText('Beta'))
    await user.click(screen.getByText('Отправить'))

    expect(onSubmit.mock.calls[0]?.[0].get('letters')).toBe('b')
  })

  it('без выбора одиночное поле присутствует и пусто', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Form onSubmit={onSubmit} />)

    await user.click(screen.getByText('Отправить'))

    expect(onSubmit.mock.calls[0]?.[0].get('letters')).toBe('')
  })

  it('множественный выбор отправляет по значению на каждый выбор', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Form multiple onSubmit={onSubmit} />)

    await user.click(screen.getByText('Alpha'))
    await user.click(screen.getByText('Beta'))
    await user.click(screen.getByText('Отправить'))

    expect(onSubmit.mock.calls[0]?.[0].getAll('letters')).toEqual(['a', 'b'])
  })

  it('в множественном режиме без выбора поле отсутствует', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Form multiple onSubmit={onSubmit} />)

    await user.click(screen.getByText('Отправить'))

    expect(onSubmit.mock.calls[0]?.[0].getAll('letters')).toEqual([])
  })
})
