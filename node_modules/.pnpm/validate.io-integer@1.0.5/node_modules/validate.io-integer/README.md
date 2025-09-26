Integer
===
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependencies][dependencies-image]][dependencies-url]

> Validates if a value is an integer.


## Installation

``` bash
$ npm install validate.io-integer
```

For use in the browser, use [browserify](https://github.com/substack/node-browserify).


## Usage

``` javascript
var isInteger = require( 'validate.io-integer' );
```


#### isInteger( value )

Validates if a value is an `integer`.

``` javascript
var value = 5;

var bool = isInteger( value );
// returns true
```

__Note__: this method validates that a value is `numeric` __before__ determining if the `value` is an `integer`. For non-numeric values, the method returns `false`.


## Examples

``` javascript
var bool;

bool = isInteger( 5 );
// returns true

bool = isInteger( 0 );
// returns true

bool = isInteger( 5.256 );
// returns false

bool = isInteger( 1/0 );
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


[npm-image]: http://img.shields.io/npm/v/validate.io-integer.svg
[npm-url]: https://npmjs.org/package/validate.io-integer

[travis-image]: http://img.shields.io/travis/validate-io/integer/master.svg
[travis-url]: https://travis-ci.org/validate-io/integer

[coveralls-image]: https://img.shields.io/coveralls/validate-io/integer/master.svg
[coveralls-url]: https://coveralls.io/r/validate-io/integer?branch=master

[dependencies-image]: http://img.shields.io/david/validate-io/integer.svg
[dependencies-url]: https://david-dm.org/validate-io/integer

[dev-dependencies-image]: http://img.shields.io/david/dev/validate-io/integer.svg
[dev-dependencies-url]: https://david-dm.org/dev/validate-io/integer

[github-issues-image]: http://img.shields.io/github/issues/validate-io/integer.svg
[github-issues-url]: https://github.com/validate-io/integer/issues
