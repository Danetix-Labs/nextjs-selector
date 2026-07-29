import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type SelectOption,
  supportsPopover,
  useAnchorStyle,
  usePopoverProps,
  useSelect,
  useTriggerProps,
} from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

function Harness() {
  const api = useSelect({ options })

  return (
    <div>
      <button type="button" {...useTriggerProps(api)} style={useAnchorStyle(api)}>
        Открыть
      </button>
      <ul {...usePopoverProps(api, { topLayer: true })} />
    </div>
  )
}

function Plain() {
  const api = useSelect({ options })

  return (
    <div>
      <button type="button" {...useTriggerProps(api)}>
        Открыть
      </button>
      <ul {...usePopoverProps(api)} />
    </div>
  )
}

function stubPopoverApi() {
  const show = vi.fn()
  const hide = vi.fn()
  Object.assign(HTMLElement.prototype, { showPopover: show, hidePopover: hide })
  // The top layer is only used when placement is available too.
  Object.assign(globalThis, { CSS: { supports: () => true } })

  return { show, hide }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'CSS')
  for (const key of ['showPopover', 'hidePopover'] as const) {
    // biome-ignore lint/performance/noDelete: restoring the prototype needs a real delete
    delete (HTMLElement.prototype as Partial<HTMLElement>)[key]
  }
})

describe('popover layer', () => {
  it('по умолчанию верхний слой не используется', () => {
    render(<Plain />)

    const content = document.querySelector('[data-part="content"]') as HTMLElement
    expect(content).not.toHaveAttribute('popover')
  })

  it('в среде без Popover API работает как обычная разметка', () => {
    expect(supportsPopover()).toBe(false)

    render(<Harness />)

    const content = document.querySelector('[data-part="content"]') as HTMLElement
    expect(content).not.toHaveAttribute('popover')
    expect(content).toHaveAttribute('data-state', 'closed')
  })

  it('связывает listbox с триггером через CSS anchor', () => {
    render(<Harness />)

    const anchorName = screen.getByRole('combobox').style.getPropertyValue('anchor-name')
    expect(anchorName).toMatch(/^--anchor-/)
    const content = document.querySelector('[data-part="content"]') as HTMLElement
    expect(content.style.getPropertyValue('position-anchor')).toBe(anchorName)
  })

  it('где Popover API есть — открывает и закрывает через него', async () => {
    const { show, hide } = stubPopoverApi()
    const user = userEvent.setup()
    const { container } = render(<Harness />)

    // С атрибутом popover элемент скрыт UA-стилем, поэтому ARIA-запрос его не видит.
    expect(container.querySelector('[data-part="content"]')).toHaveAttribute('popover', 'auto')

    await user.click(screen.getByRole('combobox'))
    expect(show).toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(hide).toHaveBeenCalled()
  })

  it('light dismiss браузера закрывает состояние в сторе', async () => {
    stubPopoverApi()
    const user = userEvent.setup()
    const { container } = render(<Harness />)

    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')

    const listbox = container.querySelector('[data-part="content"]') as HTMLElement
    const toggle = new Event('toggle')
    Object.assign(toggle, { newState: 'closed' })
    act(() => {
      listbox.dispatchEvent(toggle)
    })

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
  })
})
