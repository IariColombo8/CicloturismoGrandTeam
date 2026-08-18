import { defineConfig } from "@playwright/test"

// Config para tests unitarios de logica pura (schemas, normalizadores, utils).
// No levanta el dev server ni abre navegador: corren en Node, en segundos.
export default defineConfig({
  testDir: "./e2e/unit",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
})
