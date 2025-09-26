import * as util from '../../../util/index.mjs';
import * as math from '../../../math.mjs';

var CRp = {};

var motionBlurDelay = 100;

// var isFirefox = typeof InstallTrigger !== 'undefined';

CRp.getPixelRatio = function(){
  var context = this.data.contexts[0];

  if( this.forcedPixelRatio != null ){
    return this.forcedPixelRatio;
  }

  var containerWindow = this.cy.window();

  var backingStore = context.backingStorePixelRatio ||
    context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio || 1;

  return (containerWindow.devicePixelRatio || 1) / backingStore; // eslint-disable-line no-undef
};

CRp.paintCache = function( context ){
  var caches = this.paintCaches = this.paintCaches || [];
  var needToCreateCache = true;
  var cache;

  for( var i = 0; i < caches.length; i++ ){
    cache = caches[ i ];

    if( cache.context === context ){
      needToCreateCache = false;
      break;
    }
  }

  if( needToCreateCache ){
    cache = {
      context: context
    };
    caches.push( cache );
  }

  return cache;
};

CRp.createGradientStyleFor = function( context, shapeStyleName, ele, fill, opacity ){
  let gradientStyle;
  let usePaths = this.usePaths();

  let colors = ele.pstyle(shapeStyleName + '-gradient-stop-colors').value,
    positions = ele.pstyle(shapeStyleName + '-gradient-stop-positions').pfValue;

  if (fill === 'radial-gradient') {
    if (ele.isEdge()) {
      let start = ele.sourceEndpoint(), end = ele.targetEndpoint(), mid = ele.midpoint();

      let d1 = math.dist( start, mid );
      let d2 = math.dist( end, mid );

      gradientStyle = context.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, Math.max(d1, d2));
    } else {
      let pos = usePaths ? {x: 0, y: 0 } : ele.position(),
        width = ele.paddedWidth(), height = ele.paddedHeight();
      gradientStyle = context.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, Math.max(width, height));
    }
  } else {
    if (ele.isEdge()) {
      let start = ele.sourceEndpoint(), end = ele.targetEndpoint();

      gradientStyle = context.createLinearGradient(start.x, start.y, end.x, end.y);
    } else {
      let pos = usePaths ? { x: 0, y: 0 } : ele.position(),
        width = ele.paddedWidth(), height = ele.paddedHeight(),
        halfWidth = width / 2, halfHeight = height / 2;
      let direction = ele.pstyle('background-gradient-direction').value;

      switch (direction) {
        case 'to-bottom':
          gradientStyle = context.createLinearGradient(pos.x, pos.y - halfHeight, pos.x, pos.y + halfHeight);
          break;
        case 'to-top':
          gradientStyle = context.createLinearGradient(pos.x, pos.y + halfHeight, pos.x, pos.y - halfHeight);
          break;
        case 'to-left':
          gradientStyle = context.createLinearGradient(pos.x + halfWidth, pos.y, pos.x - halfWidth, pos.y);
          break;
        case 'to-right':
            gradientStyle = context.createLinearGradient(pos.x - halfWidth, pos.y, pos.x + halfWidth, pos.y);
          break;
        case 'to-bottom-right':
        case 'to-right-bottom':
          gradientStyle = context.createLinearGradient(pos.x - halfWidth, pos.y - halfHeight, pos.x + halfWidth, pos.y + halfHeight);
          break;
        case 'to-top-right':
        case 'to-right-top':
          gradientStyle = context.createLinearGradient(pos.x - halfWidth, pos.y + halfHeight, pos.x + halfWidth, pos.y - halfHeight);
          break;
        case 'to-bottom-left':
        case 'to-left-bottom':
          gradientStyle = context.createLinearGradient(pos.x + halfWidth, pos.y - halfHeight, pos.x - halfWidth, pos.y + halfHeight);
          break;
        case 'to-top-left':
        case 'to-left-top':
          gradientStyle = context.createLinearGradient(pos.x + halfWidth, pos.y + halfHeight, pos.x - halfWidth, pos.y - halfHeight);
          break;
      }
    }
  }
  if (!gradientStyle) return null; // invalid gradient style

  let hasPositions = positions.length === colors.length;

  let length = colors.length;
  for (let i = 0; i < length; i++) {
    gradientStyle.addColorStop(hasPositions ? positions[i] : i / (length - 1), 'rgba(' + colors[i][0] + ',' + colors[i][1] + ',' + colors[i][2] + ',' + opacity + ')');
  }

  return gradientStyle;
};

CRp.gradientFillStyle = function( context, ele, fill, opacity ){
  const gradientStyle = this.createGradientStyleFor(context, 'background', ele, fill, opacity);
  if (!gradientStyle) return null; // error
  context.fillStyle = gradientStyle;
};

CRp.colorFillStyle = function( context, r, g, b, a ){
  context.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  // turn off for now, seems context does its own caching

  // var cache = this.paintCache(context);

  // var fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';

  // if( cache.fillStyle !== fillStyle ){
  //   context.fillStyle = cache.fillStyle = fillStyle;
  // }
};

CRp.eleFillStyle = function( context, ele, opacity ){
  let backgroundFill = ele.pstyle('background-fill').value;

  if (backgroundFill === 'linear-gradient' || backgroundFill === 'radial-gradient') {
    this.gradientFillStyle(context, ele, backgroundFill, opacity);
  } else {
    let backgroundColor = ele.pstyle('background-color').value;
    this.colorFillStyle( context, backgroundColor[0], backgroundColor[1], backgroundColor[2], opacity );
  }
};

CRp.gradientStrokeStyle = function( context, ele, fill, opacity ){
  const gradientStyle = this.createGradientStyleFor(context, 'line', ele, fill ,opacity);
  if (!gradientStyle) return null; // error
  context.strokeStyle = gradientStyle;
};

CRp.colorStrokeStyle = function( context, r, g, b, a ){
  context.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  // turn off for now, seems context does its own caching

  // var cache = this.paintCache(context);

  // var strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';

  // if( cache.strokeStyle !== strokeStyle ){
  //   context.strokeStyle = cache.strokeStyle = strokeStyle;
  // }
};

CRp.eleStrokeStyle = function( context, ele, opacity ){
  let lineFill = ele.pstyle('line-fill').value;

  if (lineFill === 'linear-gradient' || lineFill === 'radial-gradient') {
    this.gradientStrokeStyle(context, ele, lineFill, opacity);
  } else {
    let lineColor = ele.pstyle('line-color').value;
    this.colorStrokeStyle( context, lineColor[0], lineColor[1], lineColor[2], opacity );
  }
};

// Resize canvas
CRp.matchCanvasSize = function( container ){
  var r = this;
  var data = r.data;
  var bb = r.findContainerClientCoords();
  var width = bb[2];
  var height = bb[3];
  var pixelRatio = r.getPixelRatio();
  var mbPxRatio = r.motionBlurPxRatio;

  if(
    container === r.data.bufferCanvases[ r.MOTIONBLUR_BUFFER_NODE ] ||
    container === r.data.bufferCanvases[ r.MOTIONBLUR_BUFFER_DRAG ]
  ){
    pixelRatio = mbPxRatio;
  }

  var canvasWidth = width * pixelRatio;
  var canvasHeight = height * pixelRatio;
  var canvas;

  if( canvasWidth === r.canvasWidth && canvasHeight === r.canvasHeight ){
    return; // save cycles if same
  }

  r.fontCaches = null; // resizing resets the style

  var canvasContainer = data.canvasContainer;
  canvasContainer.style.width = width + 'px';
  canvasContainer.style.height = height + 'px';

  for( var i = 0; i < r.CANVAS_LAYERS; i++ ){
    canvas = data.canvases[ i ];

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  for( var i = 0; i < r.BUFFER_COUNT; i++ ){
    canvas = data.bufferCanvases[ i ];

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  r.textureMult = 1;
  if( pixelRatio <= 1 ){
    canvas = data.bufferCanvases[ r.TEXTURE_BUFFER ];

    r.textureMult = 2;
    canvas.width = canvasWidth * r.textureMult;
    canvas.height = canvasHeight * r.textureMult;
  }

  r.canvasWidth = canvasWidth;
  r.canvasHeight = canvasHeight;
  r.pixelRatio = pixelRatio;
};

CRp.renderTo = function( cxt, zoom, pan, pxRatio ){
  this.render( {
    forcedContext: cxt,
    forcedZoom: zoom,
    forcedPan: pan,
    drawAllLayers: true,
    forcedPxRatio: pxRatio
  } );
};

CRp.clearCanvas = function(){
  var r = this;
  var data = r.data;
  function clear(context) {
    context.clearRect(0, 0, r.canvasWidth, r.canvasHeight);
  }
  clear(data.contexts[ r.NODE ]);
  clear(data.contexts[ r.DRAG ]);
};


CRp.render = function( options ){
  var r = this;
  options = options || util.staticEmptyObject();

  var cy = r.cy; 

  var forcedContext = options.forcedContext;
  var drawAllLayers = options.drawAllLayers;
  var drawOnlyNodeLayer = options.drawOnlyNodeLayer;
  var forcedZoom = options.forcedZoom;
  var forcedPan = options.forcedPan;
  var pixelRatio = options.forcedPxRatio === undefined ? this.getPixelRatio() : options.forcedPxRatio;
  var data = r.data;
  var needDraw = data.canvasNeedsRedraw;
  var textureDraw = r.textureOnViewport && !forcedContext && (r.pinching || r.hoverData.dragging || r.swipePanning || r.data.wheelZooming);
  var motionBlur = options.motionBlur !== undefined ? options.motionBlur : r.motionBlur;
  var mbPxRatio = r.motionBlurPxRatio;
  var hasCompoundNodes = cy.hasCompoundNodes();
  var inNodeDragGesture = r.hoverData.draggingEles;
  var inBoxSelection = r.hoverData.selecting || r.touchData.selecting ? true : false;
  motionBlur = motionBlur && !forcedContext && r.motionBlurEnabled && !inBoxSelection;
  var motionBlurFadeEffect = motionBlur;

  if( !forcedContext ){
    if( r.prevPxRatio !== pixelRatio ){
      r.invalidateContainerClientCoordsCache();
      r.matchCanvasSize( r.container );

      r.redrawHint('eles', true);
      r.redrawHint('drag', true);
    }

    r.prevPxRatio = pixelRatio;
  }

  if( !forcedContext && r.motionBlurTimeout ){
    clearTimeout( r.motionBlurTimeout );
  }

  if( motionBlur ){
    if( r.mbFrames == null ){
      r.mbFrames = 0;
    }

    r.mbFrames++;

    if( r.mbFrames < 3 ){ // need several frames before even high quality motionblur
      motionBlurFadeEffect = false;
    }

    // go to lower quality blurry frames when several m/b frames have been rendered (avoids flashing)
    if( r.mbFrames > r.minMbLowQualFrames ){
      //r.fullQualityMb = false;
      r.motionBlurPxRatio = r.mbPxRBlurry;
    }
  }

  if( r.clearingMotionBlur ){
    r.motionBlurPxRatio = 1;
  }

  // b/c drawToContext() may be async w.r.t. redraw(), keep track of last texture frame
  // because a rogue async texture frame would clear needDraw
  if( r.textureDrawLastFrame && !textureDraw ){
    needDraw[ r.NODE ] = true;
    needDraw[ r.SELECT_BOX ] = true;
  }

  var style = cy.style();

  var zoom = cy.zoom();
  var effectiveZoom = forcedZoom !== undefined ? forcedZoom : zoom;
  var pan = cy.pan();
  var effectivePan = {
    x: pan.x,
    y: pan.y
  };

  var vp = {
    zoom: zoom,
    pan: {
      x: pan.x,
      y: pan.y
    }
  };
  var prevVp = r.prevViewport;
  var viewportIsDiff = prevVp === undefined || vp.zoom !== prevVp.zoom || vp.pan.x !== prevVp.pan.x || vp.pan.y !== prevVp.pan.y;

  // we want the low quality motionblur only when the viewport is being manipulated etc (where it's not noticed)
  if( !viewportIsDiff && !(inNodeDragGesture && !hasCompoundNodes) ){
    r.motionBlurPxRatio = 1;
  }

  if( forcedPan ){
    effectivePan = forcedPan;
  }

  // apply pixel ratio

  effectiveZoom *= pixelRatio;
  effectivePan.x *= pixelRatio;
  effectivePan.y *= pixelRatio;

  var eles = r.getCachedZSortedEles();

  function mbclear( context, x, y, w, h ){
    var gco = context.globalCompositeOperation;

    context.globalCompositeOperation = 'destination-out';
    r.colorFillStyle( context, 255, 255, 255, r.motionBlurTransparency );
    context.fillRect( x, y, w, h );

    context.globalCompositeOperation = gco;
  }

  function setContextTransform( context, clear ){
    var ePan, eZoom, w, h;

    if( !r.clearingMotionBlur && (context === data.bufferContexts[ r.MOTIONBLUR_BUFFER_NODE ] || context === data.bufferContexts[ r.MOTIONBLUR_BUFFER_DRAG ]) ){
      ePan = {
        x: pan.x * mbPxRatio,
        y: pan.y * mbPxRatio
      };

      eZoom = zoom * mbPxRatio;

      w = r.canvasWidth * mbPxRatio;
      h = r.canvasHeight * mbPxRatio;
    } else {
      ePan = effectivePan;
      eZoom = effectiveZoom;

      w = r.canvasWidth;
      h = r.canvasHeight;
    }

    context.setTransform( 1, 0, 0, 1, 0, 0 );

    if( clear === 'motionBlur' ){
      mbclear( context, 0, 0, w, h );
    } else if( !forcedContext && (clear === undefined || clear) ){
      context.clearRect( 0, 0, w, h );
    }

    if( !drawAllLayers ){
      context.translate( ePan.x, ePan.y );
      context.scale( eZoom, eZoom );
    }
    if( forcedPan ){
      context.translate( forcedPan.x, forcedPan.y );
    }
    if( forcedZoom ){
      context.scale( forcedZoom, forcedZoom );
    }
  }

  if( !textureDraw ){
    r.textureDrawLastFrame = false;
  }

  if( textureDraw ){
    r.textureDrawLastFrame = true;

    if( !r.textureCache ){
      r.textureCache = {};

      r.textureCache.bb = cy.mutableElements().boundingBox();

      r.textureCache.texture = r.data.bufferCanvases[ r.TEXTURE_BUFFER ];

      var cxt = r.data.bufferContexts[ r.TEXTURE_BUFFER ];

      cxt.setTransform( 1, 0, 0, 1, 0, 0 );
      cxt.clearRect( 0, 0, r.canvasWidth * r.textureMult, r.canvasHeight * r.textureMult );

      r.render( {
        forcedContext: cxt,
        drawOnlyNodeLayer: true,
        forcedPxRatio: pixelRatio * r.textureMult
      } );

      var vp = r.textureCache.viewport = {
        zoom: cy.zoom(),
        pan: cy.pan(),
        width: r.canvasWidth,
        height: r.canvasHeight
      };

      vp.mpan = {
        x: (0 - vp.pan.x) / vp.zoom,
        y: (0 - vp.pan.y) / vp.zoom
      };
    }

    needDraw[ r.DRAG ] = false;
    needDraw[ r.NODE ] = false;

    var context = data.contexts[ r.NODE ];

    var texture = r.textureCache.texture;
    var vp = r.textureCache.viewport;

    context.setTransform( 1, 0, 0, 1, 0, 0 );

    if( motionBlur ){
      mbclear( context, 0, 0, vp.width, vp.height );
    } else {
      context.clearRect( 0, 0, vp.width, vp.height );
    }

    var outsideBgColor = style.core( 'outside-texture-bg-color' ).value;
    var outsideBgOpacity = style.core( 'outside-texture-bg-opacity' ).value;
    r.colorFillStyle( context, outsideBgColor[0], outsideBgColor[1], outsideBgColor[2], outsideBgOpacity );
    context.fillRect( 0, 0, vp.width, vp.height );

    var zoom = cy.zoom();

    setContextTransform( context, false );

    context.clearRect( vp.mpan.x, vp.mpan.y, vp.width / vp.zoom / pixelRatio, vp.height / vp.zoom / pixelRatio );
    context.drawImage( texture, vp.mpan.x, vp.mpan.y, vp.width / vp.zoom / pixelRatio, vp.height / vp.zoom / pixelRatio );

  } else if( r.textureOnViewport && !forcedContext ){ // clear the cache since we don't need it
    r.textureCache = null;
  }

  var extent = cy.extent();
  var vpManip = (r.pinching || r.hoverData.dragging || r.swipePanning || r.data.wheelZooming || r.hoverData.draggingEles || r.cy.animated());
  var hideEdges = r.hideEdgesOnViewport && vpManip;

  var needMbClear = [];

  needMbClear[ r.NODE ] = !needDraw[ r.NODE ] && motionBlur && !r.clearedForMotionBlur[ r.NODE ] || r.clearingMotionBlur;
  if( needMbClear[ r.NODE ] ){ r.clearedForMotionBlur[ r.NODE ] = true; }

  needMbClear[ r.DRAG ] = !needDraw[ r.DRAG ] && motionBlur && !r.clearedForMotionBlur[ r.DRAG ] || r.clearingMotionBlur;
  if( needMbClear[ r.DRAG ] ){ r.clearedForMotionBlur[ r.DRAG ] = true; }

  if( needDraw[ r.NODE ] || drawAllLayers || drawOnlyNodeLayer || needMbClear[ r.NODE ] ){
    var useBuffer = motionBlur && !needMbClear[ r.NODE ] && mbPxRatio !== 1;
    var context = forcedContext || ( useBuffer ? r.data.bufferContexts[ r.MOTIONBLUR_BUFFER_NODE ] : data.contexts[ r.NODE ] );
    var clear = motionBlur && !useBuffer ? 'motionBlur' : undefined;

    setContextTransform( context, clear );

    if( hideEdges ){
      r.drawCachedNodes( context, eles.nondrag, pixelRatio, extent );
    } else {
      r.drawLayeredElements( context, eles.nondrag, pixelRatio, extent );
    }

    if( r.debug ){
      r.drawDebugPoints( context, eles.nondrag );
    }

    if( !drawAllLayers && !motionBlur ){
      needDraw[ r.NODE ] = false;
    }
  }

  if( !drawOnlyNodeLayer && (needDraw[ r.DRAG ] || drawAllLayers || needMbClear[ r.DRAG ]) ){
    var useBuffer = motionBlur && !needMbClear[ r.DRAG ] && mbPxRatio !== 1;
    var context = forcedContext || ( useBuffer ? r.data.bufferContexts[ r.MOTIONBLUR_BUFFER_DRAG ] : data.contexts[ r.DRAG ] );

    setContextTransform( context, motionBlur && !useBuffer ? 'motionBlur' : undefined );

    if( hideEdges ){
      r.drawCachedNodes( context, eles.drag, pixelRatio, extent );
    } else {
      r.drawCachedElements( context, eles.drag, pixelRatio, extent );
    }

    if( r.debug ){
      r.drawDebugPoints( context, eles.drag );
    }

    if( !drawAllLayers && !motionBlur ){
      needDraw[ r.DRAG ] = false;
    }
  }

  this.drawSelectionRectangle(options, setContextTransform);

  // motionblur: blit rendered blurry frames
  if( motionBlur && mbPxRatio !== 1 ){
    var cxtNode = data.contexts[ r.NODE ];
    var txtNode = r.data.bufferCanvases[ r.MOTIONBLUR_BUFFER_NODE ];

    var cxtDrag = data.contexts[ r.DRAG ];
    var txtDrag = r.data.bufferCanvases[ r.MOTIONBLUR_BUFFER_DRAG ];

    var drawMotionBlur = function( cxt, txt, needClear ){
      cxt.setTransform( 1, 0, 0, 1, 0, 0 );

      if( needClear || !motionBlurFadeEffect ){
        cxt.clearRect( 0, 0, r.canvasWidth, r.canvasHeight );
      } else {
        mbclear( cxt, 0, 0, r.canvasWidth, r.canvasHeight );
      }

      var pxr = mbPxRatio;

      cxt.drawImage(
        txt, // img
        0, 0, // sx, sy
        r.canvasWidth * pxr, r.canvasHeight * pxr, // sw, sh
        0, 0, // x, y
        r.canvasWidth, r.canvasHeight // w, h
      );
    };

    if( needDraw[ r.NODE ] || needMbClear[ r.NODE ] ){
      drawMotionBlur( cxtNode, txtNode, needMbClear[ r.NODE ] );
      needDraw[ r.NODE ] = false;
    }

    if( needDraw[ r.DRAG ] || needMbClear[ r.DRAG ] ){
      drawMotionBlur( cxtDrag, txtDrag, needMbClear[ r.DRAG ] );
      needDraw[ r.DRAG ] = false;
    }
  }

  r.prevViewport = vp;

  if( r.clearingMotionBlur ){
    r.clearingMotionBlur = false;
    r.motionBlurCleared = true;
    r.motionBlur = true;
  }

  if( motionBlur ){
    r.motionBlurTimeout = setTimeout( function(){
      r.motionBlurTimeout = null;

      r.clearedForMotionBlur[ r.NODE ] = false;
      r.clearedForMotionBlur[ r.DRAG ] = false;
      r.motionBlur = false;
      r.clearingMotionBlur = !textureDraw;
      r.mbFrames = 0;

      needDraw[ r.NODE ] = true;
      needDraw[ r.DRAG ] = true;

      r.redraw();
    }, motionBlurDelay );
  }

  if( !forcedContext ){
    cy.emit('render');
  }

};

let fpsHeight;

CRp.drawSelectionRectangle = function(options, setContextTransform) {
  const r = this;
  const cy = r.cy; 
  const data = r.data;
  const style = cy.style();

  const drawOnlyNodeLayer = options.drawOnlyNodeLayer;
  const drawAllLayers = options.drawAllLayers;
  const needDraw = data.canvasNeedsRedraw;
  const forcedContext = options.forcedContext;

  if( r.showFps || (!drawOnlyNodeLayer && (needDraw[ r.SELECT_BOX ] && !drawAllLayers)) ){
    var context = forcedContext || data.contexts[ r.SELECT_BOX ];

    setContextTransform( context );

    if( r.selection[4] == 1 && ( r.hoverData.selecting || r.touchData.selecting ) ){
      var zoom = r.cy.zoom();
      var borderWidth = style.core( 'selection-box-border-width' ).value / zoom;

      context.lineWidth = borderWidth;
      context.fillStyle = 'rgba('
        + style.core( 'selection-box-color' ).value[0] + ','
        + style.core( 'selection-box-color' ).value[1] + ','
        + style.core( 'selection-box-color' ).value[2] + ','
        + style.core( 'selection-box-opacity' ).value + ')';

      context.fillRect(
        r.selection[0],
        r.selection[1],
        r.selection[2] - r.selection[0],
        r.selection[3] - r.selection[1] );

      if( borderWidth > 0 ){
        context.strokeStyle = 'rgba('
          + style.core( 'selection-box-border-color' ).value[0] + ','
          + style.core( 'selection-box-border-color' ).value[1] + ','
          + style.core( 'selection-box-border-color' ).value[2] + ','
          + style.core( 'selection-box-opacity' ).value + ')';

        context.strokeRect(
          r.selection[0],
          r.selection[1],
          r.selection[2] - r.selection[0],
          r.selection[3] - r.selection[1] );
      }
    }

    if( data.bgActivePosistion && !r.hoverData.selecting ){
      var zoom = r.cy.zoom();
      var pos = data.bgActivePosistion;

      context.fillStyle = 'rgba('
        + style.core( 'active-bg-color' ).value[0] + ','
        + style.core( 'active-bg-color' ).value[1] + ','
        + style.core( 'active-bg-color' ).value[2] + ','
        + style.core( 'active-bg-opacity' ).value + ')';

      context.beginPath();
      context.arc( pos.x, pos.y, style.core( 'active-bg-size' ).pfValue / zoom, 0, 2 * Math.PI );
      context.fill();
    }

    var timeToRender = r.lastRedrawTime;
    if( r.showFps && timeToRender ){
      timeToRender = Math.round( timeToRender );
      var fps = Math.round( 1000 / timeToRender );
      const text = '1 frame = ' + timeToRender + ' ms = ' + fps + ' fps';

      context.setTransform( 1, 0, 0, 1, 0, 0 );

      context.fillStyle = 'rgba(255, 0, 0, 0.75)';
      context.strokeStyle = 'rgba(255, 0, 0, 0.75)';
      // context.lineWidth = 1;
      context.font = '30px Arial';
      if(!fpsHeight) {
        const dims = context.measureText(text);
        fpsHeight = dims.actualBoundingBoxAscent;
      }
      context.fillText( text, 0, fpsHeight );

      var maxFps = 60;
      context.strokeRect( 0, fpsHeight + 10, 250, 20 );
      context.fillRect( 0, fpsHeight + 10, 250 * Math.min( fps / maxFps, 1 ), 20 );
    }

    if( !drawAllLayers ){
      needDraw[ r.SELECT_BOX ] = false;
    }
  }
};

export default CRp;
