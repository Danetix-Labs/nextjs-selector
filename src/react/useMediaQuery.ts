'use client'

import { useEffect, useState } from 'react'

/**
 * Whether a media query currently matches.
 *
 * Returns `false` until after mount: `matchMedia` does not exist on the server,
 * and answering differently there would break hydration. Absent entirely (as in
 * jsdom) it simply stays `false`.
 */
export function useMediaQuery(query: string | null): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (query === null || typeof window === 'undefined' || !window.matchMedia) return

    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)

    update()
    list.addEventListener('change', update)

    return () => list.removeEventListener('change', update)
  }, [query])

  return matches
}
