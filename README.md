# nextjs-selector

[![CI](https://github.com/Danetix-Labs/nextjs-selector/actions/workflows/ci.yml/badge.svg)](https://github.com/Danetix-Labs/nextjs-selector/actions/workflows/ci.yml)

## Установка

```bash
npm install nextjs-selector
```

Требования: Node.js >= 18.17.0.

## Совместимость

CI проверяет на каждом push и PR:

| Проверка | Покрытие |
| --- | --- |
| Установка тарбола в чистый проект | Node.js 18, 20, 22, 24 — ESM и CJS |
| Резолв типов | `node10`, `node16` (CJS и ESM), `bundler` |
| Условия экспорта | `import`, `require`, fallback `default` под `--conditions=react-server` |
| Сборка Next.js | 14 (webpack, React 18), 15 (webpack, React 19), 16 (Turbopack и `--webpack`, React 19.2) |
| Роутеры Next.js | App Router (Server + Client Components) и Pages Router |

## Точки входа

| Импорт | Что внутри | Где работает |
| --- | --- | --- |
| `nextjs-selector` | компоненты + весь headless-слой | Client Components |
| `nextjs-selector/headless` | хуки без разметки | Client Components |
| `nextjs-selector/core` | чистый автомат состояния, без React | где угодно, включая RSC |

`core` не содержит ни `'use client'`, ни импортов React, поэтому фильтрацию,
переходы состояния и расчёт окна можно выполнять на сервере. CI проверяет это
запуском под `--conditions=react-server`.

## Использование

### Составные компоненты

```tsx
'use client'

import { Select } from 'nextjs-selector'

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte', disabled: true },
]

export function Picker() {
  return (
    <Select.Root options={options} multiple name="stack">
      <Select.Label>Технологии</Select.Label>
      <Select.Trigger>
        <Select.Value placeholder="Выберите" />
        <Select.ClearButton>×</Select.ClearButton>
      </Select.Trigger>
      <Select.Content>
        <Select.Search aria-label="Поиск" />
        <Select.Empty>Ничего не найдено</Select.Empty>
        <Select.List />
      </Select.Content>
    </Select.Root>
  )
}
```

`name` включает скрытые поля формы: значение видно `FormData`, обычной отправке
и Server Actions React 19 — без JavaScript на принимающей стороне.

Части подменяются по одной. `Select.List` принимает функцию, если нужен свой
рендер строки:

```tsx
<Select.List>
  {(option, index) => (
    <Select.Item option={option} index={index}>
      <Select.ItemIndicator option={option}>✓</Select.ItemIndicator>
      {option.label}
    </Select.Item>
  )}
</Select.List>
```

### Headless

Когда нужна своя разметка целиком — логика, клавиатура и ARIA без единого
элемента от библиотеки.

```tsx
'use client'

import {
  useSelect, useTriggerProps, useListboxProps, useOptionProps,
  useSearchProps, useLabelProps, useSelectedValues,
} from 'nextjs-selector'

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte', disabled: true },
]

function Option({ api, index, option }) {
  return <li {...useOptionProps(api, { index, value: option.value, disabled: option.disabled })}>
    {option.label}
  </li>
}

export function Picker() {
  const api = useSelect({ options, multiple: true })
  const selected = useSelectedValues(api)

  return (
    <div>
      <label {...useLabelProps(api)}>Технологии</label>
      <button type="button" {...useTriggerProps(api)}>{selected.join(', ') || 'Выберите'}</button>
      <input {...useSearchProps(api)} />
      <ul {...useListboxProps(api)}>
        {api.getVisibleOptions().map((option, index) => (
          <Option key={option.value} api={api} index={index} option={option} />
        ))}
      </ul>
    </div>
  )
}
```

### Стилизация

Состояние выражено data-атрибутами, поэтому подходит любой способ писать стили —
Tailwind не обязателен.

```css
[data-part='option'][data-highlighted] { background: #eef; }
[data-part='option'][data-selected]    { font-weight: 600; }
[data-part='option'][data-disabled]    { opacity: 0.5; }
[data-part='trigger'][data-state='open'] { border-color: #66f; }
```

```tsx
<li {...props} className="data-highlighted:bg-indigo-50 data-selected:font-semibold" />
```

Части: `label`, `trigger`, `search`, `listbox`, `option`.
Состояния: `data-state="open|closed"`, `data-highlighted`, `data-selected`,
`data-disabled`, `data-multiple`.

### Возможности

| Что | Как |
| --- | --- |
| Одиночный и множественный выбор | `multiple` |
| Поиск | `Select.Search`, свой `filter` |
| Группы | поле `group` в опции |
| Чипы с удалением | `Select.Chips` |
| Создание на лету | `creatable`, `onCreate` |
| Асинхронная загрузка | `loadOptions`, `debounceMs`, `Select.Loading`, `Select.LoadError` |
| Большие списки | `Select.Virtualized` или хук `useVirtual` |
| Состояния | `disabled`, `readOnly`, `required`, `invalid` |
| Формы и Server Actions | `name` на `Select.Root` |
| Подмена элемента | `asChild` на `Trigger`, `Item`, `Content` |
| Контролируемый режим | `value` + `onValueChange` |

### Позиционирование

`usePopoverProps` использует нативный Popover API и CSS anchor positioning —
браузер сам даёт top layer, закрытие по клику вне и по Esc. Где API нет, список
рендерится в обычном потоке, а `data-state` скрывает его в CSS: чистое
прогрессивное улучшение, без JS-вычислений позиции и без floating-ui.

```tsx
<button {...useTriggerProps(api)} style={useAnchorStyle(api)}>…</button>
<ul {...usePopoverProps(api)}>…</ul>
```

Опционально — базовые стили позиционирования:

```ts
import 'nextjs-selector/styles.css'
```

### Клавиатура

По паттерну APG combobox: `↑↓`, `Home`/`End`, `PageUp`/`PageDown`, `Enter`,
`Esc`, `Tab`, typeahead по набранным буквам (повтор буквы перебирает опции на
неё, как в нативном `<select>`), `Backspace` снимает последнее значение
в множественном режиме.

### Большие списки

```tsx
const virtual = useVirtual(api, { count: visible.length, itemHeight: 32 })
```

В DOM попадает только видимое окно плюс overscan, подсветка удерживается
в зоне видимости. Тест поднимает 10 000 опций и проверяет, что узлов меньше 25.

### Производительность

Состояние живёт во внешнем store, а компоненты подписываются на отдельные
булевы срезы через `useSyncExternalStore`. Перемещение подсветки перерисовывает
две опции — ту, что её теряет, и ту, что получает, — независимо от длины списка.
Это закреплено тестом.

### Доступность

Тесты прогоняют axe в закрытом и открытом состоянии, с группами, чипами,
виртуализацией, состояниями и при `dir="rtl"`. Автоматический аудит
ловит структурные ошибки ARIA, но не заменяет проверку живым скринридером:
прогонов в NVDA, JAWS и VoiceOver ещё не было, поэтому соответствие WCAG 2.2 AA
пока не заявляется.

## Разработка

```bash
npm install
npm run dev            # сборка в watch-режиме
npm run test           # vitest run
npm run lint           # biome check
npm run format         # biome check --write
npm run typecheck      # tsc --noEmit
npm run build          # сборка dist/ (ESM + CJS + типы)
npm run check:exports  # publint + are-the-types-wrong
npm run check          # всё вышеперечисленное разом
```

Сборка требует Node.js `^22.18.0 || >=24.11.0` (требование tsdown).

> `check:exports` вызывает `npm pack`, поэтому его нельзя запускать из
> `prepublishOnly` — вложенный `npm pack` внутри `npm publish` ломается.
> Проверки живут в отдельном скрипте `check` и вызываются до публикации.

## Релиз

Версионирование через [Changesets](https://github.com/changesets/changesets):

```bash
npx changeset          # описать изменение
npx changeset version  # поднять версию и обновить CHANGELOG
npm run release        # check + changeset publish
```

## Лицензия

[MIT](./LICENSE) © Danetix-Labs
