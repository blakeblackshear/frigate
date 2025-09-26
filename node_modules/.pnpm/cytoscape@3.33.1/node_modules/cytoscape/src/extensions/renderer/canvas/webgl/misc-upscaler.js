// Canvas Upscaling Plugin
class MiscUpscaler {
    constructor(options = {}) {
        // Plugin Settings
        this.options = Object.assign({
            useEdgeDetection: true,  // Edge Detection
            scaleFactor: 2.0,        // Upscaling Value
        }, options);
        
        this.gl = null;
        this.program = null;
        this.frameBuffer = null;
        this.texture = null;
        this.outputTexture = null;
    }

    init(inputCanvas, outputCanvas) {
        this.inputCanvas = inputCanvas;
        this.outputCanvas = outputCanvas;
        
        // Set output canvas size based on scale factor
        this.outputCanvas.width = this.inputCanvas.width * this.options.scaleFactor;
        this.outputCanvas.height = this.inputCanvas.height * this.options.scaleFactor;
        
        // Initialize WebGL context
        this.gl = this.outputCanvas.getContext('webgl2');
        if (!this.gl) {
            console.error('WebGL not supported');
            return false;
        }
        
        // Initialize shaders and buffers
        this.initShaders();
        this.initBuffers();
        this.initTextures();
        
        return true;
    }
    
    initShaders() {
        // Vertex shader
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 vUv;
            void main() {
                vUv = a_texCoord;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        
        // Fragment shader
        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D tDiffuse;
            uniform vec2 resolution;
            varying vec2 vUv;

            void main() {
                vec2 texelSize = 1.0 / resolution;

                // Get Neighbor Pixels
                vec4 color = texture2D(tDiffuse, vUv);
                vec4 colorUp = texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y));
                vec4 colorDown = texture2D(tDiffuse, vUv - vec2(0.0, texelSize.y));
                vec4 colorLeft = texture2D(tDiffuse, vUv - vec2(texelSize.x, 0.0));
                vec4 colorRight = texture2D(tDiffuse, vUv + vec2(texelSize.x, 0.0));

                // Work with edges
                float edgeStrength = 1.0 - smoothstep(0.1, 0.3, length(color.rgb - colorUp.rgb));
                edgeStrength += 1.0 - smoothstep(0.1, 0.3, length(color.rgb - colorDown.rgb));
                edgeStrength += 1.0 - smoothstep(0.1, 0.3, length(color.rgb - colorLeft.rgb));
                edgeStrength += 1.0 - smoothstep(0.1, 0.3, length(color.rgb - colorRight.rgb));
                edgeStrength = clamp(edgeStrength, 0.0, 1.0);

                // Applying edges incresing and filtering
                vec3 enhancedColor = mix(color.rgb, vec3(1.0) - (1.0 - color.rgb) * edgeStrength, 0.5);

                gl_FragColor = vec4(enhancedColor, color.a);
            }
        `;
        
        // Create shader program
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // Get attribute and uniform locations
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'resolution');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'tDiffuse');
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    initBuffers() {
        // Create a buffer for positions
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        
        // Full screen quad (2 triangles)
        const positions = [
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        
        // Create a buffer for texture coordinates
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        
        // Texture coordinates for the quad with Y-flipped to match canvas coordinates
        const texCoords = [
            0, 1,  // top-left (flipped from 0,0)
            1, 1,  // top-right (flipped from 1,0)
            0, 0,  // bottom-left (flipped from 0,1)
            0, 0,  // bottom-left (flipped from 0,1)
            1, 1,  // top-right (flipped from 1,0)
            1, 0   // bottom-right (flipped from 1,1)
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);
    }
    
    initTextures() {
        // Create texture for input canvas
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        
        // Set parameters for texture
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    }

    render() {
        if (!this.gl) return;
        
        // Update texture from input canvas
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.inputCanvas);
        
        // Set viewport and clear
        this.gl.viewport(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Use shader program
        this.gl.useProgram(this.program);
        
        // Set uniforms
        this.gl.uniform2f(this.resolutionLocation, this.inputCanvas.width, this.inputCanvas.height);
        this.gl.uniform1i(this.textureLocation, 0);
        
        // Set position attribute
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // Set texture coordinate attribute
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.enableVertexAttribArray(this.texCoordLocation);
        this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // Draw
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
    
    resize() {
        if (this.inputCanvas && this.outputCanvas) {
            this.outputCanvas.width = this.inputCanvas.width * this.options.scaleFactor;
            this.outputCanvas.height = this.inputCanvas.height * this.options.scaleFactor;
        }
    }
}

export { MiscUpscaler as UpscalerPlugin };