// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Solo puntos y sin mensajes de tus hooks
    reporters: ['dot'],
    silent: true,
    // Aquí va toda la config de coverage
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,js}'],   // cubre todo tu código fuente
      reporter: ['text'],              // imprime solo la tabla textual
    },
  },
});
