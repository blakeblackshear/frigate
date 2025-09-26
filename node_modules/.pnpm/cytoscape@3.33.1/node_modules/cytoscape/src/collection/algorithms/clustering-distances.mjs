// Common distance metrics for clustering algorithms
// https://en.wikipedia.org/wiki/Hierarchical_clustering#Metric

import * as is from '../../is.mjs';

let identity = x => x;
let absDiff = ( p, q ) => Math.abs( q - p );
let addAbsDiff = ( total, p, q ) => total + absDiff(p, q);
let addSquaredDiff = ( total, p, q ) => total + Math.pow( q - p, 2 );
let sqrt = x => Math.sqrt(x);
let maxAbsDiff = ( currentMax, p, q ) => Math.max( currentMax, absDiff(p, q) );

let getDistance = function( length, getP, getQ, init, visit, post = identity ){
  let ret = init;
  let p, q;

  for ( let dim = 0; dim < length; dim++ ) {
    p = getP(dim);
    q = getQ(dim);

    ret = visit( ret, p, q );
  }

  return post( ret );
};

let distances = {
  euclidean: function ( length, getP, getQ ) {
    if( length >= 2 ){
      return getDistance( length, getP, getQ, 0, addSquaredDiff, sqrt );
    } else { // for single attr case, more efficient to avoid sqrt
      return getDistance( length, getP, getQ, 0, addAbsDiff );
    }
  },
  squaredEuclidean: function ( length, getP, getQ ) {
    return getDistance( length, getP, getQ, 0, addSquaredDiff );
  },
  manhattan: function ( length, getP, getQ ) {
    return getDistance( length, getP, getQ, 0, addAbsDiff );
  },
  max: function ( length, getP, getQ ) {
    return getDistance( length, getP, getQ, -Infinity, maxAbsDiff );
  }
};

// in case the user accidentally doesn't use camel case
distances['squared-euclidean'] = distances['squaredEuclidean'];
distances['squaredeuclidean'] = distances['squaredEuclidean'];

export default function( method, length, getP, getQ, nodeP, nodeQ ){
  let impl;

  if( is.fn( method ) ){
    impl = method;
  } else {
    impl = distances[ method ] || distances.euclidean;
  }

  if( length === 0 && is.fn( method ) ){
    return impl( nodeP, nodeQ );
  } else {
    return impl( length, getP, getQ, nodeP, nodeQ );
  }
}
