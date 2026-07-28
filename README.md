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

## Использование

Ядро headless: логика, клавиатура и ARIA — ваши разметка и стили.

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

### Производительность

Состояние живёт во внешнем store, а компоненты подписываются на отдельные
булевы срезы через `useSyncExternalStore`. Перемещение подсветки перерисовывает
две опции — ту, что её теряет, и ту, что получает, — независимо от длины списка.
Это закреплено тестом.

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
