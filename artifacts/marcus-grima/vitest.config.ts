/**
 * Vitest configuration for marcus-grima client tests.
 *
 * Intentionally does NOT import vite.config.ts because that file throws at
 * module evaluation if PORT or BASE_PATH are absent — which they are in the
 * test environment. This config sets up only what vitest needs: the React
 * plugin, the @/ path alias, and a jsdom environment.
 */
import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
