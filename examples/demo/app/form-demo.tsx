'use client'

import { Select } from 'nextjs-selector'
import { useActionState } from 'react'

import { submitStack } from './actions'
import { frameworks } from './data'

export function FormDemo() {
  const [result, action, pending] = useActionState(submitStack, null)

  return (
    <form action={action}>
      <Select.Root<string> options={frameworks} multiple name="stack">
        <Select.Label>Стек</Select.Label>
        <Select.Chips />
        <Select.Trigger>
          <Select.Value placeholder="Выберите" />
          <span aria-hidden="true">▾</span>
        </Select.Trigger>
        <Select.Content>
          <Select.List />
        </Select.Content>
      </Select.Root>

      <button type="submit" disabled={pending}>
        {pending ? 'Отправка…' : 'Отправить на сервер'}
      </button>

      <output>
        {result
          ? `Сервер получил: ${result.picked.length > 0 ? result.picked.join(', ') : 'ничего'}`
          : 'Значение уйдёт в Server Action через FormData'}
      </output>
    </form>
  )
}
