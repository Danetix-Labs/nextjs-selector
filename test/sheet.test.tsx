import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

/** jsdom has no matchMedia; give it one that answers a fixed verdict. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => media),
  })

  return media
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
})

const mode = () => document.querySelector('[data-part="content"]')?.getAttribute('data-mode')

describe('нижняя шторка', () => {
  it('выключена по умолчанию — даже на узком экране', () => {
    stubMatchMedia(true)
    render(<Select options={options} label="Буквы" />)

    expect(mode()).toBe('dropdown')
  })

  it('включается опцией, когда медиазапрос совпал', () => {
    stubMatchMedia(true)
    render(<Select options={options} label="Буквы" sheet />)

    expect(mode()).toBe('sheet')
  })

  it('на широком экране остаётся выпадающим списком', () => {
    stubMatchMedia(false)
    render(<Select options={options} label="Буквы" sheet />)

    expect(mode()).toBe('dropdown')
  })

  it('принимает свой медиазапрос', () => {
    stubMatchMedia(true)
    render(<Select options={options} label="Буквы" sheet sheetMedia="(max-width: 400px)" />)

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 400px)')
  })

  it('в режиме шторки сторона не вычисляется — её задаёт вьюпорт', () => {
    stubMatchMedia(true)
    render(<Select options={options} label="Буквы" sheet />)

    expect(document.querySelector('[data-part="content"]')).not.toHaveAttribute('data-side')
  })

  it('поведение и разметка не меняются: выбор работает так же', async () => {
    stubMatchMedia(true)
    const user = userEvent.setup()
    render(<Select options={options} label="Буквы" sheet />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Beta' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('Beta')
  })

  it('без matchMedia в окружении не падает', () => {
    render(<Select options={options} label="Буквы" sheet />)

    expect(mode()).toBe('dropdown')
  })
})
