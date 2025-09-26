/*
The CoSE layout was written by Gerardo Huck.
https://www.linkedin.com/in/gerardohuck/

Based on the following article:
http://dl.acm.org/citation.cfm?id=1498047

Modifications tracked on Github.
*/

import * as util from '../../util/index.mjs';
import * as math from '../../math.mjs';
import * as is from '../../is.mjs';

var DEBUG;

/**
 * @brief :  default layout options
 */
var defaults = {
  // Called on `layoutready`
  ready: function(){},

  // Called on `layoutstop`
  stop: function(){},

  // Whether to animate while running the layout
  // true : Animate continuously as the layout is running
  // false : Just show the end result
  // 'end' : Animate with the end result, from the initial positions to the end positions
  animate: true,

  // Easing of the animation for animate:'end'
  animationEasing: undefined,

  // The duration of the animation for animate:'end'
  animationDuration: undefined,

  // A function that determines whether the node should be animated
  // All nodes animated by default on animate enabled
  // Non-animated nodes are positioned immediately when the layout starts
  animateFilter: function ( node, i ){ return true; },


  // The layout animates only after this many milliseconds for animate:true
  // (prevents flashing on fast runs)
  animationThreshold: 250,

  // Number of iterations between consecutive screen positions update
  refresh: 20,

  // Whether to fit the network view after when done
  fit: true,

  // Padding on fit
  padding: 30,

  // Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  boundingBox: undefined,

  // Excludes the label when calculating node bounding boxes for the layout algorithm
  nodeDimensionsIncludeLabels: false,

  // Randomize the initial positions of the nodes (true) or use existing positions (false)
  randomize: false,

  // Extra spacing between components in non-compound graphs
  componentSpacing: 40,

  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: function( node ){ return 2048; },

  // Node repulsion (overlapping) multiplier
  nodeOverlap: 4,

  // Ideal edge (non nested) length
  idealEdgeLength: function( edge ){ return 32; },

  // Divisor to compute edge forces
  edgeElasticity: function( edge ){ return 32; },

  // Nesting factor (multiplier) to compute ideal edge length for nested edges
  nestingFactor: 1.2,

  // Gravity force (constant)
  gravity: 1,

  // Maximum number of iterations to perform
  numIter: 1000,

  // Initial temperature (maximum node displacement)
  initialTemp: 1000,

  // Cooling factor (how the temperature is reduced between consecutive iterations
  coolingFactor: 0.99,

  // Lower temperature threshold (below this point the layout will end)
  minTemp: 1.0
};


/**
 * @brief       : constructor
 * @arg options : object containing layout options
 */
function CoseLayout( options ){
  this.options = util.extend( {}, defaults, options );
  this.options.layout = this;

  // Exclude any edge that has a source or target node that is not in the set of passed-in nodes
  const nodes = this.options.eles.nodes();
  const edges = this.options.eles.edges();
  const notEdges = edges.filter((e) => {
    const sourceId = e.source().data('id');
    const targetId = e.target().data('id');
    const hasSource = nodes.some((n) => n.data('id') === sourceId);
    const hasTarget = nodes.some((n) => n.data('id') === targetId);
    return !hasSource || !hasTarget;
  });
  this.options.eles = this.options.eles.not(notEdges);
}

/**
 * @brief : runs the layout
 */
CoseLayout.prototype.run = function(){
  var options = this.options;
  var cy      = options.cy;
  var layout  = this;

  layout.stopped = false;

  if( options.animate === true || options.animate === false ){
    layout.emit( { type: 'layoutstart', layout: layout } );
  }

  // Set DEBUG - Global variable
  if( true === options.debug ){
    DEBUG = true;
  } else {
    DEBUG = false;
  }

  // Initialize layout info
  var layoutInfo = createLayoutInfo( cy, layout, options );

  // Show LayoutInfo contents if debugging
  if( DEBUG ){
    printLayoutInfo( layoutInfo );
  }

  // If required, randomize node positions
  if (options.randomize) {
    randomizePositions( layoutInfo, cy );
  }

  var startTime = util.performanceNow();

  var refresh = function(){
    refreshPositions( layoutInfo, cy, options );

    // Fit the graph if necessary
    if( true === options.fit ){
      cy.fit( options.padding );
    }
  };

  var mainLoop = function( i ){
    if( layout.stopped || i >= options.numIter ){
      // logDebug("Layout manually stopped. Stopping computation in step " + i);
      return false;
    }

    // Do one step in the phisical simulation
    step( layoutInfo, options, i );

    // Update temperature
    layoutInfo.temperature = layoutInfo.temperature * options.coolingFactor;
    // logDebug("New temperature: " + layoutInfo.temperature);

    if( layoutInfo.temperature < options.minTemp ){
      // logDebug("Temperature drop below minimum threshold. Stopping computation in step " + i);
      return false;
    }

    return true;
  };

  var done = function(){
    if( options.animate === true || options.animate === false ){
      refresh();

      // Layout has finished
      layout.one('layoutstop', options.stop);
      layout.emit({ type: 'layoutstop', layout: layout });
    } else {
      var nodes = options.eles.nodes();
      var getScaledPos = getScaleInBoundsFn(layoutInfo, options, nodes);

      nodes.layoutPositions(layout, options, getScaledPos);
    }
  };

  var i = 0;
  var loopRet = true;

  if( options.animate === true ){
    var frame = function(){
      var f = 0;

      while( loopRet && f < options.refresh ){
        loopRet = mainLoop(i);

        i++;
        f++;
      }

      if( !loopRet ){ // it's done
        separateComponents( layoutInfo, options );
        done();
      } else {
        var now = util.performanceNow();

        if( now - startTime >= options.animationThreshold ){
          refresh();
        }

        util.requestAnimationFrame(frame);
      }
    };

    frame();
  } else {
    while( loopRet ){
      loopRet = mainLoop(i);

      i++;
    }

    separateComponents( layoutInfo, options );
    done();
  }

  return this; // chaining
};


/**
 * @brief : called on continuous layouts to stop them before they finish
 */
CoseLayout.prototype.stop = function(){
  this.stopped = true;

  if( this.thread ){
    this.thread.stop();
  }

  this.emit( 'layoutstop' );

  return this; // chaining
};

CoseLayout.prototype.destroy = function(){
  if( this.thread ){
    this.thread.stop();
  }

  return this; // chaining
};


/**
 * @brief     : Creates an object which is contains all the data
 *              used in the layout process
 * @arg cy    : cytoscape.js object
 * @return    : layoutInfo object initialized
 */
var createLayoutInfo = function( cy, layout, options ){
  // Shortcut
  var edges = options.eles.edges();
  var nodes = options.eles.nodes();
  var bb = math.makeBoundingBox( options.boundingBox ? options.boundingBox : {
    x1: 0, y1: 0, w: cy.width(), h: cy.height()
  } );

  var layoutInfo   = {
    isCompound: cy.hasCompoundNodes(),
    layoutNodes: [],
    idToIndex: {},
    nodeSize: nodes.size(),
    graphSet: [],
    indexToGraph: [],
    layoutEdges: [],
    edgeSize: edges.size(),
    temperature: options.initialTemp,
    clientWidth: bb.w,
    clientHeight: bb.h,
    boundingBox: bb
  };

  var components = options.eles.components();
  var id2cmptId = {};

  for( var i = 0; i < components.length; i++ ){
    var component = components[ i ];

    for( var j = 0; j < component.length; j++ ){
      var node = component[ j ];

      id2cmptId[ node.id() ] = i;
    }
  }

  // Iterate over all nodes, creating layout nodes
  for( var i = 0; i < layoutInfo.nodeSize; i++ ){
    var n = nodes[ i ];
    var nbb = n.layoutDimensions( options );

    var tempNode        = {};
    tempNode.isLocked   = n.locked();
    tempNode.id         = n.data( 'id' );
    tempNode.parentId   = n.data( 'parent' );
    tempNode.cmptId     = id2cmptId[ n.id() ];
    tempNode.children   = [];
    tempNode.positionX  = n.position( 'x' );
    tempNode.positionY  = n.position( 'y' );
    tempNode.offsetX    = 0;
    tempNode.offsetY    = 0;
    tempNode.height     = nbb.w;
    tempNode.width      = nbb.h;
    tempNode.maxX       = tempNode.positionX + tempNode.width  / 2;
    tempNode.minX       = tempNode.positionX - tempNode.width  / 2;
    tempNode.maxY       = tempNode.positionY + tempNode.height / 2;
    tempNode.minY       = tempNode.positionY - tempNode.height / 2;
    tempNode.padLeft    = parseFloat( n.style( 'padding' ) );
    tempNode.padRight   = parseFloat( n.style( 'padding' ) );
    tempNode.padTop     = parseFloat( n.style( 'padding' ) );
    tempNode.padBottom  = parseFloat( n.style( 'padding' ) );

    // forces
    tempNode.nodeRepulsion = is.fn( options.nodeRepulsion ) ? options.nodeRepulsion(n) : options.nodeRepulsion;

    // Add new node
    layoutInfo.layoutNodes.push( tempNode );
    // Add entry to id-index map
    layoutInfo.idToIndex[ tempNode.id ] = i;
  }

  // Inline implementation of a queue, used for traversing the graph in BFS order
  var queue = [];
  var start = 0;   // Points to the start the queue
  var end   = -1;  // Points to the end of the queue

  var tempGraph = [];

  // Second pass to add child information and
  // initialize queue for hierarchical traversal
  for( var i = 0; i < layoutInfo.nodeSize; i++ ){
    var n = layoutInfo.layoutNodes[ i ];
    var p_id = n.parentId;
    // Check if node n has a parent node
    if( null != p_id ){
      // Add node Id to parent's list of children
      layoutInfo.layoutNodes[ layoutInfo.idToIndex[ p_id ] ].children.push( n.id );
    } else {
      // If a node doesn't have a parent, then it's in the root graph
      queue[ ++end ] = n.id;
      tempGraph.push( n.id );
    }
  }

  // Add root graph to graphSet
  layoutInfo.graphSet.push( tempGraph );

  // Traverse the graph, level by level,
  while( start <= end ){
    // Get the node to visit and remove it from queue
    var node_id  = queue[ start++ ];
    var node_ix  = layoutInfo.idToIndex[ node_id ];
    var node     = layoutInfo.layoutNodes[ node_ix ];
    var children = node.children;
    if( children.length > 0 ){
      // Add children nodes as a new graph to graph set
      layoutInfo.graphSet.push( children );
      // Add children to que queue to be visited
      for( var i = 0; i < children.length; i++ ){
        queue[ ++end ] = children[ i ];
      }
    }
  }

  // Create indexToGraph map
  for( var i = 0; i < layoutInfo.graphSet.length; i++ ){
    var graph = layoutInfo.graphSet[ i ];
    for( var j = 0; j < graph.length; j++ ){
      var index = layoutInfo.idToIndex[ graph[ j ] ];
      layoutInfo.indexToGraph[ index ] = i;
    }
  }

  // Iterate over all edges, creating Layout Edges
  for( var i = 0; i < layoutInfo.edgeSize; i++ ){
    var e = edges[ i ];
    var tempEdge = {};
    tempEdge.id       = e.data( 'id' );
    tempEdge.sourceId = e.data( 'source' );
    tempEdge.targetId = e.data( 'target' );

    // Compute ideal length
    var idealLength = is.fn( options.idealEdgeLength ) ? options.idealEdgeLength(e) : options.idealEdgeLength;
    var elasticity = is.fn( options.edgeElasticity ) ? options.edgeElasticity(e) : options.edgeElasticity;

    // Check if it's an inter graph edge
    var sourceIx    = layoutInfo.idToIndex[ tempEdge.sourceId ];
    var targetIx    = layoutInfo.idToIndex[ tempEdge.targetId ];
    var sourceGraph = layoutInfo.indexToGraph[ sourceIx ];
    var targetGraph = layoutInfo.indexToGraph[ targetIx ];

    if( sourceGraph != targetGraph ){
      // Find lowest common graph ancestor
      var lca = findLCA( tempEdge.sourceId, tempEdge.targetId, layoutInfo );

      // Compute sum of node depths, relative to lca graph
      var lcaGraph = layoutInfo.graphSet[ lca ];
      var depth    = 0;

      // Source depth
      var tempNode = layoutInfo.layoutNodes[ sourceIx ];
      while( -1 === lcaGraph.indexOf( tempNode.id ) ){
        tempNode = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ tempNode.parentId ] ];
        depth++;
      }

      // Target depth
      tempNode = layoutInfo.layoutNodes[ targetIx ];
      while( -1 === lcaGraph.indexOf( tempNode.id ) ){
        tempNode = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ tempNode.parentId ] ];
        depth++;
      }

      // logDebug('LCA of nodes ' + tempEdge.sourceId + ' and ' + tempEdge.targetId +
      //  ". Index: " + lca + " Contents: " + lcaGraph.toString() +
      //  ". Depth: " + depth);

      // Update idealLength
      idealLength *= depth * options.nestingFactor;
    }

    tempEdge.idealLength = idealLength;
    tempEdge.elasticity = elasticity;

    layoutInfo.layoutEdges.push( tempEdge );
  }

  // Finally, return layoutInfo object
  return layoutInfo;
};


/**
 * @brief : This function finds the index of the lowest common
 *          graph ancestor between 2 nodes in the subtree
 *          (from the graph hierarchy induced tree) whose
 *          root is graphIx
 *
 * @arg node1: node1's ID
 * @arg node2: node2's ID
 * @arg layoutInfo: layoutInfo object
 *
 */
var findLCA = function( node1, node2, layoutInfo ){
  // Find their common ancester, starting from the root graph
  var res = findLCA_aux( node1, node2, 0, layoutInfo );
  if( 2 > res.count ){
    // If aux function couldn't find the common ancester,
    // then it is the root graph
    return 0;
  } else {
    return res.graph;
  }
};


/**
 * @brief          : Auxiliary function used for LCA computation
 *
 * @arg node1      : node1's ID
 * @arg node2      : node2's ID
 * @arg graphIx    : subgraph index
 * @arg layoutInfo : layoutInfo object
 *
 * @return         : object of the form {count: X, graph: Y}, where:
 *                   X is the number of ancestors (max: 2) found in
 *                   graphIx (and it's subgraphs),
 *                   Y is the graph index of the lowest graph containing
 *                   all X nodes
 */
var findLCA_aux = function( node1, node2, graphIx, layoutInfo ){
  var graph = layoutInfo.graphSet[ graphIx ];
  // If both nodes belongs to graphIx
  if( -1 < graph.indexOf( node1 ) && -1 < graph.indexOf( node2 ) ){
    return {count: 2, graph: graphIx};
  }

  // Make recursive calls for all subgraphs
  var c = 0;
  for( var i = 0; i < graph.length; i++ ){
    var nodeId   = graph[ i ];
    var nodeIx   = layoutInfo.idToIndex[ nodeId ];
    var children = layoutInfo.layoutNodes[ nodeIx ].children;

    // If the node has no child, skip it
    if( 0 === children.length ){
      continue;
    }

    var childGraphIx = layoutInfo.indexToGraph[ layoutInfo.idToIndex[ children[0] ] ];
    var result = findLCA_aux( node1, node2, childGraphIx, layoutInfo );
    if( 0 === result.count ){
      // Neither node1 nor node2 are present in this subgraph
      continue;
    } else if( 1 === result.count ){
      // One of (node1, node2) is present in this subgraph
      c++;
      if( 2 === c ){
        // We've already found both nodes, no need to keep searching
        break;
      }
    } else {
      // Both nodes are present in this subgraph
      return result;
    }
  }

  return {count: c, graph: graphIx};
};


/**
 * @brief: printsLayoutInfo into js console
 *         Only used for debbuging
 */
if( process.env.NODE_ENV !== 'production' ){
  var printLayoutInfo = function( layoutInfo ){
    /* eslint-disable */

    if( !DEBUG ){
      return;
    }
    console.debug( 'layoutNodes:' );
    for( var i = 0; i < layoutInfo.nodeSize; i++ ){
      var n = layoutInfo.layoutNodes[ i ];
      var s =
      '\nindex: '     + i +
      '\nId: '        + n.id +
      '\nChildren: '  + n.children.toString() +
      '\nparentId: '  + n.parentId  +
      '\npositionX: ' + n.positionX +
      '\npositionY: ' + n.positionY +
      '\nOffsetX: ' + n.offsetX +
      '\nOffsetY: ' + n.offsetY +
      '\npadLeft: ' + n.padLeft +
      '\npadRight: ' + n.padRight +
      '\npadTop: ' + n.padTop +
      '\npadBottom: ' + n.padBottom;

      console.debug( s );
    }

    console.debug( 'idToIndex' );
    for( var i in layoutInfo.idToIndex ){
      console.debug( 'Id: ' + i + '\nIndex: ' + layoutInfo.idToIndex[ i ] );
    }

    console.debug( 'Graph Set' );
    var set = layoutInfo.graphSet;
    for( var i = 0; i < set.length; i ++ ){
      console.debug( 'Set : ' + i + ': ' + set[ i ].toString() );
    }

    var s = 'IndexToGraph';
    for( var i = 0; i < layoutInfo.indexToGraph.length; i ++ ){
      s += '\nIndex : ' + i + ' Graph: ' + layoutInfo.indexToGraph[ i ];
    }
    console.debug( s );

    s = 'Layout Edges';
    for( var i = 0; i < layoutInfo.layoutEdges.length; i++ ){
      var e = layoutInfo.layoutEdges[ i ];
      s += '\nEdge Index: ' + i + ' ID: ' + e.id +
      ' SouceID: ' + e.sourceId + ' TargetId: ' + e.targetId +
      ' Ideal Length: ' + e.idealLength;
    }
    console.debug( s );

    s =  'nodeSize: ' + layoutInfo.nodeSize;
    s += '\nedgeSize: ' + layoutInfo.edgeSize;
    s += '\ntemperature: ' + layoutInfo.temperature;
    console.debug( s );

    return;
    /* eslint-enable */
  };
}

/**
 * @brief : Randomizes the position of all nodes
 */
var randomizePositions = function( layoutInfo, cy ){
  var width     = layoutInfo.clientWidth;
  var height    = layoutInfo.clientHeight;

  for( var i = 0; i < layoutInfo.nodeSize; i++ ){
    var n = layoutInfo.layoutNodes[ i ];

    // No need to randomize compound nodes or locked nodes
    if( 0 === n.children.length && !n.isLocked ){
      n.positionX = Math.random() * width;
      n.positionY = Math.random() * height;
    }
  }
};

var getScaleInBoundsFn = function( layoutInfo, options, nodes ){
  var bb = layoutInfo.boundingBox;
  var coseBB = { x1: Infinity, x2: -Infinity, y1: Infinity, y2: -Infinity };

  if( options.boundingBox ){
    nodes.forEach( function( node ){
      var lnode = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ node.data( 'id' ) ] ];

      coseBB.x1 = Math.min( coseBB.x1, lnode.positionX );
      coseBB.x2 = Math.max( coseBB.x2, lnode.positionX );

      coseBB.y1 = Math.min( coseBB.y1, lnode.positionY );
      coseBB.y2 = Math.max( coseBB.y2, lnode.positionY );
    } );

    coseBB.w = coseBB.x2 - coseBB.x1;
    coseBB.h = coseBB.y2 - coseBB.y1;
  }

  return function( ele, i ){
    var lnode = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ ele.data( 'id' ) ] ];

    if( options.boundingBox ){ // then add extra bounding box constraint
      // Handle single node case where coseBB.w or coseBB.h is 0
      var pctX = coseBB.w === 0 ? 0.5 : (lnode.positionX - coseBB.x1) / coseBB.w;
      var pctY = coseBB.h === 0 ? 0.5 : (lnode.positionY - coseBB.y1) / coseBB.h;

      return {
        x: bb.x1 + pctX * bb.w,
        y: bb.y1 + pctY * bb.h
      };
    } else {
      return {
        x: lnode.positionX,
        y: lnode.positionY
      };
    }
  };
};

/**
 * @brief          : Updates the positions of nodes in the network
 * @arg layoutInfo : LayoutInfo object
 * @arg cy         : Cytoscape object
 * @arg options    : Layout options
 */
var refreshPositions = function( layoutInfo, cy, options ){
  // var s = 'Refreshing positions';
  // logDebug(s);

  var layout = options.layout;
  var nodes = options.eles.nodes();
  var getScaledPos = getScaleInBoundsFn(layoutInfo, options, nodes);

  nodes.positions(getScaledPos);

  // Trigger layoutReady only on first call
  if( true !== layoutInfo.ready ){
    // s = 'Triggering layoutready';
    // logDebug(s);
    layoutInfo.ready = true;
    layout.one( 'layoutready', options.ready );
    layout.emit( { type: 'layoutready', layout: this } );
  }
};

/**
 * @brief : Logs a debug message in JS console, if DEBUG is ON
 */
// var logDebug = function(text) {
//   if (DEBUG) {
//     console.debug(text);
//   }
// };

/**
 * @brief          : Performs one iteration of the physical simulation
 * @arg layoutInfo : LayoutInfo object already initialized
 * @arg cy         : Cytoscape object
 * @arg options    : Layout options
 */
var step = function( layoutInfo, options, step ){
  // var s = "\n\n###############################";
  // s += "\nSTEP: " + step;
  // s += "\n###############################\n";
  // logDebug(s);

  // Calculate node repulsions
  calculateNodeForces( layoutInfo, options );
  // Calculate edge forces
  calculateEdgeForces( layoutInfo, options );
  // Calculate gravity forces
  calculateGravityForces( layoutInfo, options );
  // Propagate forces from parent to child
  propagateForces( layoutInfo, options );
  // Update positions based on calculated forces
  updatePositions( layoutInfo, options );
};

/**
 * @brief : Computes the node repulsion forces
 */
var calculateNodeForces = function( layoutInfo, options ){
  // Go through each of the graphs in graphSet
  // Nodes only repel each other if they belong to the same graph
  // var s = 'calculateNodeForces';
  // logDebug(s);
  for( var i = 0; i < layoutInfo.graphSet.length; i ++ ){
    var graph    = layoutInfo.graphSet[ i ];
    var numNodes = graph.length;

    // s = "Set: " + graph.toString();
    // logDebug(s);

    // Now get all the pairs of nodes
    // Only get each pair once, (A, B) = (B, A)
    for( var j = 0; j < numNodes; j++ ){
      var node1 = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ graph[ j ] ] ];

      for( var k = j + 1; k < numNodes; k++ ){
        var node2 = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ graph[ k ] ] ];

        nodeRepulsion( node1, node2, layoutInfo, options );
      }
    }
  }
};

var randomDistance = function( max ){
  return -max + 2 * max * Math.random();
};

/**
 * @brief : Compute the node repulsion forces between a pair of nodes
 */
var nodeRepulsion = function( node1, node2, layoutInfo, options ){
  // var s = "Node repulsion. Node1: " + node1.id + " Node2: " + node2.id;

  var cmptId1 = node1.cmptId;
  var cmptId2 = node2.cmptId;

  if( cmptId1 !== cmptId2 && !layoutInfo.isCompound ){ return; }

  // Get direction of line connecting both node centers
  var directionX = node2.positionX - node1.positionX;
  var directionY = node2.positionY - node1.positionY;
  var maxRandDist = 1;
  // s += "\ndirectionX: " + directionX + ", directionY: " + directionY;

  // If both centers are the same, apply a random force
  if( 0 === directionX && 0 === directionY ){
    directionX = randomDistance( maxRandDist );
    directionY = randomDistance( maxRandDist );
  }

  var overlap = nodesOverlap( node1, node2, directionX, directionY );

  if( overlap > 0 ){
    // s += "\nNodes DO overlap.";
    // s += "\nOverlap: " + overlap;
    // If nodes overlap, repulsion force is proportional
    // to the overlap
    var force    = options.nodeOverlap * overlap;

    // Compute the module and components of the force vector
    var distance = Math.sqrt( directionX * directionX + directionY * directionY );
    // s += "\nDistance: " + distance;
    var forceX   = force * directionX / distance;
    var forceY   = force * directionY / distance;

  } else {
    // s += "\nNodes do NOT overlap.";
    // If there's no overlap, force is inversely proportional
    // to squared distance

    // Get clipping points for both nodes
    var point1 = findClippingPoint( node1, directionX, directionY );
    var point2 = findClippingPoint( node2, -1 * directionX, -1 * directionY );

    // Use clipping points to compute distance
    var distanceX   = point2.x - point1.x;
    var distanceY   = point2.y - point1.y;
    var distanceSqr = distanceX * distanceX + distanceY * distanceY;
    var distance    = Math.sqrt( distanceSqr );
    // s += "\nDistance: " + distance;

    // Compute the module and components of the force vector
    var force  = ( node1.nodeRepulsion + node2.nodeRepulsion ) / distanceSqr;
    var forceX = force * distanceX / distance;
    var forceY = force * distanceY / distance;
  }

  // Apply force
  if( !node1.isLocked ){
    node1.offsetX -= forceX;
    node1.offsetY -= forceY;
  }

  if( !node2.isLocked ){
    node2.offsetX += forceX;
    node2.offsetY += forceY;
  }

  // s += "\nForceX: " + forceX + " ForceY: " + forceY;
  // logDebug(s);

  return;
};

/**
 * @brief  : Determines whether two nodes overlap or not
 * @return : Amount of overlapping (0 => no overlap)
 */
var nodesOverlap = function( node1, node2, dX, dY ){

  if( dX > 0 ){
    var overlapX = node1.maxX - node2.minX;
  } else {
    var overlapX = node2.maxX - node1.minX;
  }

  if( dY > 0 ){
    var overlapY = node1.maxY - node2.minY;
  } else {
    var overlapY = node2.maxY - node1.minY;
  }

  if( overlapX >= 0 && overlapY >= 0 ){
    return Math.sqrt( overlapX * overlapX + overlapY * overlapY );
  } else {
    return 0;
  }
};

/**
 * @brief : Finds the point in which an edge (direction dX, dY) intersects
 *          the rectangular bounding box of it's source/target node
 */
var findClippingPoint = function( node, dX, dY ){

  // Shorcuts
  var X = node.positionX;
  var Y = node.positionY;
  var H = node.height || 1;
  var W = node.width || 1;
  var dirSlope     = dY / dX;
  var nodeSlope    = H / W;

  // var s = 'Computing clipping point of node ' + node.id +
  //   " . Height:  " + H + ", Width: " + W +
  //   "\nDirection " + dX + ", " + dY;
  //
  // Compute intersection
  var res = {};

  // Case: Vertical direction (up)
  if( 0 === dX && 0 < dY ){
    res.x = X;
    // s += "\nUp direction";
    res.y = Y + H / 2;

    return res;
  }

  // Case: Vertical direction (down)
  if( 0 === dX && 0 > dY ){
    res.x = X;
    res.y = Y + H / 2;
    // s += "\nDown direction";

    return res;
  }

  // Case: Intersects the right border
  if( 0 < dX &&
  -1 * nodeSlope <= dirSlope &&
  dirSlope <= nodeSlope ){
    res.x = X + W / 2;
    res.y = Y + (W * dY / 2 / dX);
    // s += "\nRightborder";

    return res;
  }

  // Case: Intersects the left border
  if( 0 > dX &&
  -1 * nodeSlope <= dirSlope &&
  dirSlope <= nodeSlope ){
    res.x = X - W / 2;
    res.y = Y - (W * dY / 2 / dX);
    // s += "\nLeftborder";

    return res;
  }

  // Case: Intersects the top border
  if( 0 < dY &&
  ( dirSlope <= -1 * nodeSlope ||
    dirSlope >= nodeSlope ) ){
    res.x = X + (H * dX / 2 / dY);
    res.y = Y + H / 2;
    // s += "\nTop border";

    return res;
  }

  // Case: Intersects the bottom border
  if( 0 > dY &&
  ( dirSlope <= -1 * nodeSlope ||
    dirSlope >= nodeSlope ) ){
    res.x = X - (H * dX / 2 / dY);
    res.y = Y - H / 2;
    // s += "\nBottom border";

    return res;
  }

  // s += "\nClipping point found at " + res.x + ", " + res.y;
  // logDebug(s);
  return res;
};

/**
 * @brief : Calculates all edge forces
 */
var calculateEdgeForces = function( layoutInfo, options ){
  // Iterate over all edges
  for( var i = 0; i < layoutInfo.edgeSize; i++ ){
    // Get edge, source & target nodes
    var edge     = layoutInfo.layoutEdges[ i ];
    var sourceIx = layoutInfo.idToIndex[ edge.sourceId ];
    var source   = layoutInfo.layoutNodes[ sourceIx ];
    var targetIx = layoutInfo.idToIndex[ edge.targetId ];
    var target   = layoutInfo.layoutNodes[ targetIx ];

    // Get direction of line connecting both node centers
    var directionX = target.positionX - source.positionX;
    var directionY = target.positionY - source.positionY;

    // If both centers are the same, do nothing.
    // A random force has already been applied as node repulsion
    if( 0 === directionX && 0 === directionY ){
      continue;
    }

    // Get clipping points for both nodes
    var point1 = findClippingPoint( source, directionX, directionY );
    var point2 = findClippingPoint( target, -1 * directionX, -1 * directionY );


    var lx = point2.x - point1.x;
    var ly = point2.y - point1.y;
    var l  = Math.sqrt( lx * lx + ly * ly );

    var force  = Math.pow( edge.idealLength - l, 2 ) / edge.elasticity;

    if( 0 !== l ){
      var forceX = force * lx / l;
      var forceY = force * ly / l;
    } else {
      var forceX = 0;
      var forceY = 0;
    }

    // Add this force to target and source nodes
    if( !source.isLocked ){
      source.offsetX += forceX;
      source.offsetY += forceY;
    }

    if( !target.isLocked ){
      target.offsetX -= forceX;
      target.offsetY -= forceY;
    }

    // var s = 'Edge force between nodes ' + source.id + ' and ' + target.id;
    // s += "\nDistance: " + l + " Force: (" + forceX + ", " + forceY + ")";
    // logDebug(s);
  }
};

/**
 * @brief : Computes gravity forces for all nodes
 */
var calculateGravityForces = function( layoutInfo, options ){
  if (options.gravity === 0) {
    return;
  }

  var distThreshold = 1;

  // var s = 'calculateGravityForces';
  // logDebug(s);
  for( var i = 0; i < layoutInfo.graphSet.length; i ++ ){
    var graph    = layoutInfo.graphSet[ i ];
    var numNodes = graph.length;

    // s = "Set: " + graph.toString();
    // logDebug(s);

    // Compute graph center
    if( 0 === i ){
      var centerX   = layoutInfo.clientHeight / 2;
      var centerY   = layoutInfo.clientWidth  / 2;
    } else {
      // Get Parent node for this graph, and use its position as center
      var temp    = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ graph[0] ] ];
      var parent  = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ temp.parentId ] ];
      var centerX = parent.positionX;
      var centerY = parent.positionY;
    }
    // s = "Center found at: " + centerX + ", " + centerY;
    // logDebug(s);

    // Apply force to all nodes in graph
    for( var j = 0; j < numNodes; j++ ){
      var node = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ graph[ j ] ] ];
      // s = "Node: " + node.id;

      if( node.isLocked ){ continue; }

      var dx = centerX - node.positionX;
      var dy = centerY - node.positionY;
      var d  = Math.sqrt( dx * dx + dy * dy );
      if( d > distThreshold ){
        var fx = options.gravity * dx / d;
        var fy = options.gravity * dy / d;
        node.offsetX += fx;
        node.offsetY += fy;
        // s += ": Applied force: " + fx + ", " + fy;
      } else {
        // s += ": skypped since it's too close to center";
      }
      // logDebug(s);
    }
  }
};

/**
 * @brief          : This function propagates the existing offsets from
 *                   parent nodes to its descendents.
 * @arg layoutInfo : layoutInfo Object
 * @arg cy         : cytoscape Object
 * @arg options    : Layout options
 */
var propagateForces = function( layoutInfo, options ){
  // Inline implementation of a queue, used for traversing the graph in BFS order
  var queue = [];
  var start = 0;   // Points to the start the queue
  var end   = -1;  // Points to the end of the queue

  // logDebug('propagateForces');

  // Start by visiting the nodes in the root graph
  queue.push.apply( queue, layoutInfo.graphSet[0] );
  end += layoutInfo.graphSet[0].length;

  // Traverse the graph, level by level,
  while( start <= end ){
    // Get the node to visit and remove it from queue
    var nodeId    = queue[ start++ ];
    var nodeIndex = layoutInfo.idToIndex[ nodeId ];
    var node      = layoutInfo.layoutNodes[ nodeIndex ];
    var children  = node.children;

    // We only need to process the node if it's compound
    if( 0 < children.length && !node.isLocked ){
      var offX = node.offsetX;
      var offY = node.offsetY;

      // var s = "Propagating offset from parent node : " + node.id +
      //   ". OffsetX: " + offX + ". OffsetY: " + offY;
      // s += "\n Children: " + children.toString();
      // logDebug(s);

      for( var i = 0; i < children.length; i++ ){
        var childNode = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ children[ i ] ] ];
        // Propagate offset
        childNode.offsetX += offX;
        childNode.offsetY += offY;
        // Add children to queue to be visited
        queue[ ++end ] = children[ i ];
      }

      // Reset parent offsets
      node.offsetX = 0;
      node.offsetY = 0;
    }

  }
};

/**
 * @brief : Updates the layout model positions, based on
 *          the accumulated forces
 */
var updatePositions = function( layoutInfo, options ){
  // var s = 'Updating positions';
  // logDebug(s);

  // Reset boundaries for compound nodes
  for( var i = 0; i < layoutInfo.nodeSize; i++ ){
    var n = layoutInfo.layoutNodes[ i ];
    if( 0 < n.children.length ){
      // logDebug("Resetting boundaries of compound node: " + n.id);
      n.maxX = undefined;
      n.minX = undefined;
      n.maxY = undefined;
      n.minY = undefined;
    }
  }

  for( var i = 0; i < layoutInfo.nodeSize; i++ ){
    var n = layoutInfo.layoutNodes[ i ];
    if( 0 < n.children.length || n.isLocked ){
      // No need to set compound or locked node position
      // logDebug("Skipping position update of node: " + n.id);
      continue;
    }
    // s = "Node: " + n.id + " Previous position: (" +
    // n.positionX + ", " + n.positionY + ").";

    // Limit displacement in order to improve stability
    var tempForce = limitForce( n.offsetX, n.offsetY, layoutInfo.temperature );
    n.positionX += tempForce.x;
    n.positionY += tempForce.y;
    n.offsetX = 0;
    n.offsetY = 0;
    n.minX    = n.positionX - n.width;
    n.maxX    = n.positionX + n.width;
    n.minY    = n.positionY - n.height;
    n.maxY    = n.positionY + n.height;
    // s += " New Position: (" + n.positionX + ", " + n.positionY + ").";
    // logDebug(s);

    // Update ancestry boudaries
    updateAncestryBoundaries( n, layoutInfo );
  }

  // Update size, position of compund nodes
  for( var i = 0; i < layoutInfo.nodeSize; i++ ){
    var n = layoutInfo.layoutNodes[ i ];
    if( 0 < n.children.length && !n.isLocked ){
      n.positionX = (n.maxX + n.minX) / 2;
      n.positionY = (n.maxY + n.minY) / 2;
      n.width     = n.maxX - n.minX;
      n.height    = n.maxY - n.minY;
      // s = "Updating position, size of compound node " + n.id;
      // s += "\nPositionX: " + n.positionX + ", PositionY: " + n.positionY;
      // s += "\nWidth: " + n.width + ", Height: " + n.height;
      // logDebug(s);
    }
  }
};

/**
 * @brief : Limits a force (forceX, forceY) to be not
 *          greater (in modulo) than max.
 8          Preserves force direction.
  */
var limitForce = function( forceX, forceY, max ){
  // var s = "Limiting force: (" + forceX + ", " + forceY + "). Max: " + max;
  var force = Math.sqrt( forceX * forceX + forceY * forceY );

  if( force > max ){
    var res = {
      x: max * forceX / force,
      y: max * forceY / force
    };

  } else {
    var res = {
      x: forceX,
      y: forceY
    };
  }

  // s += ".\nResult: (" + res.x + ", " + res.y + ")";
  // logDebug(s);

  return res;
};

/**
 * @brief : Function used for keeping track of compound node
 *          sizes, since they should bound all their subnodes.
 */
var updateAncestryBoundaries = function( node, layoutInfo ){
  // var s = "Propagating new position/size of node " + node.id;
  var parentId = node.parentId;
  if( null == parentId ){
    // If there's no parent, we are done
    // s += ". No parent node.";
    // logDebug(s);
    return;
  }

  // Get Parent Node
  var p = layoutInfo.layoutNodes[ layoutInfo.idToIndex[ parentId ] ];
  var flag = false;

  // MaxX
  if( null == p.maxX || node.maxX + p.padRight > p.maxX ){
    p.maxX = node.maxX + p.padRight;
    flag = true;
    // s += "\nNew maxX for parent node " + p.id + ": " + p.maxX;
  }

  // MinX
  if( null == p.minX || node.minX - p.padLeft < p.minX ){
    p.minX = node.minX - p.padLeft;
    flag = true;
    // s += "\nNew minX for parent node " + p.id + ": " + p.minX;
  }

  // MaxY
  if( null == p.maxY || node.maxY + p.padBottom > p.maxY ){
    p.maxY = node.maxY + p.padBottom;
    flag = true;
    // s += "\nNew maxY for parent node " + p.id + ": " + p.maxY;
  }

  // MinY
  if( null == p.minY || node.minY - p.padTop < p.minY ){
    p.minY = node.minY - p.padTop;
    flag = true;
    // s += "\nNew minY for parent node " + p.id + ": " + p.minY;
  }

  // If updated boundaries, propagate changes upward
  if( flag ){
    // logDebug(s);
    return updateAncestryBoundaries( p, layoutInfo );
  }

  // s += ". No changes in boundaries/position of parent node " + p.id;
  // logDebug(s);
  return;
};

var separateComponents = function( layoutInfo, options ){
  var nodes = layoutInfo.layoutNodes;
  var components = [];

  for( var i = 0; i < nodes.length; i++ ){
    var node = nodes[ i ];
    var cid = node.cmptId;
    var component = components[ cid ] = components[ cid ] || [];

    component.push( node );
  }

  var totalA = 0;

  for( var i = 0; i < components.length; i++ ){
    var c = components[ i ];

    if( !c ){ continue; }

    c.x1 = Infinity;
    c.x2 = -Infinity;
    c.y1 = Infinity;
    c.y2 = -Infinity;

    for( var j = 0; j < c.length; j++ ){
      var n = c[ j ];

      c.x1 = Math.min( c.x1, n.positionX - n.width / 2 );
      c.x2 = Math.max( c.x2, n.positionX + n.width / 2 );
      c.y1 = Math.min( c.y1, n.positionY - n.height / 2 );
      c.y2 = Math.max( c.y2, n.positionY + n.height / 2 );
    }

    c.w = c.x2 - c.x1;
    c.h = c.y2 - c.y1;

    totalA += c.w * c.h;
  }

  components.sort( function( c1, c2 ){
    return c2.w * c2.h - c1.w * c1.h;
  } );

  var x = 0;
  var y = 0;
  var usedW = 0;
  var rowH = 0;
  var maxRowW = Math.sqrt( totalA ) * layoutInfo.clientWidth / layoutInfo.clientHeight;

  for( var i = 0; i < components.length; i++ ){
    var c = components[ i ];

    if( !c ){ continue; }

    for( var j = 0; j < c.length; j++ ){
      var n = c[ j ];

      if( !n.isLocked ){
        n.positionX += (x - c.x1);
        n.positionY += (y - c.y1);
      }
    }

    x += c.w + options.componentSpacing;
    usedW += c.w + options.componentSpacing;
    rowH = Math.max( rowH, c.h );

    if( usedW > maxRowW ){
      y += rowH + options.componentSpacing;
      x = 0;
      usedW = 0;
      rowH = 0;
    }
  }
};

export default CoseLayout;
