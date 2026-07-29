import {
  AsChildSelect,
  AsyncSelect,
  BasicSelect,
  CreatableSelect,
  MultiWithSearch,
  StatesSelect,
  VirtualizedSelect,
} from './demos'
import { FormDemo } from './form-demo'
import { IconGrid, SheetSelect, StatusSelect } from './rich'

/**
 * A Server Component: the page itself ships no JavaScript. Only the widgets
 * below cross into the client, each behind its own 'use client' boundary.
 */
export default function Page() {
  return (
    <main>
      <header>
        <h1>nextjs-selector</h1>
        <p>
          Доступный select и multi-select. Стили на этой странице — обычный CSS по data-атрибутам:
          ни Tailwind, ни CSS-in-JS не требуются.
        </p>
      </header>

      <section>
        <h2>Одиночный выбор</h2>
        <p>Клавиатура по APG: стрелки, Home/End, набор букв, Esc.</p>
        <BasicSelect />
      </section>

      <section>
        <h2>Множественный выбор с поиском и группами</h2>
        <p>Чипы удаляются по отдельности, Backspace снимает последний.</p>
        <MultiWithSearch />
      </section>

      <section>
        <h2>Асинхронная загрузка</h2>
        <p>Запросы схлопываются по debounce, устаревшие ответы отбрасываются.</p>
        <AsyncSelect />
      </section>

      <section>
        <h2>Создание опций на лету</h2>
        <p>Введите название, которого нет в списке.</p>
        <CreatableSelect />
      </section>

      <section>
        <h2>Десять тысяч опций</h2>
        <p>В DOM попадает только видимое окно, подсветка держится в зоне видимости.</p>
        <VirtualizedSelect />
      </section>

      <section>
        <h2>Иконки, галочка и подпись под пунктом</h2>
        <p>Раскладка пункта — ваша разметка через функцию-рендер.</p>
        <StatusSelect />
      </section>

      <section>
        <h2>Нижняя шторка на узком экране</h2>
        <p>
          Опция включается для каждого виджета отдельно. Сузьте окно до 640 пикселей — список
          превратится в шторку; разметка и поведение те же.
        </p>
        <SheetSelect />
      </section>

      <section>
        <h2>Сетка</h2>
        <p>
          Сетку задаёт ваш CSS; библиотеке нужно знать только число столбцов, чтобы стрелки ходили в
          двух измерениях.
        </p>
        <IconGrid />
      </section>

      <section>
        <h2>Состояния</h2>
        <StatesSelect />
      </section>

      <section>
        <h2>Подмена элемента через asChild</h2>
        <p>Поведение и ARIA переносятся на ваш элемент, роль и id остаются за библиотекой.</p>
        <AsChildSelect />
      </section>

      <section>
        <h2>Форма и Server Action</h2>
        <p>Значение уходит через скрытые поля, поэтому работает и без JavaScript.</p>
        <FormDemo />
      </section>
    </main>
  )
}
