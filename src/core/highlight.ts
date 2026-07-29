export interface LabelSegment {
  readonly text: string
  readonly matched: boolean
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Splits a label into matched and unmatched runs.
 *
 * Matching happens on a normalized copy while the slices come from the
 * original string, so the rendered text keeps its case and diacritics — the
 * user sees «Ёлка», not «елка», with only the highlight moving.
 */
export function highlightMatches(label: string, query: string): readonly LabelSegment[] {
  const needle = normalize(query.trim())
  if (needle === '') return [{ text: label, matched: false }]

  const haystack = normalize(label)
  const segments: LabelSegment[] = []
  let cursor = 0

  // Normalization can change length (a decomposed character folds to one), so
  // a run found in the copy is only trustworthy when lengths line up.
  if (haystack.length !== label.length) {
    const at = haystack.indexOf(needle)

    return at === -1 ? [{ text: label, matched: false }] : [{ text: label, matched: true }]
  }

  while (cursor < label.length) {
    const at = haystack.indexOf(needle, cursor)
    if (at === -1) break

    if (at > cursor) segments.push({ text: label.slice(cursor, at), matched: false })
    segments.push({ text: label.slice(at, at + needle.length), matched: true })
    cursor = at + needle.length
  }

  if (segments.length === 0) return [{ text: label, matched: false }]
  if (cursor < label.length) segments.push({ text: label.slice(cursor), matched: false })

  return segments
}
