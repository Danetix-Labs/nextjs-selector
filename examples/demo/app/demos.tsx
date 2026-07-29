'use client'

import { MultiSelect, Select } from 'nextjs-selector'
import type { SelectOption } from 'nextjs-selector/core'
import { useState } from 'react'

import { countries, frameworks, manyOptions } from './data'

export function BasicSelect() {
  return <Select options={frameworks} label="Фреймворк" placeholder="Выберите" clearable />
}

export function MultiWithSearch() {
  return (
    <MultiSelect
      options={countries}
      label="Страны"
      placeholder="Ничего не выбрано"
      searchable
      searchPlaceholder="Поиск…"
    />
  )
}

/** Options are fetched, so filtering happens at the source, not locally. */
export function AsyncSelect() {
  const loadOptions = async (query: string): Promise<readonly SelectOption[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    if (query === 'ошибка') throw new Error('Демонстрация ошибки')

    return countries.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
  }

  return (
    <Select
      options={[]}
      loadOptions={loadOptions}
      label="Поиск по источнику"
      placeholder="Начните вводить"
      searchPlaceholder="Введите «ошибка» для сбоя"
    />
  )
}

export function CreatableSelect() {
  const [extra, setExtra] = useState<readonly SelectOption[]>([])

  return (
    <MultiSelect
      options={[...frameworks, ...extra]}
      label="Технологии, можно добавлять свои"
      placeholder="Выберите или создайте"
      searchable
      searchPlaceholder="Введите новое название…"
      creatable
      onCreate={(label) => setExtra((prev) => [...prev, { value: label, label }])}
    />
  )
}

export function VirtualizedSelect() {
  return (
    <Select
      options={manyOptions}
      label="Десять тысяч опций"
      placeholder="Открыть список"
      searchable
      itemHeight={34}
    />
  )
}

export function StatesSelect() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Select options={frameworks} label="disabled" defaultValue={['next']} disabled />
      <Select
        options={frameworks}
        label="readOnly — открывается, но не меняется"
        defaultValue={['remix']}
        readOnly
      />
      <Select
        options={frameworks}
        label="required + invalid"
        placeholder="Обязательное поле"
        required
        invalid
      />
    </div>
  )
}

/**
 * The parts are still there when the layout has to differ — here the trigger
 * is a plain div, wired through asChild.
 */
export function AsChildSelect() {
  return (
    <Select.Root<string> options={frameworks}>
      <Select.Label>Свой элемент триггера</Select.Label>
      <Select.Trigger asChild>
        <div className="ghost-trigger" data-part="trigger" tabIndex={0}>
          <Select.Value placeholder="Это div, а не button" />
        </div>
      </Select.Trigger>
      <Select.Content>
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}
