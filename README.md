# nextjs-selector

[![CI](https://github.com/Danetix-Labs/nextjs-selector/actions/workflows/ci.yml/badge.svg)](https://github.com/Danetix-Labs/nextjs-selector/actions/workflows/ci.yml)

## Установка

```bash
npm install nextjs-selector
```

Требования: Node.js >= 18.17.0.

## Использование

```ts
import {} from 'nextjs-selector'
```

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
