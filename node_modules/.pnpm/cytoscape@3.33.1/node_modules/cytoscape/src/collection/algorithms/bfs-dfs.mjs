import * as is from '../../is.mjs';

let defineSearch = function( params ){
  params = {
    bfs: params.bfs || !params.dfs,
    dfs: params.dfs || !params.bfs
  };

  // from pseudocode on wikipedia
  return function searchFn( roots, fn, directed ){
    let options;
    if( is.plainObject( roots ) && !is.elementOrCollection( roots ) ){
      options = roots;
      roots = options.roots || options.root;
      fn = options.visit;
      directed = options.directed;
    }

    directed = arguments.length === 2 && !is.fn( fn ) ? fn : directed;
    fn = is.fn( fn ) ? fn : function(){};

    let cy = this._private.cy;
    let v = roots = is.string( roots ) ? this.filter( roots ) : roots;
    let Q = [];
    let connectedNodes = [];
    let connectedBy = {};
    let id2depth = {};
    let V = {};
    let j = 0;
    let found;
    let { nodes, edges } = this.byGroup();

    // enqueue v
    for( let i = 0; i < v.length; i++ ){
      let vi = v[i];
      let viId = vi.id();

      if( vi.isNode() ){
        Q.unshift( vi );

        if( params.bfs ){
          V[ viId ] = true;

          connectedNodes.push( vi );
        }

        id2depth[ viId ] = 0;
      }
    }

    while( Q.length !== 0 ){
      let v = params.bfs ? Q.shift() : Q.pop();
      let vId = v.id();

      if( params.dfs ){
        if( V[ vId ] ){ continue; }

        V[ vId ] = true;

        connectedNodes.push( v );
      }

      let depth = id2depth[ vId ];
      let prevEdge = connectedBy[ vId ];
      let src = prevEdge != null ? prevEdge.source() : null;
      let tgt = prevEdge != null ? prevEdge.target() : null;
      let prevNode = prevEdge == null ? undefined : ( v.same(src) ? tgt[0] : src[0] );
      let ret;

      ret = fn( v, prevEdge, prevNode, j++, depth );

      if( ret === true ){
        found = v;
        break;
      }

      if( ret === false ){
        break;
      }

      let vwEdges = v.connectedEdges().filter(e => (!directed || e.source().same(v)) && edges.has(e));
      for( let i = 0; i < vwEdges.length; i++ ){
        let e = vwEdges[ i ];
        let w = e.connectedNodes().filter(n => !n.same(v) && nodes.has(n));
        let wId = w.id();

        if( w.length !== 0 && !V[ wId ] ){
          w = w[0];

          Q.push( w );

          if( params.bfs ){
            V[ wId ] = true;

            connectedNodes.push( w );
          }

          connectedBy[ wId ] = e;

          id2depth[ wId ] = id2depth[ vId ] + 1;
        }
      }

    }

    let connectedEles = cy.collection();

    for( let i = 0; i < connectedNodes.length; i++ ){
      let node = connectedNodes[ i ];
      let edge = connectedBy[ node.id() ];

      if( edge != null ){
        connectedEles.push( edge );
      }

      connectedEles.push( node );
    }

    return {
      path: cy.collection( connectedEles ),
      found: cy.collection( found )
    };
  };
};

// search, spanning trees, etc
let elesfn = ({
  breadthFirstSearch: defineSearch( { bfs: true } ),
  depthFirstSearch: defineSearch( { dfs: true } )
});

// nice, short mathematical alias
elesfn.bfs = elesfn.breadthFirstSearch;
elesfn.dfs = elesfn.depthFirstSearch;

export default elesfn;
