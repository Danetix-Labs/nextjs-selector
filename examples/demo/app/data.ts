import type { SelectOption } from 'nextjs-selector/core'

export const frameworks: readonly SelectOption[] = [
  { value: 'next', label: 'Next.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: 'nuxt', label: 'Nuxt', disabled: true },
]

export const countries: readonly SelectOption[] = [
  { value: 'ru', label: 'Россия', group: 'Европа' },
  { value: 'de', label: 'Германия', group: 'Европа' },
  { value: 'fr', label: 'Франция', group: 'Европа' },
  { value: 'jp', label: 'Япония', group: 'Азия' },
  { value: 'kr', label: 'Корея', group: 'Азия' },
  { value: 'br', label: 'Бразилия', group: 'Америка' },
]

export const manyOptions: readonly SelectOption[] = Array.from({ length: 10_000 }, (_, i) => ({
  value: `item-${i}`,
  label: `Позиция №${i.toLocaleString('ru-RU')}`,
}))
