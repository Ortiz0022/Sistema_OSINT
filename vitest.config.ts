import { defineConfig } from 'vitest/config';

// Pruebas unitarias del proyecto (ítem 2.2 / 4.2).
// Corren en Node, sin red ni servicios externos, para que sean reproducibles.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'scripts/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'html'],
    },
  },
});
