import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { memo } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  type SelectApi,
  type SelectOption,
  useLabelProps,
  useListboxProps,
  useOptionProps,
  useSearchProps,
  useSelect,
  useSelectedValues,
  useTriggerProps,
} from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

const Option = memo(function Option({
  api,
  index,
  option,
  onRender,
}: {
  api: SelectApi<string>
  index: number
  option: SelectOption
  onRender?: (value: string) => void
}) {
  const props = useOptionProps(api, { index, value: option.value, disabled: option.disabled })
  onRender?.(option.value)

  return <li {...props}>{option.label}</li>
})

function Harness({
  multiple = false,
  onRender,
  onValueChange,
}: {
  multiple?: boolean
  onRender?: (value: string) => void
  onValueChange?: (value: readonly string[]) => void
}) {
  const api = useSelect<string>({ options, multiple, onValueChange })
  const selected = useSelectedValues(api)

  return (
    <div>
      <label {...useLabelProps(api)}>Буква</label>
      <button type="button" {...useTriggerProps(api)}>
        {selected.join(',') || 'Выберите'}
      </button>
      <input {...useSearchProps(api)} aria-label="Поиск" />
      <ul {...useListboxProps(api)}>
        {api.getVisibleOptions().map((option, index) => (
          <Option key={option.value} api={api} index={index} option={option} onRender={onRender} />
        ))}
      </ul>
    </div>
  )
}

describe('useSelect', () => {
  it('выставляет ARIA-связи комбобокса', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)
    expect(trigger).toHaveAccessibleName('Буква')
  })

  it('открывается с клавиатуры и ведёт aria-activedescendant', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('combobox')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByText('Alpha').id)

    await user.keyboard('{ArrowDown}')
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByText('Beta').id)

    await user.keyboard('{End}')
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByText('Gamma').id)
  })

  it('проставляет data-атрибуты состояния для стилизации', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('combobox')).toHaveAttribute('data-state', 'open')
    expect(screen.getByText('Alpha')).toHaveAttribute('data-highlighted', '')

    await user.keyboard('{Enter}')
    expect(screen.getByText('Alpha')).toHaveAttribute('data-selected', '')
    expect(screen.getByText('Beta')).not.toHaveAttribute('data-selected')
  })

  it('в множественном режиме накапливает значения', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Harness multiple onValueChange={onValueChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{Enter}{ArrowDown}{Enter}')

    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b'])
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
  })

  it('фильтрует опции по запросу', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Поиск'), 'gam')

    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('перемещение подсветки перерисовывает только две опции', async () => {
    const user = userEvent.setup()
    const onRender = vi.fn()
    render(<Harness onRender={onRender} />)

    await user.click(screen.getByRole('combobox'))
    onRender.mockClear()

    await user.keyboard('{ArrowDown}')

    // Только та, что теряет подсветку, и та, что её получает.
    const rendered = onRender.mock.calls.map(([value]) => value)
    expect(rendered.sort()).toEqual(['a', 'b'])
  })
})
