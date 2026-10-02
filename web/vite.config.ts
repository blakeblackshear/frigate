import path, { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

const proxyHost = process.env.PROXY_HOST || "localhost:5000";

// https://vitejs.dev/config/
export default defineConfig({
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
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        login: resolve(import.meta.dirname, "login.html"),
      },
      output: {
        keepNames: true,
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
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
