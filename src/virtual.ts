'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { computeWindow, scrollOffsetFor, type VirtualWindow } from './core/virtual.js'
import { useStoreSlice } from './react/useStoreSlice.js'
import type { SelectOption, SelectState } from './types.js'
import type { SelectApi } from './useSelect.js'

export interface UseVirtualConfig {
  /** Number of options currently rendered — after filtering. */
  readonly count: number
  /** Fixed row height in pixels. */
  readonly itemHeight: number
  readonly overscan?: number
}

export interface VirtualList {
  readonly window: VirtualWindow
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
  const { count, itemHeight, overscan = 4 } = config

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

    const offset = scrollOffsetFor(activeIndex, itemHeight, viewportHeight, element.scrollTop)
    if (offset !== null) element.scrollTop = offset
  }, [activeIndex, itemHeight, viewportHeight])

  const virtualWindow = useMemo(
    () => computeWindow({ count, itemHeight, viewportHeight, scrollTop, overscan }),
    [count, itemHeight, viewportHeight, scrollTop, overscan],
  )

  const onScroll = useCallback(() => {
    const element = elementRef.current
    if (element) setScrollTop(element.scrollTop)
  }, [])

  return useMemo(
    () => ({
      window: virtualWindow,
      scrollProps: {
        ref: setRef,
        onScroll,
        style: { overflowY: 'auto' },
      },
      topSpacerStyle: { height: virtualWindow.paddingTop, flexShrink: 0 },
      bottomSpacerStyle: { height: virtualWindow.paddingBottom, flexShrink: 0 },
    }),
    [virtualWindow, setRef, onScroll],
  )
}
