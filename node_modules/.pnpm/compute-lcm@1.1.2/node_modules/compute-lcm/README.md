Least Common Multiple
===
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependencies][dependencies-image]][dependencies-url]

> Computes the [least common multiple](http://en.wikipedia.org/wiki/Least_common_multiple) (lcm).

__Note__: the lcm is also known as the __lowest common multiple__ or __smallest common multiple__ and finds common use in calculating the __lowest common denominator__ (lcd).


## Installation

``` bash
$ npm install compute-lcm
```

For use in the browser, use [browserify](https://github.com/substack/node-browserify).


## Usage

``` javascript
var lcm = require( 'compute-lcm' );
```


#### lcm( a, b[, c,...,n] )

Computes the [least common multiple](http://en.wikipedia.org/wiki/Least_common_multiple) (lcm) of two or more `integers`.

``` javascript
var val = lcm( 21, 6 );
// returns 42

var val = lcm( 21, 6, 126 );
// returns 126
```


#### lcm( arr[, clbk] )

Computes the [least common multiple](http://en.wikipedia.org/wiki/Least_common_multiple) (lcm) of two or more `integers`.

``` javascript
var val = lcm( [21, 6] );
// returns 42

var val = lcm( [21, 6, 126] );
// returns 126
```

For object `arrays`, provide an accessor `function` for accessing `array` values.

``` javascript
var data = [
	['beep', 4],
	['boop', 8],
	['bap', 12],
	['baz', 16]
];

function getValue( d, i ) {
	return d[ 1 ];
}

var arr = lcm( arr, getValue );
// returns 48
```

## Notes

- If provided a single `integer` argument or an `array` with a length less than `2`, the function returns `null`.


## Examples

``` javascript
var lcm = require( 'compute-lcm' );

// Compute the lcm of random tuples...
var x, y, z, arr, val;
for ( var i = 0; i < 100; i++ ) {
	x = Math.round( Math.random()*50 );
	y = Math.round( Math.random()*50 );
	z = Math.round( Math.random()*50 );
	arr = [ x, y, z ];
	val = lcm( arr );
	console.log( arr, val );
}
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

Copyright &copy; 2014-2015. Athan Reines.


[npm-image]: http://img.shields.io/npm/v/compute-lcm.svg
[npm-url]: https://npmjs.org/package/compute-lcm

[travis-image]: http://img.shields.io/travis/compute-io/lcm/master.svg
[travis-url]: https://travis-ci.org/compute-io/lcm

[coveralls-image]: https://img.shields.io/coveralls/compute-io/lcm/master.svg
[coveralls-url]: https://coveralls.io/r/compute-io/lcm?branch=master

[dependencies-image]: http://img.shields.io/david/compute-io/lcm.svg
[dependencies-url]: https://david-dm.org/compute-io/lcm

[dev-dependencies-image]: http://img.shields.io/david/dev/compute-io/lcm.svg
[dev-dependencies-url]: https://david-dm.org/dev/compute-io/lcm

[github-issues-image]: http://img.shields.io/github/issues/compute-io/lcm.svg
[github-issues-url]: https://github.com/compute-io/lcm/issues
