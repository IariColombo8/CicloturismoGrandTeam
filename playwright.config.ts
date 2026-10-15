import { defineConfig, devices } from "@playwright/test"

// Config de Playwright para smoke tests E2E.
// Levanta el dev server de Next automáticamente y corre los tests contra él.
// Puerto dedicado (3100) para no colisionar con otro dev server en 3000.
const PORT = 3100
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  // Los unitarios corren con playwright.unit.config.ts (sin dev server).
  testIgnore: "**/unit/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Un reintento. No es para tapar bugs: el dev server compila cada ruta en la
  // primera visita y, con la suite entera corriendo, eso solo alcanza para
  // pintar de rojo un test que anda. Si algo falla de verdad, falla las dos veces.
  retries: 1,
  // Las aserciones también esperan a que el server termine de compilar.
  expect: { timeout: 15_000 },
  // Más de 3 navegadores a la vez ahogan al dev server de Next y los tests
  // empiezan a fallar por lentitud, no por bugs.
  workers: 3,
  // La primera visita a cada ruta la compila el dev server en el momento, y eso
  // solo ya se come los 30 s que trae Playwright por defecto.
  timeout: 90_000,
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
      // El spec de iPhone trae su propio device (WebKit).
      testIgnore: "**/inscripcion-iphone.spec.ts",
    },
    {
      // Safari de iPhone: donde se rompen primero los campos de fecha, la
      // cámara y el almacenamiento.
      name: "webkit",
      use: { ...devices["iPhone 13"] },
      testMatch: "**/inscripcion-iphone.spec.ts",
    },
  ],
  // Si ya hay un server en el puerto (npm run dev abierto), lo reutiliza.
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Con la suite completa (celular + iPhone + 35 combinaciones de pantalla)
    // el dev server se quedaba sin memoria y tiraba los tests que venían
    // después: "JavaScript heap out of memory".
    env: { NODE_OPTIONS: "--max-old-space-size=4096" },
  },
})
