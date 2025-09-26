'use strict';

// MODULES //

var gcd = require( 'compute-gcd' ),
	isArray = require( 'validate.io-array' ),
	isIntegerArray = require( 'validate.io-integer-array' ),
	isFunction = require( 'validate.io-function' );


// LEAST COMMON MULTIPLE //

/**
* FUNCTION: lcm( arr[, clbk] )
*	Computes the least common multiple (lcm).
*
* @param {Number[]|Number} arr - input array of integers
* @param {Function|Number} [accessor] - accessor function for accessing array values
* @returns {Number|Null} least common multiple or null
*/
function lcm() {
	var nargs = arguments.length,
		args,
		clbk,
		arr,
		len,
		a, b,
		i;

	// Copy the input arguments to an array...
	args = new Array( nargs );
	for ( i = 0; i < nargs; i++ ) {
		args[ i ] = arguments[ i ];
	}
	// Have we been provided with integer arguments?
	if ( isIntegerArray( args ) ) {
		if ( nargs === 2 ) {
			a = args[ 0 ];
			b = args[ 1 ];
			if ( a < 0 ) {
				a = -a;
			}
			if ( b < 0 ) {
				b = -b;
			}
			if ( a === 0 || b === 0 ) {
				return 0;
			}
			return ( a/gcd(a,b) ) * b;
		}
		arr = args;
	}
	// If not integers, ensure that the first argument is an array...
	else if ( !isArray( args[ 0 ] ) ) {
		throw new TypeError( 'lcm()::invalid input argument. Must provide an array of integers. Value: `' + args[ 0 ] + '`.' );
	}
	// Have we been provided with more than one argument? If so, ensure that the accessor argument is a function...
	else if ( nargs > 1 ) {
		arr = args[ 0 ];
		clbk = args[ 1 ];
		if ( !isFunction( clbk ) ) {
			throw new TypeError( 'lcm()::invalid input argument. Accessor must be a function. Value: `' + clbk + '`.' );
		}
	}
	// We have been provided an array...
	else {
		arr = args[ 0 ];
	}
	len = arr.length;

	// Check if a sufficient number of values have been provided...
	if ( len < 2 ) {
		return null;
	}
	// If an accessor is provided, extract the array values...
	if ( clbk ) {
		a = new Array( len );
		for ( i = 0; i < len; i++ ) {
			a[ i ] = clbk( arr[ i ], i );
		}
		arr = a;
	}
	// Given an input array, ensure all array values are integers...
	if ( nargs < 3 ) {
		if ( !isIntegerArray( arr ) ) {
			throw new TypeError( 'lcm()::invalid input argument. Accessed array values must be integers. Value: `' + arr + '`.' );
		}
	}
	// Convert any negative integers to positive integers...
	for ( i = 0; i < len; i++ ) {
		a = arr[ i ];
		if ( a < 0 ) {
			arr[ i ] = -a;
		}
	}
	// Exploit the fact that the lcm is an associative function...
	a = arr[ 0 ];
	for ( i = 1; i < len; i++ ) {
		b = arr[ i ];
		if ( a === 0 || b === 0 ) {
			return 0;
		}
		a = ( a/gcd(a,b) ) * b;
	}
	return a;
} // end FUNCTION lcm()


// EXPORTS //

module.exports = lcm;
