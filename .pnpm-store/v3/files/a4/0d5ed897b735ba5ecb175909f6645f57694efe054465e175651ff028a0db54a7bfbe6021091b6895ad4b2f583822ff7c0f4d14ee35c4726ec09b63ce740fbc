node-parse-numeric-range
========================

Parses expressions like 1-10,20-30. Returns an energetic (as opposed to lazy) array.


## Supported Expressions
Comprehensive supported expression examples:

| Expression | result       |
|:----------:|:------------:|
|            |   []         |
|     1      |   [1]        |
|    1,2     |  [1,2]       |
|    -10     |  [-10]       |
|   -3,-3    |[-3, -3]      |
|  -1-2,-2   |[-1,0,1,2,-2] |
|  -1--2     |[-1,-2]       |
|  -1..2,-2  |[-1,0,1,2,-2] |
|  -1...3,-2 |[-1,0,1,2,-2] |
|   1⋯3      |[1,2]         |
|  1…3       |[1,2]         |
|  1‥3       |[1,2,3]       |


What's this useful for? Well, letting users input these sorts of things and then
making them programmatically useful.


## Usage

First, `npm install parse-numeric-range`.

```javascript
const rangeParser = require("parse-numeric-range");

const numbers = rangeParser("4,6,8-10,12,14..16,18,20...23");

console.log(
  `The first ${numbers.length} composite numbers are: ${numbers.join(", ")}`,
);
```

### ES6
```jsx
import rangeParser from "parse-numeric-range";

const numbers = rangeParser("4,6,8-10,12,14..16,18,20...23");

console.log(
  `The first ${numbers.length} composite numbers are: ${numbers.join(", ")}`,
);
```