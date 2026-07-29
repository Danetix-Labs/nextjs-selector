'use client'

import { Select } from 'nextjs-selector'
import type { SelectOption } from 'nextjs-selector/core'

const statuses: readonly SelectOption[] = [
  { value: 'all', label: 'All statuses', description: 'Ничего не скрывать' },
  { value: 'draft', label: 'Draft', description: 'Виден только вам' },
  { value: 'published', label: 'Published', description: 'Виден всем' },
  { value: 'archived', label: 'Archived', description: 'Скрыт из списков' },
]

const glyphs = ['🎧', '📈', '⚙️', '👥', '🧩', '📋', '⚖️', '💼', '📣', '🖼️', '🏢', '🔧']

const iconOptions: readonly SelectOption[] = glyphs.map((glyph, index) => ({
  value: `icon-${index}`,
  label: glyph,
}))

/** Icons beside each label, a tick on the selected one, a second line below. */
export function StatusSelect() {
  return (
    <Select.Root<string> options={statuses} defaultValue={['all']}>
      <Select.Label>Статус</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
        <span aria-hidden="true">▾</span>
      </Select.Trigger>
      <Select.Content>
        <Select.List>
          {(option, index) => (
            <Select.Item key={String(option.value)} option={option} index={index}>
              <span data-part="option-icon" aria-hidden="true">
                ◆
              </span>
              <span data-part="option-text">
                <span data-part="option-label">{option.label}</span>
                {option.description ? (
                  <span data-part="option-description">{option.description}</span>
                ) : null}
              </span>
              <Select.ItemIndicator option={option}>✓</Select.ItemIndicator>
            </Select.Item>
          )}
        </Select.List>
      </Select.Content>
    </Select.Root>
  )
}

/** A grid: the CSS is yours, the keyboard follows via `columns`. */
export function IconGrid() {
  return (
    <Select.Root<string> options={iconOptions} columns={6}>
      <Select.Label>Иконка</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите иконку" />
        <span aria-hidden="true">▾</span>
      </Select.Trigger>
      <Select.Content>
        <Select.List className="icon-grid" />
      </Select.Content>
    </Select.Root>
  )
}
