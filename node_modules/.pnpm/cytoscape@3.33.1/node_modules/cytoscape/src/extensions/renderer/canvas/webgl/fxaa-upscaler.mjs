/**
 * FXAA (Fast Approximate Anti-Aliasing) implementation for Cytoscape.js
 * Uses WebGL2 to apply efficient anti-aliasing to canvas content
 */
export class FxaaUpscaler {
  /**
   * Creates a new FXAA upscaler using WebGL2
   * @param {Object} options - Configuration options
   * @param {number} [options.subpixelQuality=0.75] - Amount of subpixel aliasing removal (0.0 to 1.0)
   * @param {number} [options.edgeThreshold=0.166] - Edge detection threshold (0.0 to 1.0)
   * @param {number} [options.edgeThresholdMin=0.0833] - Minimum edge threshold (helps with really fine edges)
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(options = {}) {
    this.updateOptions(options);
    this.debug = options.debug !== undefined ? options.debug : false;
    
    // WebGL2 shader sources
    this.vertexShaderSource = `#version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;
    
    this.fragmentShaderSource = `#version 300 es
      precision mediump float;
      
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_subpixelQuality;
      uniform float u_edgeThreshold;
      uniform float u_edgeThresholdMin;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        
        // Sample source texture
        vec3 rgbM = texture(u_image, v_texCoord).rgb;
        
        // Detect edges by sampling neighboring pixels
        vec3 rgbNW = texture(u_image, v_texCoord + vec2(-1.0, -1.0) * texelSize).rgb;
        vec3 rgbNE = texture(u_image, v_texCoord + vec2(1.0, -1.0) * texelSize).rgb;
        vec3 rgbSW = texture(u_image, v_texCoord + vec2(-1.0, 1.0) * texelSize).rgb;
        vec3 rgbSE = texture(u_image, v_texCoord + vec2(1.0, 1.0) * texelSize).rgb;
        
        // Calculate luminance using perceptual weights for RGB
        const vec3 lumCoeff = vec3(0.299, 0.587, 0.114);
        float lumNW = dot(rgbNW, lumCoeff);
        float lumNE = dot(rgbNE, lumCoeff);
        float lumSW = dot(rgbSW, lumCoeff);
        float lumSE = dot(rgbSE, lumCoeff);
        float lumM = dot(rgbM, lumCoeff);
        
        // Calculate luminance deltas for edge detection
        float lumMin = min(lumM, min(min(lumNW, lumNE), min(lumSW, lumSE)));
        float lumMax = max(lumM, max(max(lumNW, lumNE), max(lumSW, lumSE)));
        
        // Calculate edge contrast
        float range = lumMax - lumMin;
        
        // Skip processing if contrast is too low (not an edge)
        if (range < max(u_edgeThresholdMin, lumMax * u_edgeThreshold)) {
          fragColor = vec4(rgbM, 1.0);
          return;
        }
        
        // Sample additional pixels for the blur direction determination
        vec3 rgbN = texture(u_image, v_texCoord + vec2(0.0, -1.0) * texelSize).rgb;
        vec3 rgbS = texture(u_image, v_texCoord + vec2(0.0, 1.0) * texelSize).rgb;
        vec3 rgbW = texture(u_image, v_texCoord + vec2(-1.0, 0.0) * texelSize).rgb;
        vec3 rgbE = texture(u_image, v_texCoord + vec2(1.0, 0.0) * texelSize).rgb;
        
        float lumN = dot(rgbN, lumCoeff);
        float lumS = dot(rgbS, lumCoeff);
        float lumW = dot(rgbW, lumCoeff);
        float lumE = dot(rgbE, lumCoeff);
        
        // Determine the blur direction
        float blurH = 2.0 * (lumW + lumE) - (lumNW + lumNE + lumSW + lumSE);
        float blurV = 2.0 * (lumN + lumS) - (lumNW + lumNE + lumSW + lumSE);
        
        // Calculate blur direction
        vec2 blurDir;
        blurDir.x = -((blurH < 0.0) ? -blurH : blurH) / (blurV < 0.0 ? -blurV : blurV + 0.00001);
        blurDir.y = 1.0;
        
        // Normalize the blur vector and scale
        float dirReduce = max(
          (lumNW + lumNE + lumSW + lumSE) * 0.25 * u_subpixelQuality, 
          1.0/32.0
        );
        float rcpDirMin = 1.0 / (min(abs(blurDir.x), 1.0) + abs(blurDir.y));
        blurDir = min(vec2(8.0, 8.0), 
                    max(vec2(-8.0, -8.0), 
                    blurDir * rcpDirMin)) * texelSize;
        
        // Sample in the calculated direction
        vec3 rgbA = 0.5 * (
          texture(u_image, v_texCoord + blurDir * (1.0/3.0 - 0.5)).rgb +
          texture(u_image, v_texCoord + blurDir * (2.0/3.0 - 0.5)).rgb);
        
        vec3 rgbB = rgbA * 0.5 + 0.25 * (
          texture(u_image, v_texCoord + blurDir * -0.5).rgb +
          texture(u_image, v_texCoord + blurDir * 0.5).rgb);
        
        // Detect if we are on a highly contrasting edge
        float lumB = dot(rgbB, lumCoeff);
        
        // Choose final color based on contrast detection
        if (lumB < lumMin || lumB > lumMax) {
          fragColor = vec4(rgbA, 1.0);
        } else {
          fragColor = vec4(rgbB, 1.0);
        }
      }
    `;

    // Add cached uniform locations
    this.uniformLocations = {};
  }

  /**
   * Update FXAA options
   * @param {Object} options - Configuration options
   * @param {number} [options.subpixelQuality] - Amount of subpixel aliasing removal (0.0 to 1.0)
   * @param {number} [options.edgeThreshold] - Edge detection threshold (0.0 to 1.0)
   * @param {number} [options.edgeThresholdMin] - Minimum edge threshold (helps with really fine edges)
   * @param {boolean} [options.debug] - Enable debug logging
   */
  updateOptions(options = {}) {
    if (options.subpixelQuality !== undefined) this.subpixelQuality = options.subpixelQuality;
    else if (!this.hasOwnProperty('subpixelQuality')) this.subpixelQuality = 0.75;
    
    if (options.edgeThreshold !== undefined) this.edgeThreshold = options.edgeThreshold;
    else if (!this.hasOwnProperty('edgeThreshold')) this.edgeThreshold = 0.166;
    
    if (options.edgeThresholdMin !== undefined) this.edgeThresholdMin = options.edgeThresholdMin;
    else if (!this.hasOwnProperty('edgeThresholdMin')) this.edgeThresholdMin = 0.0833;
    
    if (options.debug !== undefined) this.debug = options.debug;

    if (this.debug) {
      console.log('FXAA options updated:', {
        subpixelQuality: this.subpixelQuality,
        edgeThreshold: this.edgeThreshold,
        edgeThresholdMin: this.edgeThresholdMin
      });
    }
  }

  /**
   * Compile a shader from source
   * @param {WebGL2RenderingContext} gl - The WebGL2 context
   * @param {number} type - The shader type
   * @param {string} source - The shader source code
   * @returns {WebGLShader} - The compiled shader
   * @private
   */
  compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Create a WebGL2 program with vertex and fragment shaders
   * @param {WebGL2RenderingContext} gl - The WebGL2 context
   * @returns {WebGLProgram} - The WebGL2 program
   * @private
   */
  createProgram(gl) {
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  /**
   * Apply FXAA to the input canvas and render to the output canvas
   * @param {HTMLCanvasElement} inputCanvas - The source canvas
   * @param {HTMLCanvasElement} outputCanvas - The destination canvas
   * @returns {boolean} - Whether FXAA was successfully applied
   */
  apply(inputCanvas, outputCanvas) {
    // Don't modify canvas sizes - use them as they are

    // Get WebGL2 context for the output canvas
    const gl = outputCanvas.getContext('webgl2', { 
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      console.error('WebGL2 is not supported');
      // Fall back to 2D copy if WebGL2 is not available
      const ctx = outputCanvas.getContext('2d');
      ctx.drawImage(inputCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
      return false;
    }

    // Create shader program
    const program = this.createProgram(gl);
    if (!program) {
      return false;
    }
    gl.useProgram(program);

    // Cache uniform locations
    this.uniformLocations = {
      image: gl.getUniformLocation(program, 'u_image'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      subpixelQuality: gl.getUniformLocation(program, 'u_subpixelQuality'),
      edgeThreshold: gl.getUniformLocation(program, 'u_edgeThreshold'),
      edgeThresholdMin: gl.getUniformLocation(program, 'u_edgeThresholdMin')
    };

    // Set up a vertex array object (VAO) - WebGL2 feature
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Create position buffer with a full-screen quad (2 triangles)
    const positionBuffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  // bottom-left
       1, -1,  // bottom-right
      -1,  1,  // top-left
      -1,  1,  // top-left
       1, -1,  // bottom-right
       1,  1   // top-right
    ]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Create texcoord buffer - FIX: flip Y coordinates to correct the upside-down rendering
    const texCoordBuffer = gl.createBuffer();
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,  // bottom-left (flipped y)
      1, 1,  // bottom-right (flipped y)
      0, 0,  // top-left (flipped y)
      0, 0,  // top-left (flipped y)
      1, 1,  // bottom-right (flipped y)
      1, 0   // top-right (flipped y)
    ]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Create texture from input canvas
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, inputCanvas);

    // Set uniforms
    gl.uniform1i(this.uniformLocations.image, 0); // Use texture unit 0
    gl.uniform2f(this.uniformLocations.resolution, inputCanvas.width, inputCanvas.height);
    
    // Ensure these crucial values are properly set
    gl.uniform1f(this.uniformLocations.subpixelQuality, this.subpixelQuality);
    gl.uniform1f(this.uniformLocations.edgeThreshold, this.edgeThreshold);
    gl.uniform1f(this.uniformLocations.edgeThresholdMin, this.edgeThresholdMin);

    if (this.debug) {
      console.log('FXAA applying with options:', {
        subpixelQuality: this.subpixelQuality,
        edgeThreshold: this.edgeThreshold,
        edgeThresholdMin: this.edgeThresholdMin,
        canvasSize: `${outputCanvas.width}x${outputCanvas.height}`
      });
      
      // Check if uniform values were set correctly
      const uniforms = {
        subpixelQuality: gl.getUniform(program, this.uniformLocations.subpixelQuality),
        edgeThreshold: gl.getUniform(program, this.uniformLocations.edgeThreshold),
        edgeThresholdMin: gl.getUniform(program, this.uniformLocations.edgeThresholdMin)
      };
      console.log('Actual uniform values set in shader:', uniforms);
    }

    // Set viewport to match output canvas size - allows proper upscaling
    gl.viewport(0, 0, outputCanvas.width, outputCanvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Clean up
    gl.deleteVertexArray(vao);
    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(texCoordBuffer);
    gl.deleteTexture(texture);
    gl.deleteProgram(program);

    return true;
  }
}