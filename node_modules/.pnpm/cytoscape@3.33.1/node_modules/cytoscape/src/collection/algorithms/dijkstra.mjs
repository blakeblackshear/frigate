import * as is from '../../is.mjs';
import Heap from '../../heap.mjs';
import { defaults } from '../../util/index.mjs';

const dijkstraDefaults = defaults({
  root: null,
  weight: edge => 1,
  directed: false
});

let elesfn = ({

  dijkstra: function( options ){
    if( !is.plainObject(options) ){
      let args = arguments;

      options = { root: args[0], weight: args[1], directed: args[2] };
    }

    let { root, weight, directed } = dijkstraDefaults(options);

    let eles = this;
    let weightFn = weight;
    let source = is.string( root ) ? this.filter( root )[0] : root[0];
    let dist = {};
    let prev = {};
    let knownDist = {};

    let { nodes, edges } = this.byGroup();
    edges.unmergeBy( ele => ele.isLoop() );

    let getDist = node => dist[ node.id() ];

    let setDist = ( node, d ) => {
      dist[ node.id() ] = d;

      Q.updateItem( node );
    };

    let Q = new Heap( (a, b) => getDist(a) - getDist(b) );

    for( let i = 0; i < nodes.length; i++ ){
      let node = nodes[ i ];

      dist[ node.id() ] = node.same( source ) ? 0 : Infinity;
      Q.push( node );
    }

    let distBetween = ( u, v ) => {
      let uvs = ( directed ? u.edgesTo(v) : u.edgesWith(v) ).intersect( edges );
      let smallestDistance = Infinity;
      let smallestEdge;

      for( let i = 0; i < uvs.length; i++ ){
        let edge = uvs[ i ];
        let weight = weightFn( edge );

        if( weight < smallestDistance || !smallestEdge ){
          smallestDistance = weight;
          smallestEdge = edge;
        }
      }

      return {
        edge: smallestEdge,
        dist: smallestDistance
      };
    };

    while( Q.size() > 0 ){
      let u = Q.pop();
      let smalletsDist = getDist( u );
      let uid = u.id();

      knownDist[ uid ] = smalletsDist;

      if( smalletsDist === Infinity ){
        continue;
      }

      let neighbors = u.neighborhood().intersect( nodes );
      for( let i = 0; i < neighbors.length; i++ ){
        let v = neighbors[ i ];
        let vid = v.id();
        let vDist = distBetween( u, v );

        let alt = smalletsDist + vDist.dist;

        if( alt < getDist( v ) ){
          setDist( v, alt );

          prev[ vid ] = {
            node: u,
            edge: vDist.edge
          };
        }
      } // for
    } // while

    return {
      distanceTo: function( node ){
        let target = is.string( node ) ? nodes.filter( node )[0] : node[0];

        return knownDist[ target.id() ];
      },

      pathTo: function( node ){
        let target = is.string( node ) ? nodes.filter( node )[0] : node[0];
        let S = [];
        let u = target;
        let uid = u.id();

        if( target.length > 0 ){
          S.unshift( target );

          while( prev[ uid ] ){
            let p = prev[ uid ];

            S.unshift( p.edge );
            S.unshift( p.node );

            u = p.node;
            uid = u.id();
          }
        }

        return eles.spawn( S );
      }
    };
  }
});

export default elesfn;
