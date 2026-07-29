---
'nextjs-selector': minor
---

Подгрузка страницами: `loadOptions` принимает курсор и может вернуть
`{ options, nextCursor }`. Компонент `Select.LoadMore` догружает следующую
страницу при прокрутке к концу списка.
