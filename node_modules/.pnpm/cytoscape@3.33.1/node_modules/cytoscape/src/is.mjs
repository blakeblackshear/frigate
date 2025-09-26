/*global HTMLElement DocumentTouch */

import window from './window.mjs';

let navigator = window ? window.navigator : null;
let document = window ? window.document : null;

let typeofstr = typeof '';
let typeofobj = typeof {};
let typeoffn = typeof function(){};
let typeofhtmlele = typeof HTMLElement;

let instanceStr = function( obj ){
  return obj && obj.instanceString && fn( obj.instanceString ) ? obj.instanceString() : null;
};

export const defined = obj =>
  obj != null; // not undefined or null

export const string = obj =>
  obj != null && typeof obj == typeofstr;

export const fn = obj =>
  obj != null && typeof obj === typeoffn;

export const array = obj =>
  !(elementOrCollection(obj)) && (Array.isArray ? Array.isArray( obj ) : obj != null && obj instanceof Array);

export const plainObject = obj =>
  obj != null && typeof obj === typeofobj && !array( obj ) && obj.constructor === Object;

export const object = obj =>
  obj != null && typeof obj === typeofobj;

export const number = obj =>
  obj != null && typeof obj === typeof 1 && !isNaN( obj );

export const integer = obj =>
  number( obj ) && Math.floor( obj ) === obj;

export const bool = obj =>
  obj != null && typeof obj === typeof true;

export const htmlElement = obj => {
  if( 'undefined' === typeofhtmlele ){
    return undefined;
  } else {
    return null != obj && obj instanceof HTMLElement;
  }
};

export const elementOrCollection = obj =>
  element( obj ) || collection( obj );

export const element = obj =>
  instanceStr( obj ) === 'collection' && obj._private.single;

export const collection = obj =>
  instanceStr( obj ) === 'collection' && !obj._private.single;

export const core = obj =>
  instanceStr( obj ) === 'core';

export const style = obj =>
  instanceStr( obj ) === 'style';

export const stylesheet = obj =>
  instanceStr( obj ) === 'stylesheet';

export const event = obj =>
  instanceStr( obj ) === 'event';

export const thread = obj =>
  instanceStr( obj ) === 'thread';

export const fabric = obj =>
  instanceStr( obj ) === 'fabric';

export const emptyString = obj => {
  if( obj === undefined || obj === null ){ // null is empty
    return true;
  } else if( obj === '' || obj.match( /^\s+$/ ) ){
    return true; // empty string is empty
  }

  return false; // otherwise, we don't know what we've got
};

export const nonemptyString = obj => {
  if( obj && string( obj ) && obj !== '' && !obj.match( /^\s+$/ ) ){
    return true;
  }

  return false;
};

export const domElement = obj => {
  if( typeof HTMLElement === 'undefined' ){
    return false; // we're not in a browser so it doesn't matter
  } else {
    return obj instanceof HTMLElement;
  }
};

export const boundingBox = obj =>
  plainObject( obj ) &&
    number( obj.x1 ) && number( obj.x2 ) &&
    number( obj.y1 ) && number( obj.y2 )
  ;

export const promise = obj =>
  object( obj ) && fn( obj.then );

export const touch = () =>
  window && ( ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch );

export const gecko = () =>
  window && ( typeof InstallTrigger !== 'undefined' || ('MozAppearance' in document.documentElement.style) );

export const webkit = () =>
  window && ( typeof webkitURL !== 'undefined' || ('WebkitAppearance' in document.documentElement.style) );

export const chromium = () =>
  window && ( typeof chrome !== 'undefined' );

export const khtml = () =>
  navigator && navigator.vendor.match( /kde/i ); // probably a better way to detect this...

export const khtmlEtc = () =>
  khtml() || webkit() || chromium();

export const ms = () =>
  navigator && navigator.userAgent.match( /msie|trident|edge/i ); // probably a better way to detect this...

export const windows = () =>
  navigator && navigator.appVersion.match( /Win/i );

export const mac = () =>
  navigator && navigator.appVersion.match( /Mac/i );

export const linux = () =>
  navigator && navigator.appVersion.match( /Linux/i );

export const unix = () =>
  navigator && navigator.appVersion.match( /X11/i );
