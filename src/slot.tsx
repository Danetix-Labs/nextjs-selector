'use client'

import type { ReactElement, ReactNode } from 'react'
import { cloneElement, isValidElement } from 'react'

type Props = Record<string, unknown>

const isHandler = (key: string, value: unknown): value is (...args: unknown[]) => void =>
  key.startsWith('on') &&
  key.length > 2 &&
  key[2] === key[2]?.toUpperCase() &&
  typeof value === 'function'

/** Attributes the widget owns outright — a consumer must not overwrite them. */
const isOwned = (key: string): boolean =>
  key.startsWith('aria-') || key.startsWith('data-') || key === 'role' || key === 'id'

/**
 * Merges the widget's props into the consumer's element.
 *
 * Handlers run consumer-first, then ours, so a consumer can inspect the event
 * without losing behaviour. Class names and styles combine. ARIA, roles, ids
 * and data-attributes stay ours: letting them be overwritten is how accessible
 * widgets quietly stop being accessible.
 */
export function mergeProps(ours: Props, theirs: Props): Props {
  const merged: Props = { ...ours, ...theirs }

  for (const [key, ourValue] of Object.entries(ours)) {
    const theirValue = theirs[key]

    if (isHandler(key, ourValue) && isHandler(key, theirValue)) {
      merged[key] = (...args: unknown[]) => {
        theirValue(...args)
        ourValue(...args)
      }
      continue
    }

    if (key === 'className' && typeof ourValue === 'string' && typeof theirValue === 'string') {
      merged[key] = `${ourValue} ${theirValue}`
      continue
    }

    if (key === 'style' && ourValue && theirValue) {
      merged[key] = { ...(ourValue as object), ...(theirValue as object) }
      continue
    }

    if (isOwned(key)) merged[key] = ourValue
  }

  return merged
}

export interface SlotProps {
  readonly children?: ReactNode
  readonly [prop: string]: unknown
}

/** Renders the consumer's own element, carrying the widget's behaviour. */
export function Slot({ children, ...props }: SlotProps) {
  if (!isValidElement(children)) return null

  const element = children as ReactElement<Props>

  return cloneElement(element, mergeProps(props, element.props))
}
