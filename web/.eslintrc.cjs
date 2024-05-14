module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:vitest-globals/recommended",
    "plugin:prettier/recommended",
  ],
  env: { browser: true, es2021: true, "vitest-globals/env": true },
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  settings: {
    jest: {
      version: 27,
    },
  },
  ignorePatterns: ["*.d.ts", "/src/components/ui/*"],
  plugins: ["react-hooks", "react-refresh"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "comma-dangle": [
      "error",
      {
        objects: "always-multiline",
        arrays: "always-multiline",
        imports: "always-multiline",
      },
    ],
    "no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "no-console": "error",
    "prettier/prettier": [
      "warn",
      {
        plugins: ["prettier-plugin-tailwindcss"],
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
      ],
    },
  ],
};
