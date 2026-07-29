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

export interface VariableWindowInput {
  /** Cumulative offsets: `offsets[i]` is where row `i` starts. Length = count + 1. */
  readonly offsets: readonly number[]
  readonly viewportHeight: number
  readonly scrollTop: number
  readonly overscan: number
}

/** Index of the last offset that is still `<= target`, by binary search. */
function findRow(offsets: readonly number[], target: number): number {
  let low = 0
  let high = offsets.length - 1

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    if ((offsets[mid] ?? 0) <= target) low = mid
    else high = mid - 1
  }

  return low
}

/**
 * Window for rows whose heights differ.
 *
 * Works off cumulative offsets rather than a single row height, so the search
 * stays logarithmic no matter how many rows there are.
 */
export function computeVariableWindow(input: VariableWindowInput): VirtualWindow {
  const { offsets, viewportHeight, scrollTop, overscan } = input
  const count = Math.max(0, offsets.length - 1)
  const totalHeight = offsets[count] ?? 0

  if (count === 0 || viewportHeight <= 0) {
    return { start: 0, end: 0, paddingTop: 0, paddingBottom: totalHeight, totalHeight }
  }

  const first = findRow(offsets, scrollTop)
  const last = findRow(offsets, scrollTop + viewportHeight)

  const start = Math.max(0, first - overscan)
  const end = Math.min(count, last + 1 + overscan)

  return {
    start,
    end,
    paddingTop: offsets[start] ?? 0,
    paddingBottom: totalHeight - (offsets[end] ?? totalHeight),
    totalHeight,
  }
}

/** Running sums of measured heights, falling back to an estimate. */
export function toOffsets(
  count: number,
  measured: ReadonlyMap<number, number>,
  estimate: number,
): readonly number[] {
  const offsets: number[] = [0]

  for (let i = 0; i < count; i++) {
    offsets.push((offsets[i] ?? 0) + (measured.get(i) ?? estimate))
  }

  return offsets
}
