import * as util from '../util/index.mjs';
import * as is from '../is.mjs';
import Set from '../set.mjs';

// represents a node or an edge
let Element = function( cy, params, restore = true ){
  if( cy === undefined || params === undefined || !is.core( cy ) ){
    util.error( 'An element must have a core reference and parameters set' );
    return;
  }

  let group = params.group;

  // try to automatically infer the group if unspecified
  if( group == null ){
    if( params.data && params.data.source != null && params.data.target != null ){
      group = 'edges';
    } else {
      group = 'nodes';
    }
  }

  // validate group
  if( group !== 'nodes' && group !== 'edges' ){
    util.error( 'An element must be of type `nodes` or `edges`; you specified `' + group + '`' );
    return;
  }

  // make the element array-like, just like a collection
  this.length = 1;
  this[0] = this;

  // NOTE: when something is added here, add also to ele.json()
  let _p = this._private = {
    cy: cy,
    single: true, // indicates this is an element
    data: params.data || {}, // data object
    position: params.position || { x: 0, y: 0 }, // (x, y) position pair
    autoWidth: undefined, // width and height of nodes calculated by the renderer when set to special 'auto' value
    autoHeight: undefined,
    autoPadding: undefined,
    compoundBoundsClean: false, // whether the compound dimensions need to be recalculated the next time dimensions are read
    listeners: [], // array of bound listeners
    group: group, // string; 'nodes' or 'edges'
    style: {}, // properties as set by the style
    rstyle: {}, // properties for style sent from the renderer to the core
    styleCxts: [], // applied style contexts from the styler
    styleKeys: {}, // per-group keys of style property values
    removed: true, // whether it's inside the vis; true if removed (set true here since we call restore)
    selected: params.selected ? true : false, // whether it's selected
    selectable: params.selectable === undefined ? true : ( params.selectable ? true : false ), // whether it's selectable
    locked: params.locked ? true : false, // whether the element is locked (cannot be moved)
    grabbed: false, // whether the element is grabbed by the mouse; renderer sets this privately
    grabbable: params.grabbable === undefined ? true : ( params.grabbable ? true : false ), // whether the element can be grabbed
    pannable: params.pannable === undefined ? (group === 'edges' ? true : false) : ( params.pannable ? true : false ), // whether the element has passthrough panning enabled
    active: false, // whether the element is active from user interaction
    classes: new Set(), // map ( className => true )
    animation: { // object for currently-running animations
      current: [],
      queue: []
    },
    rscratch: {}, // object in which the renderer can store information
    scratch: params.scratch || {}, // scratch objects
    edges: [], // array of connected edges
    children: [], // array of children
    parent: params.parent && params.parent.isNode() ? params.parent : null, // parent ref
    traversalCache: {}, // cache of output of traversal functions
    backgrounding: false, // whether background images are loading
    bbCache: null, // cache of the current bounding box
    bbCacheShift: { x: 0, y: 0 }, // shift applied to cached bb to be applied on next get
    bodyBounds: null, // bounds cache of element body, w/o overlay
    overlayBounds: null, // bounds cache of element body, including overlay
    labelBounds: { // bounds cache of labels
      all: null,
      source: null,
      target: null,
      main: null
    },
    arrowBounds: { // bounds cache of edge arrows
      source: null,
      target: null,
      'mid-source': null,
      'mid-target': null
    }
  };

  if( _p.position.x == null ){ _p.position.x = 0; }
  if( _p.position.y == null ){ _p.position.y = 0; }

  // renderedPosition overrides if specified
  if( params.renderedPosition ){
    let rpos = params.renderedPosition;
    let pan = cy.pan();
    let zoom = cy.zoom();

    _p.position = {
      x: (rpos.x - pan.x) / zoom,
      y: (rpos.y - pan.y) / zoom
    };
  }

  let classes = [];
  if( is.array( params.classes ) ){
    classes = params.classes;
  } else if( is.string( params.classes ) ){
    classes = params.classes.split( /\s+/ );
  }
  for( let i = 0, l = classes.length; i < l; i++ ){
    let cls = classes[ i ];
    if( !cls || cls === '' ){ continue; }

    _p.classes.add(cls);
  }

  this.createEmitter();

  if( restore === undefined || restore ){
    this.restore();
  }

  let bypass = params.style || params.css;
  if( bypass ){
    util.warn('Setting a `style` bypass at element creation should be done only when absolutely necessary.  Try to use the stylesheet instead.');

    this.style(bypass);
  }

};

export default Element;
