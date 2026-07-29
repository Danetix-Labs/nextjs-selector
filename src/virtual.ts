'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  computeVariableWindow,
  computeWindow,
  scrollOffsetFor,
  toOffsets,
  type VirtualWindow,
} from './core/virtual.js'
import { useStoreSlice } from './react/useStoreSlice.js'
import type { SelectOption, SelectState } from './types.js'
import type { SelectApi } from './useSelect.js'

export interface UseVirtualConfig {
  /** Number of options currently rendered — after filtering. */
  readonly count: number
  /** Fixed row height in pixels. Omit and pass `estimateHeight` for variable rows. */
  readonly itemHeight?: number
  /**
   * Starting guess for rows whose height is not known yet.
   *
   * Rows report their real height once rendered; the guess only decides where
   * the scrollbar starts out.
   */
  readonly estimateHeight?: number
  readonly overscan?: number
}

export interface VirtualList {
  readonly window: VirtualWindow
  /** Ref callback that reports a row's real height. Only needed for variable rows. */
  readonly measureItem: (index: number) => (element: HTMLElement | null) => void
  readonly scrollProps: {
    readonly ref: (element: HTMLElement | null) => void
    readonly onScroll: () => void
    readonly style: CSSProperties
  }
  /** Spacer style reserving the height of the rows above the window. */
  readonly topSpacerStyle: CSSProperties
  readonly bottomSpacerStyle: CSSProperties
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Fixed-height windowing with keyboard follow.
 *
 * Only the visible rows plus overscan reach the DOM, so a 10 000-option list
 * opens as fast as a 10-option one. The active index is kept in view without
 * re-rendering the list: the scroll write happens in an effect driven by a
 * primitive subscription.
 */
export function useVirtual<TValue, TOption extends SelectOption<TValue>>(
  api: SelectApi<TValue, TOption>,
  config: UseVirtualConfig,
): VirtualList {
  const { count, itemHeight, estimateHeight, overscan = 4 } = config
  const rowHeight = itemHeight ?? estimateHeight ?? 0
  const variable = itemHeight === undefined

  const [measured, setMeasured] = useState<ReadonlyMap<number, number>>(() => new Map())

  const elementRef = useRef<HTMLElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const activeIndex = useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue, TOption>) => state.activeIndex, []),
  )
  const open = useStoreSlice(
    api.store,
    useCallback((state: SelectState<TValue, TOption>) => state.open, []),
  )

  const measure = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    setViewportHeight(element.clientHeight)
    setScrollTop(element.scrollTop)
  }, [])

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element
      if (element) measure()
    },
    [measure],
  )

  // The listbox has no size until it opens.
  useIsomorphicLayoutEffect(() => {
    if (open) measure()
  }, [open, measure])

  useEffect(() => {
    const element = elementRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])

  // Keep the highlighted option in view as the user arrows through the list.
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const offset = scrollOffsetFor(activeIndex, rowHeight, viewportHeight, element.scrollTop)
    if (offset !== null) element.scrollTop = offset
  }, [activeIndex, rowHeight, viewportHeight])

  const virtualWindow = useMemo(() => {
    if (!variable) {
      return computeWindow({ count, itemHeight: rowHeight, viewportHeight, scrollTop, overscan })
    }

    const offsets = toOffsets(count, measured, rowHeight)

    return computeVariableWindow({ offsets, viewportHeight, scrollTop, overscan })
  }, [variable, count, rowHeight, viewportHeight, scrollTop, overscan, measured])

  const measureItem = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      if (!element) return

      const height = element.offsetHeight || element.getBoundingClientRect().height
      if (height <= 0) return

      setMeasured((previous) =>
        previous.get(index) === height ? previous : new Map(previous).set(index, height),
      )
    },
    [],
  )

  const onScroll = useCallback(() => {
    const element = elementRef.current
    if (element) setScrollTop(element.scrollTop)
  }, [])

  return useMemo(
    () => ({
      window: virtualWindow,
      measureItem,
      scrollProps: {
        ref: setRef,
        onScroll,
        style: { overflowY: 'auto' },
      },
      topSpacerStyle: { height: virtualWindow.paddingTop, flexShrink: 0 },
      bottomSpacerStyle: { height: virtualWindow.paddingBottom, flexShrink: 0 },
    }),
    [virtualWindow, measureItem, setRef, onScroll],
  )
}
