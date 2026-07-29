'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react'

import { groupOptions, type OptionGroup } from './core/grouping.js'
import { highlightMatches } from './core/highlight.js'
import { useFormFields } from './form.js'
import { type PopoverOptions, usePopoverProps } from './popover.js'
import {
  useHasMore,
  useIsOpen,
  useLabelProps,
  useListboxProps,
  useOptionProps,
  useQuery,
  useSearchProps,
  useSelectedValues,
  useStatus,
  useTriggerProps,
  useVisibleOptions,
} from './props.js'
import { useStoreSlice } from './react/useStoreSlice.js'
import { Slot } from './slot.js'
import type { SelectOption, SelectState } from './types.js'
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

  // Mapped over the selection, not filtered from the options: the order the
  // user picked in is meaningful, and reordering must show up here.
  const byValue = new Map(api.getAllOptions().map((option) => [option.value, option.label]))
  const label =
    selected.length === 0
      ? placeholder
      : selected.map((value) => byValue.get(value) ?? String(value)).join(', ')

  return (
    <span data-part="value" data-placeholder={selected.length === 0 ? '' : undefined} {...props}>
      {children ? children(selected) : label}
    </span>
  )
}

export interface ChipsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Accessible name of a chip's remove button. */
  readonly removeLabel?: (label: string) => string
  /**
   * Lets chips be dragged into a different order.
   *
   * Uses native HTML drag and drop — no dependency, and keyboard users get the
   * same reordering through Alt+Arrow, which pointer-only libraries skip.
   */
  readonly reorderable?: boolean
}

/**
 * Selected values as removable chips.
 *
 * Belongs next to the trigger, never inside it: a chip carries its own button,
 * and nesting a button inside the trigger button is invalid HTML.
 */
export function Chips({ removeLabel, reorderable = false, ...props }: ChipsProps) {
  const api = useApi()
  const selected = useSelectedValues(api)
  const dragging = useRef<number | null>(null)
  const byValue = new Map(api.getAllOptions().map((option) => [option.value, option]))
  if (selected.length === 0) return null

  const move = (from: number, to: number) => api.dispatch({ type: 'reorder', from, to })

  const chips = (
    <>
      {selected.map((value, index) => {
        const label = byValue.get(value)?.label ?? String(value)

        return (
          <span
            key={String(value)}
            data-part="chip"
            // A reorderable chip is a list item the user can act on; without
            // the role its handlers would sit on a bare span.
            role={reorderable ? 'listitem' : undefined}
            draggable={reorderable || undefined}
            onDragStart={reorderable ? () => (dragging.current = index) : undefined}
            onDragOver={reorderable ? (event) => event.preventDefault() : undefined}
            onDrop={
              reorderable
                ? (event) => {
                    event.preventDefault()
                    if (dragging.current !== null) move(dragging.current, index)
                    dragging.current = null
                  }
                : undefined
            }
            // Keyboard equivalent of the drag: reordering must not be
            // pointer-only.
            onKeyDown={
              reorderable
                ? (event) => {
                    if (!event.altKey) return
                    if (event.key === 'ArrowLeft') move(index, index - 1)
                    else if (event.key === 'ArrowRight') move(index, index + 1)
                    else return
                    event.preventDefault()
                  }
                : undefined
            }
            tabIndex={reorderable ? 0 : undefined}
          >
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
    </>
  )

  if (!reorderable) {
    return (
      <div data-part="chips" {...props}>
        {chips}
      </div>
    )
  }

  // Two branches rather than conditional attributes: a role computed at
  // runtime is invisible to static analysis, which then reads this as a bare
  // div carrying a label it cannot support.
  return (
    <div
      data-part="chips"
      role="list"
      // Said once on the list: `listitem` takes no label, and repeating the
      // hint on every chip would be noise in a screen reader.
      aria-label="Выбранные значения, Alt со стрелками меняет порядок"
      {...props}
    >
      {chips}
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

export interface ContentProps extends ComponentPropsWithoutRef<'div'>, PopoverOptions {
  readonly asChild?: boolean
}

export function Content({ asChild, topLayer, sheet, sheetMedia, ...props }: ContentProps) {
  const popoverProps = usePopoverProps(useApi(), { topLayer, sheet, sheetMedia })
  if (asChild) return <Slot {...popoverProps} {...props} />

  return <div {...popoverProps} {...props} />
}

export function Search(props: ComponentPropsWithoutRef<'input'>) {
  return <input {...useSearchProps(useApi())} {...props} />
}

/**
 * The option's label with the current query highlighted.
 *
 * Splitting happens on a normalized copy, so a label keeps its case and its
 * diacritics while only the highlight moves.
 */
export function Highlight({
  text,
  ...props
}: ComponentPropsWithoutRef<'span'> & { readonly text: string }) {
  const query = useQuery(useApi())
  const segments = useMemo(() => highlightMatches(text, query), [text, query])

  return (
    <span {...props}>
      {segments.map((segment, index) =>
        segment.matched ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional by nature
          <mark key={index} data-part="match">
            {segment.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional by nature
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  )
}

/**
 * Takes back the last removal.
 *
 * Renders nothing when there is nothing to take back, and any other change to
 * the selection clears the offer — an undo that resurrects something the user
 * has forgotten about is worse than no undo at all.
 */
export function UndoRemove(props: ComponentPropsWithoutRef<'button'>) {
  const api = useApi()
  const undo = useStoreSlice(
    api.store,
    useCallback((state: SelectState<unknown, SelectOption<unknown>>) => state.undo, []),
  )
  if (!undo) return null

  return (
    <button
      type="button"
      data-part="undo"
      onClick={() => api.dispatch({ type: 'undoRemove' })}
      {...props}
    />
  )
}

/** Selects every enabled option, up to `max`. */
export function SelectAllButton(props: ComponentPropsWithoutRef<'button'>) {
  const api = useApi()

  return (
    <button
      type="button"
      data-part="select-all"
      onClick={() => api.dispatch({ type: 'selectAll' })}
      {...props}
    />
  )
}

/**
 * Pinned area above the list — a counter, a hint, a filter.
 *
 * Lives outside the listbox on purpose: a listbox may only contain options and
 * groups, so anything else here would break aria-required-children.
 */
export function Header(props: ComponentPropsWithoutRef<'div'>) {
  return <div data-part="header" {...props} />
}

/** Pinned area below the list — actions like «Create», «Manage», «Clear». */
export function Footer(props: ComponentPropsWithoutRef<'div'>) {
  return <div data-part="footer" {...props} />
}

/** Number of currently selected values, for counters in a header. */
export function useSelectedCount(): number {
  return useSelectedValues(useApi()).length
}

export interface ListProps<TValue, TOption extends SelectOption<TValue> = SelectOption<TValue>>
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  readonly children?: (option: TOption, index: number) => ReactNode
}

type RenderOption<TOption> = (option: TOption, index: number) => ReactNode

function defaultRender<TValue>(option: SelectOption<TValue>, index: number) {
  return (
    <Item key={String(option.value)} option={option} index={index}>
      <Highlight data-part="option-label" text={option.label} />
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
  /** Fixed row height in pixels. Omit and pass `estimateHeight` for variable rows. */
  readonly itemHeight?: number
  /** Starting guess for rows of unknown height. */
  readonly estimateHeight?: number
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
  estimateHeight,
  overscan,
  children,
  ...props
}: VirtualizedProps<TValue, TOption>) {
  const api = useApi<TValue, TOption>()
  const options = useVisibleOptions(api)
  const virtual = useVirtual(api, { count: options.length, itemHeight, estimateHeight, overscan })
  const render = (children ?? defaultRender) as RenderOption<TOption>
  const { window: bounds } = virtual

  return (
    <div {...useListboxProps(api)} {...virtual.scrollProps} {...props}>
      <div role="presentation" style={virtual.topSpacerStyle} />
      {options.slice(bounds.start, bounds.end).map((option, offset) => {
        const index = bounds.start + offset

        // Variable rows report their height; fixed rows need no wrapper.
        return itemHeight === undefined ? (
          <div key={String(option.value)} ref={virtual.measureItem(index)}>
            {render(option, index)}
          </div>
        ) : (
          render(option, index)
        )
      })}
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

/**
 * Sentinel that asks for the next page when it scrolls into view.
 *
 * Renders nothing once the source says there is no more; put it at the end of
 * the list. Without IntersectionObserver it degrades to a button, so the last
 * page is still reachable.
 */
export function LoadMore({ children = 'Показать ещё', ...props }: ComponentPropsWithoutRef<'div'>) {
  const api = useApi()
  const hasMore = useHasMore(api)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!hasMore || !element || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) api.loadMore()
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, api])

  if (!hasMore) return null

  return (
    <div ref={ref} data-part="load-more" {...props}>
      <button type="button" onClick={() => api.loadMore()}>
        {children}
      </button>
    </div>
  )
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
  LoadMore,
  Header,
  Footer,
  Highlight,
  SelectAllButton,
  UndoRemove,
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
