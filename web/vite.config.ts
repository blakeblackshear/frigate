/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.vitest': 'undefined',
  },
  plugins: [
    preact(),
    monacoEditorPlugin.default({
      customWorkers: [{ label: 'yaml', entry: 'monaco-yaml/yaml.worker' }],
      languageWorkers: ['editorWorkerService'], // we don't use any of the default languages
    }),
  ],
  test: {
    environment: 'jsdom',
    alias: {
      'testing-library': path.resolve(__dirname, './__test__/testing-library.js'),
    },
    setupFiles: ['./__test__/test-setup.ts'],
    includeSource: ['src/**/*.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text-summary', 'text'],
    },
    mockReset: true,
    restoreMocks: true,
    globals: true,
  },
});
