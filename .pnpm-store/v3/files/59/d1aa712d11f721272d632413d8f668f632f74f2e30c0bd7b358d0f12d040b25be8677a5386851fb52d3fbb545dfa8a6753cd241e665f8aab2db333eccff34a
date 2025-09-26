Greatest Common Divisor
===
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependencies][dependencies-image]][dependencies-url]

> Computes the [greatest common divisor](http://en.wikipedia.org/wiki/Greatest_common_divisor) (gcd).

Note: the gcd is also known as the __greatest common factor__ (gcf), __highest common factor__ (hcf), __highest common divisor__, and __greatest common measure__ (gcm).



## Installation

``` bash
$ npm install compute-gcd
```

For use in the browser, use [browserify](https://github.com/substack/node-browserify).


## Usage

``` javascript
var gcd = require( 'compute-gcd' );
```


#### gcd( a, b[, c,...,n] )

Computes the [greatest common divisor](http://en.wikipedia.org/wiki/Greatest_common_divisor) (gcd) of two or more `integers`.

``` javascript
var val = gcd( 48, 18 );
// returns 6

var val = gcd( 8, 12, 16 );
// returns 4
```


#### gcd( arr[, accessor] )

Computes the [greatest common divisor](http://en.wikipedia.org/wiki/Greatest_common_divisor) (gcd) of two or more `integers`.

``` javascript
var val = gcd( [48, 18] );
// returns 6

var val = gcd( [8, 12, 16] );
// returns 4
```

For object `arrays`, provide an accessor `function` for accessing `array` values

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

var arr = gcd( arr, getValue );
// returns 4
```



## Notes

-	For more than 3 values, a performance gain can be achieved if the values are sorted in ascending order.
- 	If provided an `array` with a length less than `2` or a single `integer` argument, the function returns `null`.



## Examples

``` javascript
var gcd = require( 'compute-gcd' );

// Compute the gcd of random tuples...
var x, y, z, arr, val;
for ( var i = 0; i < 100; i++ ) {
	x = Math.round( Math.random()*50 );
	y = Math.round( Math.random()*50 );
	z = Math.round( Math.random()*50 );
	arr = [ x, y, z ];
	val = gcd( arr );
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


[npm-image]: http://img.shields.io/npm/v/compute-gcd.svg
[npm-url]: https://npmjs.org/package/compute-gcd

[travis-image]: http://img.shields.io/travis/compute-io/gcd/master.svg
[travis-url]: https://travis-ci.org/compute-io/gcd

[coveralls-image]: https://img.shields.io/coveralls/compute-io/gcd/master.svg
[coveralls-url]: https://coveralls.io/r/compute-io/gcd?branch=master

[dependencies-image]: http://img.shields.io/david/compute-io/gcd.svg
[dependencies-url]: https://david-dm.org/compute-io/gcd

[dev-dependencies-image]: http://img.shields.io/david/dev/compute-io/gcd.svg
[dev-dependencies-url]: https://david-dm.org/dev/compute-io/gcd

[github-issues-image]: http://img.shields.io/github/issues/compute-io/gcd.svg
[github-issues-url]: https://github.com/compute-io/gcd/issues
