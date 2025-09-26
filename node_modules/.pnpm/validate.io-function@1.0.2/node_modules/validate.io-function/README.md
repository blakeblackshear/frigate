Function
===
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependencies][dependencies-image]][dependencies-url]

> Validates if a value is a function.


## Installation

``` bash
$ npm install validate.io-function
```

For use in the browser, use [browserify](https://github.com/substack/node-browserify).


## Usage

``` javascript
var isFunction = require( 'validate.io-function' );
```

#### isFunction( value )

Validates if a `value` is a `function`.

``` javascript
var value = function beep(){};

var bool = isFunction( value );
// returns true
```


## Examples

``` javascript
console.log( isFunction( function foo(){} ) );
// returns true

console.log( isFunction( {} ) );
// returns false
```

To run the example code from the top-level application directory,

``` bash
$ node ./examples/index.js
```


## Tests

### Unit

Unit tests use the [Mocha](http://mochajs.org) test framework with [Chai](http://chaijs.com) assertions. To run the tests, execute the following command in the top-level application directory:

``` bash
$ make test
```

All new feature development should have corresponding unit tests to validate correct functionality.


### Test Coverage

This repository uses [Istanbul](https://github.com/gotwarlost/istanbul) as its code coverage tool. To generate a test coverage report, execute the following command in the top-level application directory:

``` bash
$ make test-cov
```

Istanbul creates a `./reports/coverage` directory. To access an HTML version of the report,

``` bash
$ make view-cov
```


---
## License

[MIT license](http://opensource.org/licenses/MIT). 


## Copyright

Copyright &copy; 2014. Athan Reines.


[npm-image]: http://img.shields.io/npm/v/validate.io-function.svg
[npm-url]: https://npmjs.org/package/validate.io-function

[travis-image]: http://img.shields.io/travis/validate-io/function/master.svg
[travis-url]: https://travis-ci.org/validate-io/function

[coveralls-image]: https://img.shields.io/coveralls/validate-io/function/master.svg
[coveralls-url]: https://coveralls.io/r/validate-io/function?branch=master

[dependencies-image]: http://img.shields.io/david/validate-io/function.svg
[dependencies-url]: https://david-dm.org/validate-io/function

[dev-dependencies-image]: http://img.shields.io/david/dev/validate-io/function.svg
[dev-dependencies-url]: https://david-dm.org/dev/validate-io/function

[github-issues-image]: http://img.shields.io/github/issues/validate-io/function.svg
[github-issues-url]: https://github.com/validate-io/function/issues
