import Heap from '../../heap.mjs';
import Set from '../../set.mjs';
import { defaults } from '../../util/index.mjs';

const aStarDefaults = defaults({
  root: null,
  goal: null,
  weight: edge => 1,
  heuristic: edge => 0,
  directed: false
});

let elesfn = ({

  // Implemented from pseudocode from wikipedia
  aStar: function( options ){
    let cy = this.cy();
    let { root, goal, heuristic, directed, weight } = aStarDefaults(options);

    root = cy.collection(root)[0];
    goal = cy.collection(goal)[0];

    let sid = root.id();
    let tid = goal.id();

    let gScore = {};
    let fScore = {};
    let closedSetIds = {};
    let openSet = new Heap( (a, b) => fScore[a.id()] - fScore[b.id()] );
    let openSetIds = new Set();
    let cameFrom = {};
    let cameFromEdge = {};

    let addToOpenSet = (ele, id) => {
      openSet.push(ele);
      openSetIds.add(id);
    };

    let cMin, cMinId;

    let popFromOpenSet = () => {
      cMin = openSet.pop();
      cMinId = cMin.id();
      openSetIds.delete(cMinId);
    };

    let isInOpenSet = id => openSetIds.has(id);

    addToOpenSet(root, sid);

    gScore[ sid ] = 0;
    fScore[ sid ] = heuristic( root );

    // Counter
    let steps = 0;

    // Main loop
    while( openSet.size() > 0 ){
      popFromOpenSet();
      steps++;

      // If we've found our goal, then we are done
      if( cMinId === tid ){
        let path = [];
        let pathNode = goal;
        let pathNodeId = tid;
        let pathEdge = cameFromEdge[pathNodeId];

        for( ;; ){
          path.unshift(pathNode);

          if( pathEdge != null ){
            path.unshift(pathEdge);
          }

          pathNode = cameFrom[pathNodeId];

          if( pathNode == null ){ break; }

          pathNodeId = pathNode.id();
          pathEdge = cameFromEdge[pathNodeId];
        }

        return {
          found: true,
          distance: gScore[ cMinId ],
          path: this.spawn( path ),
          steps
        };
      }

      // Add cMin to processed nodes
      closedSetIds[ cMinId ] = true;

      // Update scores for neighbors of cMin
      // Take into account if graph is directed or not
      let vwEdges = cMin._private.edges;

      for( let i = 0; i < vwEdges.length; i++ ){
        let e = vwEdges[ i ];

        // edge must be in set of calling eles
        if( !this.hasElementWithId( e.id() ) ){ continue; }

        // cMin must be the source of edge if directed
        if( directed && e.data('source') !== cMinId ){ continue; }

        let wSrc = e.source();
        let wTgt = e.target();

        let w = wSrc.id() !== cMinId ? wSrc : wTgt;
        let wid = w.id();

        // node must be in set of calling eles
        if( !this.hasElementWithId( wid ) ){ continue; }

        // if node is in closedSet, ignore it
        if( closedSetIds[ wid ] ){
          continue;
        }

        // New tentative score for node w
        let tempScore = gScore[ cMinId ] + weight( e );

        // Update gScore for node w if:
        //   w not present in openSet
        // OR
        //   tentative gScore is less than previous value

        // w not in openSet
        if( !isInOpenSet(wid) ){
          gScore[ wid ] = tempScore;
          fScore[ wid ] = tempScore + heuristic( w );
          addToOpenSet( w, wid );
          cameFrom[ wid ] = cMin;
          cameFromEdge[ wid ] = e;

          continue;
        }

        // w already in openSet, but with greater gScore
        if( tempScore < gScore[ wid ] ){
          gScore[ wid ] = tempScore;
          fScore[ wid ] = tempScore + heuristic( w );
          cameFrom[ wid ] = cMin;
          cameFromEdge[ wid ] = e;
        }

      } // End of neighbors update

    } // End of main loop

    // If we've reached here, then we've not reached our goal
    return {
      found: false,
      distance: undefined,
      path: undefined,
      steps: steps
    };
  }

}); // elesfn


export default elesfn;
