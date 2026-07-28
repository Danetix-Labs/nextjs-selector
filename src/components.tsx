'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { createContext, useContext } from 'react'

import { useFormFields } from './form.js'
import { usePopoverProps } from './popover.js'
import {
  useIsOpen,
  useLabelProps,
  useListboxProps,
  useOptionProps,
  useSearchProps,
  useSelectedValues,
  useTriggerProps,
  useVisibleOptions,
} from './props.js'
import type { SelectOption } from './types.js'
import { type SelectApi, type UseSelectConfig, useSelect } from './useSelect.js'

const SelectContext = createContext<SelectApi<unknown> | null>(null)

function useApi<TValue>(): SelectApi<TValue> {
  const api = useContext(SelectContext)
  if (!api) throw new Error('Компоненты Select должны быть внутри <Select.Root>')

  return api as SelectApi<TValue>
}

export interface RootProps<TValue> extends UseSelectConfig<TValue> {
  readonly children: ReactNode
  /** Enables hidden form fields under this name. */
  readonly name?: string
}

/**
 * Owns the state and shares it through context.
 *
 * The context value is the stable api handle, so nothing re-renders merely
 * because it is provided. Pieces that depend on state subscribe themselves.
 */
export function Root<TValue>({ children, name, ...config }: RootProps<TValue>) {
  const api = useSelect(config)

  return (
    <SelectContext.Provider value={api as SelectApi<unknown>}>
      {children}
      {name ? <HiddenFields name={name} /> : null}
    </SelectContext.Provider>
  )
}

/** Isolated so the selection subscription does not re-render the whole tree. */
function HiddenFields({ name }: { readonly name: string }) {
  const fields = useFormFields(useApi(), { name })

  return (
    <>
      {fields.map(({ key, ...props }) => (
        <input key={key} {...props} />
      ))}
    </>
  )
}

export function Label({ children, ...props }: ComponentPropsWithoutRef<'label'>) {
  const { htmlFor, ...labelProps } = useLabelProps(useApi())

  // htmlFor and children are spelled out rather than left to the spread:
  // static analysis cannot see them inside it, and silencing the a11y rule in
  // an accessibility library would be the wrong trade.
  return (
    <label htmlFor={htmlFor} {...labelProps} {...props}>
      {children}
    </label>
  )
}

export function Trigger(props: ComponentPropsWithoutRef<'button'>) {
  return <button type="button" {...useTriggerProps(useApi())} {...props} />
}

export interface ValueProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  readonly placeholder?: string
  /** Renders the current selection. Defaults to comma-separated labels. */
  readonly children?: (selected: readonly unknown[]) => ReactNode
}

export function Value({ placeholder, children, ...props }: ValueProps) {
  const api = useApi()
  const selected = useSelectedValues(api)
  const visible = useVisibleOptions(api)

  const label =
    selected.length === 0
      ? placeholder
      : visible
          .filter((option) => selected.includes(option.value))
          .map((option) => option.label)
          .join(', ')

  return (
    <span data-part="value" data-placeholder={selected.length === 0 ? '' : undefined} {...props}>
      {children ? children(selected) : label}
    </span>
  )
}

export function ClearButton(props: ComponentPropsWithoutRef<'button'>) {
  const api = useApi()
  const selected = useSelectedValues(api)
  if (selected.length === 0) return null

  return (
    <button
      type="button"
      data-part="clear"
      aria-label="Очистить"
      onClick={() => api.dispatch({ type: 'clear' })}
      {...props}
    />
  )
}

export function Content(props: ComponentPropsWithoutRef<'div'>) {
  return <div {...usePopoverProps(useApi())} {...props} />
}

export function Search(props: ComponentPropsWithoutRef<'input'>) {
  return <input {...useSearchProps(useApi())} {...props} />
}

export interface ListProps<TValue> extends Omit<ComponentPropsWithoutRef<'ul'>, 'children'> {
  readonly children?: (option: SelectOption<TValue>, index: number) => ReactNode
}

/** The listbox itself — the element that directly owns the options. */
export function List<TValue>({ children, ...props }: ListProps<TValue>) {
  const api = useApi<TValue>()
  const options = useVisibleOptions(api)

  return (
    <ul {...useListboxProps(api)} {...props}>
      {options.map((option, index) =>
        children ? (
          children(option, index)
        ) : (
          <Item key={String(option.value)} option={option} index={index}>
            {option.label}
          </Item>
        ),
      )}
    </ul>
  )
}

export interface ItemProps<TValue> extends Omit<ComponentPropsWithoutRef<'li'>, 'value'> {
  readonly option: SelectOption<TValue>
  readonly index: number
}

export function Item<TValue>({ option, index, ...props }: ItemProps<TValue>) {
  const optionProps = useOptionProps(useApi<TValue>(), {
    index,
    value: option.value,
    disabled: option.disabled,
  })

  return <li {...optionProps} {...props} />
}

/** Rendered only while its enclosing option is selected. */
export function ItemIndicator({
  option,
  ...props
}: ComponentPropsWithoutRef<'span'> & { readonly option: SelectOption<unknown> }) {
  const selected = useSelectedValues(useApi())
  if (!selected.includes(option.value)) return null

  return <span data-part="indicator" aria-hidden="true" {...props} />
}

export function Empty(props: ComponentPropsWithoutRef<'div'>) {
  const api = useApi()
  const open = useIsOpen(api)
  const visible = useVisibleOptions(api)
  if (!open || visible.length > 0) return null

  return <div data-part="empty" {...props} />
}

export const Select = {
  Root,
  Label,
  Trigger,
  Value,
  ClearButton,
  Content,
  Search,
  List,
  Item,
  ItemIndicator,
  Empty,
}
