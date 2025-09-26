# Prefer `jest.mocked()` over `fn as jest.Mock` (`prefer-jest-mocked`)

🔧 This rule is automatically fixable by the
[`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

When working with mocks of functions using Jest, it's recommended to use the
`jest.mocked()` helper function to properly type the mocked functions. This rule
enforces the use of `jest.mocked()` for better type safety and readability.

Restricted types:

- `jest.Mock`
- `jest.MockedFunction`
- `jest.MockedClass`
- `jest.MockedObject`

## Rule details

The following patterns are warnings:

```typescript
(foo as jest.Mock).mockReturnValue(1);
const mock = (foo as jest.Mock).mockReturnValue(1);
(foo as unknown as jest.Mock).mockReturnValue(1);
(Obj.foo as jest.Mock).mockReturnValue(1);
([].foo as jest.Mock).mockReturnValue(1);
```

The following patterns are not warnings:

```js
jest.mocked(foo).mockReturnValue(1);
const mock = jest.mocked(foo).mockReturnValue(1);
jest.mocked(Obj.foo).mockReturnValue(1);
jest.mocked([].foo).mockReturnValue(1);
```
