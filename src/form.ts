'use client'

import { useMemo } from 'react'

import { useSelectedValues } from './props.js'
import type { SelectApi } from './useSelect.js'

export interface HiddenFieldProps {
  readonly type: 'hidden'
  readonly name: string
  readonly value: string
  /** Stable key for rendering the list. */
  readonly key: string
}

export interface UseFormFieldsConfig<TValue> {
  readonly name: string
  /** Defaults to `String`. Supply one when values are not strings. */
  readonly serialize?: (value: TValue) => string
}

/**
 * Hidden inputs mirroring the selection.
 *
 * Renders the widget's value into the form itself, so `FormData`, plain form
 * submits and React 19 Server Actions all see it — without any JavaScript on
 * the receiving end.
 *
 * Multiple mode emits one input per value, matching how a native
 * `<select multiple>` behaves: read them with `formData.getAll(name)`, and
 * expect the field to be absent entirely when nothing is selected.
 */
export function useFormFields<TValue>(
  api: SelectApi<TValue>,
  config: UseFormFieldsConfig<TValue>,
): readonly HiddenFieldProps[] {
  const { name, serialize } = config
  const selected = useSelectedValues(api)
  const { multiple } = api

  return useMemo(() => {
    const toString = serialize ?? ((value: TValue) => String(value))

    if (!multiple) {
      // Single mode always submits the key, empty when nothing is chosen —
      // the behaviour of a <select> whose first option has an empty value.
      const value = selected[0]

      return [
        { type: 'hidden', name, value: value === undefined ? '' : toString(value), key: name },
      ]
    }

    return selected.map((value) => {
      const serialized = toString(value)

      return { type: 'hidden', name, value: serialized, key: serialized }
    })
  }, [selected, multiple, name, serialize])
}
