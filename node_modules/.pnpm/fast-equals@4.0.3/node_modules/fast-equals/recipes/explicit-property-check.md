# Explicit property check

Sometimes it is necessary to squeeze every once of performance out of your runtime code, and deep equality checks can be a bottleneck. When this is occurs, it can be advantageous to build a custom comparison that allows for highly specific equality checks.

An example where you know the shape of the objects being passed in, where the `foo` property is a simple primitive and the `bar` property is a nested object:

```ts
import { createCustomEqual } from 'fast-equals';
import type { TypeEqualityComparator } from 'fast-equals';

interface SpecialObject {
  foo: string;
  bar: {
    baz: number;
  };
}

const areObjectsEqual: TypeEqualityComparator<SpecialObject, undefined> = (
  a,
  b,
) => {
  return a.foo === b.foo && a.bar.baz === b.bar.baz;
};

const isSpecialObjectEqual = createCustomEqual(() => ({
  areObjectsEqual,
}));
```
