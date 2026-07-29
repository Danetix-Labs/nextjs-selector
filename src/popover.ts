'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useIsOpen } from './props.js'
import type { SelectApi } from './useSelect.js'

/** Native top-layer popover — Baseline since Safari 17 / Firefox 132. */
export function supportsPopover(): boolean {
  return (
    typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'
  )
}

/**
 * CSS anchor positioning, including placement.
 *
 * `position-area` is checked alongside `anchor-name` on purpose: it shipped
 * later (and under the earlier name `inset-area`), so browsers exist that
 * accept the anchor but ignore the placement. Testing only for `anchor-name`
 * lets the popover into the top layer with nothing positioning it, and the
 * listbox lands in a corner of the viewport.
 */
export function supportsAnchorPositioning(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('anchor-name', '--probe') &&
    CSS.supports('position-area', 'bottom')
  )
}

interface ToggleEventLike extends Event {
  readonly newState?: string
}

/**
 * Listbox wired to the native popover.
 *
 * Where the API exists the browser hands us the top layer, light dismiss and
 * Esc for free; where it does not, the element renders inline and `data-state`
 * is enough to hide it in CSS. Detection runs after mount so server and client
 * markup agree during hydration.
 */
export interface PopoverOptions {
  /**
   * Escape clipping ancestors by using the native popover.
   *
   * Costs the anchor: in the top layer the listbox can no longer position
   * against its trigger, so place it yourself if you turn this on.
   */
  readonly topLayer?: boolean
}

export function usePopoverProps<TValue>(
  api: SelectApi<TValue>,
  { topLayer = false }: PopoverOptions = {},
) {
  const open = useIsOpen(api)
  const ref = useRef<HTMLElement | null>(null)
  const [enhanced, setEnhanced] = useState(false)

  // Opt-in, and off by default. Moving the listbox to the top layer severs it
  // from the trigger it anchors to: `position-area` resolves to `none` and the
  // box lands in a corner of the viewport. Positioning against the root
  // wrapper works in every browser, so that is the default; enable the top
  // layer only when a clipping ancestor forces it.
  useEffect(() => {
    if (!topLayer) return
    setEnhanced(supportsPopover())
  }, [topLayer])

  useEffect(() => {
    const element = ref.current
    if (!enhanced || !element) return

    // The browser throws when asked to repeat a state the element is already in.
    try {
      if (open) element.showPopover()
      else element.hidePopover()
    } catch {
      // Already in the requested state — nothing to do.
    }
  }, [enhanced, open])

  // Light dismiss closes the popover behind our back; keep the store in sync.
  useEffect(() => {
    const element = ref.current
    if (!enhanced || !element) return

    const onToggle = (event: Event) => {
      if ((event as ToggleEventLike).newState === 'closed') api.dispatch({ type: 'close' })
    }

    element.addEventListener('toggle', onToggle)
    return () => element.removeEventListener('toggle', onToggle)
  }, [enhanced, api])

  // Without the native popover nothing dismisses the list on an outside click,
  // so provide it ourselves.
  useEffect(() => {
    if (enhanced || !open) return

    const onPointerDown = (event: Event) => {
      const element = ref.current
      const target = event.target
      if (!element || !(target instanceof Node)) return
      if (element.contains(target) || element.closest('[data-part="root"]')?.contains(target))
        return

      api.dispatch({ type: 'close' })
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [enhanced, open, api])

  const setRef = useCallback((element: HTMLElement | null) => {
    ref.current = element
  }, [])

  // Deliberately carries no ARIA role: `role="listbox"` belongs on the element
  // that directly contains the options, otherwise aria-required-children and
  // aria-required-parent are both violated.
  return {
    ref: setRef,
    popover: enhanced ? ('auto' as const) : undefined,
    'data-part': 'content',
    'data-state': open ? 'open' : 'closed',
    style: { positionAnchor: api.ids.anchor } as CSSProperties,
  }
}

/** Marks the trigger as the anchor the listbox positions against. */
export function useAnchorStyle<TValue>(api: SelectApi<TValue>): CSSProperties {
  return { anchorName: api.ids.anchor } as CSSProperties
}
