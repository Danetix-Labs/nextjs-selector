import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'
import { violations } from './a11y.js'

const options: readonly SelectOption[] = Array.from({ length: 5_000 }, (_, i) => ({
  value: `v${i}`,
  label: `Опция ${i}`,
}))

function stubViewport() {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 320 })
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
})

function Picker() {
  return (
    <Select.Root<string> options={options}>
      <Select.Label>Опции</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
      </Select.Trigger>
      <Select.Content>
        <Select.Virtualized itemHeight={32} />
      </Select.Content>
    </Select.Root>
  )
}

describe('Select.Virtualized', () => {
  it('рендерит только окно из пяти тысяч опций', async () => {
    stubViewport()
    const user = userEvent.setup()
    const { container } = render(<Picker />)

    await user.click(screen.getByRole('combobox'))

    const rendered = container.querySelectorAll('[data-part="option"]')
    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.length).toBeLessThan(25)
  })

  it('прокрутка сдвигает окно', async () => {
    stubViewport()
    const user = userEvent.setup()
    const { container } = render(<Picker />)
    await user.click(screen.getByRole('combobox'))

    const listbox = screen.getByRole('listbox')
    listbox.scrollTop = 3200
    fireEvent.scroll(listbox)

    const rendered = container.querySelectorAll('[data-part="option"]')
    expect(rendered[0]?.textContent).toBe('Опция 96')
    expect(rendered.length).toBeLessThan(25)
  })

  it('выбор работает по сквозному индексу', async () => {
    stubViewport()
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Опция 3' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('Опция 3')
  })

  it('распорки не попадают в дерево доступности', async () => {
    stubViewport()
    const user = userEvent.setup()
    const { container } = render(<Picker />)

    await user.click(screen.getByRole('combobox'))

    expect(await violations(container)).toEqual([])
  })
})
