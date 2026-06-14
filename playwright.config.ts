import { defineConfig, devices } from "@playwright/test"

// Config de Playwright para smoke tests E2E.
// Levanta el dev server de Next automáticamente y corre los tests contra él.
// Puerto dedicado (3100) para no colisionar con otro dev server en 3000.
const PORT = 3100
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  // CI: sin reintentos engañosos; local: igual. Fail rápido si algo se rompe.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Si ya hay un server en el puerto (npm run dev abierto), lo reutiliza.
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
