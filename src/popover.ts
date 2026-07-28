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

/** CSS anchor positioning — Baseline 2026. Absent in jsdom and older browsers. */
export function supportsAnchorPositioning(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('anchor-name', '--probe')
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
export function usePopoverProps<TValue>(api: SelectApi<TValue>) {
  const open = useIsOpen(api)
  const ref = useRef<HTMLElement | null>(null)
  const [enhanced, setEnhanced] = useState(false)

  useEffect(() => setEnhanced(supportsPopover()), [])

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
