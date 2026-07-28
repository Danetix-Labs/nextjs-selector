import { describe, expect, it } from 'vitest'

import {
  appendToBuffer,
  emptyBuffer,
  matchPrefix,
  TYPEAHEAD_TIMEOUT_MS,
} from '../src/core/typeahead.js'
import type { SelectOption } from '../src/types.js'

const options: readonly SelectOption[] = [
  { value: 'a', label: 'Argentina' },
  { value: 'b', label: 'Brazil' },
  { value: 'c', label: 'Belgium', disabled: true },
  { value: 'd', label: 'Bolivia' },
]

describe('appendToBuffer', () => {
  it('накапливает символы внутри таймаута', () => {
    const first = appendToBuffer(emptyBuffer, 'b', 1000)

    expect(appendToBuffer(first, 'o', 1100).text).toBe('bo')
  })

  it('начинает заново после истечения таймаута', () => {
    const first = appendToBuffer(emptyBuffer, 'b', 1000)

    expect(appendToBuffer(first, 'o', 1000 + TYPEAHEAD_TIMEOUT_MS + 1).text).toBe('o')
  })
})

describe('matchPrefix', () => {
  it('находит опцию по префиксу без учёта регистра', () => {
    expect(matchPrefix(options, 'bra', -1)).toBe(1)
    expect(matchPrefix(options, 'ARG', -1)).toBe(0)
  })

  it('повтор одной буквы перебирает опции на эту букву', () => {
    const first = matchPrefix(options, 'b', -1)
    const second = matchPrefix(options, 'bb', first)

    expect(first).toBe(1)
    // Belgium под индексом 2 отключена, поэтому следующая — Bolivia.
    expect(second).toBe(3)
  })

  it('заворачивается по кругу', () => {
    expect(matchPrefix(options, 'a', 3)).toBe(0)
  })

  it('пропускает disabled', () => {
    expect(matchPrefix(options, 'bel', -1)).toBe(-1)
  })

  it('возвращает -1 на пустом вводе и пустом списке', () => {
    expect(matchPrefix(options, '', 0)).toBe(-1)
    expect(matchPrefix([], 'a', 0)).toBe(-1)
  })
})
