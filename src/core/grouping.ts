import type { SelectOption } from '../types.js'

export interface GroupedOption<TValue> {
  readonly option: SelectOption<TValue>
  /** Position in the flat list — what keyboard navigation indexes. */
  readonly index: number
}

export interface OptionGroup<TValue> {
  /** Undefined for options that declare no group. */
  readonly label: string | undefined
  readonly options: readonly GroupedOption<TValue>[]
}

/**
 * Groups options while preserving their flat indices.
 *
 * Grouping is presentational: navigation, selection and virtualization all
 * keep working against the flat list, so the indices must survive.
 * Groups appear in first-seen order, and options keep their relative order.
 */
export function groupOptions<TValue>(
  options: readonly SelectOption<TValue>[],
): readonly OptionGroup<TValue>[] {
  const groups: OptionGroup<TValue>[] = []
  const byLabel = new Map<string | undefined, GroupedOption<TValue>[]>()

  options.forEach((option, index) => {
    let bucket = byLabel.get(option.group)

    if (!bucket) {
      bucket = []
      byLabel.set(option.group, bucket)
      groups.push({ label: option.group, options: bucket })
    }

    bucket.push({ option, index })
  })

  return groups
}
