// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // (opcional) ejecutar sólo el index.spec.ts
    include: ['tests/index.spec.ts'],

    coverage: {
      provider: 'v8',                  // usa v8
      reporter: ['text', 'lcov'],      // primero la tabla en consola, luego lcov.info
      include: ['src/routers/**'],     // lo que tú quieras cubrir
      all: true,                       // si quieres ver incluso archivos sin tests
      reportsDirectory: 'coverage',    // carpeta de salida
    },
  },
})
