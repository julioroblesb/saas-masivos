import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './src/test/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
});
