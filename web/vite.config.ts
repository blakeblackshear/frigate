/// <reference types="vitest" />
import path, { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

const proxyHost = process.env.PROXY_HOST || "1ocalhost:5000";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "import.meta.vitest": "undefined",
  },
  server: {
    proxy: {
      "/api": {
        target: `http://${proxyHost}`,
        ws: true,
      },
      "/vod": {
        target: `http://${proxyHost}`,
      },
      "/clips": {
        target: `http://${proxyHost}`,
      },
      "/exports": {
        target: `http://${proxyHost}`,
      },
      "/ws": {
        target: `ws://${proxyHost}`,
        ws: true,
      },
      "/live": {
        target: `ws://${proxyHost}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
      },
    },
  },
  plugins: [
    react(),
    monacoEditorPlugin.default({
      customWorkers: [{ label: "yaml", entry: "monaco-yaml/yaml.worker" }],
      languageWorkers: ["editorWorkerService"], // we don't use any of the default languages
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    alias: {
      "testing-library": path.resolve(
        __dirname,
        "./__test__/testing-library.js",
      ),
    },
    setupFiles: ["./__test__/test-setup.ts"],
    includeSource: ["src/**/*.{js,jsx,ts,tsx}"],
    coverage: {
      reporter: ["text-summary", "text"],
    },
    mockReset: true,
    restoreMocks: true,
    globals: true,
  },
});
