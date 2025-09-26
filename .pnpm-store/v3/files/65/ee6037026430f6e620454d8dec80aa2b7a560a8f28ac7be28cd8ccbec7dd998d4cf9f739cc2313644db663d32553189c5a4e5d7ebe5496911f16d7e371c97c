import * as util from '../../util/index.mjs';
import * as is from '../../is.mjs';
import { copyPosition } from '../../math.mjs';

let defaults = {
  positions: undefined, // map of (node id) => (position obj); or function(node){ return somPos; }
  zoom: undefined, // the zoom level to set (prob want fit = false if set)
  pan: undefined, // the pan level to set (prob want fit = false if set)
  fit: true, // whether to fit to viewport
  padding: 30, // padding on fit
  spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
  animate: false, // whether to transition the node positions
  animationDuration: 500, // duration of animation in ms if enabled
  animationEasing: undefined, // easing of animation if enabled
  animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
  ready: undefined, // callback on layoutready
  stop: undefined, // callback on layoutstop
  transform: function (node, position ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts
};

function PresetLayout( options ){
  this.options = util.extend( {}, defaults, options );
}

PresetLayout.prototype.run = function(){
  let options = this.options;
  let eles = options.eles;

  let nodes = eles.nodes();
  let posIsFn = is.fn( options.positions );

  function getPosition( node ){
    if( options.positions == null ){
      return copyPosition( node.position() );
    }

    if( posIsFn ){
      return options.positions( node );
    }

    let pos = options.positions[ node._private.data.id ];

    if( pos == null ){
      return null;
    }

    return pos;
  }

  nodes.layoutPositions( this, options, function( node, i ){
    let position = getPosition( node );

    if( node.locked() || position == null ){
      return false;
    }

    return position;
  } );

  return this; // chaining
};

export default PresetLayout;
