import * as util from './webgl-util.mjs';
import { mat3 } from 'gl-matrix';
import { AtlasManager, AtlasBatchManager } from './atlas.mjs';
import * as math from '../../../../math.mjs';
import * as sdf from './shader-sdf.mjs';
import {endsWith} from "../../../../util/index.mjs";


/**
 * Two render modes. Each mode has its own shader program. They are almost identical, the main difference is the output.
 * SCREEN:  output pixel colors to the screen
 * PICKING: output z-order index to an offscreen framebuffer, used to detect what's under the mouse cursor
 */
export const RENDER_TARGET = {
  SCREEN:  { name: 'screen',  screen:  true },
  PICKING: { name: 'picking', picking: true },
};

/**
 * Special handing for label textures in PICKING mode. See issue #3337.
 */
export const TEX_PICKING_MODE = {
  NORMAL: 0, // render the texture just like in RENDER_TARGET.SCREEN mode
  IGNORE: 1, // don't render the texture at all
  USE_BB: 2  // render the bounding box as an opaque rectangle
}

// Vertex types.
// Used directly in the shaders so must be numeric.
// There is only one shader program used for an entire frame that renders all types of elements.
// There are if-else blocks in the shaders that do different things depending on the vertex type.
// This allows all elements to be rendererd in large batches without switching shader programs.
const TEXTURE = 0;
const EDGE_STRAIGHT = 1;
const EDGE_CURVE_SEGMENT = 2;
const EDGE_ARROW = 3;
const RECTANGLE = 4;
const ROUND_RECTANGLE = 5;
const BOTTOM_ROUND_RECTANGLE = 6;
const ELLIPSE = 7;


export class ElementDrawingWebGL {

  /**
   * @param {WebGLRenderingContext} gl
   */
  constructor(r, gl, opts) {
    this.r = r; // reference to the canvas renderer
    this.gl = gl;

    this.maxInstances = opts.webglBatchSize;
    this.atlasSize = opts.webglTexSize;
    this.bgColor = opts.bgColor;

    this.debug = opts.webglDebug;
    this.batchDebugInfo = [];

    opts.enableWrapping = true;
    opts.createTextureCanvas = util.createTextureCanvas; // Unit tests mock this

    this.atlasManager = new AtlasManager(r, opts);
    this.batchManager = new AtlasBatchManager(opts);

    this.simpleShapeOptions = new Map();

    this.program = this._createShaderProgram(RENDER_TARGET.SCREEN);
    this.pickingProgram = this._createShaderProgram(RENDER_TARGET.PICKING);

    this.vao = this._createVAO();
  }


  /**
   * @param { string } collectionName
   * @param {{ texRows: number }} opts
   */
  addAtlasCollection(collectionName, opts) {
    this.atlasManager.addAtlasCollection(collectionName, opts);
  }


  /**
   * @typedef { Object } TextureRenderTypeOpts
   * @property { string } collection - name of atlas collection to render textures to
   * @property { function } getKey - returns the "style key" for an element, may be a single value or an array for multi-line lables
   * @property { function } drawElement - uses a canvas renderer to draw the element to the texture atlas
   * @property { boolean  } drawClipped - if true the context will be clipped to the bounding box before drawElement() is called, may affect performance
   * @property { function } getBoundingBox - returns the bounding box for an element
   * @property { function } getRotation
   * @property { function } getRotationPoint
   * @property { function } getRotationOffset
   * @property { function } isVisible - an extra check for visibility in addition to ele.visible()
   * @property { function } getTexPickingMode - returns a value from the TEX_PICKING_MODE enum
   */
  /**
   * @param { string } typeName
   * @param { TextureRenderTypeOpts } opts
   */
  addTextureAtlasRenderType(typeName, opts) {
    this.atlasManager.addRenderType(typeName, opts);
  }


  /**
   * @typedef { Object } SimpleShapeRenderTypeOpts
   * @property { function } getBoundingBox - returns the bounding box for an element
   * @property { function } isVisible - this is an extra check for visibility in addition to ele.visible()
   * @property { function } isSimple - check if element is a simple shape, or if it needs to fall back to texture rendering
   * @property { ShapeVisualProperties } shapeProps
   */
  /**
   * @typedef { Object } ShapeVisualProperties
   * @property { string } shape
   * @property { string } color
   * @property { string } opacity
   * @property { string } padding
   * @property { string } radius
   * @property { boolean } border
  */
  /**
   * @param { string } typeName
   * @param { SimpleShapeRenderTypeOpts } opts
   */
  addSimpleShapeRenderType(typeName, opts) {
    this.simpleShapeOptions.set(typeName, opts);
  }


  /**
   * Inform the atlasManager when element style keys may have changed.
   * The atlasManager can then mark unused textures for "garbage collection".
   */
  invalidate(eles, { type } = {}) {
    const { atlasManager } = this;
    if(type) {
      return atlasManager.invalidate(eles, {
        filterType: t => t === type,
        forceRedraw: true
      });
    } else {
      return atlasManager.invalidate(eles);
    }
  }

  /**
   * Run texture garbage collection.
   */
  gc() {
    this.atlasManager.gc();
  }


  _createShaderProgram(renderTarget) {
    const { gl } = this;

    const vertexShaderSource = `#version 300 es
      precision highp float;

      uniform mat3 uPanZoomMatrix;
      uniform int  uAtlasSize;
      
      // instanced
      in vec2 aPosition; // a vertex from the unit square
      
      in mat3 aTransform; // used to transform verticies, eg into a bounding box
      in int aVertType; // the type of thing we are rendering

      // the z-index that is output when using picking mode
      in vec4 aIndex;
      
      // For textures
      in int aAtlasId; // which shader unit/atlas to use
      in vec4 aTex; // x/y/w/h of texture in atlas

      // for edges
      in vec4 aPointAPointB;
      in vec4 aPointCPointD;
      in vec2 aLineWidth; // also used for node border width

      // simple shapes
      in vec4 aCornerRadius; // for round-rectangle [top-right, bottom-right, top-left, bottom-left]
      in vec4 aColor; // also used for edges
      in vec4 aBorderColor; // aLineWidth is used for border width

      // output values passed to the fragment shader
      out vec2 vTexCoord;
      out vec4 vColor;
      out vec2 vPosition;
      // flat values are not interpolated
      flat out int vAtlasId; 
      flat out int vVertType;
      flat out vec2 vTopRight;
      flat out vec2 vBotLeft;
      flat out vec4 vCornerRadius;
      flat out vec4 vBorderColor;
      flat out vec2 vBorderWidth;
      flat out vec4 vIndex;
      
      void main(void) {
        int vid = gl_VertexID;
        vec2 position = aPosition; // TODO make this a vec3, simplifies some code below

        if(aVertType == ${TEXTURE}) {
          float texX = aTex.x; // texture coordinates
          float texY = aTex.y;
          float texW = aTex.z;
          float texH = aTex.w;

          if(vid == 1 || vid == 2 || vid == 4) {
            texX += texW;
          }
          if(vid == 2 || vid == 4 || vid == 5) {
            texY += texH;
          }

          float d = float(uAtlasSize);
          vTexCoord = vec2(texX / d, texY / d); // tex coords must be between 0 and 1

          gl_Position = vec4(uPanZoomMatrix * aTransform * vec3(position, 1.0), 1.0);
        }
        else if(aVertType == ${RECTANGLE} || aVertType == ${ELLIPSE} 
             || aVertType == ${ROUND_RECTANGLE} || aVertType == ${BOTTOM_ROUND_RECTANGLE}) { // simple shapes

          // the bounding box is needed by the fragment shader
          vBotLeft  = (aTransform * vec3(0, 0, 1)).xy; // flat
          vTopRight = (aTransform * vec3(1, 1, 1)).xy; // flat
          vPosition = (aTransform * vec3(position, 1)).xy; // will be interpolated

          // calculations are done in the fragment shader, just pass these along
          vColor = aColor;
          vCornerRadius = aCornerRadius;
          vBorderColor = aBorderColor;
          vBorderWidth = aLineWidth;

          gl_Position = vec4(uPanZoomMatrix * aTransform * vec3(position, 1.0), 1.0);
        }
        else if(aVertType == ${EDGE_STRAIGHT}) {
          vec2 source = aPointAPointB.xy;
          vec2 target = aPointAPointB.zw;

          // adjust the geometry so that the line is centered on the edge
          position.y = position.y - 0.5;

          // stretch the unit square into a long skinny rectangle
          vec2 xBasis = target - source;
          vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x));
          vec2 point = source + xBasis * position.x + yBasis * aLineWidth[0] * position.y;

          gl_Position = vec4(uPanZoomMatrix * vec3(point, 1.0), 1.0);
          vColor = aColor;
        } 
        else if(aVertType == ${EDGE_CURVE_SEGMENT}) {
          vec2 pointA = aPointAPointB.xy;
          vec2 pointB = aPointAPointB.zw;
          vec2 pointC = aPointCPointD.xy;
          vec2 pointD = aPointCPointD.zw;

          // adjust the geometry so that the line is centered on the edge
          position.y = position.y - 0.5;

          vec2 p0, p1, p2, pos;
          if(position.x == 0.0) { // The left side of the unit square
            p0 = pointA;
            p1 = pointB;
            p2 = pointC;
            pos = position;
          } else { // The right side of the unit square, use same approach but flip the geometry upside down
            p0 = pointD;
            p1 = pointC;
            p2 = pointB;
            pos = vec2(0.0, -position.y);
          }

          vec2 p01 = p1 - p0;
          vec2 p12 = p2 - p1;
          vec2 p21 = p1 - p2;

          // Find the normal vector.
          vec2 tangent = normalize(normalize(p12) + normalize(p01));
          vec2 normal = vec2(-tangent.y, tangent.x);

          // Find the vector perpendicular to p0 -> p1.
          vec2 p01Norm = normalize(vec2(-p01.y, p01.x));

          // Determine the bend direction.
          float sigma = sign(dot(p01 + p21, normal));
          float width = aLineWidth[0];

          if(sign(pos.y) == -sigma) {
            // This is an intersecting vertex. Adjust the position so that there's no overlap.
            vec2 point = 0.5 * width * normal * -sigma / dot(normal, p01Norm);
            gl_Position = vec4(uPanZoomMatrix * vec3(p1 + point, 1.0), 1.0);
          } else {
            // This is a non-intersecting vertex. Treat it like a mitre join.
            vec2 point = 0.5 * width * normal * sigma * dot(normal, p01Norm);
            gl_Position = vec4(uPanZoomMatrix * vec3(p1 + point, 1.0), 1.0);
          }

          vColor = aColor;
        } 
        else if(aVertType == ${EDGE_ARROW} && vid < 3) {
          // massage the first triangle into an edge arrow
          if(vid == 0)
            position = vec2(-0.15, -0.3);
          if(vid == 1)
            position = vec2(  0.0,  0.0);
          if(vid == 2)
            position = vec2( 0.15, -0.3);

          gl_Position = vec4(uPanZoomMatrix * aTransform * vec3(position, 1.0), 1.0);
          vColor = aColor;
        }
        else {
          gl_Position = vec4(2.0, 0.0, 0.0, 1.0); // discard vertex by putting it outside webgl clip space
        }

        vAtlasId = aAtlasId;
        vVertType = aVertType;
        vIndex = aIndex;
      }
    `;

    const idxs = this.batchManager.getIndexArray();

    const fragmentShaderSource = `#version 300 es
      precision highp float;

      // declare texture unit for each texture atlas in the batch
      ${idxs.map(i => `uniform sampler2D uTexture${i};`).join('\n\t')}

      uniform vec4 uBGColor;
      uniform float uZoom;

      in vec2 vTexCoord;
      in vec4 vColor;
      in vec2 vPosition; // model coordinates

      flat in int vAtlasId;
      flat in vec4 vIndex;
      flat in int vVertType;
      flat in vec2 vTopRight;
      flat in vec2 vBotLeft;
      flat in vec4 vCornerRadius;
      flat in vec4 vBorderColor;
      flat in vec2 vBorderWidth;

      out vec4 outColor;

      ${sdf.circleSD}
      ${sdf.rectangleSD}
      ${sdf.roundRectangleSD}
      ${sdf.ellipseSD}

      vec4 blend(vec4 top, vec4 bot) { // blend colors with premultiplied alpha
        return vec4( 
          top.rgb + (bot.rgb * (1.0 - top.a)),
          top.a   + (bot.a   * (1.0 - top.a)) 
        );
      }

      vec4 distInterp(vec4 cA, vec4 cB, float d) { // interpolate color using Signed Distance
        // scale to the zoom level so that borders don't look blurry when zoomed in
        // note 1.5 is an aribitrary value chosen because it looks good
        return mix(cA, cB, 1.0 - smoothstep(0.0, 1.5 / uZoom, abs(d))); 
      }

      void main(void) {
        if(vVertType == ${TEXTURE}) {
          // look up the texel from the texture unit
          ${idxs.map(i => `if(vAtlasId == ${i}) outColor = texture(uTexture${i}, vTexCoord);`).join('\n\telse ')}
        } 
        else if(vVertType == ${EDGE_ARROW}) {
          // mimics how canvas renderer uses context.globalCompositeOperation = 'destination-out';
          outColor = blend(vColor, uBGColor);
          outColor.a = 1.0; // make opaque, masks out line under arrow
        }
        else if(vVertType == ${RECTANGLE} && vBorderWidth == vec2(0.0)) { // simple rectangle with no border
          outColor = vColor; // unit square is already transformed to the rectangle, nothing else needs to be done
        }
        else if(vVertType == ${RECTANGLE} || vVertType == ${ELLIPSE} 
          || vVertType == ${ROUND_RECTANGLE} || vVertType == ${BOTTOM_ROUND_RECTANGLE}) { // use SDF

          float outerBorder = vBorderWidth[0];
          float innerBorder = vBorderWidth[1];
          float borderPadding = outerBorder * 2.0;
          float w = vTopRight.x - vBotLeft.x - borderPadding;
          float h = vTopRight.y - vBotLeft.y - borderPadding;
          vec2 b = vec2(w/2.0, h/2.0); // half width, half height
          vec2 p = vPosition - vec2(vTopRight.x - b[0] - outerBorder, vTopRight.y - b[1] - outerBorder); // translate to center

          float d; // signed distance
          if(vVertType == ${RECTANGLE}) {
            d = rectangleSD(p, b);
          } else if(vVertType == ${ELLIPSE} && w == h) {
            d = circleSD(p, b.x); // faster than ellipse
          } else if(vVertType == ${ELLIPSE}) {
            d = ellipseSD(p, b);
          } else {
            d = roundRectangleSD(p, b, vCornerRadius.wzyx);
          }

          // use the distance to interpolate a color to smooth the edges of the shape, doesn't need multisampling
          // we must smooth colors inwards, because we can't change pixels outside the shape's bounding box
          if(d > 0.0) {
            if(d > outerBorder) {
              discard;
            } else {
              outColor = distInterp(vBorderColor, vec4(0), d - outerBorder);
            }
          } else {
            if(d > innerBorder) {
              vec4 outerColor = outerBorder == 0.0 ? vec4(0) : vBorderColor;
              vec4 innerBorderColor = blend(vBorderColor, vColor);
              outColor = distInterp(innerBorderColor, outerColor, d);
            } 
            else {
              vec4 outerColor;
              if(innerBorder == 0.0 && outerBorder == 0.0) {
                outerColor = vec4(0);
              } else if(innerBorder == 0.0) {
                outerColor = vBorderColor;
              } else {
                outerColor = blend(vBorderColor, vColor);
              }
              outColor = distInterp(vColor, outerColor, d - innerBorder);
            }
          }
        }
        else {
          outColor = vColor;
        }

        ${ renderTarget.picking
          ? `if(outColor.a == 0.0) discard;
             else outColor = vIndex;`
          : ''
        }
      }
    `;

    const program = util.createProgram(gl, vertexShaderSource, fragmentShaderSource);

    // instance geometry
    program.aPosition = gl.getAttribLocation(program, 'aPosition');

    // attributes
    program.aIndex     = gl.getAttribLocation(program, 'aIndex');
    program.aVertType  = gl.getAttribLocation(program, 'aVertType');
    program.aTransform = gl.getAttribLocation(program, 'aTransform');

    program.aAtlasId   = gl.getAttribLocation(program, 'aAtlasId');
    program.aTex       = gl.getAttribLocation(program, 'aTex');

    program.aPointAPointB   = gl.getAttribLocation(program, 'aPointAPointB');
    program.aPointCPointD   = gl.getAttribLocation(program, 'aPointCPointD');
    program.aLineWidth      = gl.getAttribLocation(program, 'aLineWidth');
    program.aColor          = gl.getAttribLocation(program, 'aColor');
    program.aCornerRadius   = gl.getAttribLocation(program, 'aCornerRadius');
    program.aBorderColor    = gl.getAttribLocation(program, 'aBorderColor');

    // uniforms
    program.uPanZoomMatrix = gl.getUniformLocation(program, 'uPanZoomMatrix');
    program.uAtlasSize     = gl.getUniformLocation(program, 'uAtlasSize');
    program.uBGColor       = gl.getUniformLocation(program, 'uBGColor');
    program.uZoom          = gl.getUniformLocation(program, 'uZoom');

    program.uTextures = [];
    for(let i = 0; i < this.batchManager.getMaxAtlasesPerBatch(); i++) {
      program.uTextures.push(gl.getUniformLocation(program, `uTexture${i}`));
    }

    return program;
  }


  _createVAO() {
    const unitSquare = [
      0, 0,  1, 0,  1, 1,
      0, 0,  1, 1,  0, 1,
    ];

    this.vertexCount = unitSquare.length / 2;
    const n = this.maxInstances;
    const { gl, program } = this;

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    util.createBufferStaticDraw(gl, 'vec2', program.aPosition, unitSquare);

    // Create buffers for all the attributes
    this.transformBuffer = util.create3x3MatrixBufferDynamicDraw(gl, n, program.aTransform);

    this.indexBuffer = util.createBufferDynamicDraw(gl, n, 'vec4', program.aIndex);
    this.vertTypeBuffer = util.createBufferDynamicDraw(gl, n, 'int', program.aVertType);
    this.atlasIdBuffer = util.createBufferDynamicDraw(gl, n, 'int', program.aAtlasId);
    this.texBuffer = util.createBufferDynamicDraw(gl, n, 'vec4', program.aTex);
    this.pointAPointBBuffer = util.createBufferDynamicDraw(gl, n, 'vec4', program.aPointAPointB);
    this.pointCPointDBuffer = util.createBufferDynamicDraw(gl, n, 'vec4', program.aPointCPointD);
    this.lineWidthBuffer = util.createBufferDynamicDraw(gl, n, 'vec2', program.aLineWidth);
    this.colorBuffer = util.createBufferDynamicDraw(gl, n, 'vec4', program.aColor);
    this.cornerRadiusBuffer = util.createBufferDynamicDraw(gl, n, 'vec4', program.aCornerRadius);
    this.borderColorBuffer = util.createBufferDynamicDraw(gl, n, 'vec4', program.aBorderColor);

    gl.bindVertexArray(null);
    return vao;
  }

  get buffers() {
    if(!this._buffers) {
      this._buffers = Object.keys(this).filter(k => endsWith(k, 'Buffer')).map(k => this[k]);
    }
    return this._buffers;
  }


  startFrame(panZoomMatrix, renderTarget = RENDER_TARGET.SCREEN) {
    this.panZoomMatrix = panZoomMatrix;
    this.renderTarget = renderTarget;

    this.batchDebugInfo = [];
    this.wrappedCount = 0;
    this.simpleCount = 0;

    this.startBatch();
  }

  startBatch() {
    this.instanceCount = 0;
    this.batchManager.startBatch();
  }

  endFrame() {
    this.endBatch();
  }


  _isVisible(ele, opts) {
    if(ele.visible()) {
      if(opts && opts.isVisible) {
        return opts.isVisible(ele);
      }
      return true;
    }
    return false;
  }

  /**
   * Draws a texture using the texture atlas.
   */
  drawTexture(ele, eleIndex, type) {
    const { atlasManager, batchManager } = this;
    const opts = atlasManager.getRenderTypeOpts(type);
    if(!this._isVisible(ele, opts)) {
      return;
    }

    // Edges with invalid points could be passed here (labels), causing errors
    // Ref: Random "Script Error" thrown when generating nodes and edges in newest webgl version #3365
    // https://github.com/cytoscape/cytoscape.js/issues/3365
    if(ele.isEdge() && !this._isValidEdge(ele)) {
      return;
    }

    if(this.renderTarget.picking && opts.getTexPickingMode) {
      const mode = opts.getTexPickingMode(ele);
      if(mode === TEX_PICKING_MODE.IGNORE) {
        return;
      } else if(mode == TEX_PICKING_MODE.USE_BB) {
        this.drawPickingRectangle(ele, eleIndex, type);
        return;
      }
    }

    // Get the atlas and the texture coordinates, will draw the texture if it hasn't been drawn yet
    // May be more than one texture if for example the label has multiple lines
    const atlasInfoArray = atlasManager.getAtlasInfo(ele, type);
    for(const atlasInfo of atlasInfoArray) {
      const { atlas, tex1, tex2 } = atlasInfo; // tex2 is used if the label wraps and there are two textures

      if(!batchManager.canAddToCurrentBatch(atlas)) {
        this.endBatch();
      }
      const atlasIndex = batchManager.getAtlasIndexForBatch(atlas);

      for(const [tex, first] of [[tex1, true], [tex2, false]]) {
        if(tex.w != 0) {
          const instance = this.instanceCount;
          this.vertTypeBuffer.getView(instance)[0] = TEXTURE;

          const indexView = this.indexBuffer.getView(instance);
          util.indexToVec4(eleIndex, indexView);

          // Set values in the buffers using Typed Array Views for performance.
          const atlasIdView = this.atlasIdBuffer.getView(instance);
          atlasIdView[0] = atlasIndex;

          // we have two sets of texture coordinates and transforms because textures can wrap in the atlas
          const texView = this.texBuffer.getView(instance);
          texView[0] = tex.x;
          texView[1] = tex.y;
          texView[2] = tex.w;
          texView[3] = tex.h;

          const matrixView = this.transformBuffer.getMatrixView(instance);
          this.setTransformMatrix(ele, matrixView, opts, atlasInfo, first);

          this.instanceCount++;
          if(!first)
            this.wrappedCount++;

          if(this.instanceCount >= this.maxInstances) {
            this.endBatch();
          }
        }
      }
    }
  }

  /**
   * matrix is expected to be a 9 element array
   * this function follows same pattern as CRp.drawCachedElementPortion(...)
   */
  setTransformMatrix(ele, matrix, opts, atlasInfo, first=true) {
    let padding = 0;
    if(opts.shapeProps && opts.shapeProps.padding) {
      padding = ele.pstyle(opts.shapeProps.padding).pfValue;
    }

    if(atlasInfo) { // we've already computed the bb and tex bounds for a texture
      const { bb, tex1, tex2 } = atlasInfo;
      // wrapped textures need separate matrix for each part
      let ratio = tex1.w / (tex1.w + tex2.w);
      if(!first) { // first = true means its the first part of the wrapped texture
        ratio = 1 - ratio;
      }
      const adjBB = this._getAdjustedBB(bb, padding, first, ratio);
      this._applyTransformMatrix(matrix, adjBB, opts, ele);
    }
    else {
      // we don't have a texture, or we want to avoid creating a texture for simple shapes
      const bb = opts.getBoundingBox(ele);
      const adjBB = this._getAdjustedBB(bb, padding, true, 1);
      this._applyTransformMatrix(matrix, adjBB, opts, ele);
    }
  }

  _applyTransformMatrix(matrix, adjBB, opts, ele) {
    let x, y;
    mat3.identity(matrix);

    const theta = opts.getRotation ? opts.getRotation(ele) : 0;
    if(theta !== 0) {
      const { x:sx, y:sy } = opts.getRotationPoint(ele);
      mat3.translate(matrix, matrix, [sx, sy]);
      mat3.rotate(matrix, matrix, theta);

      const offset = opts.getRotationOffset(ele);
      x = offset.x + (adjBB.xOffset || 0);
      y = offset.y + (adjBB.yOffset || 0);
    } else {
      x = adjBB.x1;
      y = adjBB.y1;
    }

    mat3.translate(matrix, matrix, [x, y]);
    mat3.scale(matrix, matrix, [adjBB.w, adjBB.h]);
  }

  /**
   * Adjusts a node or label BB to accomodate padding and split for wrapped textures.
   * @param bb - the original bounding box
   * @param padding - the padding to add to the bounding box
   * @param first - whether this is the first part of a wrapped texture
   * @param ratio - the ratio of the texture width of part of the text to the entire texture
   */
  _getAdjustedBB(bb, padding, first, ratio) {
    let { x1, y1, w, h, yOffset } = bb;

    if(padding) {
      x1 -= padding;
      y1 -= padding;
      w += 2 * padding;
      h += 2 * padding;
    }

    let xOffset = 0;
    const adjW = w * ratio;

    if(first && ratio < 1) {
      w = adjW;
    } else if(!first && ratio < 1) {
      xOffset = w - adjW;
      x1 += xOffset;
      w = adjW;
    }

    return { x1, y1, w, h, xOffset, yOffset };
  }

  /**
   * Draw a solid opaque rectangle matching the element's Bounding Box.
   * Used by the PICKING mode to make the entire BB of a label clickable.
   */
  drawPickingRectangle(ele, eleIndex, type) {
    const opts = this.atlasManager.getRenderTypeOpts(type);
    const instance = this.instanceCount;

    this.vertTypeBuffer.getView(instance)[0] = RECTANGLE;

    const indexView = this.indexBuffer.getView(instance);
    util.indexToVec4(eleIndex, indexView);

    const colorView = this.colorBuffer.getView(instance);
    util.toWebGLColor([0,0,0], 1, colorView); // opaque, so entire label BB is clickable

    const matrixView = this.transformBuffer.getMatrixView(instance);
    this.setTransformMatrix(ele, matrixView, opts);

    this.simpleCount++;
    this.instanceCount++;
    if(this.instanceCount >= this.maxInstances) {
      this.endBatch();
    }
  }

  /**
   * Draw a node using either a texture or a "simple shape".
   */
  drawNode(node, eleIndex, type) {
    const opts = this.simpleShapeOptions.get(type);
    if(!this._isVisible(node, opts)) {
      return;
    }
    const props = opts.shapeProps;

    // Check if we have to use a texture
    const vertType = this._getVertTypeForShape(node, props.shape);
    if(vertType === undefined || (opts.isSimple && !opts.isSimple(node))) {
      this.drawTexture(node, eleIndex, type);
      return;
    }

    // Render a "simple shape" using SDF (signed distance fields)
    const instance = this.instanceCount;
    this.vertTypeBuffer.getView(instance)[0] = vertType;

    if(vertType === ROUND_RECTANGLE || vertType === BOTTOM_ROUND_RECTANGLE) { // get corner radius
      const bb = opts.getBoundingBox(node);
      const radius = this._getCornerRadius(node, props.radius, bb);

      const radiusView = this.cornerRadiusBuffer.getView(instance);
      radiusView[0] = radius; // top-right
      radiusView[1] = radius; // bottom-right
      radiusView[2] = radius; // top-left
      radiusView[3] = radius; // bottom-left
      if(vertType === BOTTOM_ROUND_RECTANGLE) {
        radiusView[0] = 0;
        radiusView[2] = 0;
      }
    }

    const indexView = this.indexBuffer.getView(instance);
    util.indexToVec4(eleIndex, indexView);

    const color = node.pstyle(props.color).value;
    const opacity = node.pstyle(props.opacity).value;
    const colorView = this.colorBuffer.getView(instance);
    util.toWebGLColor(color, opacity, colorView);

    const lineWidthView = this.lineWidthBuffer.getView(instance); // reuse edge line width attribute for node border
    lineWidthView[0] = 0;
    lineWidthView[1] = 0;

    if(props.border) {
      const borderWidth = node.pstyle('border-width').value;
      if(borderWidth > 0) {
        const borderColor = node.pstyle('border-color').value;
        const borderOpacity = node.pstyle('border-opacity').value;

        const borderColorView = this.borderColorBuffer.getView(instance);
        util.toWebGLColor(borderColor, borderOpacity, borderColorView);

        // SDF distance is negative inside the shape and positive outside
        const borderPos = node.pstyle('border-position').value;
        if(borderPos === 'inside') {
          lineWidthView[0] = 0;
          lineWidthView[1] = -borderWidth;
        } else if(borderPos === 'outside') {
          lineWidthView[0] = borderWidth;
          lineWidthView[1] = 0;
        } else { // 'center'
          const halfWidth = borderWidth / 2;
          lineWidthView[0] =  halfWidth;
          lineWidthView[1] = -halfWidth;
        }
      }
    }

    const matrixView = this.transformBuffer.getMatrixView(instance);
    this.setTransformMatrix(node, matrixView, opts);

    this.simpleCount++;
    this.instanceCount++;
    if(this.instanceCount >= this.maxInstances) {
      this.endBatch();
    }
  }


  _getVertTypeForShape(node, shapeProp) {
    const shape = node.pstyle(shapeProp).value
    switch(shape) {
      case 'rectangle':
        return RECTANGLE;
      case 'ellipse':
        return ELLIPSE;
      case 'roundrectangle':
      case 'round-rectangle':
        return ROUND_RECTANGLE;
      case 'bottom-round-rectangle':
        return BOTTOM_ROUND_RECTANGLE;
      default:
        return undefined;
    }
  }

  _getCornerRadius(node, radiusProp, { w, h }) { // see CRp.drawRoundRectanglePath
    if(node.pstyle(radiusProp).value === 'auto') {
      return math.getRoundRectangleRadius(w, h);
    } else {
      const radius = node.pstyle(radiusProp).pfValue;
      const halfWidth  = w / 2;
      const halfHeight = h / 2;
      return Math.min(radius, halfHeight, halfWidth);
    }
  }


  /**
   * Only supports drawing triangles at the moment.
   */
  drawEdgeArrow(edge, eleIndex, prefix) {
    if(!edge.visible()) {
      return;
    }
    // Edge points and arrow angles etc are calculated by the base renderer and cached in the rscratch object.
    const rs = edge._private.rscratch;

    let x, y, angle;
    if(prefix === 'source') {
      x = rs.arrowStartX;
      y = rs.arrowStartY;
      angle = rs.srcArrowAngle;
    } else {
      x = rs.arrowEndX;
      y = rs.arrowEndY;
      angle = rs.tgtArrowAngle;
    }

    // taken from CRp.drawArrowhead
    if(isNaN(x) || x == null || isNaN(y) || y == null || isNaN(angle) || angle == null) {
      return;
    }

    // check shape after the x/y check because pstyle() is a bit slow
    const arrowShape = edge.pstyle(prefix + '-arrow-shape').value;
    if(arrowShape === 'none') {
      return;
    }

    const color = edge.pstyle(prefix + '-arrow-color').value;
    const baseOpacity = edge.pstyle('opacity').value;
    const lineOpacity = edge.pstyle('line-opacity').value;
    const opacity = baseOpacity * lineOpacity;
    const lineWidth = edge.pstyle('width').pfValue;
    const scale = edge.pstyle('arrow-scale').value;
    const size = this.r.getArrowWidth(lineWidth, scale);

    const instance = this.instanceCount;

    const transform = this.transformBuffer.getMatrixView(instance);
    mat3.identity(transform);
    mat3.translate(transform, transform, [x, y]);
    mat3.scale(transform, transform, [size, size]);
    mat3.rotate(transform, transform, angle);

    this.vertTypeBuffer.getView(instance)[0] = EDGE_ARROW;

    const indexView = this.indexBuffer.getView(instance);
    util.indexToVec4(eleIndex, indexView);

    const colorView = this.colorBuffer.getView(instance);
    util.toWebGLColor(color, opacity, colorView);

    this.instanceCount++;
    if(this.instanceCount >= this.maxInstances) {
      this.endBatch();
    }
  }


  /**
   * Draw straight-line or bezier curve edges.
   */
  drawEdgeLine(edge, eleIndex) {
    if(!edge.visible()) {
      return;
    }
    const points = this._getEdgePoints(edge);
    if(!points) {
      return;
    }

    // line style
    const baseOpacity = edge.pstyle('opacity').value;
    const lineOpacity = edge.pstyle('line-opacity').value;
    const width = edge.pstyle('width').pfValue;
    const color = edge.pstyle('line-color').value;
    const opacity = baseOpacity * lineOpacity;

    if(points.length/2 + this.instanceCount > this.maxInstances) {
      this.endBatch();
    }

    if(points.length == 4) { // straight line
      const instance = this.instanceCount;

      this.vertTypeBuffer.getView(instance)[0] = EDGE_STRAIGHT;

      const indexView = this.indexBuffer.getView(instance);
      util.indexToVec4(eleIndex, indexView);
      const colorView = this.colorBuffer.getView(instance);
      util.toWebGLColor(color, opacity, colorView);
      const lineWidthBuffer = this.lineWidthBuffer.getView(instance);
      lineWidthBuffer[0] = width;

      const sourceTargetView = this.pointAPointBBuffer.getView(instance);
      sourceTargetView[0] = points[0]; // source x
      sourceTargetView[1] = points[1]; // source y
      sourceTargetView[2] = points[2]; // target x
      sourceTargetView[3] = points[3]; // target y

      this.instanceCount++;
      if(this.instanceCount >= this.maxInstances) {
        this.endBatch();
      }

    } else { // curved line
      for(let i = 0; i < points.length-2; i += 2) {
        const instance = this.instanceCount;

        this.vertTypeBuffer.getView(instance)[0] = EDGE_CURVE_SEGMENT;

        const indexView = this.indexBuffer.getView(instance);
        util.indexToVec4(eleIndex, indexView);
        const colorView = this.colorBuffer.getView(instance);
        util.toWebGLColor(color, opacity, colorView);
        const lineWidthBuffer = this.lineWidthBuffer.getView(instance);
        lineWidthBuffer[0] = width;

        let pAx = points[i-2], pAy = points[i-1];
        let pBx = points[i  ], pBy = points[i+1];
        let pCx = points[i+2], pCy = points[i+3];
        let pDx = points[i+4], pDy = points[i+5];

        // make phantom points for the first and last segments
        // TODO adding 0.001 to avoid division by zero in the shader (I think), need a better solution
        if(i == 0) {
          pAx = 2*pBx - pCx + 0.001;
          pAy = 2*pBy - pCy + 0.001;
        }
        if(i == points.length-4) {
          pDx = 2*pCx - pBx + 0.001;
          pDy = 2*pCy - pBy + 0.001;
        }

        const pointABView = this.pointAPointBBuffer.getView(instance);
        pointABView[0] = pAx;
        pointABView[1] = pAy;
        pointABView[2] = pBx;
        pointABView[3] = pBy;

        const pointCDView = this.pointCPointDBuffer.getView(instance);
        pointCDView[0] = pCx;
        pointCDView[1] = pCy;
        pointCDView[2] = pDx;
        pointCDView[3] = pDy;

        this.instanceCount++;
        if(this.instanceCount >= this.maxInstances) {
          this.endBatch();
        }
      }
    }
  }

  _isValidEdge(edge) {
    const rs = edge._private.rscratch;
    
    if( rs.badLine || rs.allpts == null || isNaN(rs.allpts[0]) ){ // isNaN in case edge is impossible and browser bugs (e.g. safari)
      return false;
    }

    return true;
  }

  _getEdgePoints(edge) {
    const rs = edge._private.rscratch;

    // if bezier ctrl pts can not be calculated, then die
    if(!this._isValidEdge(edge)){ // isNaN in case edge is impossible and browser bugs (e.g. safari)
      return;
    }
    const controlPoints = rs.allpts;
    if(controlPoints.length == 4) {
      return controlPoints;
    }
    const numSegments = this._getNumSegments(edge);
    return this._getCurveSegmentPoints(controlPoints, numSegments);
  }

  _getNumSegments(edge) {
    // TODO Need a heuristic that decides how many segments to use. Factors to consider:
    // - edge width/length
    // - edge curvature (the more the curvature, the more segments)
    // - zoom level (more segments when zoomed in)
    // - number of visible edges (more segments when there are fewer edges)
    // - performance (fewer segments when performance is a concern)
    // - user configurable option(s)
    // note: number of segments must be less than the max number of instances
    // note: segments don't need to be evenly spaced out, it might make sense to have shorter segments nearer to the control points
    const numSegments = 15;
    return Math.min(Math.max(numSegments, 5), this.maxInstances);
  }

  _getCurveSegmentPoints(controlPoints, segments) {
    if(controlPoints.length == 4) {
      return controlPoints; // straight line
    }
    const curvePoints = Array((segments + 1) * 2);
    for(let i = 0; i <= segments; i++) {
      // the first and last points are the same as the first and last control points
      if(i == 0) {
        curvePoints[0] = controlPoints[0];
        curvePoints[1] = controlPoints[1];
      } else if(i == segments) {
        curvePoints[i*2  ] = controlPoints[controlPoints.length-2];
        curvePoints[i*2+1] = controlPoints[controlPoints.length-1];
      } else {
        const t = i / segments; // segments have equal length, its not strictly necessary to do it this way
        // pass in curvePoints to set the values in the array directly
        this._setCurvePoint(controlPoints, t, curvePoints, i*2);
      }
    }
    return curvePoints;
  }

  _setCurvePoint(points, t, curvePoints, cpi) {
    if(points.length <= 2) {
      curvePoints[cpi  ] = points[0];
      curvePoints[cpi+1] = points[1];
    } else {
      const newpoints = Array(points.length-2);
      for(let i = 0; i < newpoints.length; i+=2) {
        const x = (1-t) * points[i  ] + t * points[i+2];
        const y = (1-t) * points[i+1] + t * points[i+3];
        newpoints[i  ] = x;
        newpoints[i+1] = y;
      }
      return this._setCurvePoint(newpoints, t, curvePoints, cpi);
    }
  }


  endBatch() {
    const { gl, vao, vertexCount, instanceCount: count } = this;
    if(count === 0)
      return;

    const program = this.renderTarget.picking
      ? this.pickingProgram
      : this.program;

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    // buffer the attribute data
    for(const buffer of this.buffers) {
      buffer.bufferSubData(count);
    }

    const atlases = this.batchManager.getAtlases();
    // must buffer before activating texture units
    for(let i = 0; i < atlases.length; i++) {
      atlases[i].bufferIfNeeded(gl);
    }
    // Activate all the texture units that we need
    for(let i = 0; i < atlases.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, atlases[i].texture);
      gl.uniform1i(program.uTextures[i], i);
    }

    // Set the uniforms
    gl.uniform1f(program.uZoom, util.getEffectiveZoom(this.r));
    gl.uniformMatrix3fv(program.uPanZoomMatrix, false, this.panZoomMatrix);
    gl.uniform1i(program.uAtlasSize, this.batchManager.getAtlasSize());
    // set background color, needed for edge arrow color blending
    const webglBgColor = util.toWebGLColor(this.bgColor, 1);
    gl.uniform4fv(program.uBGColor, webglBgColor);

    // draw!
    gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, count);

    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null); // TODO is this right when having multiple texture units?

    if(this.debug) {
      this.batchDebugInfo.push({
        count, // instance count
        atlasCount: atlases.length
      });
    }

    // start the next batch, even if not needed
    this.startBatch();
  }


  getDebugInfo() {
    const atlasInfo = this.atlasManager.getDebugInfo();
    const totalAtlases = atlasInfo.reduce((count, info) => count + info.atlasCount, 0);

    const batchInfo = this.batchDebugInfo;
    const totalInstances = batchInfo.reduce((count, info) => count + info.count, 0);

    return {
      atlasInfo,
      totalAtlases,
      wrappedCount: this.wrappedCount,
      simpleCount: this.simpleCount,
      batchCount: batchInfo.length,
      batchInfo,
      totalInstances
    };
  }

}
