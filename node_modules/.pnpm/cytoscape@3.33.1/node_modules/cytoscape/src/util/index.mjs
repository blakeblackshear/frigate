import * as is from '../is.mjs';
import * as strings from './strings.mjs';
import * as regex from './regex.mjs';
import * as sort from './sort.mjs';
import { memoize } from './memoize.mjs';
import { extend } from './extend.mjs';

export * from './colors.mjs';
export * from './maps.mjs';
export * from './strings.mjs';
export * from './timing.mjs';
export * from './hash.mjs';
export * from './position.mjs';

export { strings, extend, extend as assign, memoize, regex, sort };

let warningsEnabled = true;
let warnSupported = console.warn != null;
let traceSupported = console.trace != null;

export const MAX_INT = Number.MAX_SAFE_INTEGER || 9007199254740991;

export const trueify = () => true;

export const falsify = () => false;

export const zeroify = () => 0;

export const noop = () => {};

export const error = msg => {
  throw new Error( msg );
};

export const warnings = enabled => {
  if( enabled !== undefined ){
    warningsEnabled = !!enabled;
  } else {
    return warningsEnabled;
  }
};

export const warn = msg => {
  if( !warnings() ){ return; }

  if( warnSupported ){
    console.warn( msg );
  } else {
    console.log( msg );

    if( traceSupported ){
      console.trace();
    }
  }
};

export const clone = obj => {
  return extend( {}, obj );
};

// gets a shallow copy of the argument
export const copy = obj => {
  if( obj == null ){
    return obj;
  } if( is.array( obj ) ){
    return obj.slice();
  } else if( is.plainObject( obj ) ){
    return clone( obj );
  } else {
    return obj;
  }
};

export const copyArray = arr => {
  return arr.slice();
};

export const clonePosition = pos => {
  return { x: pos.x, y: pos.y };
};

export const uuid = ( a, b /* placeholders */) => {
    for(               // loop :)
        b=a='';        // b - result , a - numeric letiable
        a++<36;        //
        b+=a*51&52  // if "a" is not 9 or 14 or 19 or 24
                    ?  //  return a random number or 4
           (
             a^15      // if "a" is not 15
                ?      // generate a random number from 0 to 15
             8^Math.random()*
             (a^20?16:4)  // unless "a" is 20, in which case a random number from 8 to 11
                :
             4            //  otherwise 4
             ).toString(16)
                    :
           '-'            //  in other cases (if "a" is 9,14,19,24) insert "-"
        );
    return b;
};

const _staticEmptyObject = {};

export const staticEmptyObject = () => _staticEmptyObject;

export const defaults = defaults => {
  let keys = Object.keys( defaults );

  return opts => {
    let filledOpts = {};

    for( let i = 0; i < keys.length; i++ ){
      let key = keys[i];
      let optVal = opts == null ? undefined : opts[key];

      filledOpts[key] = optVal === undefined ? defaults[key] : optVal;
    }

    return filledOpts;
  };
};

export const removeFromArray = ( arr, ele, oneCopy ) => {
  for( let i = arr.length - 1; i >= 0; i-- ){
    if( arr[i] === ele ){
      arr.splice( i, 1 );

      if( oneCopy ){ break; }
    }
  }
};

export const clearArray = arr => {
  arr.splice( 0, arr.length );
};

export const push = ( arr, otherArr ) => {
  for( let i = 0; i < otherArr.length; i++ ){
    let el = otherArr[i];

    arr.push( el );
  }
};

export const getPrefixedProperty = ( obj, propName, prefix ) => {
  if( prefix ){
    propName = strings.prependCamel( prefix, propName ); // e.g. (labelWidth, source) => sourceLabelWidth
  }

  return obj[ propName ];
};

export const setPrefixedProperty = ( obj, propName, prefix, value ) => {
  if( prefix ){
    propName = strings.prependCamel( prefix, propName ); // e.g. (labelWidth, source) => sourceLabelWidth
  }

  obj[ propName ] = value;
};
