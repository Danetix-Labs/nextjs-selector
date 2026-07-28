import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import {
  type SelectApi,
  type SelectOption,
  useOptionProps,
  useSelect,
  useTriggerProps,
  useVirtual,
} from '../src/index.js'

const VIEWPORT = 320
const ITEM = 32

const options: readonly SelectOption[] = Array.from({ length: 10_000 }, (_, i) => ({
  value: `v${i}`,
  label: `Option ${i}`,
}))

// jsdom reports every box as zero-sized; the hook needs a measurable viewport.
function stubViewport() {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: VIEWPORT,
  })
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
})

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

function Harness() {
  const api = useSelect({ options })
  const visible = api.getVisibleOptions()
  const virtual = useVirtual(api, { count: visible.length, itemHeight: ITEM })

  return (
    <div>
      <button type="button" {...useTriggerProps(api)}>
        Открыть
      </button>
      <ul {...virtual.scrollProps} data-part="listbox">
        <li style={virtual.topSpacerStyle} data-part="spacer" />
        {visible.slice(virtual.window.start, virtual.window.end).map((option, offset) => (
          <Row key={option.value} api={api} index={virtual.window.start + offset} option={option} />
        ))}
        <li style={virtual.bottomSpacerStyle} data-part="spacer" />
      </ul>
    </div>
  )
}

describe('виртуализация в DOM', () => {
  it('из 10 000 опций в DOM попадает лишь окно', async () => {
    stubViewport()
    const user = userEvent.setup()
    const { container } = render(<Harness />)

    await user.click(screen.getByRole('combobox'))

    const rendered = container.querySelectorAll('[data-part="option"]')
    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.length).toBeLessThan(25)
  })

  it('прокрутка сдвигает окно, не увеличивая его', async () => {
    stubViewport()
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('combobox'))

    const listbox = container.querySelector('[data-part="listbox"]') as HTMLElement

    listbox.scrollTop = 3200
    fireEvent.scroll(listbox)

    const after = container.querySelectorAll('[data-part="option"]')
    // У начала списка overscan сверху обрезан, в середине — полный,
    // поэтому окно не обязано совпадать по размеру, но обязано остаться малым.
    expect(after.length).toBeLessThan(25)
    expect(after[0]?.textContent).toBe('Option 96')
  })
})
