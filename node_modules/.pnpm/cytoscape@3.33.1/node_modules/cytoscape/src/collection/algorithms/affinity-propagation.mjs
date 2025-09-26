// Implemented by Zoe Xi @zoexi for GSOC 2016
// https://github.com/cytoscape/cytoscape.js-affinity-propagation

// Implemented from the reference library: https://github.com/juhis/affinity-propagation
// Additional reference: http://www.psi.toronto.edu/affinitypropagation/faq.html

import * as util from '../../util/index.mjs';
import * as math from '../../math.mjs';
import * as is from '../../is.mjs';
import clusteringDistance from './clustering-distances.mjs';

let defaults = util.defaults({
  distance: 'euclidean', // distance metric to compare attributes between two nodes
  preference: 'median', // suitability of a data point to serve as an exemplar
  damping: 0.8, // damping factor between [0.5, 1)
  maxIterations: 1000, // max number of iterations to run
  minIterations: 100, // min number of iterations to run in order for clustering to stop
  attributes: [ // functions to quantify the similarity between any two points
    // e.g. node => node.data('weight')
  ]
});

let setOptions = function( options ) {
  let dmp = options.damping;
  let pref = options.preference;

  if( !(0.5 <= dmp && dmp < 1) ){
    util.error(`Damping must range on [0.5, 1).  Got: ${dmp}`);
  }

  let validPrefs = ['median', 'mean', 'min', 'max'];
  if( !( validPrefs.some(v => v === pref) || is.number(pref) ) ){
    util.error(`Preference must be one of [${validPrefs.map( p => `'${p}'` ).join(', ')}] or a number.  Got: ${pref}`);
  }

  return defaults( options );
};

if( process.env.NODE_ENV !== 'production' ){ /* eslint-disable no-console, no-unused-vars */
  var printMatrix = function( M ) { // used for debugging purposes only
    let str = '';
    let log = s => str = str + s + '\n';
    let n = Math.sqrt(M.length);
    for ( let i = 0; i < n; i++ ) {
      let row = '';
      for ( let j = 0; j < n; j++ ) {
        row += M[i*n+j] + ' ';
      }
      log(row);
    }

    console.log(str);
  };
} /* eslint-enable */

let getSimilarity = function( type, n1, n2, attributes ) {
  let attr = (n, i) => attributes[i](n);

  // nb negative because similarity should have an inverse relationship to distance
  return -clusteringDistance( type, attributes.length, i => attr(n1, i), i => attr(n2, i), n1, n2 );
};

let getPreference = function( S, preference ) { // larger preference = greater # of clusters
  let p = null;

  if( preference === 'median' ){
    p = math.median( S );
  } else if( preference === 'mean' ){
    p = math.mean( S );
  } else if ( preference === 'min' ){
    p = math.min( S );
  } else if ( preference === 'max' ){
    p = math.max( S );
  } else { // Custom preference number, as set by user
    p = preference;
  }

  return p;
};

let findExemplars = function( n, R, A ) {
  let indices = [];
  for ( let i = 0; i < n; i++ ) {
    if ( R[i * n + i] + A[i * n + i] > 0 ) {
      indices.push(i);
    }
  }
  return indices;
};

let assignClusters = function( n, S, exemplars ) {
  let clusters = [];

  for ( let i = 0; i < n; i++ ) {
    let index = -1;
    let max = -Infinity;

    for ( let ei = 0; ei < exemplars.length; ei++ ) {
      let e = exemplars[ei];
      if ( S[i * n + e] > max ) {
        index = e;
        max = S[i * n + e];
      }
    }

    if( index > 0 ){
      clusters.push(index);
    }
  }

  for (let ei = 0; ei < exemplars.length; ei++) {
    clusters[ exemplars[ei] ] = exemplars[ei];
  }

  return clusters;
};

let assign = function( n, S, exemplars ) {

  let clusters = assignClusters( n, S, exemplars );

  for ( let ei = 0; ei < exemplars.length; ei++ ) {

    let ii = [];
    for ( let c = 0; c < clusters.length; c++ ) {
      if (clusters[c] === exemplars[ei]) {
        ii.push(c);
      }
    }

    let maxI = -1;
    let maxSum = -Infinity;
    for ( let i = 0; i < ii.length; i++ ) {
      let sum = 0;
      for ( let j = 0; j < ii.length; j++ ) {
        sum += S[ii[j] * n + ii[i]];
      }
      if ( sum > maxSum ) {
        maxI = i;
        maxSum = sum;
      }
    }

    exemplars[ei] = ii[maxI];
  }

  clusters = assignClusters( n, S, exemplars );

  return clusters;
};

let affinityPropagation = function( options ) {
  let cy    = this.cy();
  let nodes = this.nodes();
  let opts  = setOptions( options );

  // Map each node to its position in node array
  let id2position = {};
  for( let i = 0; i < nodes.length; i++ ){
    id2position[ nodes[i].id() ] = i;
  }

  // Begin affinity propagation algorithm

  let n;  // number of data points
  let n2; // size of matrices
  let S;  // similarity matrix (1D array)
  let p;  // preference/suitability of a data point to serve as an exemplar
  let R;  // responsibility matrix (1D array)
  let A;  // availability matrix (1D array)

  n  = nodes.length;
  n2 = n * n;

  // Initialize and build S similarity matrix
  S  = new Array(n2);
  for ( let i = 0; i < n2; i++ ) {
    S[i] = -Infinity; // for cases where two data points shouldn't be linked together
  }

  for ( let i = 0; i < n; i++ ) {
    for ( let j = 0; j < n; j++ ) {
      if ( i !== j ) {
        S[i * n + j] = getSimilarity( opts.distance, nodes[i], nodes[j], opts.attributes );
      }
    }
  }

  // Place preferences on the diagonal of S
  p = getPreference( S, opts.preference );
  for ( let i = 0; i < n; i++ ) {
    S[i * n + i] = p;
  }

  // Initialize R responsibility matrix
  R = new Array(n2);
  for ( let i = 0; i < n2; i++ ) {
    R[i] = 0.0;
  }

  // Initialize A availability matrix
  A = new Array(n2);
  for ( let i = 0; i < n2; i++ ) {
    A[i] = 0.0;
  }

  let old = new Array(n);
  let Rp  = new Array(n);
  let se  = new Array(n);

  for ( let i = 0; i < n; i ++ ) {
    old[i] = 0.0;
    Rp[i]  = 0.0;
    se[i]  = 0;
  }

  let e = new Array(n * opts.minIterations);
  for ( let i = 0; i < e.length; i++ ) {
    e[i] = 0;
  }

  let iter;
  for ( iter = 0; iter < opts.maxIterations; iter++ ) { // main algorithmic loop

    // Update R responsibility matrix
    for ( let i = 0; i < n; i++ ) {

      let max = -Infinity,
          max2 = -Infinity,
          maxI = -1,
          AS = 0.0;

      for ( let j = 0; j < n; j++ ) {

        old[j] = R[i * n + j];

        AS = A[i * n + j] + S[i * n + j];
        if ( AS >= max ) {
          max2 = max;
          max = AS;
          maxI = j;
        }
        else if ( AS > max2 ) {
          max2 = AS;
        }
      }

      for ( let j = 0; j < n; j++ ) {
        R[i * n + j] = (1 - opts.damping) * (S[i * n + j] - max) + opts.damping * old[j];
      }

      R[i * n + maxI] = (1 - opts.damping) * (S[i * n + maxI] - max2) + opts.damping * old[maxI];
    }

    // Update A availability matrix
    for ( let i = 0; i < n; i++ ) {
      let sum = 0;

      for ( let j = 0; j < n; j++ ) {
        old[j] = A[j * n + i];
        Rp[j] = Math.max(0, R[j * n + i]);
        sum += Rp[j];
      }

      sum -= Rp[i];
      Rp[i] = R[i * n + i];
      sum += Rp[i];

      for ( let j = 0; j < n; j++ ) {
        A[j * n + i] = (1 - opts.damping) * Math.min(0, sum - Rp[j]) + opts.damping * old[j];
      }
      A[i * n + i] = (1 - opts.damping) * (sum - Rp[i]) + opts.damping * old[i];
    }

    // Check for convergence
    let K = 0;
    for ( let i = 0; i < n; i++ ) {
      let E = A[i * n + i] + R[i * n + i] > 0 ? 1 : 0;
      e[(iter % opts.minIterations) * n + i] = E;
      K += E;
    }

    if ( K > 0 && (iter >= opts.minIterations - 1 || iter == opts.maxIterations - 1) ) {

      let sum = 0;
      for ( let i = 0; i < n; i++ ) {
        se[i] = 0;
        for ( let j = 0; j < opts.minIterations; j++ ) {
          se[i] += e[j * n + i];
        }
        if ( se[i] === 0 || se[i] === opts.minIterations ) {
          sum++;
        }
      }

      if ( sum === n ) { // then we have convergence
        break;
      }
    }
  }

  // Identify exemplars (cluster centers)
  let exemplarsIndices = findExemplars( n, R, A );

  // Assign nodes to clusters
  let clusterIndices = assign( n, S, exemplarsIndices, nodes, id2position );

  let clusters = {};
  for ( let c = 0; c < exemplarsIndices.length; c++ ) {
    clusters[ exemplarsIndices[c] ] = [];
  }

  for (let i = 0; i < nodes.length; i++) {
    let pos = id2position[ nodes[i].id() ];
    let clusterIndex = clusterIndices[pos];

    if( clusterIndex != null ){ // the node may have not been assigned a cluster if no valid attributes were specified
      clusters[ clusterIndex ].push( nodes[i] );
    }
  }
  let retClusters = new Array(exemplarsIndices.length);
  for ( let c = 0; c < exemplarsIndices.length; c++ ) {
    retClusters[c] = cy.collection( clusters[ exemplarsIndices[c] ] );
  }

  return retClusters;
};

export default { affinityPropagation, ap: affinityPropagation };
