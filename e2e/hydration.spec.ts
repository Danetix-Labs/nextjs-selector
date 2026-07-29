import { expect, test } from '@playwright/test'

/**
 * Hydration mismatches only show up in a real browser against real SSR output.
 *
 * The widget defers every feature detection until after mount precisely so the
 * server and client markup agree — this is what proves it.
 */
test.describe('гидратация', () => {
  test('страница гидратируется без предупреждений React', async ({ page }) => {
    const complaints: string[] = []

    page.on('console', (message) => {
      if (message.type() !== 'error' && message.type() !== 'warning') return

      const text = message.text()
      if (/hydrat|did not match|mismatch|server.*client/i.test(text)) complaints.push(text)
    })
    page.on('pageerror', (error) => complaints.push(error.message))

    await page.goto('/', { waitUntil: 'networkidle' })

    // Виджеты интерактивны — значит гидратация действительно прошла.
    const trigger = page
      .locator('section')
      .filter({ hasText: 'Одиночный выбор' })
      .getByRole('combobox')
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    expect(complaints).toEqual([])
  })

  test('серверная разметка не содержит следов фичедетекта', async ({ page }) => {
    const response = await page.request.get('/')
    const html = await response.text()

    // Определяется после монтирования, иначе сервер и клиент разошлись бы.
    expect(html).not.toContain('popover="auto"')
    expect(html).not.toContain('data-mode="sheet"')
    // А то, что от платформы не зависит, на месте уже в ответе сервера.
    expect(html).toContain('role="combobox"')
    expect(html).toContain('data-part="announcer"')
  })

  test('шторка включается только после монтирования', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    await page.goto('/', { waitUntil: 'networkidle' })

    const content = page
      .locator('section')
      .filter({ hasText: 'Нижняя шторка' })
      .locator('[data-part="content"]')
      .first()

    // На клиенте режим уже определён, хотя сервер о нём ничего не знал.
    await expect(content).toHaveAttribute('data-mode', 'sheet')
  })
})
