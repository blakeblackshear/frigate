/*
The canvas renderer was written by Yue Dong.

Modifications tracked on Github.
*/

/* global OffscreenCanvas */

import * as util from '../../../util/index.mjs';
import * as is from '../../../is.mjs';
import { makeBoundingBox } from '../../../math.mjs';
import ElementTextureCache from './ele-texture-cache.mjs';
import LayeredTextureCache from './layered-texture-cache.mjs';

import arrowShapes from './arrow-shapes.mjs';
import drawingElements from './drawing-elements.mjs';
import drawingEdges from './drawing-edges.mjs';
import drawingImages from './drawing-images.mjs';
import drawingLabelText from './drawing-label-text.mjs';
import drawingNodes from './drawing-nodes.mjs';
import drawingRedraw from './drawing-redraw.mjs';
import drawingRedrawWebGL from './webgl/drawing-redraw-webgl.mjs';
import drawingShapes from './drawing-shapes.mjs';
import exportImage from './export-image.mjs';
import nodeShapes from './node-shapes.mjs';

var CR = CanvasRenderer;
var CRp = CanvasRenderer.prototype;

CRp.CANVAS_LAYERS = 3;
//
CRp.SELECT_BOX = 0;
CRp.DRAG = 1;
CRp.NODE = 2;
CRp.WEBGL = 3;

CRp.CANVAS_TYPES = [ '2d', '2d', '2d', 'webgl2' ];

CRp.BUFFER_COUNT = 3;
//
CRp.TEXTURE_BUFFER = 0;
CRp.MOTIONBLUR_BUFFER_NODE = 1;
CRp.MOTIONBLUR_BUFFER_DRAG = 2;

function CanvasRenderer( options ){
  var r = this;

  var containerWindow = r.cy.window();
  var document = containerWindow.document;

  if( options.webgl ){
    CRp.CANVAS_LAYERS = r.CANVAS_LAYERS = 4;
    console.log('webgl rendering enabled');
  }

  r.data = {
    canvases: new Array( CRp.CANVAS_LAYERS ),
    contexts: new Array( CRp.CANVAS_LAYERS ),
    canvasNeedsRedraw: new Array( CRp.CANVAS_LAYERS ),

    bufferCanvases: new Array( CRp.BUFFER_COUNT ),
    bufferContexts: new Array( CRp.CANVAS_LAYERS ),
  };

  var tapHlOffAttr = '-webkit-tap-highlight-color';
  var tapHlOffStyle = 'rgba(0,0,0,0)';
  r.data.canvasContainer = document.createElement( 'div' ); // eslint-disable-line no-undef
  var containerStyle = r.data.canvasContainer.style;
  r.data.canvasContainer.style[tapHlOffAttr] = tapHlOffStyle;
  containerStyle.position = 'relative';
  containerStyle.zIndex = '0';
  containerStyle.overflow = 'hidden';

  var container = options.cy.container();
  container.appendChild( r.data.canvasContainer );
  container.style[tapHlOffAttr] = tapHlOffStyle;

  var styleMap = {
    '-webkit-user-select': 'none',
    '-moz-user-select': '-moz-none',
    'user-select': 'none',
    '-webkit-tap-highlight-color': 'rgba(0,0,0,0)',
    'outline-style': 'none',
  };

  if(is.ms()) {
    styleMap['-ms-touch-action'] = 'none';
    styleMap['touch-action'] = 'none';
  }

  for( var i = 0; i < CRp.CANVAS_LAYERS; i++ ){
    var canvas = r.data.canvases[ i ] = document.createElement( 'canvas' );  // eslint-disable-line no-undef
    var type = CRp.CANVAS_TYPES[ i ];
    r.data.contexts[ i ] = canvas.getContext( type );
    if( !r.data.contexts[ i ] ) {
      util.error( 'Could not create canvas of type ' + type );
    }
    Object.keys(styleMap).forEach((k) => {
      canvas.style[k] = styleMap[k];
    });
    canvas.style.position = 'absolute';
    canvas.setAttribute( 'data-id', 'layer' + i );
    canvas.style.zIndex = String( CRp.CANVAS_LAYERS - i );
    r.data.canvasContainer.appendChild( canvas );

    r.data.canvasNeedsRedraw[ i ] = false;
  }
  r.data.topCanvas = r.data.canvases[0];

  r.data.canvases[ CRp.NODE ].setAttribute( 'data-id', 'layer' + CRp.NODE + '-node' );
  r.data.canvases[ CRp.SELECT_BOX ].setAttribute( 'data-id', 'layer' + CRp.SELECT_BOX + '-selectbox' );
  r.data.canvases[ CRp.DRAG ].setAttribute( 'data-id', 'layer' + CRp.DRAG + '-drag' );
  if( r.data.canvases[ CRp.WEBGL ] ) {
    r.data.canvases[ CRp.WEBGL ].setAttribute( 'data-id', 'layer' + CRp.WEBGL + '-webgl' );
  }

  for( var i = 0; i < CRp.BUFFER_COUNT; i++ ){
    r.data.bufferCanvases[ i ] = document.createElement( 'canvas' );  // eslint-disable-line no-undef
    r.data.bufferContexts[ i ] = r.data.bufferCanvases[ i ].getContext( '2d' );
    r.data.bufferCanvases[ i ].style.position = 'absolute';
    r.data.bufferCanvases[ i ].setAttribute( 'data-id', 'buffer' + i );
    r.data.bufferCanvases[ i ].style.zIndex = String( -i - 1 );
    r.data.bufferCanvases[ i ].style.visibility = 'hidden';
    //r.data.canvasContainer.appendChild(r.data.bufferCanvases[i]);
  }

  r.pathsEnabled = true;

  let emptyBb = makeBoundingBox();

  let getBoxCenter = bb => ({ x: (bb.x1 + bb.x2)/2, y: (bb.y1 + bb.y2)/2 });

  let getCenterOffset = bb => ({ x: -bb.w/2, y: -bb.h/2 });

  let backgroundTimestampHasChanged = ele => {
    let _p = ele[0]._private;
    let same = _p.oldBackgroundTimestamp === _p.backgroundTimestamp;

    return !same;
  };

  let getStyleKey = ele => ele[0]._private.nodeKey;
  let getLabelKey = ele => ele[0]._private.labelStyleKey;
  let getSourceLabelKey = ele => ele[0]._private.sourceLabelStyleKey;
  let getTargetLabelKey = ele => ele[0]._private.targetLabelStyleKey;

  let drawElement = (context, ele, bb, scaledLabelShown, useEleOpacity) => r.drawElement( context, ele, bb, false, false, useEleOpacity );
  let drawLabel = (context, ele, bb, scaledLabelShown, useEleOpacity) => r.drawElementText( context, ele, bb, scaledLabelShown, 'main', useEleOpacity );
  let drawSourceLabel = (context, ele, bb, scaledLabelShown, useEleOpacity) => r.drawElementText( context, ele, bb, scaledLabelShown, 'source', useEleOpacity );
  let drawTargetLabel = (context, ele, bb, scaledLabelShown, useEleOpacity) => r.drawElementText( context, ele, bb, scaledLabelShown, 'target', useEleOpacity );

  let getElementBox = ele => { ele.boundingBox(); return ele[0]._private.bodyBounds; };
  let getLabelBox   = ele => { ele.boundingBox(); return ele[0]._private.labelBounds.main || emptyBb; };
  let getSourceLabelBox = ele => { ele.boundingBox(); return ele[0]._private.labelBounds.source || emptyBb; };
  let getTargetLabelBox = ele => { ele.boundingBox(); return ele[0]._private.labelBounds.target || emptyBb; };

  let isLabelVisibleAtScale = (ele, scaledLabelShown) => scaledLabelShown;

  let getElementRotationPoint = ele => getBoxCenter( getElementBox(ele) );

  let addTextMargin = (prefix, pt, ele) => {
    let pre = prefix ? prefix + '-' : '';

    return {
      x: pt.x + ele.pstyle(pre + 'text-margin-x').pfValue,
      y: pt.y + ele.pstyle(pre + 'text-margin-y').pfValue
    };
  };

  let getRsPt = (ele, x, y) => {
    let rs = ele[0]._private.rscratch;

    return { x: rs[x], y: rs[y] };
  };

  let getLabelRotationPoint = ele => addTextMargin('', getRsPt(ele, 'labelX', 'labelY'), ele);
  let getSourceLabelRotationPoint = ele => addTextMargin('source', getRsPt(ele, 'sourceLabelX', 'sourceLabelY'), ele);
  let getTargetLabelRotationPoint = ele => addTextMargin('target', getRsPt(ele, 'targetLabelX', 'targetLabelY'), ele);

  let getElementRotationOffset = ele => getCenterOffset( getElementBox(ele) );
  let getSourceLabelRotationOffset = ele => getCenterOffset( getSourceLabelBox(ele) );
  let getTargetLabelRotationOffset = ele => getCenterOffset( getTargetLabelBox(ele) );

  let getLabelRotationOffset = ele => {
    let bb = getLabelBox(ele);
    let p = getCenterOffset( getLabelBox(ele) );

    if( ele.isNode() ){
      switch( ele.pstyle('text-halign').value ){
        case 'left':
          p.x = -bb.w - (bb.leftPad || 0);
          break;
        case 'right':
          p.x = -(bb.rightPad || 0);
          break;
      }

      switch( ele.pstyle('text-valign').value ){
        case 'top':
          p.y = -bb.h - (bb.topPad || 0);
          break;
        case 'bottom':
          p.y = -(bb.botPad || 0);
          break;
      }
    }

    return p;
  };

  let eleTxrCache = r.data.eleTxrCache = new ElementTextureCache( r, {
    getKey: getStyleKey,
    doesEleInvalidateKey: backgroundTimestampHasChanged,
    drawElement: drawElement,
    getBoundingBox: getElementBox,
    getRotationPoint: getElementRotationPoint,
    getRotationOffset: getElementRotationOffset,
    allowEdgeTxrCaching: false,
    allowParentTxrCaching: false
  } );

  let lblTxrCache = r.data.lblTxrCache = new ElementTextureCache( r, {
    getKey: getLabelKey,
    drawElement: drawLabel,
    getBoundingBox: getLabelBox,
    getRotationPoint: getLabelRotationPoint,
    getRotationOffset: getLabelRotationOffset,
    isVisible: isLabelVisibleAtScale
  } );

  let slbTxrCache = r.data.slbTxrCache = new ElementTextureCache( r, {
    getKey: getSourceLabelKey,
    drawElement: drawSourceLabel,
    getBoundingBox: getSourceLabelBox,
    getRotationPoint: getSourceLabelRotationPoint,
    getRotationOffset: getSourceLabelRotationOffset,
    isVisible: isLabelVisibleAtScale
  } );

  let tlbTxrCache = r.data.tlbTxrCache = new ElementTextureCache( r, {
    getKey: getTargetLabelKey,
    drawElement: drawTargetLabel,
    getBoundingBox: getTargetLabelBox,
    getRotationPoint: getTargetLabelRotationPoint,
    getRotationOffset: getTargetLabelRotationOffset,
    isVisible: isLabelVisibleAtScale
  } );

  let lyrTxrCache = r.data.lyrTxrCache = new LayeredTextureCache( r );

  r.onUpdateEleCalcs(function invalidateTextureCaches( willDraw, eles ){
    // each cache should check for sub-key diff to see that the update affects that cache particularly
    eleTxrCache.invalidateElements( eles );
    lblTxrCache.invalidateElements( eles );
    slbTxrCache.invalidateElements( eles );
    tlbTxrCache.invalidateElements( eles );

    // any change invalidates the layers
    lyrTxrCache.invalidateElements( eles );

    // update the old bg timestamp so diffs can be done in the ele txr caches
    for( let i = 0; i < eles.length; i++ ){
      let _p = eles[i]._private;

      _p.oldBackgroundTimestamp = _p.backgroundTimestamp;
    }
  });

  let refineInLayers = reqs => {
    for( var i = 0; i < reqs.length; i++ ){
      lyrTxrCache.enqueueElementRefinement( reqs[i].ele );
    }
  };

  eleTxrCache.onDequeue(refineInLayers);
  lblTxrCache.onDequeue(refineInLayers);
  slbTxrCache.onDequeue(refineInLayers);
  tlbTxrCache.onDequeue(refineInLayers);

  if( options.webgl ) {
    r.initWebgl( options, {
      getStyleKey,
      getLabelKey,
      getSourceLabelKey,
      getTargetLabelKey,
      drawElement,
      drawLabel,
      drawSourceLabel,
      drawTargetLabel,
      getElementBox,
      getLabelBox,
      getSourceLabelBox,
      getTargetLabelBox,
      getElementRotationPoint,
      getElementRotationOffset,
      getLabelRotationPoint,
      getSourceLabelRotationPoint,
      getTargetLabelRotationPoint,
      getLabelRotationOffset,
      getSourceLabelRotationOffset,
      getTargetLabelRotationOffset
    } );
  }
}

CRp.redrawHint = function( group, bool ){
  var r = this;
  
  switch( group ){
    case 'eles':
      r.data.canvasNeedsRedraw[ CRp.NODE ] = bool;
      break;
    case 'drag':
      r.data.canvasNeedsRedraw[ CRp.DRAG ] = bool;
      break;
    case 'select':
      r.data.canvasNeedsRedraw[ CRp.SELECT_BOX ] = bool;
      break;
    case 'gc':
      r.data.gc = true;
      break;
  }
};

// whether to use Path2D caching for drawing
var pathsImpld = typeof Path2D !== 'undefined';

CRp.path2dEnabled = function( on ){
  if( on === undefined ){
    return this.pathsEnabled;
  }

  this.pathsEnabled = on ? true : false;
};

CRp.usePaths = function(){
  return pathsImpld && this.pathsEnabled;
};

CRp.setImgSmoothing = function( context, bool ){
  if( context.imageSmoothingEnabled != null ){
    context.imageSmoothingEnabled = bool;
  } else {
    context.webkitImageSmoothingEnabled = bool;
    context.mozImageSmoothingEnabled = bool;
    context.msImageSmoothingEnabled = bool;
  }
};

CRp.getImgSmoothing = function( context ){
  if( context.imageSmoothingEnabled != null ){
    return context.imageSmoothingEnabled;
  } else {
    return context.webkitImageSmoothingEnabled || context.mozImageSmoothingEnabled || context.msImageSmoothingEnabled;
  }
};

CRp.makeOffscreenCanvas = function(width, height){
  let canvas;

  if( typeof OffscreenCanvas !== typeof undefined ){
    canvas = new OffscreenCanvas(width, height);
  } else {
    var containerWindow = this.cy.window();
    var document = containerWindow.document;
    canvas = document.createElement('canvas'); // eslint-disable-line no-undef
    canvas.width = width;
    canvas.height = height;
  }

  return canvas;
};

[
  arrowShapes,
  drawingElements,
  drawingEdges,
  drawingImages,
  drawingLabelText,
  drawingNodes,
  drawingRedraw,
  drawingRedrawWebGL,
  drawingShapes,
  exportImage,
  nodeShapes
].forEach( function( props ){
  util.extend( CRp, props );
} );

export default CR;
