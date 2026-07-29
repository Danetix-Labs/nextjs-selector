'use client'

import { selectParts } from './components.js'
import { SelectField, type SelectFieldProps } from './field.js'

/**
 * The public entry point, in both shapes.
 *
 * Call it for the common case — one element, everything wired:
 *
 *   <Select options={options} label="Страны" multiple searchable />
 *
 * Reach for the parts when the layout has to differ:
 *
 *   <Select.Root>…<Select.Trigger/>…</Select.Root>
 */
export const Select = Object.assign(SelectField, selectParts) as typeof SelectField &
  typeof selectParts

export type { SelectFieldProps }
