import { defineConfig, devices } from '@playwright/test'

/**
 * Browser-level checks for the things jsdom cannot answer: where the listbox
 * actually lands, whether the top layer behaves, what the platform supports.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  // Positioning leans on feature detection, and the engines differ exactly
  // where it matters: Popover API, anchor positioning, safe-area insets.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    cwd: './examples/demo',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
