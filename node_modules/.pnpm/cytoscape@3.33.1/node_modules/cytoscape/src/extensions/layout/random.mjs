import * as util from '../../util/index.mjs';
import * as math from '../../math.mjs';

let defaults = {
  fit: true, // whether to fit to viewport
  padding: 30, // fit padding
  boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  animate: false, // whether to transition the node positions
  animationDuration: 500, // duration of animation in ms if enabled
  animationEasing: undefined, // easing of animation if enabled
  animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
  ready: undefined, // callback on layoutready
  stop: undefined, // callback on layoutstop
  transform: function (node, position ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts 
};

function RandomLayout( options ){
  this.options = util.extend( {}, defaults, options );
}

RandomLayout.prototype.run = function(){
  let options = this.options;
  let cy = options.cy;
  let eles = options.eles;


  let bb = math.makeBoundingBox( options.boundingBox ? options.boundingBox : {
    x1: 0, y1: 0, w: cy.width(), h: cy.height()
  } );

  let getPos = function( node, i ){
    return {
      x: bb.x1 + Math.round( Math.random() * bb.w ),
      y: bb.y1 + Math.round( Math.random() * bb.h )
    };
  };

  eles.nodes().layoutPositions( this, options, getPos );

  return this; // chaining
};

export default RandomLayout;
