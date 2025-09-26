# Combine-Promises

[![NPM](https://img.shields.io/npm/dm/combine-promises.svg)](https://www.npmjs.com/package/combine-promises)
[![CI](https://github.com/slorber/combine-promises/actions/workflows/main.yml/badge.svg)](https://github.com/slorber/combine-promises/actions/workflows/main.yml)
![Size min](https://img.shields.io/bundlephobia/min/combine-promises.svg)
![Size minzip](https://img.shields.io/bundlephobia/minzip/combine-promises.svg)

Like `Promise.all([])` but for objects.

```ts
import combinePromises from 'combine-promises';

const { user, company } = await combinePromises({
  user: fetchUser(),
  company: fetchCompany(),
});
```

Why:

- Insensitive to destructuring order
- Simpler async functional code

Features:

- TypeScript support
- Lightweight
- Feature complete
- Well-tested
- ESM / CJS

--- 

# Sponsor

**[ThisWeekInReact.com](https://thisweekinreact.com)**: the best newsletter to stay up-to-date with the React ecosystem:

[![ThisWeekInReact.com banner](https://user-images.githubusercontent.com/749374/136185889-ebdb67cd-ec78-4655-b88b-79a6c134acd2.png)](https://thisweekinreact.com)

---

## Install

```
npm install combine-promises
// OR
yarn add combine-promises
```

## TypeScript support

Good, native and strict TypeScript support:

- Return type correctly inferred from the input object
- All object values should be async
- Only accept objects (reject arrays, null, undefined...)

```ts
const result: { user: User; company: Company } = await combinePromises({
  user: fetchUser(),
  company: fetchCompany(),
});
```

## Insensitive to destructuring order

A common error with `Promise.all` is to have a typo in the destructuring order.

```js
// Bad: destructuring order reversed
const [company, user] = await Promise.all([fetchUser(), fetchCompany()]);
```

This becomes more dangerous as size of the promises array grows.

With `combinePromises`, you are using explicit names instead of array indices, which makes the code more robust and not sensitive to destructuring order:

```js
// Good: we don't care about the order anymore
const { company, user } = await combinePromises({
  user: fetchUser(),
  company: fetchCompany(),
});
```

## Simpler async functional code

Suppose you have an object representing a friendship like `{user1: "userId-1", user2: "userId-2"}`, and you want to transform it to `{user1: User, user2: User}`.

You can easily do that:

```js
import combinePromises from 'combine-promises';
import { mapValues } from 'lodash'; // can be replaced by vanilla ES if you prefer

const friendsIds = { user1: 'userId-1', user2: 'userId-2' };

const friends = await combinePromises(mapValues(friendsIds, fetchUserById));
```

Without this library: good luck to keep your code simple.

## Inspirations

Name inspired by [combineReducers](https://redux.js.org/api/combinereducers) from Redux.
