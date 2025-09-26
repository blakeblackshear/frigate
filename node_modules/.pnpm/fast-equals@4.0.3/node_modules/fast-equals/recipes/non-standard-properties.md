# Non-standard properties

Sometimes, objects require a comparison that extend beyond its own keys. Perhaps there is a non-enumerable property that is important, or perhaps there are symbols as keys. In this case, the standard validators will return false positives, because internally `fast-equals` uses `Object.keys()` for object comparisons.

Using a custom object comparator with `createCustomEqual` allows these kinds of comparisons.

```ts
import { createCustomEqual } from 'fast-equals';
import type { TypeEqualityComparator } from 'fast-equals';

const areObjectsEqual: TypeEqualityComparator<Record<any, any>, undefined> = (
  a,
  b,
) => {
  const propertiesA = [
    ...Object.getOwnPropertyNames(a),
    ...Object.getOwnPropertySymbols(a),
  ];
  const propertiesB = [
    ...Object.getOwnPropertyNames(b),
    ...Object.getOwnPropertySymbols(b),
  ];

  if (propertiesA.length !== propertiesB.length) {
    return false;
  }

  return propertiesA.every(
    (property) => a[property as any] === b[property as any],
  );
};

const deepEqual = createCustomEqual(() => ({ areObjectsEqual }));
```
