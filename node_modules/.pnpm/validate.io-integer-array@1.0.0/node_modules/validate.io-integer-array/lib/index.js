/**
*
*	VALIDATE: integer-array
*
*
*	DESCRIPTION:
*		- Validates if a value is an integer array.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isInteger = require( 'validate.io-integer' );


// IS INTEGER ARRAY //

/**
* FUNCTION: isIntegerArray( value )
*	Validates if a value is an integer array.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is an integer array
*/
function isIntegerArray( value ) {
	var len;
	if ( !isArray( value ) ) {
		return false;
	}
	len = value.length;
	if ( !len ) {
		return false;
	}
	for ( var i = 0; i < len; i++ ) {
		if ( !isInteger( value[i] ) ) {
			return false;
		}
	}
	return true;
} // end FUNCTION isIntegerArray()


// EXPORTS //

module.exports = isIntegerArray;
