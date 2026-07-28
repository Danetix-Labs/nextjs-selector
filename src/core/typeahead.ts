import type { SelectOption } from '../types.js'

/** How long typed characters keep accumulating into one search string. */
export const TYPEAHEAD_TIMEOUT_MS = 500

export interface TypeaheadBuffer {
  readonly text: string
  readonly at: number
}

export const emptyBuffer: TypeaheadBuffer = { text: '', at: 0 }

export function appendToBuffer(
  buffer: TypeaheadBuffer,
  char: string,
  now: number,
): TypeaheadBuffer {
  const expired = now - buffer.at > TYPEAHEAD_TIMEOUT_MS

  return { text: expired ? char : buffer.text + char, at: now }
}

function startsWith(label: string, prefix: string): boolean {
  return label.toLowerCase().startsWith(prefix.toLowerCase())
}

/**
 * Index of the next option whose label starts with `text`, searching forward
 * from `from` and wrapping once.
 *
 * Repeating a single character cycles through the options starting with it —
 * the behaviour of a native `<select>`.
 */
export function matchPrefix<TValue>(
  options: readonly SelectOption<TValue>[],
  text: string,
  from: number,
): number {
  const { length } = options
  if (length === 0 || text === '') return -1

  const repeated = text.length > 1 && [...text].every((char) => char === text[0])
  const prefix = repeated ? (text[0] as string) : text

  // A fresh search may land on the current option; cycling must move past it.
  const offset = repeated || text.length === 1 ? 1 : 0

  for (let i = 0; i < length; i++) {
    const index = (from + offset + i) % length
    const option = options[index]

    if (option && !option.disabled && startsWith(option.label, prefix)) return index
  }

  return -1
}
