import { describe, expect, it } from 'vitest'

import { groupOptions } from '../src/core/grouping.js'
import type { SelectOption } from '../src/types.js'

const options: readonly SelectOption[] = [
  { value: 'ru', label: 'Россия', group: 'Европа' },
  { value: 'jp', label: 'Япония', group: 'Азия' },
  { value: 'de', label: 'Германия', group: 'Европа' },
  { value: 'xx', label: 'Без группы' },
]

describe('groupOptions', () => {
  it('сохраняет плоские индексы — по ним ходит клавиатура', () => {
    const groups = groupOptions(options)
    const europe = groups.find((group) => group.label === 'Европа')

    expect(europe?.options.map((entry) => entry.index)).toEqual([0, 2])
  })

  it('идёт в порядке первого появления группы', () => {
    expect(groupOptions(options).map((group) => group.label)).toEqual(['Европа', 'Азия', undefined])
  })

  it('опции без группы собираются отдельно', () => {
    const ungrouped = groupOptions(options).find((group) => group.label === undefined)

    expect(ungrouped?.options).toHaveLength(1)
    expect(ungrouped?.options[0]?.index).toBe(3)
  })

  it('без групп отдаёт единственную корзину', () => {
    const flat = groupOptions([{ value: 'a', label: 'A' }])

    expect(flat).toHaveLength(1)
    expect(flat[0]?.label).toBeUndefined()
  })

  it('переживает пустой список', () => {
    expect(groupOptions([])).toEqual([])
  })
})
