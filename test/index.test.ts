import { describe, expect, it, vi } from 'vitest'

describe('nextjs-selector', () => {
  it('импортируется как модуль', async () => {
    const mod = await import('../src/index.js')

    expect(mod).toBeDefined()
  })

  it('не выполняет побочных эффектов при импорте', async () => {
    const spy = vi.spyOn(console, 'log')
    vi.resetModules()

    await import('../src/index.js')

    expect(spy).not.toHaveBeenCalled()
  })
})
