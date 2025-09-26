# fast-equals

<img src="https://img.shields.io/badge/build-passing-brightgreen.svg"/>
<img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg"/>
<img src="https://img.shields.io/badge/license-MIT-blue.svg"/>

Perform [blazing fast](#benchmarks) equality comparisons (either deep or shallow) on two objects passed. It has no dependencies, and is ~1.27kB when minified and gzipped.

Unlike most equality validation libraries, the following types are handled out-of-the-box:

- `NaN`
- `Date` objects
- `RegExp` objects
- `Map` / `Set` iterables
- `Promise` objects
- `react` elements

Starting with version `1.5.0`, circular objects are supported for both deep and shallow equality (see [`circularDeepEqual`](#circulardeepequal) and [`circularShallowEqual`](#circularshallowequal)). You can also create a custom nested comparator, for specific scenarios ([see below](#createcustomequal)).

## Table of contents

- [fast-equals](#fast-equals)
  - [Table of contents](#table-of-contents)
  - [Usage](#usage)
    - [Specific builds](#specific-builds)
  - [Available methods](#available-methods)
    - [deepEqual](#deepequal)
      - [Comparing `Map`s](#comparing-maps)
    - [shallowEqual](#shallowequal)
    - [sameValueZeroEqual](#samevaluezeroequal)
    - [circularDeepEqual](#circulardeepequal)
    - [circularShallowEqual](#circularshallowequal)
    - [createCustomEqual](#createcustomequal)
      - [Recipes](#recipes)
    - [`createCustomCircularEqual`](#createcustomcircularequal)
      - [Recipes](#recipes-1)
  - [Benchmarks](#benchmarks)
  - [Development](#development)

## Usage

```ts
import { deepEqual } from 'fast-equals';

console.log(deepEqual({ foo: 'bar' }, { foo: 'bar' })); // true
```

### Specific builds

There are three builds, an ESM build for modern build systems / runtimes, a CommonJS build for traditional NodeJS environments, and a UMD build for legacy implementations. The ideal one will likely be chosen for you automatically, however if you want to use a specific build you can always import it directly:

- ESM => `fast-equals/dist/fast-equals.esm.js`
  - For older `nodejs` versions that do not allow ESM with file extensions other than `.mjs` => `fast-equals/dist/fast-equals.mjs`
- CommonJS => `fast-equals/dist/fast-equals.cjs.js`
- UMD => `fast-equals/dist/fast-equals.js`
- Minified UMD => `fast-equals/dist/fast-equals.min.js`

## Available methods

### deepEqual

Performs a deep equality comparison on the two objects passed and returns a boolean representing the value equivalency of the objects.

```ts
import { deepEqual } from 'fast-equals';

const objectA = { foo: { bar: 'baz' } };
const objectB = { foo: { bar: 'baz' } };

console.log(objectA === objectB); // false
console.log(deepEqual(objectA, objectB)); // true
```

#### Comparing `Map`s

`Map` objects support complex keys (objects, Arrays, etc.), however [the spec for key lookups in `Map` are based on `SameZeroValue`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#key_equality). If the spec were followed for comparison, the following would always be `false`:

```ts
const mapA = new Map([[{ foo: 'bar' }, { baz: 'quz' }]]);
const mapB = new Map([[{ foo: 'bar' }, { baz: 'quz' }]]);

deepEqual(mapA, mapB);
```

To support true deep equality of all contents, `fast-equals` will perform a deep equality comparison for key and value parirs. Therefore, the above would be `true`.

### shallowEqual

Performs a shallow equality comparison on the two objects passed and returns a boolean representing the value equivalency of the objects.

```ts
import { shallowEqual } from 'fast-equals';

const nestedObject = { bar: 'baz' };

const objectA = { foo: nestedObject };
const objectB = { foo: nestedObject };
const objectC = { foo: { bar: 'baz' } };

console.log(objectA === objectB); // false
console.log(shallowEqual(objectA, objectB)); // true
console.log(shallowEqual(objectA, objectC)); // false
```

### sameValueZeroEqual

Performs a [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero) comparison on the two objects passed and returns a boolean representing the value equivalency of the objects. In simple terms, this means either strictly equal or both `NaN`.

```ts
import { sameValueZeroEqual } from 'fast-equals';

const mainObject = { foo: NaN, bar: 'baz' };

const objectA = 'baz';
const objectB = NaN;
const objectC = { foo: NaN, bar: 'baz' };

console.log(sameValueZeroEqual(mainObject.bar, objectA)); // true
console.log(sameValueZeroEqual(mainObject.foo, objectB)); // true
console.log(sameValueZeroEqual(mainObject, objectC)); // false
```

### circularDeepEqual

Performs the same comparison as `deepEqual` but supports circular objects. It is slower than `deepEqual`, so only use if you know circular objects are present.

```ts
function Circular(value) {
  this.me = {
    deeply: {
      nested: {
        reference: this,
      },
    },
    value,
  };
}

console.log(circularDeepEqual(new Circular('foo'), new Circular('foo'))); // true
console.log(circularDeepEqual(new Circular('foo'), new Circular('bar'))); // false
```

Just as with `deepEqual`, [both keys and values are compared for deep equality](#comparing-maps).

### circularShallowEqual

Performs the same comparison as `shallowequal` but supports circular objects. It is slower than `shallowEqual`, so only use if you know circular objects are present.

```ts
const array = ['foo'];

array.push(array);

console.log(circularShallowEqual(array, ['foo', array])); // true
console.log(circularShallowEqual(array, [array])); // false
```

### createCustomEqual

Creates a custom equality comparator that will be used on nested values in the object. Unlike `deepEqual` and `shallowEqual`, this is a factory method that receives the default options used internally, and allows you to override the defaults as needed. This is generally for extreme edge-cases, or supporting legacy environments.

The signature is as follows:

```ts
type InternalEqualityComparator = (
  a: any,
  b: any,
  indexOrKeyA: any,
  indexOrKeyB: any,
  parentA: any,
  parentB: any,
  meta: any,
) => boolean;

type TypeEqualityComparator = <Type, Meta>(
  a: Type,
  b: Type,
  isEqual: InternalEqualityComparator,
  meta: Meta,
) => boolean;

interface CreateComparatorCreatorOptions<Meta> {
  areArraysEqual: TypeEqualityComparator<any[], Meta>;
  areDatesEqual: TypeEqualityComparator<Date, Meta>;
  areMapsEqual: TypeEqualityComparator<Map<any, any>, Meta>;
  areObjectsEqual: TypeEqualityComparator<Record<string, any>, Meta>;
  areRegExpsEqual: TypeEqualityComparator<RegExp, Meta>;
  areSetsEqual: TypeEqualityComparator<Set<any>, Meta>;
  createIsNestedEqual?: (
    comparator: <A, B>(a: A, b: B, meta: Meta) => boolean,
  ) => InternalEqualityComparator;
}

function createCustomEqual(
  getComparatorOptions: (
    defaultOptions: CreateComparatorOptions,
  ) => Partial<CreateComparatorOptions>,
): EqualityComparator;
```

The `meta` parameter above is whatever you want it to be. It will be passed through to all equality checks, and is meant specifically for use with custom equality methods. For example, with the `circularDeepEqual` and `circularShallowEqual` methods, it is used to pass through a cache of processed objects. You also only need to return the override handlers; absent being provided, the defaults are used.

_**NOTE**: `Map` implementations compare equality for both keys and value. When using a custom comparator and comparing equality of the keys, the iteration index is provided as both `indexOrKeyA` and `indexOrKeyB` to help use-cases where ordering of keys matters to equality._

#### Recipes

Some recipes have been created to provide examples of use-cases for `createCustomEqual`. Even if not directly applicable to the problem you are solving, they can offer guidance of how to structure your solution.

- [Legacy environment support for `RegExp` comparators](./recipes/legacy-regexp-support.md)
- [Explicit property check](./recipes/explicit-property-check.md)
- [Using `meta` in comparison](./recipes//using-meta-in-comparison.md)
- [Comparing non-standard properties](./recipes/non-standard-properties.md)
- [Strict property descriptor comparison](./recipes/strict-property-descriptor-check.md)

### `createCustomCircularEqual`

Operates nearly identically to [`createCustomEqual`](#createcustomequal), with the difference being that the `meta` property expected by the comparator is expected to have a `WeakMap` contract. This is because it is used for caching accessed objects to avoid maximum stack exceeded errors. The most common use for this method is a simple way to support circular checks for references that do not have `WeakMap` natively.

#### Recipes

Some recipes have been created to provide examples of use-cases for `createCustomEqual`. Even if not directly applicable to the problem you are solving, they can offer guidance of how to structure your solution.

- [Legacy environment support for circualr equal comparators](./recipes/legacy-circular-equal-support.md)

## Benchmarks

All benchmarks were performed on an i7-8650U Ubuntu Linux laptop with 24GB of memory using NodeJS version `12.19.1`, and are based on averages of running comparisons based deep equality on the following object types:

- Primitives (`String`, `Number`, `null`, `undefined`)
- `Function`
- `Object`
- `Array`
- `Date`
- `RegExp`
- `react` elements
- A mixed object with a combination of all the above types

|                            | Operations / second |
| -------------------------- | ------------------- |
| **fast-equals**            | **153,880**         |
| fast-deep-equal            | 144,035             |
| react-fast-compare         | 130,324             |
| nano-equal                 | 104,624             |
| **fast-equals (circular)** | **97,610**          |
| shallow-equal-fuzzy        | 83,946              |
| underscore.isEqual         | 47,370              |
| lodash.isEqual             | 25,053              |
| deep-eql                   | 22,146              |
| assert.deepStrictEqual     | 532                 |
| deep-equal                 | 209                 |

Caveats that impact the benchmark (and accuracy of comparison):

- `Map`s, `Promise`s, and `Set`s were excluded from the benchmark entirely because no library other than `deep-eql` fully supported their comparison
- `assert.deepStrictEqual` does not support `NaN` or `SameValueZero` equality for dates
- `deep-eql` does not support `SameValueZero` equality for zero equality (positive and negative zero are not equal)
- `deep-equal` does not support `NaN` and does not strictly compare object type, or date / regexp values, nor uses `SameValueZero` equality for dates
- `fast-deep-equal` does not support `NaN` or `SameValueZero` equality for dates
- `nano-equal` does not strictly compare object property structure, array length, or object type, nor `SameValueZero` equality for dates
- `react-fast-compare` does not support `NaN` or `SameValueZero` equality for dates, and does not compare `function` equality
- `shallow-equal-fuzzy` does not strictly compare object type or regexp values, nor `SameValueZero` equality for dates
- `underscore.isEqual` does not support `SameValueZero` equality for primitives or dates

All of these have the potential of inflating the respective library's numbers in comparison to `fast-equals`, but it was the closest apples-to-apples comparison I could create of a reasonable sample size. It should be noted that `react` elements can be circular objects, however simple elements are not; I kept the `react` comparison very basic to allow it to be included.

## Development

Standard practice, clone the repo and `npm i` to get the dependencies. The following npm scripts are available:

- benchmark => run benchmark tests against other equality libraries
- build => build `main`, `module`, and `browser` distributables with `rollup`
- clean => run `rimraf` on the `dist` folder
- dev => start webpack playground App
- dist => run `build`
- lint => run ESLint on all files in `src` folder (also runs on `dev` script)
- lint:fix => run `lint` script, but with auto-fixer
- prepublish:compile => run `lint`, `test:coverage`, `transpile:lib`, `transpile:es`, and `dist` scripts
- start => run `dev`
- test => run AVA with NODE_ENV=test on all files in `test` folder
- test:coverage => run same script as `test` with code coverage calculation via `nyc`
- test:watch => run same script as `test` but keep persistent watcher
