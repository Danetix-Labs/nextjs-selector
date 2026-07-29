import { expect, test } from '@playwright/test'

/**
 * Snapshots of the accessibility tree — the very thing a screen reader reads.
 *
 * Not a substitute for NVDA, JAWS or VoiceOver: those also decide *when* to
 * speak, how verbose to be, and how the user navigates. What this can prove is
 * that the names, roles and states they rely on are actually there.
 */
test.describe('дерево доступности', () => {
  test('закрытый виджет: имя, роль и свёрнутое состояние', async ({ page }) => {
    await page.goto('/')

    const trigger = page
      .locator('section')
      .filter({ hasText: 'Одиночный выбор' })
      .getByRole('combobox')

    await expect(trigger).toHaveAccessibleName('Фреймворк')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('открытый список: опции с состоянием и активный элемент', async ({ page }) => {
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Множественный выбор' })
      .locator('[data-part="root"]')
      .first()
    const trigger = root.getByRole('combobox')
    await trigger.click()

    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Активный элемент объявляется через aria-activedescendant, а не фокусом.
    const active = await trigger.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    await expect(page.locator(`#${active}`)).toHaveAttribute('aria-selected', 'false')

    // Группы имеют доступные имена — иначе скринридер прочтёт «группа» без названия.
    const groups = root.getByRole('group')
    await expect(groups.first()).toHaveAccessibleName(/\S+/)
  })

  test('выбор объявляется в живой области', async ({ page }) => {
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Множественный выбор' })
      .locator('[data-part="root"]')
      .first()
    await root.getByRole('combobox').click()
    await root.getByRole('option', { name: 'Россия' }).click()

    const live = root.locator('[data-part="announcer"]')
    await expect(live).toHaveAttribute('aria-live', 'polite')
    await expect(live).toContainText('Россия выбрано')
  })

  test('поиск объявляет число найденного', async ({ page }) => {
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Множественный выбор' })
      .locator('[data-part="root"]')
      .first()
    await root.getByRole('combobox').click()
    await root.getByRole('searchbox').fill('рос')

    await expect(root.locator('[data-part="announcer"]')).toContainText('Найдено вариантов')
  })

  test('весь путь проходится только с клавиатуры', async ({ page }) => {
    await page.goto('/')

    const root = page
      .locator('section')
      .filter({ hasText: 'Одиночный выбор' })
      .locator('[data-part="root"]')
      .first()
    const trigger = root.getByRole('combobox')

    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await expect(trigger).toContainText('Remix')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    // Фокус остался на триггере — пользователь не потерян в документе.
    await expect(trigger).toBeFocused()
  })
})
