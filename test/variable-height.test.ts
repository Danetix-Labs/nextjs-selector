import { describe, expect, it } from 'vitest'

import { computeVariableWindow, toOffsets } from '../src/core/virtual.js'

const heights = new Map([
  [0, 20],
  [1, 60],
  [2, 20],
])

describe('toOffsets', () => {
  it('копит измеренные высоты, подставляя оценку для неизвестных', () => {
    expect(toOffsets(5, heights, 30)).toEqual([0, 20, 80, 100, 130, 160])
  })

  it('на пустом списке даёт единственный ноль', () => {
    expect(toOffsets(0, new Map(), 30)).toEqual([0])
  })
})

describe('computeVariableWindow', () => {
  const offsets = toOffsets(100, new Map(), 40)

  it('находит окно по прокрутке', () => {
    const window = computeVariableWindow({
      offsets,
      viewportHeight: 200,
      scrollTop: 400,
      overscan: 1,
    })

    expect(window.start).toBe(9)
    expect(window.paddingTop).toBe(360)
    expect(window.totalHeight).toBe(4000)
  })

  it('учитывает разную высоту строк', () => {
    const uneven = toOffsets(3, heights, 30)
    const window = computeVariableWindow({
      offsets: uneven,
      viewportHeight: 30,
      scrollTop: 25,
      overscan: 0,
    })

    // Скролл 25 приходится на вторую строку: она начинается на 20 и высокая.
    expect(window.start).toBe(1)
    expect(window.paddingTop).toBe(20)
  })

  it('не гадает, пока вьюпорт не измерен', () => {
    expect(
      computeVariableWindow({ offsets, viewportHeight: 0, scrollTop: 0, overscan: 2 }),
    ).toMatchObject({ start: 0, end: 0 })
  })

  it('переживает пустой список', () => {
    expect(
      computeVariableWindow({ offsets: [0], viewportHeight: 200, scrollTop: 0, overscan: 2 }),
    ).toMatchObject({ start: 0, end: 0, totalHeight: 0 })
  })
})
