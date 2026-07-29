'use client'

import { Select } from 'nextjs-selector'
import type { SelectOption } from 'nextjs-selector/core'
import { useState } from 'react'

import { countries, frameworks, manyOptions } from './data'

export function BasicSelect() {
  return (
    <Select.Root<string> options={frameworks}>
      <Select.Label>Фреймворк</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
        <Select.ClearButton>×</Select.ClearButton>
        <span aria-hidden="true">▾</span>
      </Select.Trigger>
      <Select.Content>
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}

export function MultiWithSearch() {
  return (
    <Select.Root<string> options={countries} multiple>
      <Select.Label>Страны</Select.Label>
      <Select.Chips />
      <Select.Trigger>
        <Select.Value placeholder="Ничего не выбрано" />
        <span aria-hidden="true">▾</span>
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск страны" placeholder="Поиск…" />
        <Select.Empty>Ничего не найдено</Select.Empty>
        <Select.List />
      </Select.Content>
    </Select.Root>
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
    <Select.Root<string> options={[]} loadOptions={loadOptions}>
      <Select.Label>Поиск по источнику</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Начните вводить" />
        <span aria-hidden="true">▾</span>
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Запрос" placeholder="Введите «ошибка» для сбоя" />
        <Select.Loading>Загрузка…</Select.Loading>
        <Select.LoadError>Не удалось загрузить</Select.LoadError>
        <Select.Empty>Ничего не найдено</Select.Empty>
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}

export function CreatableSelect() {
  const [extra, setExtra] = useState<readonly SelectOption[]>([])
  const options = [...frameworks, ...extra]

  return (
    <Select.Root<string>
      options={options}
      multiple
      creatable
      onCreate={(label) => setExtra((prev) => [...prev, { value: label, label }])}
    >
      <Select.Label>Технологии, можно добавлять свои</Select.Label>
      <Select.Chips />
      <Select.Trigger>
        <Select.Value placeholder="Выберите или создайте" />
        <span aria-hidden="true">▾</span>
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск технологии" placeholder="Введите новое название…" />
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}

export function VirtualizedSelect() {
  return (
    <Select.Root<string> options={manyOptions}>
      <Select.Label>Десять тысяч опций</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Открыть список" />
        <span aria-hidden="true">▾</span>
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск позиции" placeholder="Поиск…" />
        <Select.Empty>Ничего не найдено</Select.Empty>
        {/* Явная высота обязательна: измерять нечего, пока у контейнера её нет. */}
        <Select.Virtualized itemHeight={34} style={{ height: '15rem' }} />
      </Select.Content>
    </Select.Root>
  )
}

export function StatesSelect() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Select.Root<string> options={frameworks} defaultValue={['next']} disabled>
        <Select.Label>disabled</Select.Label>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.List />
        </Select.Content>
      </Select.Root>

      <Select.Root<string> options={frameworks} defaultValue={['remix']} readOnly>
        <Select.Label>readOnly — открывается, но не меняется</Select.Label>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.List />
        </Select.Content>
      </Select.Root>

      <Select.Root<string> options={frameworks} required invalid>
        <Select.Label>required + invalid</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="Обязательное поле" />
        </Select.Trigger>
        <Select.Content>
          <Select.List />
        </Select.Content>
      </Select.Root>
    </div>
  )
}

/** The trigger is a div here — behaviour and ARIA come from asChild. */
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
