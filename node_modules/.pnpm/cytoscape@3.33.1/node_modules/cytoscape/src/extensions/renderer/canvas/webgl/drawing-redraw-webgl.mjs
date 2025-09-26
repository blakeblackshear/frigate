import { ElementDrawingWebGL, RENDER_TARGET, TEX_PICKING_MODE } from './drawing-elements-webgl.mjs';
import * as util from './webgl-util.mjs';
import * as eleTextureCache from '../ele-texture-cache.mjs';
import { debounce } from '../../../../util/index.mjs';
import { color2tuple } from '../../../../util/colors.mjs';
import { getPrefixedProperty } from '../../../../util/index.mjs';
import { mat3 } from 'gl-matrix';


const CRp = {};

/**
 * Initialize the WebGL rendering mode after the Canvas renderer has been initialized.
 */
CRp.initWebgl = function(opts, fns) {
  const r = this;
  const gl = r.data.contexts[r.WEBGL];

  // Set defaults and limits for configuration options.
  opts.bgColor = getBGColor(r);
  opts.webglTexSize = Math.min(opts.webglTexSize, gl.getParameter(gl.MAX_TEXTURE_SIZE));
  opts.webglTexRows = Math.min(opts.webglTexRows, 54);
  opts.webglTexRowsNodes = Math.min(opts.webglTexRowsNodes, 54);
  opts.webglBatchSize = Math.min(opts.webglBatchSize, 16384);
  opts.webglTexPerBatch = Math.min(opts.webglTexPerBatch, gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
  
  // Turn debug mode on or off.
  r.webglDebug = opts.webglDebug;
  r.webglDebugShowAtlases = opts.webglDebugShowAtlases;

  // Create offscreen framebuffer that stores the results when RENDER_TARGET.PICKING is enabled.
  // This is used to store the topmost element z-index for each pixel, which is used to tell whats under the mouse cursor point.
  r.pickingFrameBuffer = util.createPickingFrameBuffer(gl);
  r.pickingFrameBuffer.needsDraw = true;

  // Create an ElementDrawingWebGL instance wich is used to do the actual WebGL rendering.
  // This instance needs to be configured to draw various types of elements.
  r.drawing = new ElementDrawingWebGL(r, gl, opts);

  // Some functions that are used to configure ElementDrawingWebGL
  const getLabelRotation = (prop) => (ele) => r.getTextAngle(ele, prop);
  const isLabelVisible = (prop) => (ele) => {
    const label = ele.pstyle(prop);
    return label && label.value;
  };
  const isLayerVisible = (prefix) => (node) => { // prefix is 'overlay' or 'underlay'
    return node.pstyle(`${prefix}-opacity`).value > 0;
  }
  const getTexPickingMode = (ele) => { // tells when a label should be clickable
    const enabled = ele.pstyle('text-events').strValue === 'yes';
    return enabled ? TEX_PICKING_MODE.USE_BB : TEX_PICKING_MODE.IGNORE;
  };
  const getBBForSimpleShape = (node) => { // "simple" shapes need their BB to include border and padding
    const { x, y } = node.position();
    const w = node.outerWidth(); // includes border and padding
    const h = node.outerHeight();
    return { w, h, x1: x - w/2, y1: y - h/2 };
  };

  // An AtlasCollection is a collection of Atlases that have the same configuraiton options.
  // Create one for node bodies and one for all types of labels.
  r.drawing.addAtlasCollection('node', {
    texRows: opts.webglTexRowsNodes
  });
  r.drawing.addAtlasCollection('label', {
    texRows: opts.webglTexRows
  });

  // Configure the different types of elements that can be rendered.

  // Node bodies can be rendered as textures or as "simple shapes". 
  // Simple shapes are preferred because they do not use texture memory.
  // Textures are required if the node body uses complex styles. 
  r.drawing.addTextureAtlasRenderType('node-body', {
    collection: 'node',
    getKey: fns.getStyleKey,
    getBoundingBox: fns.getElementBox,
    drawElement: fns.drawElement,
  });

  r.drawing.addSimpleShapeRenderType('node-body', {
    getBoundingBox: getBBForSimpleShape,
    isSimple: util.isSimpleShape,
    shapeProps: {
      shape:   'shape',
      color:   'background-color',
      opacity: 'background-opacity',
      radius:  'corner-radius',
      border:  true
    }
  });

  r.drawing.addSimpleShapeRenderType('node-overlay', {
    getBoundingBox: getBBForSimpleShape,
    isVisible: isLayerVisible('overlay'),
    shapeProps: {
      shape:   'overlay-shape',
      color:   'overlay-color',
      opacity: 'overlay-opacity',
      padding: 'overlay-padding',
      radius:  'overlay-corner-radius',
    }
  });

  r.drawing.addSimpleShapeRenderType('node-underlay', {
    getBoundingBox: getBBForSimpleShape,
    isVisible: isLayerVisible('underlay'),
    shapeProps: {
      shape:   'underlay-shape',
      color:   'underlay-color',
      opacity: 'underlay-opacity',
      padding: 'underlay-padding',
      radius:  'underlay-corner-radius',
    }
  });

  r.drawing.addTextureAtlasRenderType('label', { // node label or edge mid label
    collection: 'label',
    getTexPickingMode,
    getKey: getStyleKeysForLabel(fns.getLabelKey, null),
    getBoundingBox: getBoundingBoxForLabel(fns.getLabelBox, null),
    drawClipped: true,
    drawElement: fns.drawLabel,
    getRotation: getLabelRotation(null),
    getRotationPoint: fns.getLabelRotationPoint,
    getRotationOffset: fns.getLabelRotationOffset,
    isVisible: isLabelVisible('label'),
  });

  r.drawing.addTextureAtlasRenderType('edge-source-label', {
    collection: 'label',
    getTexPickingMode,
    getKey: getStyleKeysForLabel(fns.getSourceLabelKey, 'source'),
    getBoundingBox: getBoundingBoxForLabel(fns.getSourceLabelBox, 'source'),
    drawClipped: true,
    drawElement: fns.drawSourceLabel,
    getRotation: getLabelRotation('source'),
    getRotationPoint: fns.getSourceLabelRotationPoint,
    getRotationOffset: fns.getSourceLabelRotationOffset,
    isVisible: isLabelVisible('source-label'),
  });

  r.drawing.addTextureAtlasRenderType('edge-target-label', {
    collection: 'label',
    getTexPickingMode,
    getKey: getStyleKeysForLabel(fns.getTargetLabelKey, 'target'),
    getBoundingBox: getBoundingBoxForLabel(fns.getTargetLabelBox, 'target'),
    drawClipped: true,
    drawElement: fns.drawTargetLabel,
    getRotation: getLabelRotation('target'),
    getRotationPoint: fns.getTargetLabelRotationPoint,
    getRotationOffset: fns.getTargetLabelRotationOffset,
    isVisible: isLabelVisible('target-label'),
  });


  // Very simplistic way of triggering garbage collection, just use a timer.
  const setGCFlag = debounce(() => {
    console.log('garbage collect flag set');
    r.data.gc = true;
  }, 10000);

  // Event listener checks if style keys are no longer in use.
  r.onUpdateEleCalcs((willDraw, eles) => {
    let gcNeeded = false;
    if(eles && eles.length > 0) {
      gcNeeded |= r.drawing.invalidate(eles);
    }
    if(gcNeeded) {
      setGCFlag();
    }
  });

  // "Override" certain functions in canvas and base renderer
  overrideCanvasRendererFunctions(r);
};


function getBGColor(r) {
  const container = r.cy.container();
  const cssColor = (container && container.style && container.style.backgroundColor) || 'white';
  return color2tuple(cssColor);
}


function getLabelLines(ele, prefix) {
  const rs = ele._private.rscratch;
  return getPrefixedProperty(rs, 'labelWrapCachedLines', prefix) || [];
}

/** 
 * Handle multi-line labels by rendering each line as a seperate texture.
 * That means each line needs its own style key.
 */
const getStyleKeysForLabel = (getKey, prefix) => (ele) => {
  const key = getKey(ele);
  const lines = getLabelLines(ele, prefix);
  if(lines.length > 1) {
    return lines.map((line, index) => `${key}_${index}`);
  }
  return key;
};

/**
 * Need to create a separate bounding box for each line of a multi-line label.
 * Note that 'drawClipped: true' should be used with this.
 */
const getBoundingBoxForLabel = (getBoundingBox, prefix) => (ele, styleKey) => {
  const bb = getBoundingBox(ele);
  if(typeof styleKey === 'string') {
    const ui = styleKey.indexOf('_');
    if(ui > 0) {
      const lineIndex = Number(styleKey.substring(ui + 1));
      const lines = getLabelLines(ele, prefix);
      // Adjust the height and Y coordinate for one line of the label.
      const h = bb.h / lines.length;
      const yOffset = h * lineIndex;
      const y1 = bb.y1 + yOffset;
      // the yOffset is needed when rotating the label
      return { x1: bb.x1, w: bb.w, y1, h, yOffset };
    }
  }
  return bb;
};



/**
 * Plug into the canvas renderer by dynamically overriding some of its functions.
 * This requires minimal changes to the canvas rendrerer.
 */
function overrideCanvasRendererFunctions(r) {
  { // Override the render function to call the webgl render function if the zoom level is appropriate
    const renderCanvas = r.render; 
    r.render = function(options) {
      options = options || {};
      const cy = r.cy; 
      if(r.webgl) {
        // If the zoom level is greater than the max zoom level, then disable webgl and switch back to 
        // the canvas renderer.
        if(cy.zoom() > eleTextureCache.maxZoom) {
          clearWebgl(r);
          renderCanvas.call(r, options); 
        } else {
          clearCanvas(r);
          renderWebgl(r, options, RENDER_TARGET.SCREEN);
        }
      }
    };
  }

  { // Override the matchCanvasSize function to update the picking frame buffer size
    const baseFunc = r.matchCanvasSize;
    r.matchCanvasSize = function(container) {
      baseFunc.call(r, container);
      r.pickingFrameBuffer.setFramebufferAttachmentSizes(r.canvasWidth, r.canvasHeight);
      r.pickingFrameBuffer.needsDraw = true;
    };
  } 

  { // Override function to call the webgl version for picking.
    // Don't override r.getAllInBox() selction box picking, its not accurate enough with webgl
    r.findNearestElements = function(x, y, interactiveElementsOnly, isTouch) {
      // the canvas version of this function is very slow on large graphs
      return findNearestElementsWebgl(r, x, y, interactiveElementsOnly, isTouch);
    };
  }

  { // need to know when the cached elements have changed so we can invalidate our caches
    const baseFunc = r.invalidateCachedZSortedEles;
    r.invalidateCachedZSortedEles = function() {
      baseFunc.call(r);
      r.pickingFrameBuffer.needsDraw = true;
    };
  }
  { // need to know when the cached elements have changed so we can invalidate our caches
    const baseFunc = r.notify;
    r.notify = function(eventName, eles) {
      baseFunc.call(r, eventName, eles);
      if(eventName === 'viewport' || eventName === 'bounds') {
        r.pickingFrameBuffer.needsDraw = true;
      } else if(eventName === 'background') { // background image finished loading, need to redraw
        r.drawing.invalidate(eles, { type: 'node-body' });
      }
    };
  }
}


function clearWebgl(r) {
  const gl = r.data.contexts[r.WEBGL];
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function clearCanvas(r) {
  // the CRp.clearCanvas() function doesn't take the transform into account
  const clear = context => {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, r.canvasWidth, r.canvasHeight);
    context.restore();
  };
  clear(r.data.contexts[r.NODE]);
  clear(r.data.contexts[r.DRAG]);
}


function createPanZoomMatrix(r) {
  const width  = r.canvasWidth;
  const height = r.canvasHeight;
  const { pan, zoom } = util.getEffectivePanZoom(r);

  const transform = mat3.create();
  mat3.translate(transform, transform, [pan.x, pan.y]);
  mat3.scale(transform, transform, [zoom, zoom]);

  const projection = mat3.create();
  mat3.projection(projection, width, height);

  const product = mat3.create();
  mat3.multiply(product, projection, transform);

  return product;
}


function setContextTransform(r, context) {
  const width  = r.canvasWidth;
  const height = r.canvasHeight;
  const { pan, zoom } = util.getEffectivePanZoom(r);

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.translate(pan.x, pan.y);
  context.scale(zoom, zoom);
}


function drawSelectionRectangle(r, options) {
  r.drawSelectionRectangle(options, context => setContextTransform(r, context));
}


function drawAxes(r) { // for debgging
  const context = r.data.contexts[r.NODE];
  context.save();
  setContextTransform(r, context);
  context.strokeStyle='rgba(0, 0, 0, 0.3)';
  context.beginPath();
  context.moveTo(-1000, 0);
  context.lineTo(1000, 0);
  context.stroke();
  context.beginPath();
  context.moveTo(0, -1000);
  context.lineTo(0, 1000);
  context.stroke();
  context.restore();
}


function drawAtlases(r) { // For debugging the atlases, this doesn't work for Atlases that are locked
  const draw = (drawing, name, row) => {
    const collection = drawing.atlasManager.getAtlasCollection(name);
    const context = r.data.contexts[r.NODE];
  
    const atlases = collection.atlases;
    for(let i = 0; i < atlases.length; i++) {
      const atlas = atlases[i];
      const canvas = atlas.canvas;
      if(canvas) {
        const w = canvas.width;
        const h = canvas.height;
        const x = w * i;
        const y = canvas.height * row;
    
        const scale = 0.4;
        context.save();
        context.scale(scale, scale);
        context.drawImage(canvas, x, y);
        context.strokeStyle = 'black';
        context.rect(x, y, w, h);
        context.stroke();
        context.restore();
      }
    }
  };
  let i = 0;
  draw(r.drawing, 'node',  i++);
  draw(r.drawing, 'label', i++);
}


/**
 * Returns the z-order index of elments under or very close to the mouse cursor point.
 * Arguments are in model coordinates.
 * (x1, y1) is top left corner
 * (x2, y2) is bottom right corner (optional)
 * Returns a Set of indexes.
 */
function getPickingIndexes(r, mX1, mY1, mX2, mY2) {
  let x, y, w, h;
  const { pan, zoom } = util.getEffectivePanZoom(r);

  if(mX2 === undefined || mY2 === undefined) {
    const [ cX1, cY1 ] = util.modelToRenderedPosition(r, pan, zoom, mX1, mY1);
    const t = 6; // should be even
    x = cX1 - (t / 2);
    y = cY1 - (t / 2);
    w = t;
    h = t;
  } else {
    const [ cX1, cY1 ] = util.modelToRenderedPosition(r, pan, zoom, mX1, mY1);
    const [ cX2, cY2 ] = util.modelToRenderedPosition(r, pan, zoom, mX2, mY2);
    x = cX1; // (cX1, cY2) is the bottom left corner of the box
    y = cY2;
    w = Math.abs(cX2 - cX1);
    h = Math.abs(cY2 - cY1);
  }

  if(w === 0 || h === 0) {
    return [];
  }

  const gl = r.data.contexts[r.WEBGL];
  gl.bindFramebuffer(gl.FRAMEBUFFER, r.pickingFrameBuffer);

  if(r.pickingFrameBuffer.needsDraw) {
    // Draw element z-indexes to the picking framebuffer
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    renderWebgl(r, null, RENDER_TARGET.PICKING);
    r.pickingFrameBuffer.needsDraw = false;
  }

  const n = w * h; // number of pixels to read
  const data = new Uint8Array(n * 4); // 4 bytes per pixel
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const indexes = new Set();
  for(let i = 0; i < n; i++) {
    const pixel = data.slice(i*4, i*4 + 4);
    const index = util.vec4ToIndex(pixel) - 1; // The framebuffer is cleared with 0s, so z-indexes are offset by 1
    if(index >= 0) {
      indexes.add(index);
    }
  }
  return indexes;
}


/**
 * Cy.js: model coordinate y axis goes down
 */
function findNearestElementsWebgl(r, x, y) { // model coordinates
  const indexes = getPickingIndexes(r, x, y);
  const eles = r.getCachedZSortedEles();

  let node, edge;

  for(const index of indexes) {
    const ele = eles[index];
    if(!node && ele.isNode()) {
      node = ele;
    }
    if(!edge && ele.isEdge()) {
      edge = ele;
    }
    if(node && edge) {
      break;
    }
  }

  return [ node, edge ].filter(Boolean);
}


/**
 * Draw one node or edge. 
 */
function drawEle(r, index, ele) {
  const { drawing } = r;
  index += 1; // 0 is used to clear the background, need to offset all z-indexes by one
  if(ele.isNode()) {
    drawing.drawNode(ele, index, 'node-underlay');
    drawing.drawNode(ele, index, 'node-body');
    drawing.drawTexture(ele, index, 'label');
    drawing.drawNode(ele, index, 'node-overlay');
  } else {
    drawing.drawEdgeLine(ele, index);
    drawing.drawEdgeArrow(ele, index, 'source');
    drawing.drawEdgeArrow(ele, index, 'target');
    drawing.drawTexture(ele, index, 'label');
    drawing.drawTexture(ele, index, 'edge-source-label');
    drawing.drawTexture(ele, index, 'edge-target-label');
  }
}

/**
 * Render one frame.
 */
function renderWebgl(r, options, renderTarget) {
  let start;
  if(r.webglDebug) {
    start = performance.now(); // eslint-disable-line no-undef
  }
  
  const { drawing } = r;
  let eleCount = 0;

  if(renderTarget.screen) {
    if(r.data.canvasNeedsRedraw[r.SELECT_BOX]) {
      drawSelectionRectangle(r, options);
    }
  }

  // see drawing-elements.js drawCachedElement()
  if(r.data.canvasNeedsRedraw[r.NODE] || renderTarget.picking) {
    const gl = r.data.contexts[r.WEBGL];

    if(renderTarget.screen) {
      gl.clearColor(0, 0, 0, 0); // background color
      gl.enable(gl.BLEND); // enable alpha blending of colors
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // webgl colors use premultiplied alpha
    } else {
      gl.disable(gl.BLEND); // don't blend z-order index values! they are not colors
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const panZoomMatrix = createPanZoomMatrix(r);
    const eles = r.getCachedZSortedEles();
    eleCount = eles.length;

    drawing.startFrame(panZoomMatrix, renderTarget);

    if(renderTarget.screen) {
      for(let i = 0; i < eles.nondrag.length; i++) {
        drawEle(r, i, eles.nondrag[i]);
      }
      for(let i = 0; i < eles.drag.length; i++) {
        drawEle(r, i, eles.drag[i]);
      }
    } else if(renderTarget.picking) {
      for(let i = 0; i < eles.length; i++) {
        drawEle(r, i, eles[i]);
      }
    }

    drawing.endFrame();

    if(renderTarget.screen && r.webglDebugShowAtlases) {
      drawAxes(r);
      drawAtlases(r);
    }

    r.data.canvasNeedsRedraw[r.NODE] = false;
    r.data.canvasNeedsRedraw[r.DRAG] = false;
  }

  if(r.webglDebug) {
    // eslint-disable-next-line no-undef
    const end = performance.now();
    const compact = false;

    const time = Math.ceil(end - start);
    const debugInfo = drawing.getDebugInfo();
    
    const report = [
      `${eleCount} elements`, 
      `${debugInfo.totalInstances} instances`,
      `${debugInfo.batchCount} batches`,
      `${debugInfo.totalAtlases} atlases`,
      `${debugInfo.wrappedCount} wrapped textures`,
      `${debugInfo.simpleCount} simple shapes`
    ].join(', ');

    if(compact) {
      console.log(`WebGL (${renderTarget.name}) - time ${time}ms, ${report}`);
    } else {
      console.log(`WebGL (${renderTarget.name}) - frame time ${time}ms`);
      console.log('Totals:');
      console.log(`  ${report}`);
      console.log('Texture Atlases Used:');
      const atlasInfo = debugInfo.atlasInfo;
      for(const info of atlasInfo) {
        console.log(`  ${info.type}: ${info.keyCount} keys, ${info.atlasCount} atlases`);
      }
      console.log('');
    }
  }

  if(r.data.gc) {
    console.log('Garbage Collect!');
    r.data.gc = false;
    drawing.gc();
  }
}

export default CRp;
