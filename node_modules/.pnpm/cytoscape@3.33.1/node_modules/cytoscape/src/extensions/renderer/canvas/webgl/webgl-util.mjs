
/**
 * Notes:
 * - All colors have premultiplied alpha. Very important for textues and 
 *   blending to work correctly.
 */



export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  // console.log(gl.getShaderInfoLog(shader));
  return shader;
}


export function createProgram(gl, vertexSource, fragementSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragementSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Could not initialize shaders');
  }
  return program;
}

/**
 * Creates an offscren canvas with a 2D context, for the
 * canvas renderer to use for drawing textures.
 */
export function createTextureCanvas(r, width, height) {
  if(height === undefined) {
    height = width;
  }
  const canvas = r.makeOffscreenCanvas(width, height);
  const ctx = canvas.context = canvas.getContext('2d');
  canvas.clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.clear();
  return canvas;
}

/**
 * Returns the current pan & zoom values, scaled by the pixel ratio.
 */
export function getEffectivePanZoom(r) {
  const { pixelRatio } = r;
  const zoom = r.cy.zoom();
  const pan  = r.cy.pan();
  return {
    zoom: zoom * pixelRatio,
    pan: {
      x: pan.x * pixelRatio,
      y: pan.y * pixelRatio,
    }
  };
}

/**
 * Returns the zoom value, scaled by the pixel ratio.
 */
export function getEffectiveZoom(r) {
  const { pixelRatio } = r;
  const zoom = r.cy.zoom();
  return zoom * pixelRatio;
}

export function modelToRenderedPosition(r, pan, zoom, x, y) {
  let rx = x * zoom + pan.x;
  let ry = y * zoom + pan.y;
  ry = Math.round(r.canvasHeight - ry); // adjust for webgl
  return [ rx, ry ];
}


export function isSimpleShape(node) {
  // the actual shape is checked in ElementDrawingWebGL._getVertTypeForShape()
  // no need to check it twice, this just checks other visual properties
  if(node.pstyle('background-fill').value !== 'solid')
    return false;
  if(node.pstyle('background-image').strValue !== 'none')
    return false;
  if(node.pstyle('border-width').value === 0)
    return true;
  if(node.pstyle('border-opacity').value === 0)
    return true;
  // we have a border but it must be simple
  if(node.pstyle('border-style').value !== 'solid')
    return false;
  // TODO ignoring 'border-cap', 'border-join' and 'border-position' for now
  return true;
}


export function arrayEqual(a1, a2) {
  if(a1.length !== a2.length) {
    return false;
  }
  for(let i = 0; i < a1.length; i++) {
    if(a1[i] !== a2[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Takes color & opacity style values and converts them to WebGL format. 
 * Alpha is premultiplied.
 */
export function toWebGLColor(color, opacity, outArray) {
  const r = color[0] / 255;
  const g = color[1] / 255;
  const b = color[2] / 255;
  const a = opacity;

  const arr = outArray || new Array(4);
  arr[0] = r * a;
  arr[1] = g * a;
  arr[2] = b * a;
  arr[3] = a;
  
  return arr;
}

export function zeroColor(color) {
  color[0] = 0;
  color[1] = 0;
  color[2] = 0;
  color[3] = 0;
}

export function indexToVec4(index, outArray) {
  const arr = outArray || new Array(4);
  arr[0] = ((index >>  0) & 0xFF) / 0xFF;
  arr[1] = ((index >>  8) & 0xFF) / 0xFF;
  arr[2] = ((index >> 16) & 0xFF) / 0xFF;
  arr[3] = ((index >> 24) & 0xFF) / 0xFF;
  return arr;
}

export function vec4ToIndex(vec4) {
  return (
     vec4[0] + 
    (vec4[1] << 8) + 
    (vec4[2] << 16) + 
    (vec4[3] << 24)
  );
}

export function createTexture(gl, debugID) {
  const texture = gl.createTexture();

  texture.buffer = (offscreenCanvas) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  
    // very important, this tells webgl to premultiply colors by the alpha channel
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
  
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  texture.deleteTexture = () => {
    gl.deleteTexture(texture);
  };

  return texture;
}


function getTypeInfo(gl, glslType) {
  switch(glslType) {
    case 'float': return [ 1, gl.FLOAT, 4 ];
    case 'vec2' : return [ 2, gl.FLOAT, 4 ];
    case 'vec3' : return [ 3, gl.FLOAT, 4 ];
    case 'vec4' : return [ 4, gl.FLOAT, 4 ];
    case 'int'  : return [ 1, gl.INT  , 4 ];
    case 'ivec2': return [ 2, gl.INT  , 4 ];
  }
}

function createTypedArray(gl, glType, dataOrSize) {
  switch(glType) {
    case gl.FLOAT: return new Float32Array(dataOrSize);
    case gl.INT  : return new Int32Array(dataOrSize);
  }
}

function createTypedArrayView(gl, glType, array, stride, size, i) {
  switch(glType) {
    case gl.FLOAT: return new Float32Array(array.buffer, i * stride, size);
    case gl.INT  : return new Int32Array(array.buffer, i * stride, size);
  }
}

/** @param {WebGLRenderingContext} gl */
export function createBufferStaticDraw(gl, type, attributeLoc, dataArray) {
  const [ size, glType ] = getTypeInfo(gl, type);
  const data = createTypedArray(gl, glType, dataArray);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  if(glType === gl.FLOAT) {
    gl.vertexAttribPointer(attributeLoc, size, glType, false, 0, 0);
  } else if(glType === gl.INT) {
    gl.vertexAttribIPointer(attributeLoc, size, glType, 0, 0);
  }
  gl.enableVertexAttribArray(attributeLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}


/** 
 * Creates a float buffer with gl.DYNAMIC_DRAW.
 * The returned buffer object contains functions to easily set instance data and buffer the data before a draw call.
 * @param {WebGLRenderingContext} gl 
 */
export function createBufferDynamicDraw(gl, instances, type, attributeLoc) {
  const [ size, glType, bytes ] = getTypeInfo(gl, type);
  const dataArray = createTypedArray(gl, glType, instances * size);
  const stride = size * bytes;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, instances * stride, gl.DYNAMIC_DRAW); 
  gl.enableVertexAttribArray(attributeLoc);
  if(glType === gl.FLOAT) {
    gl.vertexAttribPointer(attributeLoc, size, glType, false, stride, 0);
  } else if(glType === gl.INT) {
    gl.vertexAttribIPointer(attributeLoc, size, glType, stride, 0);
  }
  gl.vertexAttribDivisor(attributeLoc, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // use array views to set values directly into the buffer array
  const views = new Array(instances);
  for(let i = 0; i < instances; i++) {
    views[i] = createTypedArrayView(gl, glType, dataArray, stride, size, i);
  }

  buffer.dataArray = dataArray;
  buffer.stride = stride;
  buffer.size = size;

  buffer.getView = (i) => {
    return views[i];
  };

  buffer.setPoint = (i, x, y) => {
    const view = views[i];
    view[0] = x;
    view[1] = y;
  };

  buffer.bufferSubData = (count) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if(count) {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataArray, 0, count * size);
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataArray); 
    }
  };

  return buffer;
}

/** 
 * Creates a buffer of 3x3 matrix data for use as attribute data.
 * @param {WebGLRenderingContext} gl 
 */
export function create3x3MatrixBufferDynamicDraw(gl, instances, attributeLoc) {
  const matrixSize = 9; // 3x3 matrix
  const matrixData = new Float32Array(instances * matrixSize);

  // use matrix views to set values directly into the matrixData array
  const matrixViews = new Array(instances);
  for(let i = 0; i < instances; i++) {
    const byteOffset = i * matrixSize * 4; // 4 bytes per float
    matrixViews[i] = new Float32Array(matrixData.buffer, byteOffset, matrixSize); // array view
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, matrixData.byteLength, gl.DYNAMIC_DRAW);

  // each row of the matrix needs to be a separate attribute
  for(let i = 0; i < 3; i++) {
    const loc = attributeLoc + i;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 3 * 12, i * 12);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  buffer.getMatrixView = (i) => {
    return matrixViews[i];
  };

  // TODO this is too slow, use getMatrixView and pass the view directly to the glmatrix library
  buffer.setData = (matrix, i) => {
    matrixViews[i].set(matrix, 0); 
  };

  buffer.bufferSubData = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, matrixData);
  };

  return buffer;
}


/** 
 * Creates a Frame Buffer to use for offscreen rendering.
 * @param {WebGLRenderingContext} gl 
 */
export function createPickingFrameBuffer(gl) {
  // Create and bind the framebuffer
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // Create a texture to render to
  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // attach the texture as the first color attachment
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  fb.setFramebufferAttachmentSizes = (width, height) => {
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  };
  
  return fb;
}