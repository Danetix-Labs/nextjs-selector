import { describe, expect, it } from 'vitest'

import { computeWindow, scrollOffsetFor } from '../src/core/virtual.js'

const base = { count: 1000, itemHeight: 32, viewportHeight: 320, scrollTop: 0, overscan: 4 }

describe('computeWindow', () => {
  it('в начале списка рендерит окно вместо всей тысячи', () => {
    const window = computeWindow(base)

    expect(window.start).toBe(0)
    expect(window.end).toBe(14) // 10 видимых + overscan
    expect(window.paddingTop).toBe(0)
    expect(window.totalHeight).toBe(32_000)
  })

  it('сдвигает окно при прокрутке и держит его размер', () => {
    const window = computeWindow({ ...base, scrollTop: 3200 })

    expect(window.start).toBe(96)
    expect(window.end).toBe(114)
    expect(window.paddingTop).toBe(96 * 32)
    expect(window.paddingBottom).toBe((1000 - 114) * 32)
  })

  it('размер окна не зависит от длины списка', () => {
    const small = computeWindow({ ...base, count: 50 })
    const huge = computeWindow({ ...base, count: 100_000 })

    expect(huge.end - huge.start).toBe(small.end - small.start)
  })

  it('не гадает, пока вьюпорт не измерен', () => {
    const window = computeWindow({ ...base, viewportHeight: 0 })

    expect(window).toMatchObject({ start: 0, end: 0 })
  })

  it('переживает пустой список', () => {
    expect(computeWindow({ ...base, count: 0 })).toMatchObject({
      start: 0,
      end: 0,
      totalHeight: 0,
    })
  })
})

describe('scrollOffsetFor', () => {
  it('возвращает null, когда опция уже видна', () => {
    expect(scrollOffsetFor(3, 32, 320, 0)).toBeNull()
  })

  it('подтягивает опцию сверху', () => {
    expect(scrollOffsetFor(2, 32, 320, 320)).toBe(64)
  })

  it('подтягивает опцию снизу', () => {
    expect(scrollOffsetFor(20, 32, 320, 0)).toBe(21 * 32 - 320)
  })

  it('игнорирует отсутствие активной опции и неизмеренный вьюпорт', () => {
    expect(scrollOffsetFor(-1, 32, 320, 0)).toBeNull()
    expect(scrollOffsetFor(5, 32, 0, 0)).toBeNull()
  })
})
