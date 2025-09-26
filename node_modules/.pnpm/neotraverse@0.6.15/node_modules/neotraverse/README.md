# neotraverse

Traverse and transform objects by visiting every node on a recursive walk. This is a fork and TypeScript rewrite of [traverse](https://github.com/ljharb/js-traverse) with 0 dependencies and major improvements:

- 🤌 1.38KB min+brotli
- 🚥 Zero dependencies
- 🎹 TypeScript. Throw away the `@types/traverse` package
- ❎ No polyfills
- 🛸 ESM-first
- 📜 Legacy mode supporting ES5

# Principles

Rules this package aims to follow for an indefinite period of time:

- No dependencies.
- No polyfills.
- ESM-first.
- Pushing to be modern
- Always provide a legacy mode
- Always follow `traverse` API. There already are many packages that do this. `neotraverse` intends to be a drop-in replacement for `traverse` and provide the same API with 0 dependencies and enhanced Developer Experience.
- All deviating changes happen in `neotraverse/modern` build.

# Modern build

`neotraverse/modern` provides a new class `new Traverse()`, and all methods and state is provided as first argument `ctx` (`this.update -> ctx.update`, `this.isLeaf -> ctx.isLeaf`, etc.)

Before:

```js
import traverse from 'neotraverse';

const obj = { a: 1, b: 2, c: [3, 4] };

traverse(obj).forEach(function (x) {
  if (x < 0) this.update(x + 128);
});
```

After:

```js
import { Traverse } from 'neotraverse/modern';

const obj = { a: 1, b: 2, c: [3, 4] };

new Traverse(obj).forEach((ctx, x) => {
  if (x < 0) ctx.update(x + 128);
});
```

# Which build to use?

`neotraverse` provides 3 builds:

- default: Backwards compatible with `traverse` and provides the same API, but ESM only and compiled to ES2022 with Node 18+
- modern: Modern build with ESM only and compiled to ES2022 with Node 18+. Provides a new class `new Traverse()`, and all methods and state is provided as first argument `ctx` (`this.update -> ctx.update`, `this.isLeaf -> ctx.isLeaf`, etc.)
- legacy: Legacy build with ES5 and CJS, compatible with `traverse` and provides the same API.

Here's a matrix of the different builds:

| Build   | ESM       | CJS | Browser | Node | Polyfills | Size              |
| ------- | --------- | --- | ------- | ---- | --------- | ----------------- |
| default | ✅ ES2022 |     | ✅      | ✅   | ❌        | 1.54KB min+brotli |
| modern  | ✅ ES2022 |     | ✅      | ✅   | ❌        | 1.38KB min+brotli |
| legacy  | ✅ ES5    | ✅  | ✅      | ✅   | ❌        | 2.73KB min+brotli |

If you are:

## starting from scratch

```ts
import { Traverse } from 'neotraverse/modern';

const obj = { a: 1, b: 2, c: [3, 4] };

new Traverse(obj).forEach((ctx, x) => {
  if (x < 0) ctx.update(x + 128); // `this` is same as `ctx` when using regular function
});
```

## migrating from `traverse`

### and you don't care about old browsers or Node versions:

Use default build for no breaking changes, and a modern build for better developer experience.

```ts
import traverse from 'neotraverse';

const obj = { a: 1, b: 2, c: [3, 4] };

traverse(obj).forEach(function (x) {
  if (x < 0) this.update(x + 128);
});
```

### and you care about old browsers or Node versions:

Use legacy build for compatibility with old browsers and Node versions.

```js
const traverse = require('neotraverse/legacy');
```

ESM:

```js
import traverse from 'neotraverse/legacy';
```

# examples

## transform negative numbers in-place

negative.js

```js
import { Traverse } from 'neotraverse/modern';
const obj = [5, 6, -3, [7, 8, -2, 1], { f: 10, g: -13 }];

new Traverse(obj).forEach(function (ctx, x) {
  if (x < 0) ctx.update(x + 128);
});

console.dir(obj);
```

or in legacy mode:

```js
import traverse from 'neotraverse';
// OR import traverse from 'neotraverse/legacy';

const obj = [5, 6, -3, [7, 8, -2, 1], { f: 10, g: -13 }];

traverse(obj).forEach(function (x) {
  if (x < 0) this.update(x + 128);
});

// This is identical to the above
traverse.forEach(obj, function (x) {
  if (x < 0) this.update(x + 128);
});

console.dir(obj);
```

Output:

    [ 5, 6, 125, [ 7, 8, 126, 1 ], { f: 10, g: 115 } ]

## collect leaf nodes

leaves.js

```js
import { Traverse } from 'neotraverse/modern';

const obj = {
  a: [1, 2, 3],
  b: 4,
  c: [5, 6],
  d: { e: [7, 8], f: 9 }
};

const leaves = new Traverse(obj).reduce((ctx, acc, x) => {
  if (ctx.isLeaf) acc.push(x);
  return acc;
}, []);

console.dir(leaves);
```

or in legacy mode:

```js
import traverse from 'neotraverse';
// OR import traverse from 'neotraverse/legacy';

const obj = {
  a: [1, 2, 3],
  b: 4,
  c: [5, 6],
  d: { e: [7, 8], f: 9 }
};

const leaves = traverse(obj).reduce(function (acc, x) {
  if (this.isLeaf) acc.push(x);
  return acc;
}, []);

// Equivalent to the above
const leavesLegacy = traverse.reduce(
  obj,
  function (acc, x) {
    if (this.isLeaf) acc.push(x);
    return acc;
  },
  []
);

console.dir(leaves);
console.dir(leavesLegacy);
```

Output:

    [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]

## scrub circular references

scrub.js:

```js
import { Traverse } from 'neotraverse/modern';

const obj = { a: 1, b: 2, c: [3, 4] };
obj.c.push(obj);

const scrubbed = new Traverse(obj).map(function (ctx, x) {
  if (ctx.circular) ctx.remove();
});

console.dir(scrubbed);
```

or in legacy mode:

```js
import traverse from 'neotraverse';
// OR import traverse from 'neotraverse/legacy';

const obj = { a: 1, b: 2, c: [3, 4] };
obj.c.push(obj);

const scrubbed = traverse(obj).map(function (x) {
  if (this.circular) this.remove();
});

// Equivalent to the above
const scrubbedLegacy = traverse.map(obj, function (x) {
  if (this.circular) this.remove();
});

console.dir(scrubbed);
console.dir(scrubbedLegacy);
```

output:

    { a: 1, b: 2, c: [ 3, 4 ] }

## commonjs

neotraverse/legacy is compatible with commonjs and provides the same API as `traverse`, acting as a drop-in replacement:

```js
const traverse = require('neotraverse/legacy');
```

## esm

```js
import { Traverse } from 'neotraverse/modern';
```

```js
import traverse from 'neotraverse';
```

# Differences from `traverse`

- ESM-first
- ES2022, Node 18+
- Types included by default. No need to install `@types/traverse`
- Works as-is in all major browsers and Deno
- No polyfills
- `new Traverse()` class instead of regular old `traverse()`
- Legacy mode supporting `ES5` and `CJS`

There is a legacy mode that provides the same API as `traverse`, acting as a drop-in replacement:

```js
import traverse from 'neotraverse';

const obj = { a: 1, b: 2, c: [3, 4] };

traverse(obj).forEach(function (x) {
  if (x < 0) this.update(x + 128);
});
```

If you want to support really old browsers or NodeJS, supporting ES5, there's `neotraverse/legacy` which is compatible with ES5 and provides the same API as `traverse`, acting as a drop-in replacement for older browsers:

```js
import traverse from 'neotraverse/legacy';

const obj = { a: 1, b: 2, c: [3, 4] };

traverse(obj).forEach(function (x) {
  if (x < 0) this.update(x + 128);
});
```

# Migrating from `traverse`

### Step 1: Install `neotraverse`

```sh
npm install neotraverse
npm uninstall traverse @types/traverse # Remove the old dependencies
```

### Step 2: Replace `traverse` with `neotraverse`

```diff
-import traverse from 'traverse';
+import traverse from 'neotraverse';

const obj = { a: 1, b: 2, c: [3, 4] };

-traverse(obj).forEach(function (x) {
+traverse(obj).forEach(function (x) {
  if (x < 0) this.update(x + 128);
});
```

Optionally, there's also a legacy mode that provides the same API as `traverse`, acting as a drop-in replacement:

```js
import traverse from 'neotraverse/legacy';

const obj = { a: 1, b: 2, c: [3, 4] };

traverse(obj).forEach(function (x) {
  if (x < 0) this.update(x + 128);
});
```

### Step 3(Optional): Bundle time aliasing

If you use Vite, you can aliss `traverse` to `neotravers/legacy` in your `vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      traverse: 'neotraverse' // or 'neotraverse/legacy'
    }
  }
});
```

# methods

Each method that takes an `fn` uses the context documented below in the context section.

## .map(fn)

Execute `fn` for each node in the object and return a new object with the results of the walk. To update nodes in the result use `ctx.update(value)`(modern) or `this.update(value)`(legacy).

## .forEach(fn)

Execute `fn` for each node in the object but unlike `.map()`, when `ctx.update()`(modern) or `this.update()`(legacy) is called it updates the object in-place.

## .reduce(fn, acc)

For each node in the object, perform a [left-fold](<http://en.wikipedia.org/wiki/Fold_(higher-order_function)>) with the return value of `fn(acc, node)`.

If `acc` isn't specified, `acc` is set to the root object for the first step and the root element is skipped.

## .paths()

Return an `Array` of every possible non-cyclic path in the object. Paths are `Array`s of string keys.

## .nodes()

Return an `Array` of every node in the object.

## .clone()

Create a deep clone of the object.

## .get(path)

Get the element at the array `path`.

## .set(path, value)

Set the element at the array `path` to `value`.

## .has(path)

Return whether the element at the array `path` exists.

# context

Each method that takes a callback has a context (its `ctx` object, or `this` object in legacy mode) with these attributes:

## this.node

The present node on the recursive walk

## this.path

An array of string keys from the root to the present node

## this.parent

The context of the node's parent. This is `undefined` for the root node.

## this.key

The name of the key of the present node in its parent. This is `undefined` for the root node.

## this.isRoot, this.notRoot

Whether the present node is the root node

## this.isLeaf, this.notLeaf

Whether or not the present node is a leaf node (has no children)

## this.level

Depth of the node within the traversal

## this.circular

If the node equals one of its parents, the `circular` attribute is set to the context of that parent and the traversal progresses no deeper.

## this.update(value, stopHere=false)

Set a new value for the present node.

All the elements in `value` will be recursively traversed unless `stopHere` is true.

## this.remove(stopHere=false)

Remove the current element from the output. If the node is in an Array it will be spliced off. Otherwise it will be deleted from its parent.

## this.delete(stopHere=false)

Delete the current element from its parent in the output. Calls `delete` even on Arrays.

## this.before(fn)

Call this function before any of the children are traversed.

You can assign into `ctx.keys`(modern) or `this.keys`(legacy) here to traverse in a custom order.

## this.after(fn)

Call this function after any of the children are traversed.

## this.pre(fn)

Call this function before each of the children are traversed.

## this.post(fn)

Call this function after each of the children are traversed.

# license

MIT
