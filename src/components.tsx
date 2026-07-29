'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { createContext, useContext, useId, useMemo } from 'react'

import { groupOptions, type OptionGroup } from './core/grouping.js'
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
import { Slot } from './slot.js'
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

export interface TriggerProps extends ComponentPropsWithoutRef<'button'> {
  /** Render the consumer's own element instead of a button. */
  readonly asChild?: boolean
}

export function Trigger({ asChild, ...props }: TriggerProps) {
  const triggerProps = useTriggerProps(useApi())
  if (asChild) return <Slot {...triggerProps} {...props} />

  return <button type="button" {...triggerProps} {...props} />
}

export interface ValueProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  readonly placeholder?: string
  /** Renders the current selection. Defaults to comma-separated labels. */
  readonly children?: (selected: readonly unknown[]) => ReactNode
}

export function Value({ placeholder, children, ...props }: ValueProps) {
  const api = useApi()
  const selected = useSelectedValues(api)

  const label =
    selected.length === 0
      ? placeholder
      : api
          .getAllOptions()
          .filter((option) => selected.includes(option.value))
          .map((option) => option.label)
          .join(', ')

  return (
    <span data-part="value" data-placeholder={selected.length === 0 ? '' : undefined} {...props}>
      {children ? children(selected) : label}
    </span>
  )
}

export interface ChipsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Accessible name of a chip's remove button. */
  readonly removeLabel?: (label: string) => string
}

/**
 * Selected values as removable chips.
 *
 * Belongs next to the trigger, never inside it: a chip carries its own button,
 * and nesting a button inside the trigger button is invalid HTML.
 */
export function Chips({ removeLabel, ...props }: ChipsProps) {
  const api = useApi()
  const selected = useSelectedValues(api)
  const byValue = new Map(api.getAllOptions().map((option) => [option.value, option]))
  if (selected.length === 0) return null

  return (
    <div data-part="chips" {...props}>
      {selected.map((value) => {
        const label = byValue.get(value)?.label ?? String(value)

        return (
          <span key={String(value)} data-part="chip">
            {label}
            <button
              type="button"
              data-part="chip-remove"
              aria-label={removeLabel ? removeLabel(label) : `Убрать ${label}`}
              onClick={() => api.dispatch({ type: 'remove', value })}
            >
              ×
            </button>
          </span>
        )
      })}
    </div>
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

export interface ContentProps extends ComponentPropsWithoutRef<'div'> {
  readonly asChild?: boolean
}

export function Content({ asChild, ...props }: ContentProps) {
  const popoverProps = usePopoverProps(useApi())
  if (asChild) return <Slot {...popoverProps} {...props} />

  return <div {...popoverProps} {...props} />
}

export function Search(props: ComponentPropsWithoutRef<'input'>) {
  return <input {...useSearchProps(useApi())} {...props} />
}

export interface ListProps<TValue> extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  readonly children?: (option: SelectOption<TValue>, index: number) => ReactNode
}

type RenderOption<TValue> = (option: SelectOption<TValue>, index: number) => ReactNode

function defaultRender<TValue>(option: SelectOption<TValue>, index: number) {
  return (
    <Item key={String(option.value)} option={option} index={index}>
      {option.label}
    </Item>
  )
}

/**
 * The listbox itself — the element that directly owns the options.
 *
 * Rendered as a div rather than a list: ARIA wants listbox > group > option,
 * and nested ul/li cannot express that without extra wrappers that break
 * aria-required-parent.
 */
export function List<TValue>({ children, ...props }: ListProps<TValue>) {
  const api = useApi<TValue>()
  const options = useVisibleOptions(api)
  const groups = useMemo(() => groupOptions(options), [options])
  const render = (children ?? defaultRender) as RenderOption<TValue>
  const isGrouped = groups.some((group) => group.label !== undefined)

  return (
    <div {...useListboxProps(api)} {...props}>
      {isGrouped
        ? groups.map((group) => (
            <Group key={group.label ?? '\u0000'} group={group} render={render} />
          ))
        : options.map((option, index) => render(option, index))}
    </div>
  )
}

function Group<TValue>({
  group,
  render,
}: {
  readonly group: OptionGroup<TValue>
  readonly render: RenderOption<TValue>
}) {
  const labelId = useId()

  if (group.label === undefined) {
    return <>{group.options.map(({ option, index }) => render(option, index))}</>
  }

  return (
    <div role="group" aria-labelledby={labelId} data-part="group">
      <div id={labelId} data-part="group-label">
        {group.label}
      </div>
      {group.options.map(({ option, index }) => render(option, index))}
    </div>
  )
}

export interface ItemProps<TValue> extends Omit<ComponentPropsWithoutRef<'div'>, 'value'> {
  readonly option: SelectOption<TValue>
  readonly index: number
  /** Render the consumer's own element instead of a div. */
  readonly asChild?: boolean
}

export function Item<TValue>({ option, index, asChild, ...props }: ItemProps<TValue>) {
  const optionProps = useOptionProps(useApi<TValue>(), {
    index,
    value: option.value,
    disabled: option.disabled,
  })
  if (asChild) return <Slot {...optionProps} {...props} />

  return <div {...optionProps} {...props} />
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
  Chips,
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
