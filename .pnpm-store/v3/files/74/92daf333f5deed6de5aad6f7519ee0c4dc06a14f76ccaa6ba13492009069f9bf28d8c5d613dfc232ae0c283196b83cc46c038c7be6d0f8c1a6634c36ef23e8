# `tree-dump`

Prints a tree structure to the console. Can print a binary tree or a tree with any number of children.

## Usage

Install

```
npm install tree-dump
```

Print a non-binary tree

```js
import {printTree} from 'tree-dump';

const str = 'start' + printTree('', [
  (tab) => 'line 1',
  () => '',
  (tab) => 'line 2' + printTree(tab, [
    (tab) => 'line 2.1',
    (tab) => 'line 2.2',
  ])
  (tab) => 'line 3',
]);

console.log(str);
// start
// ├── line 1
// │
// ├── line 2
// │   ├── line 2.1
// │   └── line 2.2
// └── line 3
```

Print a binary tree

```js
import {printBinary} from 'tree-dump';

const str =
  'Node' +
  printBinary('', [
    (tab) => 'left' + printBinary(tab, [
      () => 'left 1',
      () => 'right 1',
    ]),
    (tab) => 'right' + printBinary(tab, [
      () => 'left 2',
      () => 'right 2',
    ]),
  ]);

console.log(str);
// Node
// ← left
//   ← left 1
//   → right 1
// → right
//   ← left 2
//   → right 2
```
