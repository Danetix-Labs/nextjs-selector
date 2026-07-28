export interface VirtualWindowInput {
  readonly count: number
  readonly itemHeight: number
  readonly viewportHeight: number
  readonly scrollTop: number
  /** Rows rendered beyond the viewport on each side. */
  readonly overscan: number
}

export interface VirtualWindow {
  readonly start: number
  /** Exclusive. */
  readonly end: number
  readonly paddingTop: number
  readonly paddingBottom: number
  readonly totalHeight: number
}

/**
 * Which slice of a fixed-height list is worth rendering.
 *
 * Before the viewport is measured (`viewportHeight === 0`) the window stays
 * empty rather than guessing — the first layout effect fills it in.
 */
export function computeWindow(input: VirtualWindowInput): VirtualWindow {
  const { count, itemHeight, viewportHeight, scrollTop, overscan } = input
  const totalHeight = count * itemHeight

  if (count === 0 || itemHeight <= 0 || viewportHeight <= 0) {
    return { start: 0, end: 0, paddingTop: 0, paddingBottom: totalHeight, totalHeight }
  }

  const firstVisible = Math.floor(scrollTop / itemHeight)
  const visibleCount = Math.ceil(viewportHeight / itemHeight)

  const start = Math.max(0, firstVisible - overscan)
  const end = Math.min(count, firstVisible + visibleCount + overscan)

  return {
    start,
    end,
    paddingTop: start * itemHeight,
    paddingBottom: (count - end) * itemHeight,
    totalHeight,
  }
}

/**
 * Scroll offset that brings `index` fully into view, or `null` when it already
 * is — returning null lets the caller skip a pointless scroll write.
 */
export function scrollOffsetFor(
  index: number,
  itemHeight: number,
  viewportHeight: number,
  scrollTop: number,
): number | null {
  if (index < 0 || itemHeight <= 0 || viewportHeight <= 0) return null

  const top = index * itemHeight
  const bottom = top + itemHeight

  if (top < scrollTop) return top
  if (bottom > scrollTop + viewportHeight) return bottom - viewportHeight

  return null
}
