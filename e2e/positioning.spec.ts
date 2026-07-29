import { expect, test, type Locator, type Page } from '@playwright/test'

/** Section headings on the demo page, used to scope each widget. */
const BASIC = 'Одиночный выбор'
const VIRTUAL = 'Десять тысяч опций'
const FORM = 'Форма и Server Action'
const ASYNC = 'Асинхронная загрузка'

function widget(page: Page, heading: string): Locator {
  return page.locator('section').filter({ hasText: heading }).locator('[data-part="root"]').first()
}

async function box(locator: Locator) {
  const value = await locator.boundingBox()
  if (!value) throw new Error('элемент не отрисован')

  return value
}

test.describe('позиционирование списка', () => {
  test('список встаёт под своим триггером, а не в углу страницы', async ({ page }) => {
    await page.goto('/')

    const root = widget(page, BASIC)
    const trigger = root.getByRole('combobox')
    await trigger.click()

    const content = root.locator('[data-part="content"]')
    await expect(content).toBeVisible()

    const triggerBox = await box(trigger)
    const contentBox = await box(content)

    // Сразу под триггером: верх списка рядом с низом кнопки.
    expect(contentBox.y).toBeGreaterThanOrEqual(triggerBox.y)
    expect(contentBox.y - (triggerBox.y + triggerBox.height)).toBeLessThan(24)

    // По горизонтали выровнен с триггером, а не уехал вбок.
    expect(Math.abs(contentBox.x - triggerBox.x)).toBeLessThan(24)
    expect(Math.abs(contentBox.width - triggerBox.width)).toBeLessThan(24)
  })

  test('виртуализованный список тоже привязан к триггеру', async ({ page }) => {
    await page.goto('/')

    const root = widget(page, VIRTUAL)
    const trigger = root.getByRole('combobox')
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()

    const content = root.locator('[data-part="content"]')
    await expect(content).toBeVisible()

    const triggerBox = await box(trigger)
    const contentBox = await box(content)

    expect(Math.abs(contentBox.x - triggerBox.x)).toBeLessThan(24)
    expect(contentBox.y).toBeGreaterThan(triggerBox.y)
    // Именно этот случай уезжал в правый нижний угол.
    expect(contentBox.y - (triggerBox.y + triggerBox.height)).toBeLessThan(24)
  })

  test('у нижнего края список переворачивается вверх, а не уходит за экран', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 })
    await page.goto('/')

    const root = widget(page, ASYNC)
    const trigger = root.getByRole('combobox')
    // Прокручиваем так, чтобы триггер оказался у самого низа вьюпорта.
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()

    const content = root.locator('[data-part="content"]')
    await expect(content).toBeVisible()
    await expect(content).toHaveAttribute('data-side', 'top')

    const contentBox = await box(content)
    const triggerBox = await box(trigger)
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('нет размеров вьюпорта')

    // Целиком на экране и выше триггера.
    expect(contentBox.y).toBeGreaterThanOrEqual(-1)
    expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(viewport.height + 1)
    expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(triggerBox.y + 1)
  })

  test('когда места снизу хватает, список остаётся под триггером', async ({ page }) => {
    await page.goto('/')

    const content = widget(page, FORM).locator('[data-part="content"]')
    const trigger = widget(page, FORM).getByRole('combobox')
    await page.mouse.wheel(0, -2000)
    await trigger.click()

    await expect(content).toHaveAttribute('data-side', 'bottom')
  })

  test('список едет вместе с триггером при прокрутке', async ({ page }) => {
    await page.goto('/')

    const root = widget(page, BASIC)
    const trigger = root.getByRole('combobox')
    await trigger.click()

    const before = await box(root.locator('[data-part="content"]'))
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(150)

    const triggerAfter = await box(trigger)
    const contentAfter = await box(root.locator('[data-part="content"]'))

    expect(contentAfter.y).not.toBe(before.y)
    expect(contentAfter.y - (triggerAfter.y + triggerAfter.height)).toBeLessThan(24)
  })
})

test.describe('поведение в браузере', () => {
  test('клик вне закрывает список', async ({ page }) => {
    await page.goto('/')

    const root = widget(page, BASIC)
    const trigger = root.getByRole('combobox')
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await page.locator('h1').click()

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('выбор мышью попадает в триггер', async ({ page }) => {
    await page.goto('/')

    const root = widget(page, BASIC)
    const trigger = root.getByRole('combobox')
    await trigger.click()
    await root.getByRole('option', { name: 'Remix' }).click()

    await expect(trigger).toContainText('Remix')
  })

  test('виртуализация держит в DOM единицы строк из десяти тысяч', async ({ page }) => {
    await page.goto('/')

    const root = widget(page, VIRTUAL)
    await root.getByRole('combobox').scrollIntoViewIfNeeded()
    await root.getByRole('combobox').click()

    const rendered = await root.locator('[data-part="option"]').count()
    expect(rendered).toBeGreaterThan(0)
    expect(rendered).toBeLessThan(30)
  })
})

test.describe('нижняя шторка', () => {
  const SHEET = 'Нижняя шторка'

  test('на узком экране список прилипает к низу во всю ширину', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    await page.goto('/')

    const root = widget(page, SHEET)
    await root.getByRole('combobox').scrollIntoViewIfNeeded()
    await root.getByRole('combobox').click()

    const content = root.locator('[data-part="content"]')
    await expect(content).toHaveAttribute('data-mode', 'sheet')

    const contentBox = await box(content)
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('нет размеров вьюпорта')

    expect(Math.abs(contentBox.y + contentBox.height - viewport.height)).toBeLessThan(2)
    expect(Math.abs(contentBox.width - viewport.width)).toBeLessThan(2)
  })

  test('на широком экране тот же виджет остаётся выпадающим списком', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const root = widget(page, SHEET)
    await root.getByRole('combobox').scrollIntoViewIfNeeded()
    await root.getByRole('combobox').click()

    await expect(root.locator('[data-part="content"]')).toHaveAttribute('data-mode', 'dropdown')
  })

  test('виджет без опции шторкой не становится даже на узком экране', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    await page.goto('/')

    const root = widget(page, BASIC)
    await root.getByRole('combobox').click()

    await expect(root.locator('[data-part="content"]')).toHaveAttribute('data-mode', 'dropdown')
  })
})
