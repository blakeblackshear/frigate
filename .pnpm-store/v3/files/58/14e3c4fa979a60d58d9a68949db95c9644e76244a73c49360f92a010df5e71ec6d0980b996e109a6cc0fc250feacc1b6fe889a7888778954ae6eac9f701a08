# Prefer importing Jest globals (`prefer-importing-jest-globals`)

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

This rule aims to enforce explicit imports from `@jest/globals`.

1. This is useful for ensuring that the Jest APIs are imported the same way in
   the codebase.
2. When you can't modify Jest's
   [`injectGlobals`](https://jestjs.io/docs/configuration#injectglobals-boolean)
   configuration property, this rule can help to ensure that the Jest globals
   are imported explicitly and facilitate a migration to `@jest/globals`.

## Rule details

Examples of **incorrect** code for this rule

```js
/* eslint jest/prefer-importing-jest-globals: "error" */

describe('foo', () => {
  it('accepts this input', () => {
    // ...
  });
});
```

Examples of **correct** code for this rule

```js
/* eslint jest/prefer-importing-jest-globals: "error" */

import { describe, it } from '@jest/globals';

describe('foo', () => {
  it('accepts this input', () => {
    // ...
  });
});
```

## Options

This rule can be configured as follows

```json
{
  "type": "object",
  "properties": {
    "types": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["hook", "describe", "test", "expect", "jest", "unknown"]
      }
    }
  },
  "additionalProperties": false
}
```

#### types

A list of Jest global types to enforce explicit imports for. By default, all
Jest globals are enforced.

This option is useful when you only want to enforce explicit imports for a
subset of Jest globals. For instance, when migrating to ESM, you might want to
enforce explicit imports only for the `jest` global, as of
[Jest's ESM documentation](https://jestjs.io/docs/ecmascript-modules#differences-between-esm-and-commonjs).

```json5
{
  'jest/prefer-importing-jest-globals': ['error', { types: ['jest'] }],
}
```

## Further Reading

- [Documentation](https://jestjs.io/docs/api)
