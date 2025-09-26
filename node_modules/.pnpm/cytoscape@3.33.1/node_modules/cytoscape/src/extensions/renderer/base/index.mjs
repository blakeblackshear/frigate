import * as util from '../../../util/index.mjs';
import * as is from '../../../is.mjs';

import arrowShapes from './arrow-shapes.mjs';
import coordEleMath from './coord-ele-math/index.mjs';
import images from './images.mjs';
import loadListeners from './load-listeners.mjs';
import nodeShapes from './node-shapes.mjs';
import redraw from './redraw.mjs';

var BaseRenderer = function( options ){ this.init( options ); };
var BR = BaseRenderer;
var BRp = BR.prototype;

BRp.clientFunctions = [ 'redrawHint', 'render', 'renderTo', 'matchCanvasSize', 'nodeShapeImpl', 'arrowShapeImpl' ];

BRp.init = function( options ){
  var r = this;

  r.options = options;

  r.cy = options.cy;

  var ctr = r.container = options.cy.container();
  var containerWindow = r.cy.window();


  // prepend a stylesheet in the head such that
  if( containerWindow ){
    var document = containerWindow.document;
    var head = document.head;
    var stylesheetId = '__________cytoscape_stylesheet';
    var className =    '__________cytoscape_container';
    var stylesheetAlreadyExists = document.getElementById( stylesheetId ) != null;

    if( ctr.className.indexOf( className ) < 0 ){
      ctr.className = ( ctr.className || '' ) + ' ' + className;
    }

    if( !stylesheetAlreadyExists ){
      var stylesheet = document.createElement('style');

      stylesheet.id = stylesheetId;
      stylesheet.textContent = '.'+className+' { position: relative; }';

      head.insertBefore( stylesheet, head.children[0] ); // first so lowest priority
    }

    var computedStyle = containerWindow.getComputedStyle( ctr );
    var position = computedStyle.getPropertyValue('position');

    if( position === 'static' ){
      util.warn('A Cytoscape container has style position:static and so can not use UI extensions properly');
    }
  }

  r.selection = [ undefined, undefined, undefined, undefined, 0]; // Coordinates for selection box, plus enabled flag

  r.bezierProjPcts = [ 0.05, 0.225, 0.4, 0.5, 0.6, 0.775, 0.95 ];

  //--Pointer-related data
  r.hoverData = {down: null, last: null,
      downTime: null, triggerMode: null,
      dragging: false,
      initialPan: [ null, null ], capture: false};

  r.dragData = {possibleDragElements: []};

  r.touchData = {
    start: null, capture: false,

    // These 3 fields related to tap, taphold events
    startPosition: [ null, null, null, null, null, null ],
    singleTouchStartTime: null,
    singleTouchMoved: true,

    now: [ null, null, null, null, null, null ],
    earlier: [ null, null, null, null, null, null ]
  };

  r.redraws = 0;
  r.showFps = options.showFps;
  r.debug = options.debug;
  r.webgl = options.webgl;

  r.hideEdgesOnViewport = options.hideEdgesOnViewport;
  r.textureOnViewport = options.textureOnViewport;
  r.wheelSensitivity = options.wheelSensitivity;
  r.motionBlurEnabled = options.motionBlur; // on by default
  r.forcedPixelRatio = is.number(options.pixelRatio) ? options.pixelRatio : null;
  r.motionBlur = options.motionBlur; // for initial kick off
  r.motionBlurOpacity = options.motionBlurOpacity;
  r.motionBlurTransparency = 1 - r.motionBlurOpacity;
  r.motionBlurPxRatio = 1;
  r.mbPxRBlurry = 1; //0.8;
  r.minMbLowQualFrames = 4;
  r.fullQualityMb = false;
  r.clearedForMotionBlur = [];
  r.desktopTapThreshold = options.desktopTapThreshold;
  r.desktopTapThreshold2 = options.desktopTapThreshold * options.desktopTapThreshold;
  r.touchTapThreshold = options.touchTapThreshold;
  r.touchTapThreshold2 = options.touchTapThreshold * options.touchTapThreshold;
  r.tapholdDuration = 500;

  r.bindings = [];
  r.beforeRenderCallbacks = [];
  r.beforeRenderPriorities = { // higher priority execs before lower one
    animations:   400,
    eleCalcs:     300,
    eleTxrDeq:    200,
    lyrTxrDeq:    150,
    lyrTxrSkip:   100,
  };

  r.registerNodeShapes();
  r.registerArrowShapes();
  r.registerCalculationListeners();
};

BRp.notify = function( eventName, eles ) {
  var r = this;
  var cy = r.cy;

  // the renderer can't be notified after it's destroyed
  if( this.destroyed ){ return; }

  if( eventName === 'init' ){
    r.load();
    return;
  }

  if( eventName === 'destroy' ){
    r.destroy();
    return;
  }

  if(
    eventName === 'add' 
    || eventName === 'remove'
    || (eventName === 'move' && cy.hasCompoundNodes())
    || eventName === 'load'
    || eventName === 'zorder'
    || eventName === 'mount'
  ){
    r.invalidateCachedZSortedEles();
  }

  if( eventName === 'viewport' ){
    r.redrawHint( 'select', true );
  }

  if( eventName === 'gc' ){
    r.redrawHint( 'gc', true );
  }

  if( eventName === 'load' || eventName === 'resize' || eventName === 'mount' ){
    r.invalidateContainerClientCoordsCache();
    r.matchCanvasSize( r.container );
  }

  r.redrawHint( 'eles', true );
  r.redrawHint( 'drag', true );

  this.startRenderLoop();

  this.redraw();
};

BRp.destroy = function(){
  var r = this;

  r.destroyed = true;

  r.cy.stopAnimationLoop();

  for( var i = 0; i < r.bindings.length; i++ ){
    var binding = r.bindings[ i ];
    var b = binding;
    var tgt = b.target;

    ( tgt.off || tgt.removeEventListener ).apply( tgt, b.args );
  }

  r.bindings = [];
  r.beforeRenderCallbacks = [];
  r.onUpdateEleCalcsFns = [];

  if( r.removeObserver ){
    r.removeObserver.disconnect();
  }

  if( r.styleObserver ){
    r.styleObserver.disconnect();
  }

  if( r.resizeObserver ){
    r.resizeObserver.disconnect();
  }

  if( r.labelCalcDiv ){
    try {
      document.body.removeChild( r.labelCalcDiv ); // eslint-disable-line no-undef
    } catch( e ){
      // ie10 issue #1014
    }
  }
};

BRp.isHeadless = function(){
  return false;
};

[
  arrowShapes,
  coordEleMath,
  images,
  loadListeners,
  nodeShapes,
  redraw
].forEach( function( props ){
  util.extend( BRp, props );
} );

export default BR;
