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
  Root,
  type RootProps,
  Search,
  Trigger,
  Value,
  Virtualized,
} from './components.js'

export interface SelectFieldProps<TValue> extends Omit<RootProps<TValue>, 'children'> {
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
export function SelectField<TValue>({
  label,
  placeholder,
  searchable,
  searchPlaceholder,
  searchLabel,
  emptyMessage = 'Ничего не найдено',
  loadingMessage = 'Загрузка…',
  errorMessage = 'Не удалось загрузить',
  clearable = false,
  itemHeight,
  chips,
  ...config
}: SelectFieldProps<TValue>) {
  const withSearch = searchable ?? config.loadOptions !== undefined
  const withChips = chips ?? config.multiple === true
  const accessibleName = searchLabel ?? 'Поиск'

  return (
    <Root<TValue> {...config}>
      {label === undefined ? null : <Label>{label}</Label>}
      {withChips ? <Chips /> : null}

      <Trigger>
        <Value placeholder={placeholder} />
        {clearable ? <ClearButton>×</ClearButton> : null}
        <span data-part="indicator-arrow" aria-hidden="true">
          ▾
        </span>
      </Trigger>

      <Content>
        {withSearch ? <Search aria-label={accessibleName} placeholder={searchPlaceholder} /> : null}
        {config.loadOptions ? <Loading>{loadingMessage}</Loading> : null}
        {config.loadOptions ? <LoadError>{errorMessage}</LoadError> : null}
        <Empty>{emptyMessage}</Empty>
        {itemHeight === undefined ? <List /> : <Virtualized itemHeight={itemHeight} />}
      </Content>
    </Root>
  )
}

/** `SelectField` with `multiple` already on. */
export function MultiSelect<TValue>(props: Omit<SelectFieldProps<TValue>, 'multiple'>) {
  return <SelectField<TValue> {...props} multiple />
}
