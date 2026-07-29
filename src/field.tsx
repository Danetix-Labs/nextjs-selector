'use client'

import type { ReactNode } from 'react'
import {
  Chips,
  ClearButton,
  Content,
  Empty,
  Label,
  List,
  LoadError,
  Loading,
  LoadMore,
  Root,
  type RootProps,
  Search,
  Trigger,
  Value,
  Virtualized,
} from './components.js'
import type { PopoverOptions } from './popover.js'
import type { SelectOption } from './types.js'

export interface SelectFieldProps<
  TValue,
  TOption extends SelectOption<TValue> = SelectOption<TValue>,
> extends Omit<RootProps<TValue, TOption>, 'children'>,
    PopoverOptions {
  readonly label?: ReactNode
  readonly placeholder?: string
  /** Adds the search box. Implied when `loadOptions` is present. */
  readonly searchable?: boolean
  readonly searchPlaceholder?: string
  /**
   * Accessible name of the search box. Defaults to "Поиск" — deliberately not
   * the field's label, or the trigger and the search box would answer to the
   * same name.
   */
  readonly searchLabel?: string
  readonly emptyMessage?: ReactNode
  readonly loadingMessage?: ReactNode
  readonly errorMessage?: ReactNode
  /** Label of the «load more» control. */
  readonly loadMoreLabel?: ReactNode
  readonly clearable?: boolean
  /** Row height in pixels. Setting it switches the list to virtualization. */
  readonly itemHeight?: number
  /** Chips above the trigger. Defaults to on in multiple mode. */
  readonly chips?: boolean
}

/**
 * Everything wired up, for the common case.
 *
 * Compose `Select.Root` and friends when the layout needs to differ; this is
 * the same parts in the arrangement most applications want, so the usual
 * usage is one element rather than a dozen.
 */
export function SelectField<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>({
  label,
  placeholder,
  searchable,
  searchPlaceholder,
  searchLabel,
  emptyMessage = 'Ничего не найдено',
  loadingMessage = 'Загрузка…',
  errorMessage = 'Не удалось загрузить',
  loadMoreLabel = 'Показать ещё',
  clearable = false,
  itemHeight,
  chips,
  topLayer,
  sheet,
  sheetMedia,
  ...config
}: SelectFieldProps<TValue, TOption>) {
  const withSearch = searchable ?? config.loadOptions !== undefined
  const withChips = chips ?? config.multiple === true
  const accessibleName = searchLabel ?? 'Поиск'

  return (
    <Root<TValue, TOption> {...config}>
      {label === undefined ? null : <Label>{label}</Label>}
      {withChips ? <Chips /> : null}

      {/* The clear button sits beside the trigger, never inside it:
          a button nested in a button is invalid HTML. */}
      <div data-part="control">
        <Trigger>
          <Value placeholder={placeholder} />
          <span data-part="indicator-arrow" aria-hidden="true">
            ▾
          </span>
        </Trigger>
        {clearable ? <ClearButton>×</ClearButton> : null}
      </div>

      <Content topLayer={topLayer} sheet={sheet} sheetMedia={sheetMedia}>
        {withSearch ? <Search aria-label={accessibleName} placeholder={searchPlaceholder} /> : null}
        {config.loadOptions ? <Loading>{loadingMessage}</Loading> : null}
        {config.loadOptions ? <LoadError>{errorMessage}</LoadError> : null}
        <Empty>{emptyMessage}</Empty>
        {itemHeight === undefined ? <List /> : <Virtualized itemHeight={itemHeight} />}
        {config.loadOptions ? <LoadMore>{loadMoreLabel}</LoadMore> : null}
      </Content>
    </Root>
  )
}

/** `SelectField` with `multiple` already on. */
export function MultiSelect<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>(
  props: Omit<SelectFieldProps<TValue, TOption>, 'multiple'>,
) {
  return <SelectField<TValue, TOption> {...props} multiple />
}
