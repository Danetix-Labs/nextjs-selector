import { expect, test } from '@playwright/test'

/**
 * The stylesheet ships as a file, so a mis-scoped rule cannot be caught by
 * unit tests — only by measuring what the browser actually applied.
 */
test.describe('таблица стилей', () => {
  test('обычный список не растягивается на весь экран', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Множественный выбор' })
      .locator('[data-part="root"]')
      .first()
    await root.getByRole('combobox').click()

    const listbox = root.getByRole('listbox')
    const maxHeight = await listbox.evaluate((el) => getComputedStyle(el).maxHeight)

    // 20rem — базовое значение; 85vh означало бы, что правило шторки утекло.
    expect(maxHeight).toBe('320px')
  })

  test('в режиме шторки список ограничен высотой шторки', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Нижняя шторка' })
      .locator('[data-part="root"]')
      .first()
    await root.getByRole('combobox').scrollIntoViewIfNeeded()
    await root.getByRole('combobox').click()

    const listbox = root.getByRole('listbox')
    const maxHeight = await listbox.evaluate((el) => Number.parseFloat(getComputedStyle(el).maxHeight))

    // 85vh минус место под поиском — заметно больше базовых 320px.
    expect(maxHeight).toBeGreaterThan(400)
  })
})
