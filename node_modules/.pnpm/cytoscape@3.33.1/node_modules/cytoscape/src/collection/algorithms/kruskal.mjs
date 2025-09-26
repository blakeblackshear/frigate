let elesfn = ({

  // kruskal's algorithm (finds min spanning tree, assuming undirected graph)
  // implemented from pseudocode from wikipedia
  kruskal: function( weightFn ){
    weightFn = weightFn || ( edge => 1 );

    let { nodes, edges } = this.byGroup();
    let numNodes = nodes.length;
    let forest = new Array(numNodes);
    let A = nodes; // assumes byGroup() creates new collections that can be safely mutated

    let findSetIndex = ele => {
      for( let i = 0; i < forest.length; i++ ){
        let eles = forest[i];

        if( eles.has(ele) ){ return i; }
      }
    };

    // start with one forest per node
    for( let i = 0; i < numNodes; i++ ){
      forest[i] = this.spawn( nodes[i] );
    }

    let S = edges.sort( (a, b) => weightFn(a) - weightFn(b) );

    for( let i = 0; i < S.length; i++ ){
      let edge = S[i];
      let u = edge.source()[0];
      let v = edge.target()[0];
      let setUIndex = findSetIndex(u);
      let setVIndex = findSetIndex(v);
      let setU = forest[ setUIndex ];
      let setV = forest[ setVIndex ];

      if( setUIndex !== setVIndex ){
        A.merge( edge );

        // combine forests for u and v
        setU.merge( setV );
        forest.splice( setVIndex, 1 );
      }
    }

    return A;
  }
});

export default elesfn;
