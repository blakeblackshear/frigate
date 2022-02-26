module.exports = {
  parser: '@babel/eslint-parser',
  extends: ['eslint:recommended', 'preact', 'prettier'],
  plugins: ['react', 'jest'],
  env: {
    browser: true,
    node: true,
    mocha: true,
    es6: true,
    'jest/globals': true,
  },
  parserOptions: {
    ecmaFeatures: {
      modules: true,
      jsx: true,
    },
  },
  settings: {
    react: {
      pragma: 'h',
    },
  },
  globals: {
    sleep: true,
  },
  rules: {
    indent: ['error', 2, { SwitchCase: 1 }],
    'comma-dangle': ['error', { objects: 'always-multiline', arrays: 'always-multiline' }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    },
  ],
};
