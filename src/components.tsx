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
  useStatus,
  useTriggerProps,
  useVisibleOptions,
} from './props.js'
import { Slot } from './slot.js'
import type { SelectOption } from './types.js'
import { type SelectApi, type UseSelectConfig, useSelect } from './useSelect.js'
import { useVirtual } from './virtual.js'

const SelectContext = createContext<SelectApi<unknown, SelectOption<unknown>> | null>(null)

function useApi<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>(): SelectApi<
  TValue,
  TOption
> {
  const api = useContext(SelectContext)
  if (!api) throw new Error('Компоненты Select должны быть внутри <Select.Root>')

  return api as unknown as SelectApi<TValue, TOption>
}

export interface RootProps<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>
  extends UseSelectConfig<TValue, TOption> {
  readonly children: ReactNode
  /** Enables hidden form fields under this name. */
  readonly name?: string
  readonly className?: string
}

/**
 * Owns the state and shares it through context.
 *
 * The context value is the stable api handle, so nothing re-renders merely
 * because it is provided. Pieces that depend on state subscribe themselves.
 */
export function Root<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>({
  children,
  name,
  className,
  ...config
}: RootProps<TValue, TOption>) {
  const api = useSelect<TValue, TOption>(config)

  // A real element, not just a provider: browsers without anchor positioning
  // need a positioned ancestor for the listbox to fall back to.
  return (
    <SelectContext.Provider value={api as unknown as SelectApi<unknown, SelectOption<unknown>>}>
      <div data-part="root" className={className}>
        {children}
        {name ? <HiddenFields name={name} /> : null}
      </div>
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

export interface ListProps<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  readonly children?: (option: TOption, index: number) => ReactNode
}

type RenderOption<TOption> = (option: TOption, index: number) => ReactNode

function defaultRender<TValue>(option: SelectOption<TValue>, index: number) {
  return (
    <Item key={String(option.value)} option={option} index={index}>
      <span data-part="option-label">{option.label}</span>
      {option.description === undefined ? null : (
        <span data-part="option-description">{option.description}</span>
      )}
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
export function List<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>({
  children,
  ...props
}: ListProps<TValue, TOption>) {
  const api = useApi<TValue, TOption>()
  const options = useVisibleOptions(api)
  const groups = useMemo(() => groupOptions(options), [options])
  const render = (children ?? defaultRender) as RenderOption<TOption>
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

function Group<TOption>({
  group,
  render,
}: {
  readonly group: OptionGroup<TOption>
  readonly render: RenderOption<TOption>
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

export interface VirtualizedProps<
  TValue,
  TOption extends SelectOption<TValue> = SelectOption<TValue>,
> extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Fixed row height in pixels. */
  readonly itemHeight: number
  readonly overscan?: number
  readonly children?: (option: TOption, index: number) => ReactNode
}

/**
 * Listbox that renders only the rows in view.
 *
 * Swap it in for `List` when the option count runs into the thousands; the
 * spacers reserve the height of everything outside the window and are marked
 * presentational so they stay out of the accessibility tree.
 */
export function Virtualized<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>({
  itemHeight,
  overscan,
  children,
  ...props
}: VirtualizedProps<TValue, TOption>) {
  const api = useApi<TValue, TOption>()
  const options = useVisibleOptions(api)
  const virtual = useVirtual(api, { count: options.length, itemHeight, overscan })
  const render = (children ?? defaultRender) as RenderOption<TOption>
  const { window: bounds } = virtual

  return (
    <div {...useListboxProps(api)} {...virtual.scrollProps} {...props}>
      <div role="presentation" style={virtual.topSpacerStyle} />
      {options
        .slice(bounds.start, bounds.end)
        .map((option, offset) => render(option, bounds.start + offset))}
      <div role="presentation" style={virtual.bottomSpacerStyle} />
    </div>
  )
}

export interface ItemProps<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>
  extends Omit<ComponentPropsWithoutRef<'div'>, 'value'> {
  readonly option: TOption
  readonly index: number
  /** Render the consumer's own element instead of a div. */
  readonly asChild?: boolean
}

export function Item<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>({
  option,
  index,
  asChild,
  ...props
}: ItemProps<TValue, TOption>) {
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

/** Rendered while an async load is in flight. */
export function Loading(props: ComponentPropsWithoutRef<'div'>) {
  const status = useStatus(useApi())
  if (status !== 'loading') return null

  return <div data-part="loading" role="status" aria-live="polite" {...props} />
}

/** Rendered when the last async load failed. */
export function LoadError(props: ComponentPropsWithoutRef<'div'>) {
  const status = useStatus(useApi())
  if (status !== 'error') return null

  return <div data-part="error" role="status" aria-live="polite" {...props} />
}

export function Empty(props: ComponentPropsWithoutRef<'div'>) {
  const api = useApi()
  const open = useIsOpen(api)
  const visible = useVisibleOptions(api)
  const status = useStatus(api)
  // Silence during a load: "nothing found" would be a lie in flight.
  if (!open || visible.length > 0 || status !== 'idle') return null

  return <div data-part="empty" {...props} />
}

const parts = {
  Root,
  Chips,
  Loading,
  LoadError,
  Label,
  Trigger,
  Value,
  ClearButton,
  Content,
  Search,
  List,
  Virtualized,
  Item,
  ItemIndicator,
  Empty,
}

export { parts as selectParts }
