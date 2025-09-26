# Non-standard properties

The equality check done for objects prioritizes the common use-case, which is to only check an object's own keys. However, it is possible that the objects being compared require a stricter comparison of property descriptors.

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

  return propertiesA.every((property) => {
    const descriptorA = Object.getOwnPropertyDescriptor(a, property);
    const descriptorB = Object.getOwnPropertyDescriptor(b, property);

    return (
      descriptorA &&
      descriptorB &&
      descriptorA.configurable === descriptorB.configurable &&
      descriptorA.enumerable === descriptorB.enumerable &&
      descriptorA.value === descriptorB.value &&
      descriptorA.writable === descriptorB.writable
    );
  });
};

const deepEqual = createCustomEqual(() => ({ areObjectsEqual }));
```
