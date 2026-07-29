import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Select, type SelectOption } from '../src/index.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

/** Parent owns the value and refuses to change it. */
function Frozen({
  value,
  onValueChange,
}: {
  value: readonly string[]
  onValueChange: (next: readonly string[]) => void
}) {
  return (
    <Select.Root<string> options={options} multiple value={value} onValueChange={onValueChange}>
      <Select.Label>Буквы</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Пусто" />
      </Select.Trigger>
      <Select.List />
    </Select.Root>
  )
}

/** Parent owns the value and accepts every change. */
function Live({ initial }: { initial: readonly string[] }) {
  const [value, setValue] = useState(initial)

  return (
    <>
      <Select.Root<string> options={options} multiple value={value} onValueChange={setValue}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="Пусто" />
        </Select.Trigger>
        <Select.List />
      </Select.Root>
      <button type="button" onClick={() => setValue(['b'])}>
        Задать извне
      </button>
    </>
  )
}

describe('контролируемый режим', () => {
  it('сообщает о намерении, но не меняет значение сам', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Frozen value={['a']} onValueChange={onValueChange} />)

    await user.click(screen.getByText('Beta'))

    expect(onValueChange).toHaveBeenCalledWith(['a', 'b'])
    // Родитель значение не обновил — виджет обязан остаться при своём.
    // Сравнение точное: toHaveTextContent прошло бы и на 'Alpha, Beta'.
    expect(screen.getByRole('combobox').textContent).toBe('Alpha')
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'false')
  })

  it('подхватывает значение, когда родитель его принимает', async () => {
    const user = userEvent.setup()
    render(<Live initial={['a']} />)

    await user.click(screen.getByText('Beta'))

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta')
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
  })

  it('реагирует на изменение значения извне', async () => {
    const user = userEvent.setup()
    render(<Live initial={['a']} />)

    await user.click(screen.getByText('Задать извне'))

    expect(screen.getByRole('combobox')).toHaveTextContent('Beta')
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false')
  })

  it('снятие значения тоже проходит через родителя', async () => {
    const user = userEvent.setup()
    render(<Live initial={['a', 'b']} />)

    await user.click(screen.getByText('Alpha'))

    expect(screen.getByRole('combobox')).toHaveTextContent('Beta')
  })

  it('неконтролируемый режим ведёт значение сам', async () => {
    const user = userEvent.setup()
    render(
      <Select.Root<string> options={options} multiple defaultValue={['a']}>
        <Select.Label>Буквы</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="Пусто" />
        </Select.Trigger>
        <Select.List />
      </Select.Root>,
    )

    await user.click(screen.getByText('Beta'))

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha, Beta')
  })
})
