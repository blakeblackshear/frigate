import Heap from '../../heap.mjs';
import * as util from '../../util/index.mjs';

const defaults = util.defaults({
  weight: null,
  directed: false
});

let elesfn = ({

  // Implemented from the algorithm in the paper "On Variants of Shortest-Path Betweenness Centrality and their Generic Computation" by Ulrik Brandes
  betweennessCentrality: function( options ){
    let { directed, weight } = defaults(options);
    let weighted = weight != null;
    let cy = this.cy();

    // starting
    let V = this.nodes();
    let A = {};
    let _C = {};
    let max = 0;
    let C = {
      set: function( key, val ){
        _C[ key ] = val;

        if( val > max ){ max = val; }
      },

      get: function( key ){ return _C[ key ]; }
    };

    // A contains the neighborhoods of every node
    for( let i = 0; i < V.length; i++ ){
      let v = V[ i ];
      let vid = v.id();

      if( directed ){
        A[ vid ] = v.outgoers().nodes(); // get outgoers of every node
      } else {
        A[ vid ] = v.openNeighborhood().nodes(); // get neighbors of every node
      }

      C.set( vid, 0 );
    }

    for( let s = 0; s < V.length; s++ ){
      let sid = V[s].id();
      let S = []; // stack
      let P = {};
      let g = {};
      let d = {};
      let Q = new Heap(function( a, b ){
        return d[a] - d[b];
      }); // queue

      // init dictionaries
      for( let i = 0; i < V.length; i++ ){
        let vid = V[ i ].id();

        P[ vid ] = [];
        g[ vid ] = 0;
        d[ vid ] = Infinity;
      }

      g[ sid ] = 1; // sigma
      d[ sid ] = 0; // distance to s

      Q.push( sid );

      while( !Q.empty() ){
        let v = Q.pop();

        S.push( v );

        if( weighted ){
          for( let j = 0; j < A[v].length; j++ ){
            let w = A[v][j];
            let vEle = cy.getElementById( v );

            let edge;
            if( vEle.edgesTo( w ).length > 0 ){
              edge = vEle.edgesTo( w )[0];
            } else {
              edge = w.edgesTo( vEle )[0];
            }

            let edgeWeight = weight( edge );

            w = w.id();

            if( d[w] > d[v] + edgeWeight ){
              d[w] = d[v] + edgeWeight;

              if( Q.nodes.indexOf( w ) < 0 ){ //if w is not in Q
                Q.push( w );
              } else { // update position if w is in Q
                Q.updateItem( w );
              }

              g[w] = 0;
              P[w] = [];
            }

            if( d[w] == d[v] + edgeWeight ){
              g[w] = g[w] + g[v];
              P[w].push( v );
            }
          }
        } else {
          for( let j = 0; j < A[v].length; j++ ){
            let w = A[v][j].id();

            if( d[w] == Infinity ){
              Q.push( w );

              d[w] = d[v] + 1;
            }

            if( d[w] == d[v] + 1 ){
              g[w] = g[w] + g[v];
              P[w].push( v );
            }
          }
        }
      }

      let e = {};
      for( let i = 0; i < V.length; i++ ){
        e[ V[ i ].id() ] = 0;
      }

      while( S.length > 0 ){
        let w = S.pop();

        for( let j = 0; j < P[w].length; j++ ){
          let v = P[w][j];

          e[v] = e[v] + (g[v] / g[w]) * (1 + e[w]);
        }

        if( w != V[s].id() ){
          C.set( w, C.get( w ) + e[w] );
        }
      }
    }

    let ret = {
      betweenness: function( node ){
        let id = cy.collection(node).id();

        return C.get( id );
      },

      betweennessNormalized: function( node ){
        if ( max == 0 ){ return 0; }

        let id = cy.collection(node).id();

        return C.get( id ) / max;
      }
    };

    // alias
    ret.betweennessNormalised = ret.betweennessNormalized;

    return ret;
  } // betweennessCentrality

}); // elesfn

// nice, short mathematical alias
elesfn.bc = elesfn.betweennessCentrality;

export default elesfn;
