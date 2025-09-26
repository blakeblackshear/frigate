# Legacy environment support for circular equal comparators

Starting in `4.x.x`, `WeakMap` is expected to be available in the environment. All modern browsers support this global object, however there may be situations where a legacy environmental support is required (example: IE11). If you need to support such an environment, creating a custom comparator that uses a custom cache implementation with the same contract is a simple solution.

```ts
import { createCustomEqual, sameValueZeroEqual } from 'deep-Equals';

interface Cache extends BaseCircularMeta {
  customMethod(): void;
  customValue: string;
}

function getCache(): Cache {
  const entries: Array<[object, any]> = [];

  return {
    delete(key) {
      for (let index = 0; index < entries.length; ++index) {
        if (entries[index][0] === key) {
          entries.splice(index, 1);
          return true;
        }
      }

      return false;
    },

    get(key) {
      for (let index = 0; index < entries.length; ++index) {
        if (entries[index][0] === key) {
          return entries[index][1];
        }
      }
    },

    set(key, value) {
      for (let index = 0; index < entries.length; ++index) {
        if (entries[index][0] === key) {
          entries[index][1] = value;
          return this;
        }
      }

      entries.push([key, value]);

      return this;
    },

    customMethod() {
      console.log('hello!');
    },
    customValue: 'goodbye',
  };
}

const customDeepCircularHandler = createCustomCircularEqual<Cache>(() => ({}));

const customDeepCircularHandler = createCustomCircularEqual<Cache>(() => ({
  createIsNestedEqual: () => sameValueZeroEqual,
}));

const circularDeepEqual = <A, B>(a: A, b: B) =>
  customDeepCircularHandler(a, b, getCache());
const circularShallowEqual = <A, B>(a: A, b: B) =>
  customShallowCircularHandler(a, b, getCache());
```
