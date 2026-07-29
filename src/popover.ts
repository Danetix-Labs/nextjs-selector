'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useIsOpen } from './props.js'
import { useMediaQuery } from './react/useMediaQuery.js'
import type { SelectOption } from './types.js'
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

/** Narrow screens, where a dropdown is the wrong shape. */
export const DEFAULT_SHEET_MEDIA = '(max-width: 640px)'

export interface PopoverOptions {
  /**
   * Escape clipping ancestors by using the native popover.
   *
   * Costs the anchor: in the top layer the listbox can no longer position
   * against its trigger, so place it yourself if you turn this on.
   */
  readonly topLayer?: boolean
  /**
   * Present the list as a bottom sheet where `sheetMedia` matches.
   *
   * Off by default — a sheet is a deliberate product decision, not something
   * to infer for someone. On a phone a dropdown means small targets and a list
   * fighting the on-screen keyboard, which is what the sheet fixes.
   */
  readonly sheet?: boolean
  /** Defaults to `(max-width: 640px)`. Pass `'all'` for a sheet everywhere. */
  readonly sheetMedia?: string
}

/**
 * Presentation of the listbox: dropdown by default, bottom sheet where opted in.
 *
 * The markup and behaviour stay identical either way — only placement changes,
 * announced through `data-mode` so the styling can follow.
 */
export function usePopoverProps<TValue, TOption extends SelectOption<TValue>>(
  api: SelectApi<TValue, TOption>,
  { topLayer = false, sheet = false, sheetMedia = DEFAULT_SHEET_MEDIA }: PopoverOptions = {},
) {
  const open = useIsOpen(api)
  const ref = useRef<HTMLElement | null>(null)
  const [enhanced, setEnhanced] = useState(false)

  const asSheet = useMediaQuery(sheet ? sheetMedia : null)

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

  // Flip above the trigger when there is no room below.
  //
  // Measured rather than left to `position-try-fallbacks`: that only applies
  // once the anchor resolves, and an anchor that is a sibling rather than an
  // ancestor does not resolve reliably — nor does it exist at all in browsers
  // without anchor positioning.
  const [side, setSide] = useState<'bottom' | 'top'>('bottom')
  /**
   * Where the trigger sits inside the wrapper.
   *
   * The wrapper also holds the label and the chips, so «top of the wrapper» is
   * not «top of the field»: anchoring to it left the flipped list floating
   * above the label, detached from the control it belongs to.
   */
  const [inset, setInset] = useState({ start: 0, end: 0 })

  useEffect(() => {
    if (!open) return

    const place = () => {
      const element = ref.current
      const trigger = element?.closest('[data-part="root"]')?.querySelector('[data-part="trigger"]')
      if (!element || !trigger) return

      const anchor = trigger.getBoundingClientRect()
      const wrapper = (element.closest('[data-part="root"]') as HTMLElement).getBoundingClientRect()
      const needed = element.offsetHeight || element.getBoundingClientRect().height
      const below = window.innerHeight - anchor.bottom
      const above = anchor.top

      setSide(below < needed && above > below ? 'top' : 'bottom')
      setInset((previous) => {
        const next = {
          start: Math.round(wrapper.bottom - anchor.top),
          end: Math.round(anchor.bottom - wrapper.top),
        }

        return previous.start === next.start && previous.end === next.end ? previous : next
      })
    }

    // Throttled to one measurement per frame.
    //
    // `place` reads getBoundingClientRect, which forces layout; on a capturing
    // scroll listener that fires far more often than the screen refreshes, so
    // unthrottled it would measure several times per painted frame for a
    // result that can only change once.
    let frame = 0
    const schedule = () => {
      if (frame !== 0) return

      frame = requestAnimationFrame(() => {
        frame = 0
        place()
      })
    }

    // First measurement waits for a frame too: right after opening the list
    // may not be laid out yet, and a height of zero reads as «there is room
    // below» — Firefox flipped nothing at all because of it.
    schedule()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [open])

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
    // A sheet is placed by the viewport, so the measured side is meaningless.
    'data-side': asSheet ? undefined : side,
    'data-mode': asSheet ? 'sheet' : 'dropdown',
    style: {
      positionAnchor: api.ids.anchor,
      '--sel-anchor-start': `${inset.start}px`,
      '--sel-anchor-end': `${inset.end}px`,
    } as CSSProperties,
  }
}

/** Marks the trigger as the anchor the listbox positions against. */
export function useAnchorStyle<TValue>(api: SelectApi<TValue>): CSSProperties {
  return { anchorName: api.ids.anchor } as CSSProperties
}
