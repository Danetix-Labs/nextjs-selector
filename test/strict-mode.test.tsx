import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MultiSelect, Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

/**
 * Strict Mode mounts, unmounts and remounts every effect.
 *
 * Anything set up there — store subscriptions, observers, debounce timers,
 * outside-click listeners — has to survive being torn down and rebuilt, and
 * must not fire twice for one user action.
 */
const strict = (ui: React.ReactElement) => render(<StrictMode>{ui}</StrictMode>)

const consoleError = vi.spyOn(console, 'error')
const consoleWarn = vi.spyOn(console, 'warn')

afterEach(() => {
  consoleError.mockClear()
  consoleWarn.mockClear()
})

describe('строгий режим', () => {
  it('монтируется без предупреждений React', () => {
    strict(<MultiSelect options={options} label="Буквы" searchable />)

    expect(consoleError).not.toHaveBeenCalled()
    expect(consoleWarn).not.toHaveBeenCalled()
  })

  it('выбор срабатывает один раз, а не дважды', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    strict(<MultiSelect options={options} label="Буквы" onValueChange={onValueChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Alpha' }))

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith(['a'])
  })

  it('подписки переживают повторное монтирование эффектов', async () => {
    const user = userEvent.setup()
    strict(<MultiSelect options={options} label="Буквы" searchable />)

    // Если бы подписка на store отвалилась при размонтировании, список бы
    // не отреагировал на ввод.
    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('Поиск'), 'gam')

    await waitFor(() => expect(screen.queryByRole('option', { name: 'Alpha' })).toBeNull())
    expect(screen.getByRole('option', { name: 'Gamma' })).toBeInTheDocument()
  })

  it('асинхронный источник опрашивается один раз на запрос', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn(async () => options)
    strict(<Select options={[]} label="Буквы" loadOptions={loadOptions} debounceMs={5} />)

    await waitFor(() => expect(loadOptions).toHaveBeenCalled())
    await user.click(screen.getByRole('combobox'))

    // Двойной прогон эффекта не должен удваивать запросы: таймер снимается
    // в cleanup.
    expect(loadOptions.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('закрытие по клику вне работает после перемонтирования', async () => {
    const user = userEvent.setup()
    strict(
      <div>
        <button type="button">снаружи</button>
        <Select options={options} label="Буквы" />
      </div>,
    )

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'снаружи' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('отмена удаления не срабатывает дважды', async () => {
    const user = userEvent.setup()
    strict(
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
    await user.click(screen.getByRole('button', { name: 'Вернуть' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta')
  })
})
