# json-schema-compare [![Build Status](https://travis-ci.org/mokkabonna/json-schema-compare.svg?branch=master)](https://travis-ci.org/mokkabonna/json-schema-compare) [![Coverage Status](https://coveralls.io/repos/github/mokkabonna/json-schema-compare/badge.svg?branch=master)](https://coveralls.io/github/mokkabonna/json-schema-compare?branch=master)


> Compare json schemas correctly

```bash
npm install json-schema-compare --save
```

```js
var compare = require('json-schema-compare')

var isEqual = compare({
  title: 'title 1',
  type: ['object'],
  uniqueItems: false,
  dependencies: {
    name: ['age', 'lastName']
  },
  required: ['name', 'age', 'name']
}, {
  title: 'title 2',
  type: 'object',
  required: ['age', 'name'],
  dependencies: {
    name: ['lastName', 'age']
  },
  properties: {
    name: {
      minLength: 0
    }
  }
}, {
  ignore: ['title']
})

console.log(isEqual) // => true
```

Compare json schemas correctly.

- Ignores sort for arrays where sort does not matter, like required, enum, type, anyOf, oneOf, anyOf, dependencies (if array)
- Compares correctly type when array or string
- Ignores duplicate values before comparing
- For schemas and sub schemas `undefined`, `true` and `{}` are equal
- For minLength, minItems and minProperties `undefined` and `0` are equal
- For uniqueItems, `undefined` and `false` are equal


## Options

**ignore** array - default: `[]`

Ignores certain keywords, useful to exclude meta keywords like title, description etc or custom keywords. If all you want to know if they are the same in terms of validation keywords.


## Contributing

Create tests for new functionality and follow the eslint rules.

## License

MIT © [Martin Hansen](http://martinhansen.com)
