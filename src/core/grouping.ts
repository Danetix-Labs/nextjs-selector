import type { SelectOption } from '../types.js'

export interface GroupedOption<TOption> {
  readonly option: TOption
  /** Position in the flat list — what keyboard navigation indexes. */
  readonly index: number
}

export interface OptionGroup<TOption> {
  /** Undefined for options that declare no group. */
  readonly label: string | undefined
  readonly options: readonly GroupedOption<TOption>[]
}

/**
 * Groups options while preserving their flat indices.
 *
 * Grouping is presentational: navigation, selection and virtualization all
 * keep working against the flat list, so the indices must survive.
 * Groups appear in first-seen order, and options keep their relative order.
 */
export function groupOptions<TOption extends SelectOption<unknown>>(
  options: readonly TOption[],
): readonly OptionGroup<TOption>[] {
  const groups: OptionGroup<TOption>[] = []
  const byLabel = new Map<string | undefined, GroupedOption<TOption>[]>()

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
