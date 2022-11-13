/// <reference types="vitest" />
import path from "path";
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.vitest': 'undefined',
  },
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    alias: {
      'testing-library': path.resolve(__dirname, "./__test__/testing-library.js")
    },
    setupFiles: ['./__test__/test-setup.ts'],
    includeSource: ['src/**/*.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text-summary', 'text'],
    },
    mockReset: true,
    restoreMocks: true,
    globals: true
  },
})