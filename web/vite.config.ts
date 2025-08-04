/// <reference types="vitest" />
import path, { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

const proxyHost = process.env.PROXY_HOST || "localhost:5000";
const proxyProtocol = process.env.PROXY_PROTOCOL || "http";
const proxySecure = process.env.PROXY_SECURE === "false" ? false : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "import.meta.vitest": "undefined",
  },
  server: {
    proxy: {
      "/api": {
        target: `${proxyProtocol}://${proxyHost}`,
        ws: true,
        secure: proxySecure,
      },
      "/vod": {
        target: `${proxyProtocol}://${proxyHost}`,
        secure: proxySecure,
      },
      "/clips": {
        target: `${proxyProtocol}://${proxyHost}`,
        secure: proxySecure,
      },
      "/exports": {
        target: `${proxyProtocol}://${proxyHost}`,
        secure: proxySecure,
      },
      "/ws": {
        target: `${proxyProtocol === "http" ? "ws" : "wss"}://${proxyHost}`,
        ws: true,
        secure: proxySecure,
      },
      "/live": {
        target: `${proxyProtocol === "http" ? "ws" : "wss"}://${proxyHost}`,
        changeOrigin: true,
        ws: true,
        secure: proxySecure,
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
