import { expect, test } from '@playwright/test'

/**
 * Numbers behind the claims.
 *
 * Thresholds are deliberately loose — this guards against a regression of an
 * order of magnitude, not against CI being a slow day. A tight budget on
 * shared runners produces noise, and noisy tests get ignored.
 */
test.describe('производительность', () => {
  test('десять тысяч опций открываются без задержки', async ({ page }) => {
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Десять тысяч опций' })
      .locator('[data-part="root"]')
      .first()
    const trigger = root.getByRole('combobox')
    await trigger.scrollIntoViewIfNeeded()

    const started = Date.now()
    await trigger.click()
    // Скоуп обязателен: на странице есть опции и других виджетов.
    await root.locator('[data-part="option"]').first().waitFor()
    const elapsed = Date.now() - started

    // react-select на этом объёме тратит секунды.
    expect(elapsed).toBeLessThan(1000)
  })

  test('в DOM остаются единицы строк, а не тысячи', async ({ page }) => {
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Десять тысяч опций' })
      .locator('[data-part="root"]')
      .first()
    await root.getByRole('combobox').scrollIntoViewIfNeeded()
    await root.getByRole('combobox').click()

    const nodes = await root.locator('[data-part="option"]').count()
    expect(nodes).toBeLessThan(30)
  })

  test('навигация по длинному списку не деградирует', async ({ page }) => {
    await page.goto('/')

    const trigger = page
      .locator('section')
      .filter({ hasText: 'Десять тысяч опций' })
      .locator('[data-part="root"]')
      .first()
      .getByRole('combobox')
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()

    const started = Date.now()
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowDown')
    const perKey = (Date.now() - started) / 40

    expect(perKey).toBeLessThan(60)
  })

  test('ввод в поиске остаётся отзывчивым на длинном списке', async ({ page }) => {
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Десять тысяч опций' })
      .locator('[data-part="root"]')
      .first()
    await root.getByRole('combobox').scrollIntoViewIfNeeded()
    await root.getByRole('combobox').click()

    const started = Date.now()
    // toLocaleString ставит неразрывный пробел — сверяем по цифрам.
    await root.getByRole('searchbox').fill('1')
    await expect(root.locator('[data-part="option"]').first()).toContainText(/Позиция/)
    const elapsed = Date.now() - started

    expect(elapsed).toBeLessThan(1500)
  })
})
