import * as util from '../../util/index.mjs';
import * as math from '../../math.mjs';
import * as is from '../../is.mjs';

/* eslint-disable no-unused-vars */
const defaults = {
  fit: true, // whether to fit the viewport to the graph
  directed: false, // whether the tree is directed downwards (or edges can point in any direction if false)
  direction: 'downward', // determines the direction in which the tree structure is drawn.  The possible values are 'downward', 'upward', 'rightward', or 'leftward'.
  padding: 30, // padding on fit
  circle: false, // put depths in concentric circles if true, put depths top down if false
  grid: false, // whether to create an even grid into which the DAG is placed (circle:false only)
  spacingFactor: 1.75, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
  boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
  nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
  roots: undefined, // the roots of the trees
  depthSort: undefined, // a sorting function to order nodes at equal depth. e.g. function(a, b){ return a.data('weight') - b.data('weight') }
  animate: false, // whether to transition the node positions
  animationDuration: 500, // duration of animation in ms if enabled
  animationEasing: undefined, // easing of animation if enabled,
  animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
  ready: undefined, // callback on layoutready
  stop: undefined, // callback on layoutstop
  transform: function (node, position ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts
};

const deprecatedOptionDefaults = {
  maximal: false, // whether to shift nodes down their natural BFS depths in order to avoid upwards edges (DAGS only); setting acyclic to true sets maximal to true also
  acyclic: false, // whether the tree is acyclic and thus a node could be shifted (due to the maximal option) multiple times without causing an infinite loop; setting to true sets maximal to true also; if you are uncertain whether a tree is acyclic, set to false to avoid potential infinite loops
};

/* eslint-enable */

const getInfo = ele => ele.scratch('breadthfirst');
const setInfo = (ele, obj) => ele.scratch('breadthfirst', obj);

function BreadthFirstLayout( options ){
  this.options = util.extend( {}, defaults, deprecatedOptionDefaults, options );
}

BreadthFirstLayout.prototype.run = function(){
  const options = this.options;
  const cy = options.cy;
  const eles = options.eles;
  const nodes = eles.nodes().filter( n => n.isChildless() );
  const graph = eles;
  const directed = options.directed;
  const maximal = options.acyclic || options.maximal || options.maximalAdjustments > 0; // maximalAdjustments for compat. w/ old code; also, setting acyclic to true sets maximal to true

  const hasBoundingBox = !!options.boundingBox;
  const bb = math.makeBoundingBox( hasBoundingBox ? options.boundingBox :
    structuredClone(cy.extent()));

  let roots;
  if( is.elementOrCollection( options.roots ) ){
    roots = options.roots;
  } else if( is.array( options.roots ) ){
    const rootsArray = [];

    for( let i = 0; i < options.roots.length; i++ ){
      const id = options.roots[ i ];
      const ele = cy.getElementById( id );
      rootsArray.push( ele );
    }

    roots = cy.collection( rootsArray );
  } else if( is.string( options.roots ) ){
    roots = cy.$( options.roots );

  } else {
    if( directed ){
      roots = nodes.roots();
    } else {
      const components = eles.components();

      roots = cy.collection();
      for( let i = 0; i < components.length; i++ ){
        const comp = components[i];
        const maxDegree = comp.maxDegree( false );
        const compRoots = comp.filter( function( ele ){
          return ele.degree( false ) === maxDegree;
        } );

        roots = roots.add( compRoots );
      }
    }
  }

  const depths = [];
  const foundByBfs = {};

  const addToDepth = ( ele, d ) => {
    if( depths[d] == null ){
      depths[d] = [];
    }

    const i = depths[d].length;

    depths[d].push( ele );

    setInfo( ele, {
      index: i,
      depth: d
    } );
  };

  const changeDepth = ( ele, newDepth ) => {
    const { depth, index } = getInfo( ele );

    depths[ depth ][ index ] = null;

    // add only childless nodes
    if (ele.isChildless()) addToDepth( ele, newDepth );
  };

  // find the depths of the nodes
  graph.bfs( {
    roots: roots,
    directed: options.directed,
    visit: function( node, edge, pNode, i, depth ){
      const ele = node[0];
      const id = ele.id();
      
      // add only childless nodes
      if (ele.isChildless()) addToDepth( ele, depth );
      foundByBfs[ id ] = true;
    }
  } );

  // check for nodes not found by bfs
  const orphanNodes = [];
  for( let i = 0; i < nodes.length; i++ ){
    const ele = nodes[ i ];

    if( foundByBfs[ ele.id() ] ){
      continue;
    } else {
      orphanNodes.push( ele );
    }
  }

  // assign the nodes a depth and index
  const assignDepthsAt = function( i ){
    const eles = depths[ i ];

    for( let j = 0; j < eles.length; j++ ){
      const ele = eles[ j ];

      if( ele == null ){
        eles.splice( j, 1 );
        j--;
        continue;
      }

      setInfo(ele, {
        depth: i,
        index: j
      });
    }
  };

  const adjustMaximally = function( ele, shifted ){
    const eInfo = getInfo( ele );
    const incomers = ele.incomers().filter( el => el.isNode() && eles.has(el) );
    let maxDepth = -1;
    const id = ele.id();

    for( let k = 0; k < incomers.length; k++ ){
      const incmr = incomers[k];
      const iInfo = getInfo( incmr );

      maxDepth = Math.max( maxDepth, iInfo.depth );
    }

    if( eInfo.depth <= maxDepth ){
      if( !options.acyclic && shifted[id] ){
        return null;
      }

      const newDepth = maxDepth + 1;
      changeDepth( ele, newDepth );
      shifted[id] = newDepth;

      return true;
    }

    return false;
  };

  // for the directed case, try to make the edges all go down (i.e. depth i => depth i + 1)
  if( directed && maximal ){
    const Q = [];
    const shifted = {};

    const enqueue = n => Q.push(n);
    const dequeue = () => Q.shift();

    nodes.forEach( n => Q.push(n) );

    while( Q.length > 0 ){
      const ele = dequeue();
      const didShift = adjustMaximally( ele, shifted );

      if( didShift ){
        ele.outgoers().filter( el => el.isNode() && eles.has(el) ).forEach( enqueue );
      } else if( didShift === null ){
        util.warn('Detected double maximal shift for node `' + ele.id() + '`.  Bailing maximal adjustment due to cycle.  Use `options.maximal: true` only on DAGs.');

        break; // exit on failure
      }
    }
  }

  // find min distance we need to leave between nodes
  let minDistance = 0;
  if( options.avoidOverlap ){
    for( let i = 0; i < nodes.length; i++ ){
      const n = nodes[ i ];
      const nbb = n.layoutDimensions( options );
      const w = nbb.w;
      const h = nbb.h;

      minDistance = Math.max( minDistance, w, h );
    }
  }

  // get the weighted percent for an element based on its connectivity to other levels
  const cachedWeightedPercent = {};
  const getWeightedPercent = function( ele ){
    if( cachedWeightedPercent[ ele.id() ] ){
      return cachedWeightedPercent[ ele.id() ];
    }

    const eleDepth = getInfo( ele ).depth;
    const neighbors = ele.neighborhood();
    let percent = 0;
    let samples = 0;

    for( let i = 0; i < neighbors.length; i++ ){
      const neighbor = neighbors[ i ];

      if( neighbor.isEdge() || neighbor.isParent() || !nodes.has( neighbor ) ){
        continue;
      }

      const bf = getInfo( neighbor );

      if (bf == null){ continue; }

      const index = bf.index;
      const depth = bf.depth;

      // unassigned neighbours shouldn't affect the ordering
      if( index == null || depth == null ){
        continue;
      }

      const nDepth = depths[ depth ].length;

      if( depth < eleDepth ){ // only get influenced by elements above
        percent += index / nDepth;
        samples++;
      }
    }

    samples = Math.max( 1, samples );
    percent = percent / samples;

    if( samples === 0 ){ // put lone nodes at the start
      percent = 0;
    }

    cachedWeightedPercent[ ele.id() ] = percent;
    return percent;
  };


  // rearrange the indices in each depth level based on connectivity
  let sortFn = function( a, b ){
    const apct = getWeightedPercent( a );
    const bpct = getWeightedPercent( b );

    const diff = apct - bpct;

    if( diff === 0 ){
      return util.sort.ascending( a.id(), b.id() ); // make sure sort doesn't have don't-care comparisons
    } else {
      return diff;
    }
  };

  if (options.depthSort !== undefined) {
    sortFn = options.depthSort;
  }

  let depthsLen = depths.length;

  // sort each level to make connected nodes closer
  for( let i = 0; i < depthsLen; i++ ){
    depths[ i ].sort( sortFn );
    assignDepthsAt( i );
  }

  // assign orphan nodes to a new top-level depth
  const orphanDepth = [];
  for( let i = 0; i < orphanNodes.length; i++ ){
    orphanDepth.push( orphanNodes[i] );
  }

  const assignDepths = function(){
    for( let i = 0; i < depthsLen; i++ ){
      assignDepthsAt( i );
    }
  };
  
  // add a new top-level depth only when there are orphan nodes
  if (orphanDepth.length) {
    depths.unshift( orphanDepth );
    depthsLen = depths.length;
    assignDepths();
  }

  let biggestDepthSize = 0;
  for( let i = 0; i < depthsLen; i++ ){
    biggestDepthSize = Math.max( depths[ i ].length, biggestDepthSize );
  }

  const center = {
    x: bb.x1 + bb.w / 2,
    y: bb.y1 + bb.h / 2
  };

  // average node size
  const aveNodeSize = nodes.reduce((acc, node) => ((box) => ({
    w: acc.w === -1 ? box.w : (acc.w + box.w) / 2,
    h: acc.h === -1 ? box.h : (acc.h + box.h) / 2,
  }))(node.boundingBox({
    includeLabels: options.nodeDimensionsIncludeLabels
  })), { w: -1, h: -1 });

  const distanceY = Math.max(
    // only one depth
    depthsLen === 1 ? 0 :
      // inside a bounding box, no need for top & bottom padding
      hasBoundingBox ? ((bb.h - options.padding * 2 - aveNodeSize.h) / (depthsLen - 1)) :
        (bb.h - options.padding * 2 - aveNodeSize.h) / (depthsLen + 1),
    minDistance );

  const maxDepthSize = depths.reduce( (max, eles) => Math.max(max, eles.length), 0 );

  const getPositionTopBottom = function( ele ){
    const { depth, index } = getInfo( ele );

    if ( options.circle ){
      let radiusStepSize = Math.min( bb.w / 2 / depthsLen, bb.h / 2 / depthsLen );
      radiusStepSize = Math.max( radiusStepSize, minDistance );

      let radius = radiusStepSize * depth + radiusStepSize - (depthsLen > 0 && depths[0].length <= 3 ? radiusStepSize / 2 : 0);
      const theta = 2 * Math.PI / depths[ depth ].length * index;

      if( depth === 0 && depths[0].length === 1 ){
        radius = 1;
      }

      return {
        x: center.x + radius * Math.cos( theta ),
        y: center.y + radius * Math.sin( theta )
      };

    } else {
      const depthSize = depths[ depth ].length;
      const distanceX = Math.max(
        // only one depth
        depthSize === 1 ? 0 :
          // inside a bounding box, no need for left & right padding
          hasBoundingBox ? ((bb.w - options.padding * 2 - aveNodeSize.w) / ((options.grid ? maxDepthSize : depthSize) - 1)):
            (bb.w - options.padding * 2 - aveNodeSize.w) / ((options.grid ? maxDepthSize : depthSize) + 1),
        minDistance );

      const epos = {
        x: center.x + (index + 1 - (depthSize + 1) / 2) * distanceX,
        y: center.y + (depth + 1 - (depthsLen + 1) / 2) * distanceY
      };

      return epos;
    }
  };

  const rotateDegrees = {
    'downward': 0,
    'leftward': 90,
    'upward': 180,
    'rightward': -90,
  }

  if (Object.keys(rotateDegrees).indexOf(options.direction) === -1) {
    util.error(`Invalid direction '${options.direction}' specified for breadthfirst layout. Valid values are: ${Object.keys(rotateDegrees).join(', ')}`);
  }

  const getPosition = (ele) => util.rotatePosAndSkewByBox(getPositionTopBottom(ele), bb, rotateDegrees[options.direction]);

  eles.nodes().layoutPositions( this, options, getPosition);

  return this; // chaining
};

export default BreadthFirstLayout;