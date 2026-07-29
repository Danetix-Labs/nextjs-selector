import type { SelectOption } from './types.js'

export interface AnnounceInput<TValue, TOption extends SelectOption<TValue>> {
  readonly open: boolean
  readonly query: string
  readonly visible: readonly TOption[]
  readonly selected: readonly TValue[]
  readonly previousSelected: readonly TValue[]
  readonly labelOf: (value: TValue) => string
}

export interface AnnounceMessages {
  readonly results: (count: number) => string
  readonly selected: (label: string) => string
  readonly deselected: (label: string) => string
}

export const defaultMessages: AnnounceMessages = {
  results: (count) => (count === 0 ? 'Ничего не найдено' : `Найдено вариантов: ${count}`),
  selected: (label) => `${label} выбрано`,
  deselected: (label) => `${label} снято`,
}

/**
 * What the widget should say out loud, or an empty string for silence.
 *
 * A change in the selection wins over the result count: it is the thing the
 * user just did, and announcing both would talk over the more useful half.
 * The list stays silent while closed — nobody wants a running commentary on a
 * widget they are not in.
 */
export function announce<TValue, TOption extends SelectOption<TValue>>(
  input: AnnounceInput<TValue, TOption>,
  messages: AnnounceMessages = defaultMessages,
): string {
  const { open, query, visible, selected, previousSelected, labelOf } = input

  const added = selected.find((value) => !previousSelected.includes(value))
  if (added !== undefined) return messages.selected(labelOf(added))

  const removed = previousSelected.find((value) => !selected.includes(value))
  if (removed !== undefined) return messages.deselected(labelOf(removed))

  if (!open || query === '') return ''

  return messages.results(visible.length)
}
