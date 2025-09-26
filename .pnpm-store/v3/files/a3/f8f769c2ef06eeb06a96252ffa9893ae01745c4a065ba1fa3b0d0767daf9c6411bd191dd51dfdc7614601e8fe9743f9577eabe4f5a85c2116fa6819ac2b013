# inline-style-parser

[![NPM](https://nodei.co/npm/inline-style-parser.png)](https://nodei.co/npm/inline-style-parser/)

[![NPM version](https://badgen.net/npm/v/inline-style-parser)](https://www.npmjs.com/package/inline-style-parser)
[![Bundlephobia minified + gzip](https://badgen.net/bundlephobia/minzip/inline-style-parser)](https://bundlephobia.com/package/inline-style-parser)
[![build](https://github.com/remarkablemark/inline-style-parser/actions/workflows/build.yml/badge.svg)](https://github.com/remarkablemark/inline-style-parser/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/remarkablemark/inline-style-parser/branch/master/graph/badge.svg?token=B8EEK5709W)](https://codecov.io/gh/remarkablemark/inline-style-parser)
[![NPM downloads](https://badgen.net/npm/dm/inline-style-parser)](https://www.npmjs.com/package/inline-style-parser)

Inline style parser copied from [`css/lib/parse/index.js`](https://github.com/reworkcss/css/blob/v2.2.4/lib/parse/index.js):

```
InlineStyleParser(string)
```

Example:

```js
const parse = require('inline-style-parser');

parse('color: #BADA55;');
```

Output:

```js
[ { type: 'declaration',
    property: 'color',
    value: '#BADA55',
    position: Position { start: [Object], end: [Object], source: undefined } } ]
```

[JSFiddle](https://jsfiddle.net/remarkablemark/hcxbpwq8/) | [Replit](https://replit.com/@remarkablemark/inline-style-parser) | [Examples](https://github.com/remarkablemark/inline-style-parser/tree/master/examples)

## Installation

[NPM](https://www.npmjs.com/package/inline-style-parser):

```sh
npm install inline-style-parser --save
```

[Yarn](https://yarnpkg.com/package/inline-style-parser):

```sh
yarn add inline-style-parser
```

[CDN](https://unpkg.com/inline-style-parser/):

```html
<script src="https://unpkg.com/inline-style-parser@latest/dist/inline-style-parser.min.js"></script>
<script>
  window.InlineStyleParser(/* string */);
</script>
```

## Usage

Import with ES Modules:

```js
import parse from 'inline-style-parser';
```

Or require with CommonJS:

```js
const parse = require('inline-style-parser');
```

Parse single declaration:

```js
parse('left: 0');
```

Output:

```js
[
  {
    type: 'declaration',
    property: 'left',
    value: '0',
    position: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 8 },
      source: undefined
    }
  }
]
```

Parse multiple declarations:

```js
parse('left: 0; right: 100px;');
```

Output:

```js
[
  {
    type: 'declaration',
    property: 'left',
    value: '0',
    position: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 8 },
      source: undefined
    }
  },
  {
    type: 'declaration',
    property: 'right',
    value: '100px',
    position: {
      start: { line: 1, column: 10 },
      end: { line: 1, column: 22 },
      source: undefined
    }
  }
]
```

Parse declaration with missing value:

```js
parse('top:');
```

Output:

```js
[
  {
    type: 'declaration',
    property: 'top',
    value: '',
    position: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 5 },
      source: undefined
    }
  }
]
```

Parse unknown declaration:

```js
parse('answer: 42;');
```

Output:

```js
[
  {
    type: 'declaration',
    property: 'answer',
    value: '42',
    position: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 11 },
      source: undefined
    }
  }
]
```

Invalid declarations:

```js
parse('');      // []
parse();        // throws TypeError
parse(1);       // throws TypeError
parse('width'); // throws Error
parse('/*');    // throws Error
```

## Testing

Run tests:

```sh
npm test
```

Run tests in watch mode:

```sh
npm run test:watch
```

Run tests with coverage:

```sh
npm run test:coverage
```

Run tests in CI mode:

```sh
npm run test:ci
```

Lint files:

```sh
npm run lint
```

Fix lint errors:

```sh
npm run lint:fix
```

## Release

Release and publish are automated by [Release Please](https://github.com/googleapis/release-please).

## License

[MIT](https://github.com/remarkablemark/inline-style-parser/blob/master/LICENSE). See the [license](https://github.com/reworkcss/css/blob/v2.2.4/LICENSE) from the original project.
