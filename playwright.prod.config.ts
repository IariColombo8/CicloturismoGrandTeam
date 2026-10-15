import { defineConfig, devices } from "@playwright/test"

/**
 * Los mismos tests E2E, pero contra el build de produccion.
 *
 * Por que existe: el dev server de Next compila cada ruta en el momento y, con
 * la suite entera (inscripcion en celular, iPhone, offline, 35 combinaciones de
 * pantalla), se queda sin memoria y arrastra a los tests que vienen despues.
 * Contra `next start` la suite corre mas rapido, no se cae y ademas prueba
 * exactamente lo que ve la gente.
 *
 *   npm run build && npm run test:e2e:prod
 */
const PORT = 3101
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/unit/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // 3 y no 4: la suite mueve comprobantes de 20-25 MB, y con cuatro navegadores
  // a la vez los tests empiezan a fallar por lentitud en vez de por bugs.
  workers: 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
      testIgnore: "**/inscripcion-iphone.spec.ts",
    },
    {
      name: "webkit",
      use: { ...devices["iPhone 13"] },
      testMatch: "**/inscripcion-iphone.spec.ts",
    },
  ],
  webServer: {
    // Necesita un `npm run build` previo.
    command: `npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
