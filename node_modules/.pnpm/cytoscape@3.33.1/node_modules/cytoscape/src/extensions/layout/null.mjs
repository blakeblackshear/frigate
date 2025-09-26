import * as util from '../../util/index.mjs';

// default layout options
let defaults = {
  ready: function(){}, // on layoutready
  stop: function(){} // on layoutstop
};

// constructor
// options : object containing layout options
function NullLayout( options ){
  this.options = util.extend( {}, defaults, options );
}

// runs the layout
NullLayout.prototype.run = function(){
  let options = this.options;
  let eles = options.eles; // elements to consider in the layout
  let layout = this;

  // cy is automatically populated for us in the constructor
  // (disable eslint for next line as this serves as example layout code to external developers)
  // eslint-disable-next-line no-unused-vars
  let cy = options.cy;

  layout.emit( 'layoutstart' );

  // puts all nodes at (0, 0)
  // n.b. most layouts would use layoutPositions(), instead of positions() and manual events
  eles.nodes().positions( function(){
    return {
      x: 0,
      y: 0
    };
  } );

  // trigger layoutready when each node has had its position set at least once
  layout.one( 'layoutready', options.ready );
  layout.emit( 'layoutready' );

  // trigger layoutstop when the layout stops (e.g. finishes)
  layout.one( 'layoutstop', options.stop );
  layout.emit( 'layoutstop' );

  return this; // chaining
};

// called on continuous layouts to stop them before they finish
NullLayout.prototype.stop = function(){
  return this; // chaining
};

export default NullLayout;
