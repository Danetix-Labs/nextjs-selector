import type { SelectOption } from '../types.js'

/**
 * Marks the synthetic "create this" entry.
 *
 * A symbol cannot collide with a real value, so `dispatch` can recognise the
 * entry without the consumer's value space needing a reserved slot.
 */
export const CREATE_VALUE: unique symbol = Symbol('nextjs-selector/create')

export function isCreateOption<TValue>(option: SelectOption<TValue>): boolean {
  return (option.value as unknown) === CREATE_VALUE
}

/** Whether the query is worth offering as a new option. */
export function canCreate<TValue>(
  options: readonly SelectOption<TValue>[],
  query: string,
): boolean {
  const trimmed = query.trim()
  if (trimmed === '') return false

  const normalized = trimmed.toLowerCase()

  return !options.some((option) => option.label.trim().toLowerCase() === normalized)
}

/**
 * Appends the create entry when the query has no exact match.
 *
 * It goes last and participates in navigation like any other option, so
 * Enter reaches it without a special case in the keyboard model.
 */
export function withCreateOption<TValue, TOption extends SelectOption<TValue>>(
  options: readonly TOption[],
  query: string,
  label: (query: string) => string,
): readonly TOption[] {
  if (!canCreate(options, query)) return options

  // The create entry is synthetic: it carries only value and label, never the
  // consumer's own fields. Check `isCreateOption` before reading them.
  const entry = {
    value: CREATE_VALUE as unknown as TValue,
    label: label(query.trim()),
  } as TOption

  return [...options, entry]
}
