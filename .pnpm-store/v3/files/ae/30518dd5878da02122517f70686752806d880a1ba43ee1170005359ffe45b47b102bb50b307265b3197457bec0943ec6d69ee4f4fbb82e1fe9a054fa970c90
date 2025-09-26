# Using `meta` in comparison

Sometimes a "pure" equality between two objects is insufficient, because the comparison relies on some external state. While these kinds of scenarios should generally be avoided, it is possible to handle them with a custom comparator that checks `meta` values.

```ts
import { createCustomEqual } from 'fast-equals';
import type {
  EqualityComparator,
  InternalEqualityComparator,
} from 'fast-equals';

interface MutableState {
  state: string;
}

const mutableState: MutableState = { state: 'baz' };

const createIsNestedEqual: EqualityComparatorCreator<MutableState> =
  (deepEqual) => (a, b, keyA, keyB, parentA, parentB, meta) =>
    deepEqual(a, b, meta) || a === meta.state || b === meta.state;

const deepEqual = createCustomEqual(() => ({ createIsNestedEqual }));
```
