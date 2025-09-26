(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Konva = factory());
})(this, (function () { 'use strict';

  /*
   * Konva JavaScript Framework v9.3.22
   * http://konvajs.org/
   * Licensed under the MIT
   * Date: Tue Jul 08 2025
   *
   * Original work Copyright (C) 2011 - 2013 by Eric Rowell (KineticJS)
   * Modified work Copyright (C) 2014 - present by Anton Lavrenov (Konva)
   *
   * @license
   */
  const PI_OVER_180 = Math.PI / 180;
  /**
   * @namespace Konva
   */
  function detectBrowser() {
      return (typeof window !== 'undefined' &&
          // browser case
          ({}.toString.call(window) === '[object Window]' ||
              // electron case
              {}.toString.call(window) === '[object global]'));
  }
  const glob = typeof global !== 'undefined'
      ? global
      : typeof window !== 'undefined'
          ? window
          : typeof WorkerGlobalScope !== 'undefined'
              ? self
              : {};
  const Konva$2 = {
      _global: glob,
      version: '9.3.22',
      isBrowser: detectBrowser(),
      isUnminified: /param/.test(function (param) { }.toString()),
      dblClickWindow: 400,
      getAngle(angle) {
          return Konva$2.angleDeg ? angle * PI_OVER_180 : angle;
      },
      enableTrace: false,
      pointerEventsEnabled: true,
      /**
       * Should Konva automatically update canvas on any changes. Default is true.
       * @property autoDrawEnabled
       * @default true
       * @name autoDrawEnabled
       * @memberof Konva
       * @example
       * Konva.autoDrawEnabled = true;
       */
      autoDrawEnabled: true,
      /**
       * Should we enable hit detection while dragging? For performance reasons, by default it is false.
       * But on some rare cases you want to see hit graph and check intersections. Just set it to true.
       * @property hitOnDragEnabled
       * @default false
       * @name hitOnDragEnabled
       * @memberof Konva
       * @example
       * Konva.hitOnDragEnabled = true;
       */
      hitOnDragEnabled: false,
      /**
       * Should we capture touch events and bind them to the touchstart target? That is how it works on DOM elements.
       * The case: we touchstart on div1, then touchmove out of that element into another element div2.
       * DOM will continue trigger touchmove events on div1 (not div2). Because events are "captured" into initial target.
       * By default Konva do not do that and will trigger touchmove on another element, while pointer is moving.
       * @property capturePointerEventsEnabled
       * @default false
       * @name capturePointerEventsEnabled
       * @memberof Konva
       * @example
       * Konva.capturePointerEventsEnabled = true;
       */
      capturePointerEventsEnabled: false,
      _mouseListenClick: false,
      _touchListenClick: false,
      _pointerListenClick: false,
      _mouseInDblClickWindow: false,
      _touchInDblClickWindow: false,
      _pointerInDblClickWindow: false,
      _mouseDblClickPointerId: null,
      _touchDblClickPointerId: null,
      _pointerDblClickPointerId: null,
      _fixTextRendering: false,
      /**
       * Global pixel ratio configuration. KonvaJS automatically detect pixel ratio of current device.
       * But you may override such property, if you want to use your value. Set this value before any components initializations.
       * @property pixelRatio
       * @default undefined
       * @name pixelRatio
       * @memberof Konva
       * @example
       * // before any Konva code:
       * Konva.pixelRatio = 1;
       */
      pixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
      /**
       * Drag distance property. If you start to drag a node you may want to wait until pointer is moved to some distance from start point,
       * only then start dragging. Default is 3px.
       * @property dragDistance
       * @default 0
       * @memberof Konva
       * @example
       * Konva.dragDistance = 10;
       */
      dragDistance: 3,
      /**
       * Use degree values for angle properties. You may set this property to false if you want to use radian values.
       * @property angleDeg
       * @default true
       * @memberof Konva
       * @example
       * node.rotation(45); // 45 degrees
       * Konva.angleDeg = false;
       * node.rotation(Math.PI / 2); // PI/2 radian
       */
      angleDeg: true,
      /**
       * Show different warnings about errors or wrong API usage
       * @property showWarnings
       * @default true
       * @memberof Konva
       * @example
       * Konva.showWarnings = false;
       */
      showWarnings: true,
      /**
       * Configure what mouse buttons can be used for drag and drop.
       * Default value is [0] - only left mouse button.
       * @property dragButtons
       * @default true
       * @memberof Konva
       * @example
       * // enable left and right mouse buttons
       * Konva.dragButtons = [0, 2];
       */
      dragButtons: [0, 1],
      /**
       * returns whether or not drag and drop is currently active
       * @method
       * @memberof Konva
       */
      isDragging() {
          return Konva$2['DD'].isDragging;
      },
      isTransforming() {
          var _a;
          return (_a = Konva$2['Transformer']) === null || _a === void 0 ? void 0 : _a.isTransforming();
      },
      /**
       * returns whether or not a drag and drop operation is ready, but may
       *  not necessarily have started
       * @method
       * @memberof Konva
       */
      isDragReady() {
          return !!Konva$2['DD'].node;
      },
      /**
       * Should Konva release canvas elements on destroy. Default is true.
       * Useful to avoid memory leak issues in Safari on macOS/iOS.
       * @property releaseCanvasOnDestroy
       * @default true
       * @name releaseCanvasOnDestroy
       * @memberof Konva
       * @example
       * Konva.releaseCanvasOnDestroy = true;
       */
      releaseCanvasOnDestroy: true,
      // user agent
      document: glob.document,
      // insert Konva into global namespace (window)
      // it is required for npm packages
      _injectGlobal(Konva) {
          glob.Konva = Konva;
      },
  };
  const _registerNode = (NodeClass) => {
      Konva$2[NodeClass.prototype.getClassName()] = NodeClass;
  };
  Konva$2._injectGlobal(Konva$2);

  /*
   * Last updated November 2011
   * By Simon Sarris
   * www.simonsarris.com
   * sarris@acm.org
   *
   * Free to use and distribute at will
   * So long as you are nice to people, etc
   */
  /*
   * The usage of this class was inspired by some of the work done by a forked
   * project, KineticJS-Ext by Wappworks, which is based on Simon's Transform
   * class.  Modified by Eric Rowell
   */
  /**
   * Transform constructor.
   * In most of the cases you don't need to use it in your app. Because it is for internal usage in Konva core.
   * But there is a documentation for that class in case you still want
   * to make some manual calculations.
   * @constructor
   * @param {Array} [m] Optional six-element matrix
   * @memberof Konva
   */
  class Transform {
      constructor(m = [1, 0, 0, 1, 0, 0]) {
          this.dirty = false;
          this.m = (m && m.slice()) || [1, 0, 0, 1, 0, 0];
      }
      reset() {
          this.m[0] = 1;
          this.m[1] = 0;
          this.m[2] = 0;
          this.m[3] = 1;
          this.m[4] = 0;
          this.m[5] = 0;
      }
      /**
       * Copy Konva.Transform object
       * @method
       * @name Konva.Transform#copy
       * @returns {Konva.Transform}
       * @example
       * const tr = shape.getTransform().copy()
       */
      copy() {
          return new Transform(this.m);
      }
      copyInto(tr) {
          tr.m[0] = this.m[0];
          tr.m[1] = this.m[1];
          tr.m[2] = this.m[2];
          tr.m[3] = this.m[3];
          tr.m[4] = this.m[4];
          tr.m[5] = this.m[5];
      }
      /**
       * Transform point
       * @method
       * @name Konva.Transform#point
       * @param {Object} point 2D point(x, y)
       * @returns {Object} 2D point(x, y)
       */
      point(point) {
          const m = this.m;
          return {
              x: m[0] * point.x + m[2] * point.y + m[4],
              y: m[1] * point.x + m[3] * point.y + m[5],
          };
      }
      /**
       * Apply translation
       * @method
       * @name Konva.Transform#translate
       * @param {Number} x
       * @param {Number} y
       * @returns {Konva.Transform}
       */
      translate(x, y) {
          this.m[4] += this.m[0] * x + this.m[2] * y;
          this.m[5] += this.m[1] * x + this.m[3] * y;
          return this;
      }
      /**
       * Apply scale
       * @method
       * @name Konva.Transform#scale
       * @param {Number} sx
       * @param {Number} sy
       * @returns {Konva.Transform}
       */
      scale(sx, sy) {
          this.m[0] *= sx;
          this.m[1] *= sx;
          this.m[2] *= sy;
          this.m[3] *= sy;
          return this;
      }
      /**
       * Apply rotation
       * @method
       * @name Konva.Transform#rotate
       * @param {Number} rad  Angle in radians
       * @returns {Konva.Transform}
       */
      rotate(rad) {
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          const m11 = this.m[0] * c + this.m[2] * s;
          const m12 = this.m[1] * c + this.m[3] * s;
          const m21 = this.m[0] * -s + this.m[2] * c;
          const m22 = this.m[1] * -s + this.m[3] * c;
          this.m[0] = m11;
          this.m[1] = m12;
          this.m[2] = m21;
          this.m[3] = m22;
          return this;
      }
      /**
       * Returns the translation
       * @method
       * @name Konva.Transform#getTranslation
       * @returns {Object} 2D point(x, y)
       */
      getTranslation() {
          return {
              x: this.m[4],
              y: this.m[5],
          };
      }
      /**
       * Apply skew
       * @method
       * @name Konva.Transform#skew
       * @param {Number} sx
       * @param {Number} sy
       * @returns {Konva.Transform}
       */
      skew(sx, sy) {
          const m11 = this.m[0] + this.m[2] * sy;
          const m12 = this.m[1] + this.m[3] * sy;
          const m21 = this.m[2] + this.m[0] * sx;
          const m22 = this.m[3] + this.m[1] * sx;
          this.m[0] = m11;
          this.m[1] = m12;
          this.m[2] = m21;
          this.m[3] = m22;
          return this;
      }
      /**
       * Transform multiplication
       * @method
       * @name Konva.Transform#multiply
       * @param {Konva.Transform} matrix
       * @returns {Konva.Transform}
       */
      multiply(matrix) {
          const m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
          const m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];
          const m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
          const m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];
          const dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
          const dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];
          this.m[0] = m11;
          this.m[1] = m12;
          this.m[2] = m21;
          this.m[3] = m22;
          this.m[4] = dx;
          this.m[5] = dy;
          return this;
      }
      /**
       * Invert the matrix
       * @method
       * @name Konva.Transform#invert
       * @returns {Konva.Transform}
       */
      invert() {
          const d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
          const m0 = this.m[3] * d;
          const m1 = -this.m[1] * d;
          const m2 = -this.m[2] * d;
          const m3 = this.m[0] * d;
          const m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
          const m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
          this.m[0] = m0;
          this.m[1] = m1;
          this.m[2] = m2;
          this.m[3] = m3;
          this.m[4] = m4;
          this.m[5] = m5;
          return this;
      }
      /**
       * return matrix
       * @method
       * @name Konva.Transform#getMatrix
       */
      getMatrix() {
          return this.m;
      }
      /**
       * convert transformation matrix back into node's attributes
       * @method
       * @name Konva.Transform#decompose
       * @returns {Konva.Transform}
       */
      decompose() {
          const a = this.m[0];
          const b = this.m[1];
          const c = this.m[2];
          const d = this.m[3];
          const e = this.m[4];
          const f = this.m[5];
          const delta = a * d - b * c;
          const result = {
              x: e,
              y: f,
              rotation: 0,
              scaleX: 0,
              scaleY: 0,
              skewX: 0,
              skewY: 0,
          };
          // Apply the QR-like decomposition.
          if (a != 0 || b != 0) {
              const r = Math.sqrt(a * a + b * b);
              result.rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r);
              result.scaleX = r;
              result.scaleY = delta / r;
              result.skewX = (a * c + b * d) / delta;
              result.skewY = 0;
          }
          else if (c != 0 || d != 0) {
              const s = Math.sqrt(c * c + d * d);
              result.rotation =
                  Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s));
              result.scaleX = delta / s;
              result.scaleY = s;
              result.skewX = 0;
              result.skewY = (a * c + b * d) / delta;
          }
          else ;
          result.rotation = Util._getRotation(result.rotation);
          return result;
      }
  }
  // CONSTANTS
  const OBJECT_ARRAY = '[object Array]', OBJECT_NUMBER = '[object Number]', OBJECT_STRING = '[object String]', OBJECT_BOOLEAN = '[object Boolean]', PI_OVER_DEG180 = Math.PI / 180, DEG180_OVER_PI = 180 / Math.PI, HASH$1 = '#', EMPTY_STRING$1 = '', ZERO = '0', KONVA_WARNING = 'Konva warning: ', KONVA_ERROR = 'Konva error: ', RGB_PAREN = 'rgb(', COLORS = {
      aliceblue: [240, 248, 255],
      antiquewhite: [250, 235, 215],
      aqua: [0, 255, 255],
      aquamarine: [127, 255, 212],
      azure: [240, 255, 255],
      beige: [245, 245, 220],
      bisque: [255, 228, 196],
      black: [0, 0, 0],
      blanchedalmond: [255, 235, 205],
      blue: [0, 0, 255],
      blueviolet: [138, 43, 226],
      brown: [165, 42, 42],
      burlywood: [222, 184, 135],
      cadetblue: [95, 158, 160],
      chartreuse: [127, 255, 0],
      chocolate: [210, 105, 30],
      coral: [255, 127, 80],
      cornflowerblue: [100, 149, 237],
      cornsilk: [255, 248, 220],
      crimson: [220, 20, 60],
      cyan: [0, 255, 255],
      darkblue: [0, 0, 139],
      darkcyan: [0, 139, 139],
      darkgoldenrod: [184, 132, 11],
      darkgray: [169, 169, 169],
      darkgreen: [0, 100, 0],
      darkgrey: [169, 169, 169],
      darkkhaki: [189, 183, 107],
      darkmagenta: [139, 0, 139],
      darkolivegreen: [85, 107, 47],
      darkorange: [255, 140, 0],
      darkorchid: [153, 50, 204],
      darkred: [139, 0, 0],
      darksalmon: [233, 150, 122],
      darkseagreen: [143, 188, 143],
      darkslateblue: [72, 61, 139],
      darkslategray: [47, 79, 79],
      darkslategrey: [47, 79, 79],
      darkturquoise: [0, 206, 209],
      darkviolet: [148, 0, 211],
      deeppink: [255, 20, 147],
      deepskyblue: [0, 191, 255],
      dimgray: [105, 105, 105],
      dimgrey: [105, 105, 105],
      dodgerblue: [30, 144, 255],
      firebrick: [178, 34, 34],
      floralwhite: [255, 255, 240],
      forestgreen: [34, 139, 34],
      fuchsia: [255, 0, 255],
      gainsboro: [220, 220, 220],
      ghostwhite: [248, 248, 255],
      gold: [255, 215, 0],
      goldenrod: [218, 165, 32],
      gray: [128, 128, 128],
      green: [0, 128, 0],
      greenyellow: [173, 255, 47],
      grey: [128, 128, 128],
      honeydew: [240, 255, 240],
      hotpink: [255, 105, 180],
      indianred: [205, 92, 92],
      indigo: [75, 0, 130],
      ivory: [255, 255, 240],
      khaki: [240, 230, 140],
      lavender: [230, 230, 250],
      lavenderblush: [255, 240, 245],
      lawngreen: [124, 252, 0],
      lemonchiffon: [255, 250, 205],
      lightblue: [173, 216, 230],
      lightcoral: [240, 128, 128],
      lightcyan: [224, 255, 255],
      lightgoldenrodyellow: [250, 250, 210],
      lightgray: [211, 211, 211],
      lightgreen: [144, 238, 144],
      lightgrey: [211, 211, 211],
      lightpink: [255, 182, 193],
      lightsalmon: [255, 160, 122],
      lightseagreen: [32, 178, 170],
      lightskyblue: [135, 206, 250],
      lightslategray: [119, 136, 153],
      lightslategrey: [119, 136, 153],
      lightsteelblue: [176, 196, 222],
      lightyellow: [255, 255, 224],
      lime: [0, 255, 0],
      limegreen: [50, 205, 50],
      linen: [250, 240, 230],
      magenta: [255, 0, 255],
      maroon: [128, 0, 0],
      mediumaquamarine: [102, 205, 170],
      mediumblue: [0, 0, 205],
      mediumorchid: [186, 85, 211],
      mediumpurple: [147, 112, 219],
      mediumseagreen: [60, 179, 113],
      mediumslateblue: [123, 104, 238],
      mediumspringgreen: [0, 250, 154],
      mediumturquoise: [72, 209, 204],
      mediumvioletred: [199, 21, 133],
      midnightblue: [25, 25, 112],
      mintcream: [245, 255, 250],
      mistyrose: [255, 228, 225],
      moccasin: [255, 228, 181],
      navajowhite: [255, 222, 173],
      navy: [0, 0, 128],
      oldlace: [253, 245, 230],
      olive: [128, 128, 0],
      olivedrab: [107, 142, 35],
      orange: [255, 165, 0],
      orangered: [255, 69, 0],
      orchid: [218, 112, 214],
      palegoldenrod: [238, 232, 170],
      palegreen: [152, 251, 152],
      paleturquoise: [175, 238, 238],
      palevioletred: [219, 112, 147],
      papayawhip: [255, 239, 213],
      peachpuff: [255, 218, 185],
      peru: [205, 133, 63],
      pink: [255, 192, 203],
      plum: [221, 160, 203],
      powderblue: [176, 224, 230],
      purple: [128, 0, 128],
      rebeccapurple: [102, 51, 153],
      red: [255, 0, 0],
      rosybrown: [188, 143, 143],
      royalblue: [65, 105, 225],
      saddlebrown: [139, 69, 19],
      salmon: [250, 128, 114],
      sandybrown: [244, 164, 96],
      seagreen: [46, 139, 87],
      seashell: [255, 245, 238],
      sienna: [160, 82, 45],
      silver: [192, 192, 192],
      skyblue: [135, 206, 235],
      slateblue: [106, 90, 205],
      slategray: [119, 128, 144],
      slategrey: [119, 128, 144],
      snow: [255, 255, 250],
      springgreen: [0, 255, 127],
      steelblue: [70, 130, 180],
      tan: [210, 180, 140],
      teal: [0, 128, 128],
      thistle: [216, 191, 216],
      transparent: [255, 255, 255, 0],
      tomato: [255, 99, 71],
      turquoise: [64, 224, 208],
      violet: [238, 130, 238],
      wheat: [245, 222, 179],
      white: [255, 255, 255],
      whitesmoke: [245, 245, 245],
      yellow: [255, 255, 0],
      yellowgreen: [154, 205, 5],
  }, RGB_REGEX = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/;
  let animQueue = [];
  const req = (typeof requestAnimationFrame !== 'undefined' && requestAnimationFrame) ||
      function (f) {
          setTimeout(f, 60);
      };
  /**
   * @namespace Util
   * @memberof Konva
   */
  const Util = {
      /*
       * cherry-picked utilities from underscore.js
       */
      _isElement(obj) {
          return !!(obj && obj.nodeType == 1);
      },
      _isFunction(obj) {
          return !!(obj && obj.constructor && obj.call && obj.apply);
      },
      _isPlainObject(obj) {
          return !!obj && obj.constructor === Object;
      },
      _isArray(obj) {
          return Object.prototype.toString.call(obj) === OBJECT_ARRAY;
      },
      _isNumber(obj) {
          return (Object.prototype.toString.call(obj) === OBJECT_NUMBER &&
              !isNaN(obj) &&
              isFinite(obj));
      },
      _isString(obj) {
          return Object.prototype.toString.call(obj) === OBJECT_STRING;
      },
      _isBoolean(obj) {
          return Object.prototype.toString.call(obj) === OBJECT_BOOLEAN;
      },
      // arrays are objects too
      isObject(val) {
          return val instanceof Object;
      },
      isValidSelector(selector) {
          if (typeof selector !== 'string') {
              return false;
          }
          const firstChar = selector[0];
          return (firstChar === '#' ||
              firstChar === '.' ||
              firstChar === firstChar.toUpperCase());
      },
      _sign(number) {
          if (number === 0) {
              // that is not what sign usually returns
              // but that is what we need
              return 1;
          }
          if (number > 0) {
              return 1;
          }
          else {
              return -1;
          }
      },
      requestAnimFrame(callback) {
          animQueue.push(callback);
          if (animQueue.length === 1) {
              req(function () {
                  const queue = animQueue;
                  animQueue = [];
                  queue.forEach(function (cb) {
                      cb();
                  });
              });
          }
      },
      createCanvasElement() {
          const canvas = document.createElement('canvas');
          // on some environments canvas.style is readonly
          try {
              canvas.style = canvas.style || {};
          }
          catch (e) { }
          return canvas;
      },
      createImageElement() {
          return document.createElement('img');
      },
      _isInDocument(el) {
          while ((el = el.parentNode)) {
              if (el == document) {
                  return true;
              }
          }
          return false;
      },
      /*
       * arg can be an image object or image data
       */
      _urlToImage(url, callback) {
          // if arg is a string, then it's a data url
          const imageObj = Util.createImageElement();
          imageObj.onload = function () {
              callback(imageObj);
          };
          imageObj.src = url;
      },
      _rgbToHex(r, g, b) {
          return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      },
      _hexToRgb(hex) {
          hex = hex.replace(HASH$1, EMPTY_STRING$1);
          const bigint = parseInt(hex, 16);
          return {
              r: (bigint >> 16) & 255,
              g: (bigint >> 8) & 255,
              b: bigint & 255,
          };
      },
      /**
       * return random hex color
       * @method
       * @memberof Konva.Util
       * @example
       * shape.fill(Konva.Util.getRandomColor());
       */
      getRandomColor() {
          let randColor = ((Math.random() * 0xffffff) << 0).toString(16);
          while (randColor.length < 6) {
              randColor = ZERO + randColor;
          }
          return HASH$1 + randColor;
      },
      /**
       * get RGB components of a color
       * @method
       * @memberof Konva.Util
       * @param {String} color
       * @example
       * // each of the following examples return {r:0, g:0, b:255}
       * var rgb = Konva.Util.getRGB('blue');
       * var rgb = Konva.Util.getRGB('#0000ff');
       * var rgb = Konva.Util.getRGB('rgb(0,0,255)');
       */
      getRGB(color) {
          let rgb;
          // color string
          if (color in COLORS) {
              rgb = COLORS[color];
              return {
                  r: rgb[0],
                  g: rgb[1],
                  b: rgb[2],
              };
          }
          else if (color[0] === HASH$1) {
              // hex
              return this._hexToRgb(color.substring(1));
          }
          else if (color.substr(0, 4) === RGB_PAREN) {
              // rgb string
              rgb = RGB_REGEX.exec(color.replace(/ /g, ''));
              return {
                  r: parseInt(rgb[1], 10),
                  g: parseInt(rgb[2], 10),
                  b: parseInt(rgb[3], 10),
              };
          }
          else {
              // default
              return {
                  r: 0,
                  g: 0,
                  b: 0,
              };
          }
      },
      // convert any color string to RGBA object
      // from https://github.com/component/color-parser
      colorToRGBA(str) {
          str = str || 'black';
          return (Util._namedColorToRBA(str) ||
              Util._hex3ColorToRGBA(str) ||
              Util._hex4ColorToRGBA(str) ||
              Util._hex6ColorToRGBA(str) ||
              Util._hex8ColorToRGBA(str) ||
              Util._rgbColorToRGBA(str) ||
              Util._rgbaColorToRGBA(str) ||
              Util._hslColorToRGBA(str));
      },
      // Parse named css color. Like "green"
      _namedColorToRBA(str) {
          const c = COLORS[str.toLowerCase()];
          if (!c) {
              return null;
          }
          return {
              r: c[0],
              g: c[1],
              b: c[2],
              a: 1,
          };
      },
      // Parse rgb(n, n, n)
      _rgbColorToRGBA(str) {
          if (str.indexOf('rgb(') === 0) {
              str = str.match(/rgb\(([^)]+)\)/)[1];
              const parts = str.split(/ *, */).map(Number);
              return {
                  r: parts[0],
                  g: parts[1],
                  b: parts[2],
                  a: 1,
              };
          }
      },
      // Parse rgba(n, n, n, n)
      _rgbaColorToRGBA(str) {
          if (str.indexOf('rgba(') === 0) {
              str = str.match(/rgba\(([^)]+)\)/)[1];
              const parts = str.split(/ *, */).map((n, index) => {
                  if (n.slice(-1) === '%') {
                      return index === 3 ? parseInt(n) / 100 : (parseInt(n) / 100) * 255;
                  }
                  return Number(n);
              });
              return {
                  r: parts[0],
                  g: parts[1],
                  b: parts[2],
                  a: parts[3],
              };
          }
      },
      // Parse #nnnnnnnn
      _hex8ColorToRGBA(str) {
          if (str[0] === '#' && str.length === 9) {
              return {
                  r: parseInt(str.slice(1, 3), 16),
                  g: parseInt(str.slice(3, 5), 16),
                  b: parseInt(str.slice(5, 7), 16),
                  a: parseInt(str.slice(7, 9), 16) / 0xff,
              };
          }
      },
      // Parse #nnnnnn
      _hex6ColorToRGBA(str) {
          if (str[0] === '#' && str.length === 7) {
              return {
                  r: parseInt(str.slice(1, 3), 16),
                  g: parseInt(str.slice(3, 5), 16),
                  b: parseInt(str.slice(5, 7), 16),
                  a: 1,
              };
          }
      },
      // Parse #nnnn
      _hex4ColorToRGBA(str) {
          if (str[0] === '#' && str.length === 5) {
              return {
                  r: parseInt(str[1] + str[1], 16),
                  g: parseInt(str[2] + str[2], 16),
                  b: parseInt(str[3] + str[3], 16),
                  a: parseInt(str[4] + str[4], 16) / 0xff,
              };
          }
      },
      // Parse #nnn
      _hex3ColorToRGBA(str) {
          if (str[0] === '#' && str.length === 4) {
              return {
                  r: parseInt(str[1] + str[1], 16),
                  g: parseInt(str[2] + str[2], 16),
                  b: parseInt(str[3] + str[3], 16),
                  a: 1,
              };
          }
      },
      // Code adapted from https://github.com/Qix-/color-convert/blob/master/conversions.js#L244
      _hslColorToRGBA(str) {
          // Check hsl() format
          if (/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.test(str)) {
              // Extract h, s, l
              const [_, ...hsl] = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(str);
              const h = Number(hsl[0]) / 360;
              const s = Number(hsl[1]) / 100;
              const l = Number(hsl[2]) / 100;
              let t2;
              let t3;
              let val;
              if (s === 0) {
                  val = l * 255;
                  return {
                      r: Math.round(val),
                      g: Math.round(val),
                      b: Math.round(val),
                      a: 1,
                  };
              }
              if (l < 0.5) {
                  t2 = l * (1 + s);
              }
              else {
                  t2 = l + s - l * s;
              }
              const t1 = 2 * l - t2;
              const rgb = [0, 0, 0];
              for (let i = 0; i < 3; i++) {
                  t3 = h + (1 / 3) * -(i - 1);
                  if (t3 < 0) {
                      t3++;
                  }
                  if (t3 > 1) {
                      t3--;
                  }
                  if (6 * t3 < 1) {
                      val = t1 + (t2 - t1) * 6 * t3;
                  }
                  else if (2 * t3 < 1) {
                      val = t2;
                  }
                  else if (3 * t3 < 2) {
                      val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
                  }
                  else {
                      val = t1;
                  }
                  rgb[i] = val * 255;
              }
              return {
                  r: Math.round(rgb[0]),
                  g: Math.round(rgb[1]),
                  b: Math.round(rgb[2]),
                  a: 1,
              };
          }
      },
      /**
       * check intersection of two client rectangles
       * @method
       * @memberof Konva.Util
       * @param {Object} r1 - { x, y, width, height } client rectangle
       * @param {Object} r2 - { x, y, width, height } client rectangle
       * @example
       * const overlapping = Konva.Util.haveIntersection(shape1.getClientRect(), shape2.getClientRect());
       */
      haveIntersection(r1, r2) {
          return !(r2.x > r1.x + r1.width ||
              r2.x + r2.width < r1.x ||
              r2.y > r1.y + r1.height ||
              r2.y + r2.height < r1.y);
      },
      cloneObject(obj) {
          const retObj = {};
          for (const key in obj) {
              if (this._isPlainObject(obj[key])) {
                  retObj[key] = this.cloneObject(obj[key]);
              }
              else if (this._isArray(obj[key])) {
                  retObj[key] = this.cloneArray(obj[key]);
              }
              else {
                  retObj[key] = obj[key];
              }
          }
          return retObj;
      },
      cloneArray(arr) {
          return arr.slice(0);
      },
      degToRad(deg) {
          return deg * PI_OVER_DEG180;
      },
      radToDeg(rad) {
          return rad * DEG180_OVER_PI;
      },
      _degToRad(deg) {
          Util.warn('Util._degToRad is removed. Please use public Util.degToRad instead.');
          return Util.degToRad(deg);
      },
      _radToDeg(rad) {
          Util.warn('Util._radToDeg is removed. Please use public Util.radToDeg instead.');
          return Util.radToDeg(rad);
      },
      _getRotation(radians) {
          return Konva$2.angleDeg ? Util.radToDeg(radians) : radians;
      },
      _capitalize(str) {
          return str.charAt(0).toUpperCase() + str.slice(1);
      },
      throw(str) {
          throw new Error(KONVA_ERROR + str);
      },
      error(str) {
          console.error(KONVA_ERROR + str);
      },
      warn(str) {
          if (!Konva$2.showWarnings) {
              return;
          }
          console.warn(KONVA_WARNING + str);
      },
      each(obj, func) {
          for (const key in obj) {
              func(key, obj[key]);
          }
      },
      _inRange(val, left, right) {
          return left <= val && val < right;
      },
      _getProjectionToSegment(x1, y1, x2, y2, x3, y3) {
          let x, y, dist;
          const pd2 = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
          if (pd2 == 0) {
              x = x1;
              y = y1;
              dist = (x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2);
          }
          else {
              const u = ((x3 - x1) * (x2 - x1) + (y3 - y1) * (y2 - y1)) / pd2;
              if (u < 0) {
                  x = x1;
                  y = y1;
                  dist = (x1 - x3) * (x1 - x3) + (y1 - y3) * (y1 - y3);
              }
              else if (u > 1.0) {
                  x = x2;
                  y = y2;
                  dist = (x2 - x3) * (x2 - x3) + (y2 - y3) * (y2 - y3);
              }
              else {
                  x = x1 + u * (x2 - x1);
                  y = y1 + u * (y2 - y1);
                  dist = (x - x3) * (x - x3) + (y - y3) * (y - y3);
              }
          }
          return [x, y, dist];
      },
      // line as array of points.
      // line might be closed
      _getProjectionToLine(pt, line, isClosed) {
          const pc = Util.cloneObject(pt);
          let dist = Number.MAX_VALUE;
          line.forEach(function (p1, i) {
              if (!isClosed && i === line.length - 1) {
                  return;
              }
              const p2 = line[(i + 1) % line.length];
              const proj = Util._getProjectionToSegment(p1.x, p1.y, p2.x, p2.y, pt.x, pt.y);
              const px = proj[0], py = proj[1], pdist = proj[2];
              if (pdist < dist) {
                  pc.x = px;
                  pc.y = py;
                  dist = pdist;
              }
          });
          return pc;
      },
      _prepareArrayForTween(startArray, endArray, isClosed) {
          const start = [], end = [];
          if (startArray.length > endArray.length) {
              const temp = endArray;
              endArray = startArray;
              startArray = temp;
          }
          for (let n = 0; n < startArray.length; n += 2) {
              start.push({
                  x: startArray[n],
                  y: startArray[n + 1],
              });
          }
          for (let n = 0; n < endArray.length; n += 2) {
              end.push({
                  x: endArray[n],
                  y: endArray[n + 1],
              });
          }
          const newStart = [];
          end.forEach(function (point) {
              const pr = Util._getProjectionToLine(point, start, isClosed);
              newStart.push(pr.x);
              newStart.push(pr.y);
          });
          return newStart;
      },
      _prepareToStringify(obj) {
          let desc;
          obj.visitedByCircularReferenceRemoval = true;
          for (const key in obj) {
              if (!(obj.hasOwnProperty(key) && obj[key] && typeof obj[key] == 'object')) {
                  continue;
              }
              desc = Object.getOwnPropertyDescriptor(obj, key);
              if (obj[key].visitedByCircularReferenceRemoval ||
                  Util._isElement(obj[key])) {
                  if (desc.configurable) {
                      delete obj[key];
                  }
                  else {
                      return null;
                  }
              }
              else if (Util._prepareToStringify(obj[key]) === null) {
                  if (desc.configurable) {
                      delete obj[key];
                  }
                  else {
                      return null;
                  }
              }
          }
          delete obj.visitedByCircularReferenceRemoval;
          return obj;
      },
      // very simplified version of Object.assign
      _assign(target, source) {
          for (const key in source) {
              target[key] = source[key];
          }
          return target;
      },
      _getFirstPointerId(evt) {
          if (!evt.touches) {
              // try to use pointer id or fake id
              return evt.pointerId || 999;
          }
          else {
              return evt.changedTouches[0].identifier;
          }
      },
      releaseCanvas(...canvases) {
          if (!Konva$2.releaseCanvasOnDestroy)
              return;
          canvases.forEach((c) => {
              c.width = 0;
              c.height = 0;
          });
      },
      drawRoundedRectPath(context, width, height, cornerRadius) {
          let topLeft = 0;
          let topRight = 0;
          let bottomLeft = 0;
          let bottomRight = 0;
          if (typeof cornerRadius === 'number') {
              topLeft =
                  topRight =
                      bottomLeft =
                          bottomRight =
                              Math.min(cornerRadius, width / 2, height / 2);
          }
          else {
              topLeft = Math.min(cornerRadius[0] || 0, width / 2, height / 2);
              topRight = Math.min(cornerRadius[1] || 0, width / 2, height / 2);
              bottomRight = Math.min(cornerRadius[2] || 0, width / 2, height / 2);
              bottomLeft = Math.min(cornerRadius[3] || 0, width / 2, height / 2);
          }
          context.moveTo(topLeft, 0);
          context.lineTo(width - topRight, 0);
          context.arc(width - topRight, topRight, topRight, (Math.PI * 3) / 2, 0, false);
          context.lineTo(width, height - bottomRight);
          context.arc(width - bottomRight, height - bottomRight, bottomRight, 0, Math.PI / 2, false);
          context.lineTo(bottomLeft, height);
          context.arc(bottomLeft, height - bottomLeft, bottomLeft, Math.PI / 2, Math.PI, false);
          context.lineTo(0, topLeft);
          context.arc(topLeft, topLeft, topLeft, Math.PI, (Math.PI * 3) / 2, false);
      },
  };

  function simplifyArray(arr) {
      const retArr = [], len = arr.length, util = Util;
      for (let n = 0; n < len; n++) {
          let val = arr[n];
          if (util._isNumber(val)) {
              val = Math.round(val * 1000) / 1000;
          }
          else if (!util._isString(val)) {
              val = val + '';
          }
          retArr.push(val);
      }
      return retArr;
  }
  const COMMA = ',', OPEN_PAREN = '(', CLOSE_PAREN = ')', OPEN_PAREN_BRACKET = '([', CLOSE_BRACKET_PAREN = '])', SEMICOLON = ';', DOUBLE_PAREN = '()', 
  // EMPTY_STRING = '',
  EQUALS = '=', 
  // SET = 'set',
  CONTEXT_METHODS = [
      'arc',
      'arcTo',
      'beginPath',
      'bezierCurveTo',
      'clearRect',
      'clip',
      'closePath',
      'createLinearGradient',
      'createPattern',
      'createRadialGradient',
      'drawImage',
      'ellipse',
      'fill',
      'fillText',
      'getImageData',
      'createImageData',
      'lineTo',
      'moveTo',
      'putImageData',
      'quadraticCurveTo',
      'rect',
      'roundRect',
      'restore',
      'rotate',
      'save',
      'scale',
      'setLineDash',
      'setTransform',
      'stroke',
      'strokeText',
      'transform',
      'translate',
  ];
  const CONTEXT_PROPERTIES = [
      'fillStyle',
      'strokeStyle',
      'shadowColor',
      'shadowBlur',
      'shadowOffsetX',
      'shadowOffsetY',
      'letterSpacing',
      'lineCap',
      'lineDashOffset',
      'lineJoin',
      'lineWidth',
      'miterLimit',
      'direction',
      'font',
      'textAlign',
      'textBaseline',
      'globalAlpha',
      'globalCompositeOperation',
      'imageSmoothingEnabled',
  ];
  const traceArrMax = 100;
  /**
   * Konva wrapper around native 2d canvas context. It has almost the same API of 2d context with some additional functions.
   * With core Konva shapes you don't need to use this object. But you will use it if you want to create
   * a [custom shape](/docs/react/Custom_Shape.html) or a [custom hit regions](/docs/events/Custom_Hit_Region.html).
   * For full information about each 2d context API use [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
   * @constructor
   * @memberof Konva
   * @example
   * const rect = new Konva.Shape({
   *    fill: 'red',
   *    width: 100,
   *    height: 100,
   *    sceneFunc: (ctx, shape) => {
   *      // ctx - is context wrapper
   *      // shape - is instance of Konva.Shape, so it equals to "rect" variable
   *      ctx.rect(0, 0, shape.getAttr('width'), shape.getAttr('height'));
   *
   *      // automatically fill shape from props and draw hit region
   *      ctx.fillStrokeShape(shape);
   *    }
   * })
   */
  class Context {
      constructor(canvas) {
          this.canvas = canvas;
          if (Konva$2.enableTrace) {
              this.traceArr = [];
              this._enableTrace();
          }
      }
      /**
       * fill shape
       * @method
       * @name Konva.Context#fillShape
       * @param {Konva.Shape} shape
       */
      fillShape(shape) {
          if (shape.fillEnabled()) {
              this._fill(shape);
          }
      }
      _fill(shape) {
          // abstract
      }
      /**
       * stroke shape
       * @method
       * @name Konva.Context#strokeShape
       * @param {Konva.Shape} shape
       */
      strokeShape(shape) {
          if (shape.hasStroke()) {
              this._stroke(shape);
          }
      }
      _stroke(shape) {
          // abstract
      }
      /**
       * fill then stroke
       * @method
       * @name Konva.Context#fillStrokeShape
       * @param {Konva.Shape} shape
       */
      fillStrokeShape(shape) {
          if (shape.attrs.fillAfterStrokeEnabled) {
              this.strokeShape(shape);
              this.fillShape(shape);
          }
          else {
              this.fillShape(shape);
              this.strokeShape(shape);
          }
      }
      getTrace(relaxed, rounded) {
          let traceArr = this.traceArr, len = traceArr.length, str = '', n, trace, method, args;
          for (n = 0; n < len; n++) {
              trace = traceArr[n];
              method = trace.method;
              // methods
              if (method) {
                  args = trace.args;
                  str += method;
                  if (relaxed) {
                      str += DOUBLE_PAREN;
                  }
                  else {
                      if (Util._isArray(args[0])) {
                          str += OPEN_PAREN_BRACKET + args.join(COMMA) + CLOSE_BRACKET_PAREN;
                      }
                      else {
                          if (rounded) {
                              args = args.map((a) => typeof a === 'number' ? Math.floor(a) : a);
                          }
                          str += OPEN_PAREN + args.join(COMMA) + CLOSE_PAREN;
                      }
                  }
              }
              else {
                  // properties
                  str += trace.property;
                  if (!relaxed) {
                      str += EQUALS + trace.val;
                  }
              }
              str += SEMICOLON;
          }
          return str;
      }
      clearTrace() {
          this.traceArr = [];
      }
      _trace(str) {
          let traceArr = this.traceArr, len;
          traceArr.push(str);
          len = traceArr.length;
          if (len >= traceArrMax) {
              traceArr.shift();
          }
      }
      /**
       * reset canvas context transform
       * @method
       * @name Konva.Context#reset
       */
      reset() {
          const pixelRatio = this.getCanvas().getPixelRatio();
          this.setTransform(1 * pixelRatio, 0, 0, 1 * pixelRatio, 0, 0);
      }
      /**
       * get canvas wrapper
       * @method
       * @name Konva.Context#getCanvas
       * @returns {Konva.Canvas}
       */
      getCanvas() {
          return this.canvas;
      }
      /**
       * clear canvas
       * @method
       * @name Konva.Context#clear
       * @param {Object} [bounds]
       * @param {Number} [bounds.x]
       * @param {Number} [bounds.y]
       * @param {Number} [bounds.width]
       * @param {Number} [bounds.height]
       */
      clear(bounds) {
          const canvas = this.getCanvas();
          if (bounds) {
              this.clearRect(bounds.x || 0, bounds.y || 0, bounds.width || 0, bounds.height || 0);
          }
          else {
              this.clearRect(0, 0, canvas.getWidth() / canvas.pixelRatio, canvas.getHeight() / canvas.pixelRatio);
          }
      }
      _applyLineCap(shape) {
          const lineCap = shape.attrs.lineCap;
          if (lineCap) {
              this.setAttr('lineCap', lineCap);
          }
      }
      _applyOpacity(shape) {
          const absOpacity = shape.getAbsoluteOpacity();
          if (absOpacity !== 1) {
              this.setAttr('globalAlpha', absOpacity);
          }
      }
      _applyLineJoin(shape) {
          const lineJoin = shape.attrs.lineJoin;
          if (lineJoin) {
              this.setAttr('lineJoin', lineJoin);
          }
      }
      setAttr(attr, val) {
          this._context[attr] = val;
      }
      /**
       * arc function.
       * @method
       * @name Konva.Context#arc
       */
      arc(x, y, radius, startAngle, endAngle, counterClockwise) {
          this._context.arc(x, y, radius, startAngle, endAngle, counterClockwise);
      }
      /**
       * arcTo function.
       * @method
       * @name Konva.Context#arcTo
       *
       */
      arcTo(x1, y1, x2, y2, radius) {
          this._context.arcTo(x1, y1, x2, y2, radius);
      }
      /**
       * beginPath function.
       * @method
       * @name Konva.Context#beginPath
       */
      beginPath() {
          this._context.beginPath();
      }
      /**
       * bezierCurveTo function.
       * @method
       * @name Konva.Context#bezierCurveTo
       */
      bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
          this._context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      }
      /**
       * clearRect function.
       * @method
       * @name Konva.Context#clearRect
       */
      clearRect(x, y, width, height) {
          this._context.clearRect(x, y, width, height);
      }
      clip(...args) {
          this._context.clip.apply(this._context, args);
      }
      /**
       * closePath function.
       * @method
       * @name Konva.Context#closePath
       */
      closePath() {
          this._context.closePath();
      }
      /**
       * createImageData function.
       * @method
       * @name Konva.Context#createImageData
       */
      createImageData(width, height) {
          const a = arguments;
          if (a.length === 2) {
              return this._context.createImageData(width, height);
          }
          else if (a.length === 1) {
              return this._context.createImageData(width);
          }
      }
      /**
       * createLinearGradient function.
       * @method
       * @name Konva.Context#createLinearGradient
       */
      createLinearGradient(x0, y0, x1, y1) {
          return this._context.createLinearGradient(x0, y0, x1, y1);
      }
      /**
       * createPattern function.
       * @method
       * @name Konva.Context#createPattern
       */
      createPattern(image, repetition) {
          return this._context.createPattern(image, repetition);
      }
      /**
       * createRadialGradient function.
       * @method
       * @name Konva.Context#createRadialGradient
       */
      createRadialGradient(x0, y0, r0, x1, y1, r1) {
          return this._context.createRadialGradient(x0, y0, r0, x1, y1, r1);
      }
      /**
       * drawImage function.
       * @method
       * @name Konva.Context#drawImage
       */
      drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
          // this._context.drawImage(...arguments);
          const a = arguments, _context = this._context;
          if (a.length === 3) {
              _context.drawImage(image, sx, sy);
          }
          else if (a.length === 5) {
              _context.drawImage(image, sx, sy, sWidth, sHeight);
          }
          else if (a.length === 9) {
              _context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
          }
      }
      /**
       * ellipse function.
       * @method
       * @name Konva.Context#ellipse
       */
      ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise) {
          this._context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise);
      }
      /**
       * isPointInPath function.
       * @method
       * @name Konva.Context#isPointInPath
       */
      isPointInPath(x, y, path, fillRule) {
          if (path) {
              return this._context.isPointInPath(path, x, y, fillRule);
          }
          return this._context.isPointInPath(x, y, fillRule);
      }
      fill(...args) {
          // this._context.fill();
          this._context.fill.apply(this._context, args);
      }
      /**
       * fillRect function.
       * @method
       * @name Konva.Context#fillRect
       */
      fillRect(x, y, width, height) {
          this._context.fillRect(x, y, width, height);
      }
      /**
       * strokeRect function.
       * @method
       * @name Konva.Context#strokeRect
       */
      strokeRect(x, y, width, height) {
          this._context.strokeRect(x, y, width, height);
      }
      /**
       * fillText function.
       * @method
       * @name Konva.Context#fillText
       */
      fillText(text, x, y, maxWidth) {
          if (maxWidth) {
              this._context.fillText(text, x, y, maxWidth);
          }
          else {
              this._context.fillText(text, x, y);
          }
      }
      /**
       * measureText function.
       * @method
       * @name Konva.Context#measureText
       */
      measureText(text) {
          return this._context.measureText(text);
      }
      /**
       * getImageData function.
       * @method
       * @name Konva.Context#getImageData
       */
      getImageData(sx, sy, sw, sh) {
          return this._context.getImageData(sx, sy, sw, sh);
      }
      /**
       * lineTo function.
       * @method
       * @name Konva.Context#lineTo
       */
      lineTo(x, y) {
          this._context.lineTo(x, y);
      }
      /**
       * moveTo function.
       * @method
       * @name Konva.Context#moveTo
       */
      moveTo(x, y) {
          this._context.moveTo(x, y);
      }
      /**
       * rect function.
       * @method
       * @name Konva.Context#rect
       */
      rect(x, y, width, height) {
          this._context.rect(x, y, width, height);
      }
      /**
       * roundRect function.
       * @method
       * @name Konva.Context#roundRect
       */
      roundRect(x, y, width, height, radii) {
          this._context.roundRect(x, y, width, height, radii);
      }
      /**
       * putImageData function.
       * @method
       * @name Konva.Context#putImageData
       */
      putImageData(imageData, dx, dy) {
          this._context.putImageData(imageData, dx, dy);
      }
      /**
       * quadraticCurveTo function.
       * @method
       * @name Konva.Context#quadraticCurveTo
       */
      quadraticCurveTo(cpx, cpy, x, y) {
          this._context.quadraticCurveTo(cpx, cpy, x, y);
      }
      /**
       * restore function.
       * @method
       * @name Konva.Context#restore
       */
      restore() {
          this._context.restore();
      }
      /**
       * rotate function.
       * @method
       * @name Konva.Context#rotate
       */
      rotate(angle) {
          this._context.rotate(angle);
      }
      /**
       * save function.
       * @method
       * @name Konva.Context#save
       */
      save() {
          this._context.save();
      }
      /**
       * scale function.
       * @method
       * @name Konva.Context#scale
       */
      scale(x, y) {
          this._context.scale(x, y);
      }
      /**
       * setLineDash function.
       * @method
       * @name Konva.Context#setLineDash
       */
      setLineDash(segments) {
          // works for Chrome and IE11
          if (this._context.setLineDash) {
              this._context.setLineDash(segments);
          }
          else if ('mozDash' in this._context) {
              // verified that this works in firefox
              this._context['mozDash'] = segments;
          }
          else if ('webkitLineDash' in this._context) {
              // does not currently work for Safari
              this._context['webkitLineDash'] = segments;
          }
          // no support for IE9 and IE10
      }
      /**
       * getLineDash function.
       * @method
       * @name Konva.Context#getLineDash
       */
      getLineDash() {
          return this._context.getLineDash();
      }
      /**
       * setTransform function.
       * @method
       * @name Konva.Context#setTransform
       */
      setTransform(a, b, c, d, e, f) {
          this._context.setTransform(a, b, c, d, e, f);
      }
      /**
       * stroke function.
       * @method
       * @name Konva.Context#stroke
       */
      stroke(path2d) {
          if (path2d) {
              this._context.stroke(path2d);
          }
          else {
              this._context.stroke();
          }
      }
      /**
       * strokeText function.
       * @method
       * @name Konva.Context#strokeText
       */
      strokeText(text, x, y, maxWidth) {
          this._context.strokeText(text, x, y, maxWidth);
      }
      /**
       * transform function.
       * @method
       * @name Konva.Context#transform
       */
      transform(a, b, c, d, e, f) {
          this._context.transform(a, b, c, d, e, f);
      }
      /**
       * translate function.
       * @method
       * @name Konva.Context#translate
       */
      translate(x, y) {
          this._context.translate(x, y);
      }
      _enableTrace() {
          let that = this, len = CONTEXT_METHODS.length, origSetter = this.setAttr, n, args;
          // to prevent creating scope function at each loop
          const func = function (methodName) {
              let origMethod = that[methodName], ret;
              that[methodName] = function () {
                  args = simplifyArray(Array.prototype.slice.call(arguments, 0));
                  ret = origMethod.apply(that, arguments);
                  that._trace({
                      method: methodName,
                      args: args,
                  });
                  return ret;
              };
          };
          // methods
          for (n = 0; n < len; n++) {
              func(CONTEXT_METHODS[n]);
          }
          // attrs
          that.setAttr = function () {
              origSetter.apply(that, arguments);
              const prop = arguments[0];
              let val = arguments[1];
              if (prop === 'shadowOffsetX' ||
                  prop === 'shadowOffsetY' ||
                  prop === 'shadowBlur') {
                  val = val / this.canvas.getPixelRatio();
              }
              that._trace({
                  property: prop,
                  val: val,
              });
          };
      }
      _applyGlobalCompositeOperation(node) {
          const op = node.attrs.globalCompositeOperation;
          const def = !op || op === 'source-over';
          if (!def) {
              this.setAttr('globalCompositeOperation', op);
          }
      }
  }
  CONTEXT_PROPERTIES.forEach(function (prop) {
      Object.defineProperty(Context.prototype, prop, {
          get() {
              return this._context[prop];
          },
          set(val) {
              this._context[prop] = val;
          },
      });
  });
  class SceneContext extends Context {
      constructor(canvas, { willReadFrequently = false } = {}) {
          super(canvas);
          this._context = canvas._canvas.getContext('2d', {
              willReadFrequently,
          });
      }
      _fillColor(shape) {
          const fill = shape.fill();
          this.setAttr('fillStyle', fill);
          shape._fillFunc(this);
      }
      _fillPattern(shape) {
          this.setAttr('fillStyle', shape._getFillPattern());
          shape._fillFunc(this);
      }
      _fillLinearGradient(shape) {
          const grd = shape._getLinearGradient();
          if (grd) {
              this.setAttr('fillStyle', grd);
              shape._fillFunc(this);
          }
      }
      _fillRadialGradient(shape) {
          const grd = shape._getRadialGradient();
          if (grd) {
              this.setAttr('fillStyle', grd);
              shape._fillFunc(this);
          }
      }
      _fill(shape) {
          const hasColor = shape.fill(), fillPriority = shape.getFillPriority();
          // priority fills
          if (hasColor && fillPriority === 'color') {
              this._fillColor(shape);
              return;
          }
          const hasPattern = shape.getFillPatternImage();
          if (hasPattern && fillPriority === 'pattern') {
              this._fillPattern(shape);
              return;
          }
          const hasLinearGradient = shape.getFillLinearGradientColorStops();
          if (hasLinearGradient && fillPriority === 'linear-gradient') {
              this._fillLinearGradient(shape);
              return;
          }
          const hasRadialGradient = shape.getFillRadialGradientColorStops();
          if (hasRadialGradient && fillPriority === 'radial-gradient') {
              this._fillRadialGradient(shape);
              return;
          }
          // now just try and fill with whatever is available
          if (hasColor) {
              this._fillColor(shape);
          }
          else if (hasPattern) {
              this._fillPattern(shape);
          }
          else if (hasLinearGradient) {
              this._fillLinearGradient(shape);
          }
          else if (hasRadialGradient) {
              this._fillRadialGradient(shape);
          }
      }
      _strokeLinearGradient(shape) {
          const start = shape.getStrokeLinearGradientStartPoint(), end = shape.getStrokeLinearGradientEndPoint(), colorStops = shape.getStrokeLinearGradientColorStops(), grd = this.createLinearGradient(start.x, start.y, end.x, end.y);
          if (colorStops) {
              // build color stops
              for (let n = 0; n < colorStops.length; n += 2) {
                  grd.addColorStop(colorStops[n], colorStops[n + 1]);
              }
              this.setAttr('strokeStyle', grd);
          }
      }
      _stroke(shape) {
          const dash = shape.dash(), 
          // ignore strokeScaleEnabled for Text
          strokeScaleEnabled = shape.getStrokeScaleEnabled();
          if (shape.hasStroke()) {
              if (!strokeScaleEnabled) {
                  this.save();
                  const pixelRatio = this.getCanvas().getPixelRatio();
                  this.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
              }
              this._applyLineCap(shape);
              if (dash && shape.dashEnabled()) {
                  this.setLineDash(dash);
                  this.setAttr('lineDashOffset', shape.dashOffset());
              }
              this.setAttr('lineWidth', shape.strokeWidth());
              if (!shape.getShadowForStrokeEnabled()) {
                  this.setAttr('shadowColor', 'rgba(0,0,0,0)');
              }
              const hasLinearGradient = shape.getStrokeLinearGradientColorStops();
              if (hasLinearGradient) {
                  this._strokeLinearGradient(shape);
              }
              else {
                  this.setAttr('strokeStyle', shape.stroke());
              }
              shape._strokeFunc(this);
              if (!strokeScaleEnabled) {
                  this.restore();
              }
          }
      }
      _applyShadow(shape) {
          var _a, _b, _c;
          const color = (_a = shape.getShadowRGBA()) !== null && _a !== void 0 ? _a : 'black', blur = (_b = shape.getShadowBlur()) !== null && _b !== void 0 ? _b : 5, offset = (_c = shape.getShadowOffset()) !== null && _c !== void 0 ? _c : {
              x: 0,
              y: 0,
          }, scale = shape.getAbsoluteScale(), ratio = this.canvas.getPixelRatio(), scaleX = scale.x * ratio, scaleY = scale.y * ratio;
          this.setAttr('shadowColor', color);
          this.setAttr('shadowBlur', blur * Math.min(Math.abs(scaleX), Math.abs(scaleY)));
          this.setAttr('shadowOffsetX', offset.x * scaleX);
          this.setAttr('shadowOffsetY', offset.y * scaleY);
      }
  }
  class HitContext extends Context {
      constructor(canvas) {
          super(canvas);
          this._context = canvas._canvas.getContext('2d', {
              willReadFrequently: true,
          });
      }
      _fill(shape) {
          this.save();
          this.setAttr('fillStyle', shape.colorKey);
          shape._fillFuncHit(this);
          this.restore();
      }
      strokeShape(shape) {
          if (shape.hasHitStroke()) {
              this._stroke(shape);
          }
      }
      _stroke(shape) {
          if (shape.hasHitStroke()) {
              // ignore strokeScaleEnabled for Text
              const strokeScaleEnabled = shape.getStrokeScaleEnabled();
              if (!strokeScaleEnabled) {
                  this.save();
                  const pixelRatio = this.getCanvas().getPixelRatio();
                  this.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
              }
              this._applyLineCap(shape);
              const hitStrokeWidth = shape.hitStrokeWidth();
              const strokeWidth = hitStrokeWidth === 'auto' ? shape.strokeWidth() : hitStrokeWidth;
              this.setAttr('lineWidth', strokeWidth);
              this.setAttr('strokeStyle', shape.colorKey);
              shape._strokeFuncHit(this);
              if (!strokeScaleEnabled) {
                  this.restore();
              }
          }
      }
  }

  // calculate pixel ratio
  let _pixelRatio;
  function getDevicePixelRatio() {
      if (_pixelRatio) {
          return _pixelRatio;
      }
      const canvas = Util.createCanvasElement();
      const context = canvas.getContext('2d');
      _pixelRatio = (function () {
          const devicePixelRatio = Konva$2._global.devicePixelRatio || 1, backingStoreRatio = context.webkitBackingStorePixelRatio ||
              context.mozBackingStorePixelRatio ||
              context.msBackingStorePixelRatio ||
              context.oBackingStorePixelRatio ||
              context.backingStorePixelRatio ||
              1;
          return devicePixelRatio / backingStoreRatio;
      })();
      Util.releaseCanvas(canvas);
      return _pixelRatio;
  }
  /**
   * Canvas Renderer constructor. It is a wrapper around native canvas element.
   * Usually you don't need to use it manually.
   * @constructor
   * @abstract
   * @memberof Konva
   * @param {Object} config
   * @param {Number} config.width
   * @param {Number} config.height
   * @param {Number} config.pixelRatio
   */
  class Canvas {
      constructor(config) {
          this.pixelRatio = 1;
          this.width = 0;
          this.height = 0;
          this.isCache = false;
          const conf = config || {};
          const pixelRatio = conf.pixelRatio || Konva$2.pixelRatio || getDevicePixelRatio();
          this.pixelRatio = pixelRatio;
          this._canvas = Util.createCanvasElement();
          // set inline styles
          this._canvas.style.padding = '0';
          this._canvas.style.margin = '0';
          this._canvas.style.border = '0';
          this._canvas.style.background = 'transparent';
          this._canvas.style.position = 'absolute';
          this._canvas.style.top = '0';
          this._canvas.style.left = '0';
      }
      /**
       * get canvas context
       * @method
       * @name Konva.Canvas#getContext
       * @returns {CanvasContext} context
       */
      getContext() {
          return this.context;
      }
      /**
       * get pixel ratio
       * @method
       * @name Konva.Canvas#getPixelRatio
       * @returns {Number} pixel ratio
       * @example
       * var pixelRatio = layer.getCanvas.getPixelRatio();
       */
      getPixelRatio() {
          return this.pixelRatio;
      }
      /**
       * set pixel ratio
       * KonvaJS automatically handles pixel ratio adustments in order to render crisp drawings
       *  on all devices. Most desktops, low end tablets, and low end phones, have device pixel ratios
       *  of 1.  Some high end tablets and phones, like iPhones and iPads have a device pixel ratio
       *  of 2.  Some Macbook Pros, and iMacs also have a device pixel ratio of 2.  Some high end Android devices have pixel
       *  ratios of 2 or 3.  Some browsers like Firefox allow you to configure the pixel ratio of the viewport.  Unless otherwise
       *  specificed, the pixel ratio will be defaulted to the actual device pixel ratio.  You can override the device pixel
       *  ratio for special situations, or, if you don't want the pixel ratio to be taken into account, you can set it to 1.
       * @method
       * @name Konva.Canvas#setPixelRatio
       * @param {Number} pixelRatio
       * @example
       * layer.getCanvas().setPixelRatio(3);
       */
      setPixelRatio(pixelRatio) {
          const previousRatio = this.pixelRatio;
          this.pixelRatio = pixelRatio;
          this.setSize(this.getWidth() / previousRatio, this.getHeight() / previousRatio);
      }
      setWidth(width) {
          // take into account pixel ratio
          this.width = this._canvas.width = width * this.pixelRatio;
          this._canvas.style.width = width + 'px';
          const pixelRatio = this.pixelRatio, _context = this.getContext()._context;
          _context.scale(pixelRatio, pixelRatio);
      }
      setHeight(height) {
          // take into account pixel ratio
          this.height = this._canvas.height = height * this.pixelRatio;
          this._canvas.style.height = height + 'px';
          const pixelRatio = this.pixelRatio, _context = this.getContext()._context;
          _context.scale(pixelRatio, pixelRatio);
      }
      getWidth() {
          return this.width;
      }
      getHeight() {
          return this.height;
      }
      setSize(width, height) {
          this.setWidth(width || 0);
          this.setHeight(height || 0);
      }
      /**
       * to data url
       * @method
       * @name Konva.Canvas#toDataURL
       * @param {String} mimeType
       * @param {Number} quality between 0 and 1 for jpg mime types
       * @returns {String} data url string
       */
      toDataURL(mimeType, quality) {
          try {
              // If this call fails (due to browser bug, like in Firefox 3.6),
              // then revert to previous no-parameter image/png behavior
              return this._canvas.toDataURL(mimeType, quality);
          }
          catch (e) {
              try {
                  return this._canvas.toDataURL();
              }
              catch (err) {
                  Util.error('Unable to get data URL. ' +
                      err.message +
                      ' For more info read https://konvajs.org/docs/posts/Tainted_Canvas.html.');
                  return '';
              }
          }
      }
  }
  class SceneCanvas extends Canvas {
      constructor(config = { width: 0, height: 0, willReadFrequently: false }) {
          super(config);
          this.context = new SceneContext(this, {
              willReadFrequently: config.willReadFrequently,
          });
          this.setSize(config.width, config.height);
      }
  }
  class HitCanvas extends Canvas {
      constructor(config = { width: 0, height: 0 }) {
          super(config);
          this.hitCanvas = true;
          this.context = new HitContext(this);
          this.setSize(config.width, config.height);
      }
  }

  const DD = {
      get isDragging() {
          let flag = false;
          DD._dragElements.forEach((elem) => {
              if (elem.dragStatus === 'dragging') {
                  flag = true;
              }
          });
          return flag;
      },
      justDragged: false,
      get node() {
          // return first dragging node
          let node;
          DD._dragElements.forEach((elem) => {
              node = elem.node;
          });
          return node;
      },
      _dragElements: new Map(),
      // methods
      _drag(evt) {
          const nodesToFireEvents = [];
          DD._dragElements.forEach((elem, key) => {
              const { node } = elem;
              // we need to find pointer relative to that node
              const stage = node.getStage();
              stage.setPointersPositions(evt);
              // it is possible that user call startDrag without any event
              // it that case we need to detect first movable pointer and attach it into the node
              if (elem.pointerId === undefined) {
                  elem.pointerId = Util._getFirstPointerId(evt);
              }
              const pos = stage._changedPointerPositions.find((pos) => pos.id === elem.pointerId);
              // not related pointer
              if (!pos) {
                  return;
              }
              if (elem.dragStatus !== 'dragging') {
                  const dragDistance = node.dragDistance();
                  const distance = Math.max(Math.abs(pos.x - elem.startPointerPos.x), Math.abs(pos.y - elem.startPointerPos.y));
                  if (distance < dragDistance) {
                      return;
                  }
                  node.startDrag({ evt });
                  // a user can stop dragging inside `dragstart`
                  if (!node.isDragging()) {
                      return;
                  }
              }
              node._setDragPosition(evt, elem);
              nodesToFireEvents.push(node);
          });
          // call dragmove only after ALL positions are changed
          nodesToFireEvents.forEach((node) => {
              node.fire('dragmove', {
                  type: 'dragmove',
                  target: node,
                  evt: evt,
              }, true);
          });
      },
      // dragBefore and dragAfter allows us to set correct order of events
      // setup all in dragbefore, and stop dragging only after pointerup triggered.
      _endDragBefore(evt) {
          const drawNodes = [];
          DD._dragElements.forEach((elem) => {
              const { node } = elem;
              // we need to find pointer relative to that node
              const stage = node.getStage();
              if (evt) {
                  stage.setPointersPositions(evt);
              }
              const pos = stage._changedPointerPositions.find((pos) => pos.id === elem.pointerId);
              // that pointer is not related
              if (!pos) {
                  return;
              }
              if (elem.dragStatus === 'dragging' || elem.dragStatus === 'stopped') {
                  // if a node is stopped manually we still need to reset events:
                  DD.justDragged = true;
                  Konva$2._mouseListenClick = false;
                  Konva$2._touchListenClick = false;
                  Konva$2._pointerListenClick = false;
                  elem.dragStatus = 'stopped';
              }
              const drawNode = elem.node.getLayer() ||
                  (elem.node instanceof Konva$2['Stage'] && elem.node);
              if (drawNode && drawNodes.indexOf(drawNode) === -1) {
                  drawNodes.push(drawNode);
              }
          });
          // draw in a sync way
          // because mousemove event may trigger BEFORE batch draw is called
          // but as we have not hit canvas updated yet, it will trigger incorrect mouseover/mouseout events
          drawNodes.forEach((drawNode) => {
              drawNode.draw();
          });
      },
      _endDragAfter(evt) {
          DD._dragElements.forEach((elem, key) => {
              if (elem.dragStatus === 'stopped') {
                  elem.node.fire('dragend', {
                      type: 'dragend',
                      target: elem.node,
                      evt: evt,
                  }, true);
              }
              if (elem.dragStatus !== 'dragging') {
                  DD._dragElements.delete(key);
              }
          });
      },
  };
  if (Konva$2.isBrowser) {
      window.addEventListener('mouseup', DD._endDragBefore, true);
      window.addEventListener('touchend', DD._endDragBefore, true);
      // add touchcancel to fix this: https://github.com/konvajs/konva/issues/1843
      window.addEventListener('touchcancel', DD._endDragBefore, true);
      window.addEventListener('mousemove', DD._drag);
      window.addEventListener('touchmove', DD._drag);
      window.addEventListener('mouseup', DD._endDragAfter, false);
      window.addEventListener('touchend', DD._endDragAfter, false);
      window.addEventListener('touchcancel', DD._endDragAfter, false);
  }

  function _formatValue(val) {
      if (Util._isString(val)) {
          return '"' + val + '"';
      }
      if (Object.prototype.toString.call(val) === '[object Number]') {
          return val;
      }
      if (Util._isBoolean(val)) {
          return val;
      }
      return Object.prototype.toString.call(val);
  }
  function RGBComponent(val) {
      if (val > 255) {
          return 255;
      }
      else if (val < 0) {
          return 0;
      }
      return Math.round(val);
  }
  function getNumberValidator() {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              if (!Util._isNumber(val)) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be a number.');
              }
              return val;
          };
      }
  }
  function getNumberOrArrayOfNumbersValidator(noOfElements) {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              let isNumber = Util._isNumber(val);
              let isValidArray = Util._isArray(val) && val.length == noOfElements;
              if (!isNumber && !isValidArray) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be a number or Array<number>(' +
                      noOfElements +
                      ')');
              }
              return val;
          };
      }
  }
  function getNumberOrAutoValidator() {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              const isNumber = Util._isNumber(val);
              const isAuto = val === 'auto';
              if (!(isNumber || isAuto)) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be a number or "auto".');
              }
              return val;
          };
      }
  }
  function getStringValidator() {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              if (!Util._isString(val)) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be a string.');
              }
              return val;
          };
      }
  }
  function getStringOrGradientValidator() {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              const isString = Util._isString(val);
              const isGradient = Object.prototype.toString.call(val) === '[object CanvasGradient]' ||
                  (val && val['addColorStop']);
              if (!(isString || isGradient)) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be a string or a native gradient.');
              }
              return val;
          };
      }
  }
  function getNumberArrayValidator() {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              // Retrieve TypedArray constructor as found in MDN (if TypedArray is available)
              // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#description
              const TypedArray = Int8Array ? Object.getPrototypeOf(Int8Array) : null;
              if (TypedArray && val instanceof TypedArray) {
                  return val;
              }
              if (!Util._isArray(val)) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be a array of numbers.');
              }
              else {
                  val.forEach(function (item) {
                      if (!Util._isNumber(item)) {
                          Util.warn('"' +
                              attr +
                              '" attribute has non numeric element ' +
                              item +
                              '. Make sure that all elements are numbers.');
                      }
                  });
              }
              return val;
          };
      }
  }
  function getBooleanValidator() {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              const isBool = val === true || val === false;
              if (!isBool) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be a boolean.');
              }
              return val;
          };
      }
  }
  function getComponentValidator(components) {
      if (Konva$2.isUnminified) {
          return function (val, attr) {
              // ignore validation on undefined value, because it will reset to defalt
              if (val === undefined || val === null) {
                  return val;
              }
              if (!Util.isObject(val)) {
                  Util.warn(_formatValue(val) +
                      ' is a not valid value for "' +
                      attr +
                      '" attribute. The value should be an object with properties ' +
                      components);
              }
              return val;
          };
      }
  }

  const GET = 'get';
  const SET$1 = 'set';
  const Factory = {
      addGetterSetter(constructor, attr, def, validator, after) {
          Factory.addGetter(constructor, attr, def);
          Factory.addSetter(constructor, attr, validator, after);
          Factory.addOverloadedGetterSetter(constructor, attr);
      },
      addGetter(constructor, attr, def) {
          const method = GET + Util._capitalize(attr);
          constructor.prototype[method] =
              constructor.prototype[method] ||
                  function () {
                      const val = this.attrs[attr];
                      return val === undefined ? def : val;
                  };
      },
      addSetter(constructor, attr, validator, after) {
          const method = SET$1 + Util._capitalize(attr);
          if (!constructor.prototype[method]) {
              Factory.overWriteSetter(constructor, attr, validator, after);
          }
      },
      overWriteSetter(constructor, attr, validator, after) {
          const method = SET$1 + Util._capitalize(attr);
          constructor.prototype[method] = function (val) {
              if (validator && val !== undefined && val !== null) {
                  val = validator.call(this, val, attr);
              }
              this._setAttr(attr, val);
              if (after) {
                  after.call(this);
              }
              return this;
          };
      },
      addComponentsGetterSetter(constructor, attr, components, validator, after) {
          const len = components.length, capitalize = Util._capitalize, getter = GET + capitalize(attr), setter = SET$1 + capitalize(attr);
          // getter
          constructor.prototype[getter] = function () {
              const ret = {};
              for (let n = 0; n < len; n++) {
                  const component = components[n];
                  ret[component] = this.getAttr(attr + capitalize(component));
              }
              return ret;
          };
          const basicValidator = getComponentValidator(components);
          // setter
          constructor.prototype[setter] = function (val) {
              const oldVal = this.attrs[attr];
              if (validator) {
                  val = validator.call(this, val, attr);
              }
              if (basicValidator) {
                  basicValidator.call(this, val, attr);
              }
              for (const key in val) {
                  if (!val.hasOwnProperty(key)) {
                      continue;
                  }
                  this._setAttr(attr + capitalize(key), val[key]);
              }
              if (!val) {
                  components.forEach((component) => {
                      this._setAttr(attr + capitalize(component), undefined);
                  });
              }
              this._fireChangeEvent(attr, oldVal, val);
              if (after) {
                  after.call(this);
              }
              return this;
          };
          Factory.addOverloadedGetterSetter(constructor, attr);
      },
      addOverloadedGetterSetter(constructor, attr) {
          const capitalizedAttr = Util._capitalize(attr), setter = SET$1 + capitalizedAttr, getter = GET + capitalizedAttr;
          constructor.prototype[attr] = function () {
              // setting
              if (arguments.length) {
                  this[setter](arguments[0]);
                  return this;
              }
              // getting
              return this[getter]();
          };
      },
      addDeprecatedGetterSetter(constructor, attr, def, validator) {
          Util.error('Adding deprecated ' + attr);
          const method = GET + Util._capitalize(attr);
          const message = attr +
              ' property is deprecated and will be removed soon. Look at Konva change log for more information.';
          constructor.prototype[method] = function () {
              Util.error(message);
              const val = this.attrs[attr];
              return val === undefined ? def : val;
          };
          Factory.addSetter(constructor, attr, validator, function () {
              Util.error(message);
          });
          Factory.addOverloadedGetterSetter(constructor, attr);
      },
      backCompat(constructor, methods) {
          Util.each(methods, function (oldMethodName, newMethodName) {
              const method = constructor.prototype[newMethodName];
              const oldGetter = GET + Util._capitalize(oldMethodName);
              const oldSetter = SET$1 + Util._capitalize(oldMethodName);
              function deprecated() {
                  method.apply(this, arguments);
                  Util.error('"' +
                      oldMethodName +
                      '" method is deprecated and will be removed soon. Use ""' +
                      newMethodName +
                      '" instead.');
              }
              constructor.prototype[oldMethodName] = deprecated;
              constructor.prototype[oldGetter] = deprecated;
              constructor.prototype[oldSetter] = deprecated;
          });
      },
      afterSetFilter() {
          this._filterUpToDate = false;
      },
  };

  // CONSTANTS
  const ABSOLUTE_OPACITY = 'absoluteOpacity', ALL_LISTENERS = 'allEventListeners', ABSOLUTE_TRANSFORM = 'absoluteTransform', ABSOLUTE_SCALE = 'absoluteScale', CANVAS = 'canvas', CHANGE = 'Change', CHILDREN = 'children', KONVA = 'konva', LISTENING = 'listening', MOUSEENTER$1 = 'mouseenter', MOUSELEAVE$1 = 'mouseleave', POINTERENTER$1 = 'pointerenter', POINTERLEAVE$1 = 'pointerleave', TOUCHENTER = 'touchenter', TOUCHLEAVE = 'touchleave', SET = 'set', SHAPE = 'Shape', SPACE$1 = ' ', STAGE$1 = 'stage', TRANSFORM = 'transform', UPPER_STAGE = 'Stage', VISIBLE = 'visible', TRANSFORM_CHANGE_STR$1 = [
      'xChange.konva',
      'yChange.konva',
      'scaleXChange.konva',
      'scaleYChange.konva',
      'skewXChange.konva',
      'skewYChange.konva',
      'rotationChange.konva',
      'offsetXChange.konva',
      'offsetYChange.konva',
      'transformsEnabledChange.konva',
  ].join(SPACE$1);
  let idCounter$1 = 1;
  /**
   * Node constructor. Nodes are entities that can be transformed, layered,
   * and have bound events. The stage, layers, groups, and shapes all extend Node.
   * @constructor
   * @memberof Konva
   * @param {Object} config
   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   */
  class Node {
      constructor(config) {
          this._id = idCounter$1++;
          this.eventListeners = {};
          this.attrs = {};
          this.index = 0;
          this._allEventListeners = null;
          this.parent = null;
          this._cache = new Map();
          this._attachedDepsListeners = new Map();
          this._lastPos = null;
          this._batchingTransformChange = false;
          this._needClearTransformCache = false;
          this._filterUpToDate = false;
          this._isUnderCache = false;
          this._dragEventId = null;
          this._shouldFireChangeEvents = false;
          // on initial set attrs wi don't need to fire change events
          // because nobody is listening to them yet
          this.setAttrs(config);
          this._shouldFireChangeEvents = true;
          // all change event listeners are attached to the prototype
      }
      hasChildren() {
          return false;
      }
      _clearCache(attr) {
          // if we want to clear transform cache
          // we don't really need to remove it from the cache
          // but instead mark as "dirty"
          // so we don't need to create a new instance next time
          if ((attr === TRANSFORM || attr === ABSOLUTE_TRANSFORM) &&
              this._cache.get(attr)) {
              this._cache.get(attr).dirty = true;
          }
          else if (attr) {
              this._cache.delete(attr);
          }
          else {
              this._cache.clear();
          }
      }
      _getCache(attr, privateGetter) {
          let cache = this._cache.get(attr);
          // for transform the cache can be NOT empty
          // but we still need to recalculate it if it is dirty
          const isTransform = attr === TRANSFORM || attr === ABSOLUTE_TRANSFORM;
          const invalid = cache === undefined || (isTransform && cache.dirty === true);
          // if not cached, we need to set it using the private getter method.
          if (invalid) {
              cache = privateGetter.call(this);
              this._cache.set(attr, cache);
          }
          return cache;
      }
      _calculate(name, deps, getter) {
          // if we are trying to calculate function for the first time
          // we need to attach listeners for change events
          if (!this._attachedDepsListeners.get(name)) {
              const depsString = deps.map((dep) => dep + 'Change.konva').join(SPACE$1);
              this.on(depsString, () => {
                  this._clearCache(name);
              });
              this._attachedDepsListeners.set(name, true);
          }
          // just use cache function
          return this._getCache(name, getter);
      }
      _getCanvasCache() {
          return this._cache.get(CANVAS);
      }
      /*
       * when the logic for a cached result depends on ancestor propagation, use this
       * method to clear self and children cache
       */
      _clearSelfAndDescendantCache(attr) {
          this._clearCache(attr);
          // trigger clear cache, so transformer can use it
          if (attr === ABSOLUTE_TRANSFORM) {
              this.fire('absoluteTransformChange');
          }
      }
      /**
       * clear cached canvas
       * @method
       * @name Konva.Node#clearCache
       * @returns {Konva.Node}
       * @example
       * node.clearCache();
       */
      clearCache() {
          if (this._cache.has(CANVAS)) {
              const { scene, filter, hit, buffer } = this._cache.get(CANVAS);
              Util.releaseCanvas(scene, filter, hit, buffer);
              this._cache.delete(CANVAS);
          }
          this._clearSelfAndDescendantCache();
          this._requestDraw();
          return this;
      }
      /**
       *  cache node to improve drawing performance, apply filters, or create more accurate
       *  hit regions. For all basic shapes size of cache canvas will be automatically detected.
       *  If you need to cache your custom `Konva.Shape` instance you have to pass shape's bounding box
       *  properties. Look at [https://konvajs.org/docs/performance/Shape_Caching.html](https://konvajs.org/docs/performance/Shape_Caching.html) for more information.
       * @method
       * @name Konva.Node#cache
       * @param {Object} [config]
       * @param {Number} [config.x]
       * @param {Number} [config.y]
       * @param {Number} [config.width]
       * @param {Number} [config.height]
       * @param {Number} [config.offset]  increase canvas size by `offset` pixel in all directions.
       * @param {Boolean} [config.drawBorder] when set to true, a red border will be drawn around the cached
       *  region for debugging purposes
       * @param {Number} [config.pixelRatio] change quality (or pixel ratio) of cached image. pixelRatio = 2 will produce 2x sized cache.
       * @param {Boolean} [config.imageSmoothingEnabled] control imageSmoothingEnabled property of created canvas for cache
       * @param {Number} [config.hitCanvasPixelRatio] change quality (or pixel ratio) of cached hit canvas.
       * @returns {Konva.Node}
       * @example
       * // cache a shape with the x,y position of the bounding box at the center and
       * // the width and height of the bounding box equal to the width and height of
       * // the shape obtained from shape.width() and shape.height()
       * image.cache();
       *
       * // cache a node and define the bounding box position and size
       * node.cache({
       *   x: -30,
       *   y: -30,
       *   width: 100,
       *   height: 200
       * });
       *
       * // cache a node and draw a red border around the bounding box
       * // for debugging purposes
       * node.cache({
       *   x: -30,
       *   y: -30,
       *   width: 100,
       *   height: 200,
       *   offset : 10,
       *   drawBorder: true
       * });
       */
      cache(config) {
          const conf = config || {};
          let rect = {};
          // don't call getClientRect if we have all attributes
          // it means call it only if have one undefined
          if (conf.x === undefined ||
              conf.y === undefined ||
              conf.width === undefined ||
              conf.height === undefined) {
              rect = this.getClientRect({
                  skipTransform: true,
                  relativeTo: this.getParent() || undefined,
              });
          }
          let width = Math.ceil(conf.width || rect.width), height = Math.ceil(conf.height || rect.height), pixelRatio = conf.pixelRatio, x = conf.x === undefined ? Math.floor(rect.x) : conf.x, y = conf.y === undefined ? Math.floor(rect.y) : conf.y, offset = conf.offset || 0, drawBorder = conf.drawBorder || false, hitCanvasPixelRatio = conf.hitCanvasPixelRatio || 1;
          if (!width || !height) {
              Util.error('Can not cache the node. Width or height of the node equals 0. Caching is skipped.');
              return;
          }
          // because using Math.floor on x, y position may shift drawing
          // to avoid shift we need to increase size
          // but we better to avoid it, for better filters flows
          const extraPaddingX = Math.abs(Math.round(rect.x) - x) > 0.5 ? 1 : 0;
          const extraPaddingY = Math.abs(Math.round(rect.y) - y) > 0.5 ? 1 : 0;
          width += offset * 2 + extraPaddingX;
          height += offset * 2 + extraPaddingY;
          x -= offset;
          y -= offset;
          // if (Math.floor(x) < x) {
          //   x = Math.floor(x);
          //   // width += 1;
          // }
          // if (Math.floor(y) < y) {
          //   y = Math.floor(y);
          //   // height += 1;
          // }
          // console.log({ x, y, width, height }, rect);
          const cachedSceneCanvas = new SceneCanvas({
              pixelRatio: pixelRatio,
              width: width,
              height: height,
          }), cachedFilterCanvas = new SceneCanvas({
              pixelRatio: pixelRatio,
              width: 0,
              height: 0,
              willReadFrequently: true,
          }), cachedHitCanvas = new HitCanvas({
              pixelRatio: hitCanvasPixelRatio,
              width: width,
              height: height,
          }), sceneContext = cachedSceneCanvas.getContext(), hitContext = cachedHitCanvas.getContext();
          const bufferCanvas = new SceneCanvas({
              // width and height already multiplied by pixelRatio
              // so we need to revert that
              // also increase size by x nd y offset to make sure content fits canvas
              width: cachedSceneCanvas.width / cachedSceneCanvas.pixelRatio + Math.abs(x),
              height: cachedSceneCanvas.height / cachedSceneCanvas.pixelRatio + Math.abs(y),
              pixelRatio: cachedSceneCanvas.pixelRatio,
          }), bufferContext = bufferCanvas.getContext();
          cachedHitCanvas.isCache = true;
          cachedSceneCanvas.isCache = true;
          this._cache.delete(CANVAS);
          this._filterUpToDate = false;
          if (conf.imageSmoothingEnabled === false) {
              cachedSceneCanvas.getContext()._context.imageSmoothingEnabled = false;
              cachedFilterCanvas.getContext()._context.imageSmoothingEnabled = false;
          }
          sceneContext.save();
          hitContext.save();
          bufferContext.save();
          sceneContext.translate(-x, -y);
          hitContext.translate(-x, -y);
          bufferContext.translate(-x, -y);
          // hard-code offset to make sure content fits canvas
          // @ts-ignore
          bufferCanvas.x = x;
          // @ts-ignore
          bufferCanvas.y = y;
          // extra flag to skip on getAbsolute opacity calc
          this._isUnderCache = true;
          this._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
          this._clearSelfAndDescendantCache(ABSOLUTE_SCALE);
          this.drawScene(cachedSceneCanvas, this, bufferCanvas);
          this.drawHit(cachedHitCanvas, this);
          this._isUnderCache = false;
          sceneContext.restore();
          hitContext.restore();
          // this will draw a red border around the cached box for
          // debugging purposes
          if (drawBorder) {
              sceneContext.save();
              sceneContext.beginPath();
              sceneContext.rect(0, 0, width, height);
              sceneContext.closePath();
              sceneContext.setAttr('strokeStyle', 'red');
              sceneContext.setAttr('lineWidth', 5);
              sceneContext.stroke();
              sceneContext.restore();
          }
          this._cache.set(CANVAS, {
              scene: cachedSceneCanvas,
              filter: cachedFilterCanvas,
              hit: cachedHitCanvas,
              buffer: bufferCanvas,
              x: x,
              y: y,
          });
          this._requestDraw();
          return this;
      }
      /**
       * determine if node is currently cached
       * @method
       * @name Konva.Node#isCached
       * @returns {Boolean}
       */
      isCached() {
          return this._cache.has(CANVAS);
      }
      /**
       * Return client rectangle {x, y, width, height} of node. This rectangle also include all styling (strokes, shadows, etc).
       * The purpose of the method is similar to getBoundingClientRect API of the DOM.
       * @method
       * @name Konva.Node#getClientRect
       * @param {Object} config
       * @param {Boolean} [config.skipTransform] should we apply transform to node for calculating rect?
       * @param {Boolean} [config.skipShadow] should we apply shadow to the node for calculating bound box?
       * @param {Boolean} [config.skipStroke] should we apply stroke to the node for calculating bound box?
       * @param {Object} [config.relativeTo] calculate client rect relative to one of the parents
       * @returns {Object} rect with {x, y, width, height} properties
       * @example
       * var rect = new Konva.Rect({
       *      width : 100,
       *      height : 100,
       *      x : 50,
       *      y : 50,
       *      strokeWidth : 4,
       *      stroke : 'black',
       *      offsetX : 50,
       *      scaleY : 2
       * });
       *
       * // get client rect without think off transformations (position, rotation, scale, offset, etc)
       * rect.getClientRect({ skipTransform: true});
       * // returns {
       * //     x : -2,   // two pixels for stroke / 2
       * //     y : -2,
       * //     width : 104, // increased by 4 for stroke
       * //     height : 104
       * //}
       *
       * // get client rect with transformation applied
       * rect.getClientRect();
       * // returns Object {x: -2, y: 46, width: 104, height: 208}
       */
      getClientRect(config) {
          // abstract method
          // redefine in Container and Shape
          throw new Error('abstract "getClientRect" method call');
      }
      _transformedRect(rect, top) {
          const points = [
              { x: rect.x, y: rect.y },
              { x: rect.x + rect.width, y: rect.y },
              { x: rect.x + rect.width, y: rect.y + rect.height },
              { x: rect.x, y: rect.y + rect.height },
          ];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          const trans = this.getAbsoluteTransform(top);
          points.forEach(function (point) {
              const transformed = trans.point(point);
              if (minX === undefined) {
                  minX = maxX = transformed.x;
                  minY = maxY = transformed.y;
              }
              minX = Math.min(minX, transformed.x);
              minY = Math.min(minY, transformed.y);
              maxX = Math.max(maxX, transformed.x);
              maxY = Math.max(maxY, transformed.y);
          });
          return {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
          };
      }
      _drawCachedSceneCanvas(context) {
          context.save();
          context._applyOpacity(this);
          context._applyGlobalCompositeOperation(this);
          const canvasCache = this._getCanvasCache();
          context.translate(canvasCache.x, canvasCache.y);
          const cacheCanvas = this._getCachedSceneCanvas();
          const ratio = cacheCanvas.pixelRatio;
          context.drawImage(cacheCanvas._canvas, 0, 0, cacheCanvas.width / ratio, cacheCanvas.height / ratio);
          context.restore();
      }
      _drawCachedHitCanvas(context) {
          const canvasCache = this._getCanvasCache(), hitCanvas = canvasCache.hit;
          context.save();
          context.translate(canvasCache.x, canvasCache.y);
          context.drawImage(hitCanvas._canvas, 0, 0, hitCanvas.width / hitCanvas.pixelRatio, hitCanvas.height / hitCanvas.pixelRatio);
          context.restore();
      }
      _getCachedSceneCanvas() {
          let filters = this.filters(), cachedCanvas = this._getCanvasCache(), sceneCanvas = cachedCanvas.scene, filterCanvas = cachedCanvas.filter, filterContext = filterCanvas.getContext(), len, imageData, n, filter;
          if (filters) {
              if (!this._filterUpToDate) {
                  const ratio = sceneCanvas.pixelRatio;
                  filterCanvas.setSize(sceneCanvas.width / sceneCanvas.pixelRatio, sceneCanvas.height / sceneCanvas.pixelRatio);
                  try {
                      len = filters.length;
                      filterContext.clear();
                      // copy cached canvas onto filter context
                      filterContext.drawImage(sceneCanvas._canvas, 0, 0, sceneCanvas.getWidth() / ratio, sceneCanvas.getHeight() / ratio);
                      imageData = filterContext.getImageData(0, 0, filterCanvas.getWidth(), filterCanvas.getHeight());
                      // apply filters to filter context
                      for (n = 0; n < len; n++) {
                          filter = filters[n];
                          if (typeof filter !== 'function') {
                              Util.error('Filter should be type of function, but got ' +
                                  typeof filter +
                                  ' instead. Please check correct filters');
                              continue;
                          }
                          filter.call(this, imageData);
                          filterContext.putImageData(imageData, 0, 0);
                      }
                  }
                  catch (e) {
                      Util.error('Unable to apply filter. ' +
                          e.message +
                          ' This post my help you https://konvajs.org/docs/posts/Tainted_Canvas.html.');
                  }
                  this._filterUpToDate = true;
              }
              return filterCanvas;
          }
          return sceneCanvas;
      }
      /**
       * bind events to the node. KonvaJS supports mouseover, mousemove,
       *  mouseout, mouseenter, mouseleave, mousedown, mouseup, wheel, contextmenu, click, dblclick, touchstart, touchmove,
       *  touchend, tap, dbltap, dragstart, dragmove, and dragend events.
       *  Pass in a string of events delimited by a space to bind multiple events at once
       *  such as 'mousedown mouseup mousemove'. Include a namespace to bind an
       *  event by name such as 'click.foobar'.
       * @method
       * @name Konva.Node#on
       * @param {String} evtStr e.g. 'click', 'mousedown touchstart', 'mousedown.foo touchstart.foo'
       * @param {Function} handler The handler function. The first argument of that function is event object. Event object has `target` as main target of the event, `currentTarget` as current node listener and `evt` as native browser event.
       * @returns {Konva.Node}
       * @example
       * // add click listener
       * node.on('click', function() {
       *   console.log('you clicked me!');
       * });
       *
       * // get the target node
       * node.on('click', function(evt) {
       *   console.log(evt.target);
       * });
       *
       * // stop event propagation
       * node.on('click', function(evt) {
       *   evt.cancelBubble = true;
       * });
       *
       * // bind multiple listeners
       * node.on('click touchstart', function() {
       *   console.log('you clicked/touched me!');
       * });
       *
       * // namespace listener
       * node.on('click.foo', function() {
       *   console.log('you clicked/touched me!');
       * });
       *
       * // get the event type
       * node.on('click tap', function(evt) {
       *   var eventType = evt.type;
       * });
       *
       * // get native event object
       * node.on('click tap', function(evt) {
       *   var nativeEvent = evt.evt;
       * });
       *
       * // for change events, get the old and new val
       * node.on('xChange', function(evt) {
       *   var oldVal = evt.oldVal;
       *   var newVal = evt.newVal;
       * });
       *
       * // get event targets
       * // with event delegations
       * layer.on('click', 'Group', function(evt) {
       *   var shape = evt.target;
       *   var group = evt.currentTarget;
       * });
       */
      on(evtStr, handler) {
          if (this._cache) {
              this._cache.delete(ALL_LISTENERS);
          }
          if (arguments.length === 3) {
              return this._delegate.apply(this, arguments);
          }
          const events = evtStr.split(SPACE$1);
          /*
           * loop through types and attach event listeners to
           * each one.  eg. 'click mouseover.namespace mouseout'
           * will create three event bindings
           */
          for (let n = 0; n < events.length; n++) {
              const event = events[n];
              const parts = event.split('.');
              const baseEvent = parts[0];
              const name = parts[1] || '';
              // create events array if it doesn't exist
              if (!this.eventListeners[baseEvent]) {
                  this.eventListeners[baseEvent] = [];
              }
              this.eventListeners[baseEvent].push({ name, handler });
          }
          return this;
      }
      /**
       * remove event bindings from the node. Pass in a string of
       *  event types delimmited by a space to remove multiple event
       *  bindings at once such as 'mousedown mouseup mousemove'.
       *  include a namespace to remove an event binding by name
       *  such as 'click.foobar'. If you only give a name like '.foobar',
       *  all events in that namespace will be removed.
       * @method
       * @name Konva.Node#off
       * @param {String} evtStr e.g. 'click', 'mousedown touchstart', '.foobar'
       * @returns {Konva.Node}
       * @example
       * // remove listener
       * node.off('click');
       *
       * // remove multiple listeners
       * node.off('click touchstart');
       *
       * // remove listener by name
       * node.off('click.foo');
       */
      off(evtStr, callback) {
          let events = (evtStr || '').split(SPACE$1), len = events.length, n, t, event, parts, baseEvent, name;
          this._cache && this._cache.delete(ALL_LISTENERS);
          if (!evtStr) {
              // remove all events
              for (t in this.eventListeners) {
                  this._off(t);
              }
          }
          for (n = 0; n < len; n++) {
              event = events[n];
              parts = event.split('.');
              baseEvent = parts[0];
              name = parts[1];
              if (baseEvent) {
                  if (this.eventListeners[baseEvent]) {
                      this._off(baseEvent, name, callback);
                  }
              }
              else {
                  for (t in this.eventListeners) {
                      this._off(t, name, callback);
                  }
              }
          }
          return this;
      }
      // some event aliases for third party integration like HammerJS
      dispatchEvent(evt) {
          const e = {
              target: this,
              type: evt.type,
              evt: evt,
          };
          this.fire(evt.type, e);
          return this;
      }
      addEventListener(type, handler) {
          // we have to pass native event to handler
          this.on(type, function (evt) {
              handler.call(this, evt.evt);
          });
          return this;
      }
      removeEventListener(type) {
          this.off(type);
          return this;
      }
      // like node.on
      _delegate(event, selector, handler) {
          const stopNode = this;
          this.on(event, function (evt) {
              const targets = evt.target.findAncestors(selector, true, stopNode);
              for (let i = 0; i < targets.length; i++) {
                  evt = Util.cloneObject(evt);
                  evt.currentTarget = targets[i];
                  handler.call(targets[i], evt);
              }
          });
      }
      /**
       * remove a node from parent, but don't destroy. You can reuse the node later.
       * @method
       * @name Konva.Node#remove
       * @returns {Konva.Node}
       * @example
       * node.remove();
       */
      remove() {
          if (this.isDragging()) {
              this.stopDrag();
          }
          // we can have drag element but that is not dragged yet
          // so just clear it
          DD._dragElements.delete(this._id);
          this._remove();
          return this;
      }
      _clearCaches() {
          this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
          this._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
          this._clearSelfAndDescendantCache(ABSOLUTE_SCALE);
          this._clearSelfAndDescendantCache(STAGE$1);
          this._clearSelfAndDescendantCache(VISIBLE);
          this._clearSelfAndDescendantCache(LISTENING);
      }
      _remove() {
          // every cached attr that is calculated via node tree
          // traversal must be cleared when removing a node
          this._clearCaches();
          const parent = this.getParent();
          if (parent && parent.children) {
              parent.children.splice(this.index, 1);
              parent._setChildrenIndices();
              this.parent = null;
          }
      }
      /**
       * remove and destroy a node. Kill it and delete forever! You should not reuse node after destroy().
       * If the node is a container (Group, Stage or Layer) it will destroy all children too.
       * @method
       * @name Konva.Node#destroy
       * @example
       * node.destroy();
       */
      destroy() {
          this.remove();
          this.clearCache();
          return this;
      }
      /**
       * get attr
       * @method
       * @name Konva.Node#getAttr
       * @param {String} attr
       * @returns {Integer|String|Object|Array}
       * @example
       * var x = node.getAttr('x');
       */
      getAttr(attr) {
          const method = 'get' + Util._capitalize(attr);
          if (Util._isFunction(this[method])) {
              return this[method]();
          }
          // otherwise get directly
          return this.attrs[attr];
      }
      /**
       * get ancestors
       * @method
       * @name Konva.Node#getAncestors
       * @returns {Array}
       * @example
       * shape.getAncestors().forEach(function(node) {
       *   console.log(node.getId());
       * })
       */
      getAncestors() {
          let parent = this.getParent(), ancestors = [];
          while (parent) {
              ancestors.push(parent);
              parent = parent.getParent();
          }
          return ancestors;
      }
      /**
       * get attrs object literal
       * @method
       * @name Konva.Node#getAttrs
       * @returns {Object}
       */
      getAttrs() {
          return (this.attrs || {});
      }
      /**
       * set multiple attrs at once using an object literal
       * @method
       * @name Konva.Node#setAttrs
       * @param {Object} config object containing key value pairs
       * @returns {Konva.Node}
       * @example
       * node.setAttrs({
       *   x: 5,
       *   fill: 'red'
       * });
       */
      setAttrs(config) {
          this._batchTransformChanges(() => {
              let key, method;
              if (!config) {
                  return this;
              }
              for (key in config) {
                  if (key === CHILDREN) {
                      continue;
                  }
                  method = SET + Util._capitalize(key);
                  // use setter if available
                  if (Util._isFunction(this[method])) {
                      this[method](config[key]);
                  }
                  else {
                      // otherwise set directly
                      this._setAttr(key, config[key]);
                  }
              }
          });
          return this;
      }
      /**
       * determine if node is listening for events by taking into account ancestors.
       *
       * Parent    | Self      | isListening
       * listening | listening |
       * ----------+-----------+------------
       * T         | T         | T
       * T         | F         | F
       * F         | T         | F
       * F         | F         | F
       *
       * @method
       * @name Konva.Node#isListening
       * @returns {Boolean}
       */
      isListening() {
          return this._getCache(LISTENING, this._isListening);
      }
      _isListening(relativeTo) {
          const listening = this.listening();
          if (!listening) {
              return false;
          }
          const parent = this.getParent();
          if (parent && parent !== relativeTo && this !== relativeTo) {
              return parent._isListening(relativeTo);
          }
          else {
              return true;
          }
      }
      /**
       * determine if node is visible by taking into account ancestors.
       *
       * Parent    | Self      | isVisible
       * visible   | visible   |
       * ----------+-----------+------------
       * T         | T         | T
       * T         | F         | F
       * F         | T         | F
       * F         | F         | F
       * @method
       * @name Konva.Node#isVisible
       * @returns {Boolean}
       */
      isVisible() {
          return this._getCache(VISIBLE, this._isVisible);
      }
      _isVisible(relativeTo) {
          const visible = this.visible();
          if (!visible) {
              return false;
          }
          const parent = this.getParent();
          if (parent && parent !== relativeTo && this !== relativeTo) {
              return parent._isVisible(relativeTo);
          }
          else {
              return true;
          }
      }
      shouldDrawHit(top, skipDragCheck = false) {
          if (top) {
              return this._isVisible(top) && this._isListening(top);
          }
          const layer = this.getLayer();
          let layerUnderDrag = false;
          DD._dragElements.forEach((elem) => {
              if (elem.dragStatus !== 'dragging') {
                  return;
              }
              else if (elem.node.nodeType === 'Stage') {
                  layerUnderDrag = true;
              }
              else if (elem.node.getLayer() === layer) {
                  layerUnderDrag = true;
              }
          });
          const dragSkip = !skipDragCheck &&
              !Konva$2.hitOnDragEnabled &&
              (layerUnderDrag || Konva$2.isTransforming());
          return this.isListening() && this.isVisible() && !dragSkip;
      }
      /**
       * show node. set visible = true
       * @method
       * @name Konva.Node#show
       * @returns {Konva.Node}
       */
      show() {
          this.visible(true);
          return this;
      }
      /**
       * hide node.  Hidden nodes are no longer detectable
       * @method
       * @name Konva.Node#hide
       * @returns {Konva.Node}
       */
      hide() {
          this.visible(false);
          return this;
      }
      getZIndex() {
          return this.index || 0;
      }
      /**
       * get absolute z-index which takes into account sibling
       *  and ancestor indices
       * @method
       * @name Konva.Node#getAbsoluteZIndex
       * @returns {Integer}
       */
      getAbsoluteZIndex() {
          let depth = this.getDepth(), that = this, index = 0, nodes, len, n, child;
          function addChildren(children) {
              nodes = [];
              len = children.length;
              for (n = 0; n < len; n++) {
                  child = children[n];
                  index++;
                  if (child.nodeType !== SHAPE) {
                      nodes = nodes.concat(child.getChildren().slice());
                  }
                  if (child._id === that._id) {
                      n = len;
                  }
              }
              if (nodes.length > 0 && nodes[0].getDepth() <= depth) {
                  addChildren(nodes);
              }
          }
          const stage = this.getStage();
          if (that.nodeType !== UPPER_STAGE && stage) {
              addChildren(stage.getChildren());
          }
          return index;
      }
      /**
       * get node depth in node tree.  Returns an integer.
       *  e.g. Stage depth will always be 0.  Layers will always be 1.  Groups and Shapes will always
       *  be >= 2
       * @method
       * @name Konva.Node#getDepth
       * @returns {Integer}
       */
      getDepth() {
          let depth = 0, parent = this.parent;
          while (parent) {
              depth++;
              parent = parent.parent;
          }
          return depth;
      }
      // sometimes we do several attributes changes
      // like node.position(pos)
      // for performance reasons, lets batch transform reset
      // so it work faster
      _batchTransformChanges(func) {
          this._batchingTransformChange = true;
          func();
          this._batchingTransformChange = false;
          if (this._needClearTransformCache) {
              this._clearCache(TRANSFORM);
              this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
          }
          this._needClearTransformCache = false;
      }
      setPosition(pos) {
          this._batchTransformChanges(() => {
              this.x(pos.x);
              this.y(pos.y);
          });
          return this;
      }
      getPosition() {
          return {
              x: this.x(),
              y: this.y(),
          };
      }
      /**
       * get position of first pointer (like mouse or first touch) relative to local coordinates of current node
       * @method
       * @name Konva.Node#getRelativePointerPosition
       * @returns {Konva.Node}
       * @example
       *
       * // let's think we have a rectangle at position x = 10, y = 10
       * // now we clicked at x = 15, y = 15 of the stage
       * // if you want to know position of the click, related to the rectangle you can use
       * rect.getRelativePointerPosition();
       */
      getRelativePointerPosition() {
          const stage = this.getStage();
          if (!stage) {
              return null;
          }
          // get pointer (say mouse or touch) position
          const pos = stage.getPointerPosition();
          if (!pos) {
              return null;
          }
          const transform = this.getAbsoluteTransform().copy();
          // to detect relative position we need to invert transform
          transform.invert();
          // now we can find relative point
          return transform.point(pos);
      }
      /**
       * get absolute position of a node. That function can be used to calculate absolute position, but relative to any ancestor
       * @method
       * @name Konva.Node#getAbsolutePosition
       * @param {Object} Ancestor optional ancestor node
       * @returns {Konva.Node}
       * @example
       *
       * // returns absolute position relative to top-left corner of canvas
       * node.getAbsolutePosition();
       *
       * // calculate absolute position of node, inside stage
       * // so stage transforms are ignored
       * node.getAbsolutePosition(stage)
       */
      getAbsolutePosition(top) {
          let haveCachedParent = false;
          let parent = this.parent;
          while (parent) {
              if (parent.isCached()) {
                  haveCachedParent = true;
                  break;
              }
              parent = parent.parent;
          }
          if (haveCachedParent && !top) {
              // make fake top element
              // "true" is not a node, but it will just allow skip all caching
              top = true;
          }
          const absoluteMatrix = this.getAbsoluteTransform(top).getMatrix(), absoluteTransform = new Transform(), offset = this.offset();
          // clone the matrix array
          absoluteTransform.m = absoluteMatrix.slice();
          absoluteTransform.translate(offset.x, offset.y);
          return absoluteTransform.getTranslation();
      }
      setAbsolutePosition(pos) {
          const { x, y, ...origTrans } = this._clearTransform();
          // don't clear translation
          this.attrs.x = x;
          this.attrs.y = y;
          // important, use non cached value
          this._clearCache(TRANSFORM);
          const it = this._getAbsoluteTransform().copy();
          it.invert();
          it.translate(pos.x, pos.y);
          pos = {
              x: this.attrs.x + it.getTranslation().x,
              y: this.attrs.y + it.getTranslation().y,
          };
          this._setTransform(origTrans);
          this.setPosition({ x: pos.x, y: pos.y });
          this._clearCache(TRANSFORM);
          this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
          return this;
      }
      _setTransform(trans) {
          let key;
          for (key in trans) {
              this.attrs[key] = trans[key];
          }
          // this._clearCache(TRANSFORM);
          // this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
      }
      _clearTransform() {
          const trans = {
              x: this.x(),
              y: this.y(),
              rotation: this.rotation(),
              scaleX: this.scaleX(),
              scaleY: this.scaleY(),
              offsetX: this.offsetX(),
              offsetY: this.offsetY(),
              skewX: this.skewX(),
              skewY: this.skewY(),
          };
          this.attrs.x = 0;
          this.attrs.y = 0;
          this.attrs.rotation = 0;
          this.attrs.scaleX = 1;
          this.attrs.scaleY = 1;
          this.attrs.offsetX = 0;
          this.attrs.offsetY = 0;
          this.attrs.skewX = 0;
          this.attrs.skewY = 0;
          // return original transform
          return trans;
      }
      /**
       * move node by an amount relative to its current position
       * @method
       * @name Konva.Node#move
       * @param {Object} change
       * @param {Number} change.x
       * @param {Number} change.y
       * @returns {Konva.Node}
       * @example
       * // move node in x direction by 1px and y direction by 2px
       * node.move({
       *   x: 1,
       *   y: 2
       * });
       */
      move(change) {
          let changeX = change.x, changeY = change.y, x = this.x(), y = this.y();
          if (changeX !== undefined) {
              x += changeX;
          }
          if (changeY !== undefined) {
              y += changeY;
          }
          this.setPosition({ x: x, y: y });
          return this;
      }
      _eachAncestorReverse(func, top) {
          let family = [], parent = this.getParent(), len, n;
          // if top node is defined, and this node is top node,
          // there's no need to build a family tree.  just execute
          // func with this because it will be the only node
          if (top && top._id === this._id) {
              // func(this);
              return;
          }
          family.unshift(this);
          while (parent && (!top || parent._id !== top._id)) {
              family.unshift(parent);
              parent = parent.parent;
          }
          len = family.length;
          for (n = 0; n < len; n++) {
              func(family[n]);
          }
      }
      /**
       * rotate node by an amount in degrees relative to its current rotation
       * @method
       * @name Konva.Node#rotate
       * @param {Number} theta
       * @returns {Konva.Node}
       */
      rotate(theta) {
          this.rotation(this.rotation() + theta);
          return this;
      }
      /**
       * move node to the top of its siblings
       * @method
       * @name Konva.Node#moveToTop
       * @returns {Boolean}
       */
      moveToTop() {
          if (!this.parent) {
              Util.warn('Node has no parent. moveToTop function is ignored.');
              return false;
          }
          const index = this.index, len = this.parent.getChildren().length;
          if (index < len - 1) {
              this.parent.children.splice(index, 1);
              this.parent.children.push(this);
              this.parent._setChildrenIndices();
              return true;
          }
          return false;
      }
      /**
       * move node up
       * @method
       * @name Konva.Node#moveUp
       * @returns {Boolean} flag is moved or not
       */
      moveUp() {
          if (!this.parent) {
              Util.warn('Node has no parent. moveUp function is ignored.');
              return false;
          }
          const index = this.index, len = this.parent.getChildren().length;
          if (index < len - 1) {
              this.parent.children.splice(index, 1);
              this.parent.children.splice(index + 1, 0, this);
              this.parent._setChildrenIndices();
              return true;
          }
          return false;
      }
      /**
       * move node down
       * @method
       * @name Konva.Node#moveDown
       * @returns {Boolean}
       */
      moveDown() {
          if (!this.parent) {
              Util.warn('Node has no parent. moveDown function is ignored.');
              return false;
          }
          const index = this.index;
          if (index > 0) {
              this.parent.children.splice(index, 1);
              this.parent.children.splice(index - 1, 0, this);
              this.parent._setChildrenIndices();
              return true;
          }
          return false;
      }
      /**
       * move node to the bottom of its siblings
       * @method
       * @name Konva.Node#moveToBottom
       * @returns {Boolean}
       */
      moveToBottom() {
          if (!this.parent) {
              Util.warn('Node has no parent. moveToBottom function is ignored.');
              return false;
          }
          const index = this.index;
          if (index > 0) {
              this.parent.children.splice(index, 1);
              this.parent.children.unshift(this);
              this.parent._setChildrenIndices();
              return true;
          }
          return false;
      }
      setZIndex(zIndex) {
          if (!this.parent) {
              Util.warn('Node has no parent. zIndex parameter is ignored.');
              return this;
          }
          if (zIndex < 0 || zIndex >= this.parent.children.length) {
              Util.warn('Unexpected value ' +
                  zIndex +
                  ' for zIndex property. zIndex is just index of a node in children of its parent. Expected value is from 0 to ' +
                  (this.parent.children.length - 1) +
                  '.');
          }
          const index = this.index;
          this.parent.children.splice(index, 1);
          this.parent.children.splice(zIndex, 0, this);
          this.parent._setChildrenIndices();
          return this;
      }
      /**
       * get absolute opacity
       * @method
       * @name Konva.Node#getAbsoluteOpacity
       * @returns {Number}
       */
      getAbsoluteOpacity() {
          return this._getCache(ABSOLUTE_OPACITY, this._getAbsoluteOpacity);
      }
      _getAbsoluteOpacity() {
          let absOpacity = this.opacity();
          const parent = this.getParent();
          if (parent && !parent._isUnderCache) {
              absOpacity *= parent.getAbsoluteOpacity();
          }
          return absOpacity;
      }
      /**
       * move node to another container
       * @method
       * @name Konva.Node#moveTo
       * @param {Container} newContainer
       * @returns {Konva.Node}
       * @example
       * // move node from current layer into layer2
       * node.moveTo(layer2);
       */
      moveTo(newContainer) {
          // do nothing if new container is already parent
          if (this.getParent() !== newContainer) {
              this._remove();
              newContainer.add(this);
          }
          return this;
      }
      /**
       * convert Node into an object for serialization.  Returns an object.
       * @method
       * @name Konva.Node#toObject
       * @returns {Object}
       */
      toObject() {
          let attrs = this.getAttrs(), key, val, getter, defaultValue, nonPlainObject;
          const obj = {
              attrs: {},
              className: this.getClassName(),
          };
          for (key in attrs) {
              val = attrs[key];
              // if value is object and object is not plain
              // like class instance, we should skip it and to not include
              nonPlainObject =
                  Util.isObject(val) && !Util._isPlainObject(val) && !Util._isArray(val);
              if (nonPlainObject) {
                  continue;
              }
              getter = typeof this[key] === 'function' && this[key];
              // remove attr value so that we can extract the default value from the getter
              delete attrs[key];
              defaultValue = getter ? getter.call(this) : null;
              // restore attr value
              attrs[key] = val;
              if (defaultValue !== val) {
                  obj.attrs[key] = val;
              }
          }
          return Util._prepareToStringify(obj);
      }
      /**
       * convert Node into a JSON string.  Returns a JSON string.
       * @method
       * @name Konva.Node#toJSON
       * @returns {String}
       */
      toJSON() {
          return JSON.stringify(this.toObject());
      }
      /**
       * get parent container
       * @method
       * @name Konva.Node#getParent
       * @returns {Konva.Node}
       */
      getParent() {
          return this.parent;
      }
      /**
       * get all ancestors (parent then parent of the parent, etc) of the node
       * @method
       * @name Konva.Node#findAncestors
       * @param {String} selector selector for search
       * @param {Boolean} [includeSelf] show we think that node is ancestro itself?
       * @param {Konva.Node} [stopNode] optional node where we need to stop searching (one of ancestors)
       * @returns {Array} [ancestors]
       * @example
       * // get one of the parent group
       * var parentGroups = node.findAncestors('Group');
       */
      findAncestors(selector, includeSelf, stopNode) {
          const res = [];
          if (includeSelf && this._isMatch(selector)) {
              res.push(this);
          }
          let ancestor = this.parent;
          while (ancestor) {
              if (ancestor === stopNode) {
                  return res;
              }
              if (ancestor._isMatch(selector)) {
                  res.push(ancestor);
              }
              ancestor = ancestor.parent;
          }
          return res;
      }
      isAncestorOf(node) {
          return false;
      }
      /**
       * get ancestor (parent or parent of the parent, etc) of the node that match passed selector
       * @method
       * @name Konva.Node#findAncestor
       * @param {String} selector selector for search
       * @param {Boolean} [includeSelf] show we think that node is ancestro itself?
       * @param {Konva.Node} [stopNode] optional node where we need to stop searching (one of ancestors)
       * @returns {Konva.Node} ancestor
       * @example
       * // get one of the parent group
       * var group = node.findAncestors('.mygroup');
       */
      findAncestor(selector, includeSelf, stopNode) {
          return this.findAncestors(selector, includeSelf, stopNode)[0];
      }
      // is current node match passed selector?
      _isMatch(selector) {
          if (!selector) {
              return false;
          }
          if (typeof selector === 'function') {
              return selector(this);
          }
          let selectorArr = selector.replace(/ /g, '').split(','), len = selectorArr.length, n, sel;
          for (n = 0; n < len; n++) {
              sel = selectorArr[n];
              if (!Util.isValidSelector(sel)) {
                  Util.warn('Selector "' +
                      sel +
                      '" is invalid. Allowed selectors examples are "#foo", ".bar" or "Group".');
                  Util.warn('If you have a custom shape with such className, please change it to start with upper letter like "Triangle".');
                  Util.warn('Konva is awesome, right?');
              }
              // id selector
              if (sel.charAt(0) === '#') {
                  if (this.id() === sel.slice(1)) {
                      return true;
                  }
              }
              else if (sel.charAt(0) === '.') {
                  // name selector
                  if (this.hasName(sel.slice(1))) {
                      return true;
                  }
              }
              else if (this.className === sel || this.nodeType === sel) {
                  return true;
              }
          }
          return false;
      }
      /**
       * get layer ancestor
       * @method
       * @name Konva.Node#getLayer
       * @returns {Konva.Layer}
       */
      getLayer() {
          const parent = this.getParent();
          return parent ? parent.getLayer() : null;
      }
      /**
       * get stage ancestor
       * @method
       * @name Konva.Node#getStage
       * @returns {Konva.Stage}
       */
      getStage() {
          return this._getCache(STAGE$1, this._getStage);
      }
      _getStage() {
          const parent = this.getParent();
          if (parent) {
              return parent.getStage();
          }
          else {
              return null;
          }
      }
      /**
       * fire event
       * @method
       * @name Konva.Node#fire
       * @param {String} eventType event type.  can be a regular event, like click, mouseover, or mouseout, or it can be a custom event, like myCustomEvent
       * @param {Event} [evt] event object
       * @param {Boolean} [bubble] setting the value to false, or leaving it undefined, will result in the event
       *  not bubbling.  Setting the value to true will result in the event bubbling.
       * @returns {Konva.Node}
       * @example
       * // manually fire click event
       * node.fire('click');
       *
       * // fire custom event
       * node.fire('foo');
       *
       * // fire custom event with custom event object
       * node.fire('foo', {
       *   bar: 10
       * });
       *
       * // fire click event that bubbles
       * node.fire('click', null, true);
       */
      fire(eventType, evt = {}, bubble) {
          evt.target = evt.target || this;
          // bubble
          if (bubble) {
              this._fireAndBubble(eventType, evt);
          }
          else {
              // no bubble
              this._fire(eventType, evt);
          }
          return this;
      }
      /**
       * get absolute transform of the node which takes into
       *  account its ancestor transforms
       * @method
       * @name Konva.Node#getAbsoluteTransform
       * @returns {Konva.Transform}
       */
      getAbsoluteTransform(top) {
          // if using an argument, we can't cache the result.
          if (top) {
              return this._getAbsoluteTransform(top);
          }
          else {
              // if no argument, we can cache the result
              return this._getCache(ABSOLUTE_TRANSFORM, this._getAbsoluteTransform);
          }
      }
      _getAbsoluteTransform(top) {
          let at;
          // we we need position relative to an ancestor, we will iterate for all
          if (top) {
              at = new Transform();
              // start with stage and traverse downwards to self
              this._eachAncestorReverse(function (node) {
                  const transformsEnabled = node.transformsEnabled();
                  if (transformsEnabled === 'all') {
                      at.multiply(node.getTransform());
                  }
                  else if (transformsEnabled === 'position') {
                      at.translate(node.x() - node.offsetX(), node.y() - node.offsetY());
                  }
              }, top);
              return at;
          }
          else {
              // try to use a cached value
              at = this._cache.get(ABSOLUTE_TRANSFORM) || new Transform();
              if (this.parent) {
                  // transform will be cached
                  this.parent.getAbsoluteTransform().copyInto(at);
              }
              else {
                  at.reset();
              }
              const transformsEnabled = this.transformsEnabled();
              if (transformsEnabled === 'all') {
                  at.multiply(this.getTransform());
              }
              else if (transformsEnabled === 'position') {
                  // use "attrs" directly, because it is a bit faster
                  const x = this.attrs.x || 0;
                  const y = this.attrs.y || 0;
                  const offsetX = this.attrs.offsetX || 0;
                  const offsetY = this.attrs.offsetY || 0;
                  at.translate(x - offsetX, y - offsetY);
              }
              at.dirty = false;
              return at;
          }
      }
      /**
       * get absolute scale of the node which takes into
       *  account its ancestor scales
       * @method
       * @name Konva.Node#getAbsoluteScale
       * @returns {Object}
       * @example
       * // get absolute scale x
       * var scaleX = node.getAbsoluteScale().x;
       */
      getAbsoluteScale(top) {
          // do not cache this calculations,
          // because it use cache transform
          // this is special logic for caching with some shapes with shadow
          let parent = this;
          while (parent) {
              if (parent._isUnderCache) {
                  top = parent;
              }
              parent = parent.getParent();
          }
          const transform = this.getAbsoluteTransform(top);
          const attrs = transform.decompose();
          return {
              x: attrs.scaleX,
              y: attrs.scaleY,
          };
      }
      /**
       * get absolute rotation of the node which takes into
       *  account its ancestor rotations
       * @method
       * @name Konva.Node#getAbsoluteRotation
       * @returns {Number}
       * @example
       * // get absolute rotation
       * var rotation = node.getAbsoluteRotation();
       */
      getAbsoluteRotation() {
          // var parent: Node = this;
          // var rotation = 0;
          // while (parent) {
          //   rotation += parent.rotation();
          //   parent = parent.getParent();
          // }
          // return rotation;
          return this.getAbsoluteTransform().decompose().rotation;
      }
      /**
       * get transform of the node
       * @method
       * @name Konva.Node#getTransform
       * @returns {Konva.Transform}
       */
      getTransform() {
          return this._getCache(TRANSFORM, this._getTransform);
      }
      _getTransform() {
          var _a, _b;
          const m = this._cache.get(TRANSFORM) || new Transform();
          m.reset();
          // I was trying to use attributes directly here
          // but it doesn't work for Transformer well
          // because it overwrite x,y getters
          const x = this.x(), y = this.y(), rotation = Konva$2.getAngle(this.rotation()), scaleX = (_a = this.attrs.scaleX) !== null && _a !== void 0 ? _a : 1, scaleY = (_b = this.attrs.scaleY) !== null && _b !== void 0 ? _b : 1, skewX = this.attrs.skewX || 0, skewY = this.attrs.skewY || 0, offsetX = this.attrs.offsetX || 0, offsetY = this.attrs.offsetY || 0;
          if (x !== 0 || y !== 0) {
              m.translate(x, y);
          }
          if (rotation !== 0) {
              m.rotate(rotation);
          }
          if (skewX !== 0 || skewY !== 0) {
              m.skew(skewX, skewY);
          }
          if (scaleX !== 1 || scaleY !== 1) {
              m.scale(scaleX, scaleY);
          }
          if (offsetX !== 0 || offsetY !== 0) {
              m.translate(-1 * offsetX, -1 * offsetY);
          }
          m.dirty = false;
          return m;
      }
      /**
       * clone node.  Returns a new Node instance with identical attributes.  You can also override
       *  the node properties with an object literal, enabling you to use an existing node as a template
       *  for another node
       * @method
       * @name Konva.Node#clone
       * @param {Object} obj override attrs
       * @returns {Konva.Node}
       * @example
       * // simple clone
       * var clone = node.clone();
       *
       * // clone a node and override the x position
       * var clone = rect.clone({
       *   x: 5
       * });
       */
      clone(obj) {
          // instantiate new node
          let attrs = Util.cloneObject(this.attrs), key, allListeners, len, n, listener;
          // apply attr overrides
          for (key in obj) {
              attrs[key] = obj[key];
          }
          const node = new this.constructor(attrs);
          // copy over listeners
          for (key in this.eventListeners) {
              allListeners = this.eventListeners[key];
              len = allListeners.length;
              for (n = 0; n < len; n++) {
                  listener = allListeners[n];
                  /*
                   * don't include konva namespaced listeners because
                   *  these are generated by the constructors
                   */
                  if (listener.name.indexOf(KONVA) < 0) {
                      // if listeners array doesn't exist, then create it
                      if (!node.eventListeners[key]) {
                          node.eventListeners[key] = [];
                      }
                      node.eventListeners[key].push(listener);
                  }
              }
          }
          return node;
      }
      _toKonvaCanvas(config) {
          config = config || {};
          const box = this.getClientRect();
          const stage = this.getStage(), x = config.x !== undefined ? config.x : Math.floor(box.x), y = config.y !== undefined ? config.y : Math.floor(box.y), pixelRatio = config.pixelRatio || 1, canvas = new SceneCanvas({
              width: config.width || Math.ceil(box.width) || (stage ? stage.width() : 0),
              height: config.height ||
                  Math.ceil(box.height) ||
                  (stage ? stage.height() : 0),
              pixelRatio: pixelRatio,
          }), context = canvas.getContext();
          const bufferCanvas = new SceneCanvas({
              // width and height already multiplied by pixelRatio
              // so we need to revert that
              // also increase size by x nd y offset to make sure content fits canvas
              width: canvas.width / canvas.pixelRatio + Math.abs(x),
              height: canvas.height / canvas.pixelRatio + Math.abs(y),
              pixelRatio: canvas.pixelRatio,
          });
          if (config.imageSmoothingEnabled === false) {
              context._context.imageSmoothingEnabled = false;
          }
          context.save();
          if (x || y) {
              context.translate(-1 * x, -1 * y);
          }
          this.drawScene(canvas, undefined, bufferCanvas);
          context.restore();
          return canvas;
      }
      /**
       * converts node into an canvas element.
       * @method
       * @name Konva.Node#toCanvas
       * @param {Object} config
       * @param {Function} config.callback function executed when the composite has completed
       * @param {Number} [config.x] x position of canvas section
       * @param {Number} [config.y] y position of canvas section
       * @param {Number} [config.width] width of canvas section
       * @param {Number} [config.height] height of canvas section
       * @param {Number} [config.pixelRatio] pixelRatio of output canvas. Default is 1.
       * You can use that property to increase quality of the image, for example for super hight quality exports
       * or usage on retina (or similar) displays. pixelRatio will be used to multiply the size of exported image.
       * If you export to 500x500 size with pixelRatio = 2, then produced image will have size 1000x1000.
       * @param {Boolean} [config.imageSmoothingEnabled] set this to false if you want to disable imageSmoothing
       * @example
       * var canvas = node.toCanvas();
       */
      toCanvas(config) {
          return this._toKonvaCanvas(config)._canvas;
      }
      /**
       * Creates a composite data URL (base64 string). If MIME type is not
       * specified, then "image/png" will result. For "image/jpeg", specify a quality
       * level as quality (range 0.0 - 1.0)
       * @method
       * @name Konva.Node#toDataURL
       * @param {Object} config
       * @param {String} [config.mimeType] can be "image/png" or "image/jpeg".
       *  "image/png" is the default
       * @param {Number} [config.x] x position of canvas section
       * @param {Number} [config.y] y position of canvas section
       * @param {Number} [config.width] width of canvas section
       * @param {Number} [config.height] height of canvas section
       * @param {Number} [config.quality] jpeg quality.  If using an "image/jpeg" mimeType,
       *  you can specify the quality from 0 to 1, where 0 is very poor quality and 1
       *  is very high quality
       * @param {Number} [config.pixelRatio] pixelRatio of output image url. Default is 1.
       * You can use that property to increase quality of the image, for example for super hight quality exports
       * or usage on retina (or similar) displays. pixelRatio will be used to multiply the size of exported image.
       * If you export to 500x500 size with pixelRatio = 2, then produced image will have size 1000x1000.
       * @param {Boolean} [config.imageSmoothingEnabled] set this to false if you want to disable imageSmoothing
       * @returns {String}
       */
      toDataURL(config) {
          config = config || {};
          const mimeType = config.mimeType || null, quality = config.quality || null;
          const url = this._toKonvaCanvas(config).toDataURL(mimeType, quality);
          if (config.callback) {
              config.callback(url);
          }
          return url;
      }
      /**
       * converts node into an image.  Since the toImage
       *  method is asynchronous, the resulting image can only be retrieved from the config callback
       *  or the returned Promise.  toImage is most commonly used
       *  to cache complex drawings as an image so that they don't have to constantly be redrawn
       * @method
       * @name Konva.Node#toImage
       * @param {Object} config
       * @param {Function} [config.callback] function executed when the composite has completed
       * @param {String} [config.mimeType] can be "image/png" or "image/jpeg".
       *  "image/png" is the default
       * @param {Number} [config.x] x position of canvas section
       * @param {Number} [config.y] y position of canvas section
       * @param {Number} [config.width] width of canvas section
       * @param {Number} [config.height] height of canvas section
       * @param {Number} [config.quality] jpeg quality.  If using an "image/jpeg" mimeType,
       *  you can specify the quality from 0 to 1, where 0 is very poor quality and 1
       *  is very high quality
       * @param {Number} [config.pixelRatio] pixelRatio of output image. Default is 1.
       * You can use that property to increase quality of the image, for example for super hight quality exports
       * or usage on retina (or similar) displays. pixelRatio will be used to multiply the size of exported image.
       * If you export to 500x500 size with pixelRatio = 2, then produced image will have size 1000x1000.
       * @param {Boolean} [config.imageSmoothingEnabled] set this to false if you want to disable imageSmoothing
       * @return {Promise<Image>}
       * @example
       * var image = node.toImage({
       *   callback(img) {
       *     // do stuff with img
       *   }
       * });
       */
      toImage(config) {
          return new Promise((resolve, reject) => {
              try {
                  const callback = config === null || config === void 0 ? void 0 : config.callback;
                  if (callback)
                      delete config.callback;
                  Util._urlToImage(this.toDataURL(config), function (img) {
                      resolve(img);
                      callback === null || callback === void 0 ? void 0 : callback(img);
                  });
              }
              catch (err) {
                  reject(err);
              }
          });
      }
      /**
       * Converts node into a blob.  Since the toBlob method is asynchronous,
       *  the resulting blob can only be retrieved from the config callback
       *  or the returned Promise.
       * @method
       * @name Konva.Node#toBlob
       * @param {Object} config
       * @param {Function} [config.callback] function executed when the composite has completed
       * @param {Number} [config.x] x position of canvas section
       * @param {Number} [config.y] y position of canvas section
       * @param {Number} [config.width] width of canvas section
       * @param {Number} [config.height] height of canvas section
       * @param {Number} [config.pixelRatio] pixelRatio of output canvas. Default is 1.
       * You can use that property to increase quality of the image, for example for super hight quality exports
       * or usage on retina (or similar) displays. pixelRatio will be used to multiply the size of exported image.
       * If you export to 500x500 size with pixelRatio = 2, then produced image will have size 1000x1000.
       * @param {Boolean} [config.imageSmoothingEnabled] set this to false if you want to disable imageSmoothing
       * @example
       * var blob = await node.toBlob({});
       * @returns {Promise<Blob>}
       */
      toBlob(config) {
          return new Promise((resolve, reject) => {
              try {
                  const callback = config === null || config === void 0 ? void 0 : config.callback;
                  if (callback)
                      delete config.callback;
                  this.toCanvas(config).toBlob((blob) => {
                      resolve(blob);
                      callback === null || callback === void 0 ? void 0 : callback(blob);
                  }, config === null || config === void 0 ? void 0 : config.mimeType, config === null || config === void 0 ? void 0 : config.quality);
              }
              catch (err) {
                  reject(err);
              }
          });
      }
      setSize(size) {
          this.width(size.width);
          this.height(size.height);
          return this;
      }
      getSize() {
          return {
              width: this.width(),
              height: this.height(),
          };
      }
      /**
       * get class name, which may return Stage, Layer, Group, or shape class names like Rect, Circle, Text, etc.
       * @method
       * @name Konva.Node#getClassName
       * @returns {String}
       */
      getClassName() {
          return this.className || this.nodeType;
      }
      /**
       * get the node type, which may return Stage, Layer, Group, or Shape
       * @method
       * @name Konva.Node#getType
       * @returns {String}
       */
      getType() {
          return this.nodeType;
      }
      getDragDistance() {
          // compare with undefined because we need to track 0 value
          if (this.attrs.dragDistance !== undefined) {
              return this.attrs.dragDistance;
          }
          else if (this.parent) {
              return this.parent.getDragDistance();
          }
          else {
              return Konva$2.dragDistance;
          }
      }
      _off(type, name, callback) {
          let evtListeners = this.eventListeners[type], i, evtName, handler;
          for (i = 0; i < evtListeners.length; i++) {
              evtName = evtListeners[i].name;
              handler = evtListeners[i].handler;
              // the following two conditions must be true in order to remove a handler:
              // 1) the current event name cannot be konva unless the event name is konva
              //    this enables developers to force remove a konva specific listener for whatever reason
              // 2) an event name is not specified, or if one is specified, it matches the current event name
              if ((evtName !== 'konva' || name === 'konva') &&
                  (!name || evtName === name) &&
                  (!callback || callback === handler)) {
                  evtListeners.splice(i, 1);
                  if (evtListeners.length === 0) {
                      delete this.eventListeners[type];
                      break;
                  }
                  i--;
              }
          }
      }
      _fireChangeEvent(attr, oldVal, newVal) {
          this._fire(attr + CHANGE, {
              oldVal: oldVal,
              newVal: newVal,
          });
      }
      /**
       * add name to node
       * @method
       * @name Konva.Node#addName
       * @param {String} name
       * @returns {Konva.Node}
       * @example
       * node.name('red');
       * node.addName('selected');
       * node.name(); // return 'red selected'
       */
      addName(name) {
          if (!this.hasName(name)) {
              const oldName = this.name();
              const newName = oldName ? oldName + ' ' + name : name;
              this.name(newName);
          }
          return this;
      }
      /**
       * check is node has name
       * @method
       * @name Konva.Node#hasName
       * @param {String} name
       * @returns {Boolean}
       * @example
       * node.name('red');
       * node.hasName('red');   // return true
       * node.hasName('selected'); // return false
       * node.hasName(''); // return false
       */
      hasName(name) {
          if (!name) {
              return false;
          }
          const fullName = this.name();
          if (!fullName) {
              return false;
          }
          // if name is '' the "names" will be [''], so I added extra check above
          const names = (fullName || '').split(/\s/g);
          return names.indexOf(name) !== -1;
      }
      /**
       * remove name from node
       * @method
       * @name Konva.Node#removeName
       * @param {String} name
       * @returns {Konva.Node}
       * @example
       * node.name('red selected');
       * node.removeName('selected');
       * node.hasName('selected'); // return false
       * node.name(); // return 'red'
       */
      removeName(name) {
          const names = (this.name() || '').split(/\s/g);
          const index = names.indexOf(name);
          if (index !== -1) {
              names.splice(index, 1);
              this.name(names.join(' '));
          }
          return this;
      }
      /**
       * set attr
       * @method
       * @name Konva.Node#setAttr
       * @param {String} attr
       * @param {*} val
       * @returns {Konva.Node}
       * @example
       * node.setAttr('x', 5);
       */
      setAttr(attr, val) {
          const func = this[SET + Util._capitalize(attr)];
          if (Util._isFunction(func)) {
              func.call(this, val);
          }
          else {
              // otherwise set directly
              this._setAttr(attr, val);
          }
          return this;
      }
      _requestDraw() {
          if (Konva$2.autoDrawEnabled) {
              const drawNode = this.getLayer() || this.getStage();
              drawNode === null || drawNode === void 0 ? void 0 : drawNode.batchDraw();
          }
      }
      _setAttr(key, val) {
          const oldVal = this.attrs[key];
          if (oldVal === val && !Util.isObject(val)) {
              return;
          }
          if (val === undefined || val === null) {
              delete this.attrs[key];
          }
          else {
              this.attrs[key] = val;
          }
          if (this._shouldFireChangeEvents) {
              this._fireChangeEvent(key, oldVal, val);
          }
          this._requestDraw();
      }
      _setComponentAttr(key, component, val) {
          let oldVal;
          if (val !== undefined) {
              oldVal = this.attrs[key];
              if (!oldVal) {
                  // set value to default value using getAttr
                  this.attrs[key] = this.getAttr(key);
              }
              this.attrs[key][component] = val;
              this._fireChangeEvent(key, oldVal, val);
          }
      }
      _fireAndBubble(eventType, evt, compareShape) {
          if (evt && this.nodeType === SHAPE) {
              evt.target = this;
          }
          const nonBubbling = [
              MOUSEENTER$1,
              MOUSELEAVE$1,
              POINTERENTER$1,
              POINTERLEAVE$1,
              TOUCHENTER,
              TOUCHLEAVE,
          ];
          const shouldStop = nonBubbling.indexOf(eventType) !== -1 &&
              ((compareShape &&
                  (this === compareShape ||
                      (this.isAncestorOf && this.isAncestorOf(compareShape)))) ||
                  (this.nodeType === 'Stage' && !compareShape));
          if (!shouldStop) {
              this._fire(eventType, evt);
              // simulate event bubbling
              const stopBubble = nonBubbling.indexOf(eventType) !== -1 &&
                  compareShape &&
                  compareShape.isAncestorOf &&
                  compareShape.isAncestorOf(this) &&
                  !compareShape.isAncestorOf(this.parent);
              if (((evt && !evt.cancelBubble) || !evt) &&
                  this.parent &&
                  this.parent.isListening() &&
                  !stopBubble) {
                  if (compareShape && compareShape.parent) {
                      this._fireAndBubble.call(this.parent, eventType, evt, compareShape);
                  }
                  else {
                      this._fireAndBubble.call(this.parent, eventType, evt);
                  }
              }
          }
      }
      _getProtoListeners(eventType) {
          var _a, _b, _c;
          const allListeners = (_a = this._cache.get(ALL_LISTENERS)) !== null && _a !== void 0 ? _a : {};
          let events = allListeners === null || allListeners === void 0 ? void 0 : allListeners[eventType];
          if (events === undefined) {
              //recalculate cache
              events = [];
              let obj = Object.getPrototypeOf(this);
              while (obj) {
                  const hierarchyEvents = (_c = (_b = obj.eventListeners) === null || _b === void 0 ? void 0 : _b[eventType]) !== null && _c !== void 0 ? _c : [];
                  events.push(...hierarchyEvents);
                  obj = Object.getPrototypeOf(obj);
              }
              // update cache
              allListeners[eventType] = events;
              this._cache.set(ALL_LISTENERS, allListeners);
          }
          return events;
      }
      _fire(eventType, evt) {
          evt = evt || {};
          evt.currentTarget = this;
          evt.type = eventType;
          const topListeners = this._getProtoListeners(eventType);
          if (topListeners) {
              for (let i = 0; i < topListeners.length; i++) {
                  topListeners[i].handler.call(this, evt);
              }
          }
          // it is important to iterate over self listeners without cache
          // because events can be added/removed while firing
          const selfListeners = this.eventListeners[eventType];
          if (selfListeners) {
              for (let i = 0; i < selfListeners.length; i++) {
                  selfListeners[i].handler.call(this, evt);
              }
          }
      }
      /**
       * draw both scene and hit graphs.  If the node being drawn is the stage, all of the layers will be cleared and redrawn
       * @method
       * @name Konva.Node#draw
       * @returns {Konva.Node}
       */
      draw() {
          this.drawScene();
          this.drawHit();
          return this;
      }
      // drag & drop
      _createDragElement(evt) {
          const pointerId = evt ? evt.pointerId : undefined;
          const stage = this.getStage();
          const ap = this.getAbsolutePosition();
          if (!stage) {
              return;
          }
          const pos = stage._getPointerById(pointerId) ||
              stage._changedPointerPositions[0] ||
              ap;
          DD._dragElements.set(this._id, {
              node: this,
              startPointerPos: pos,
              offset: {
                  x: pos.x - ap.x,
                  y: pos.y - ap.y,
              },
              dragStatus: 'ready',
              pointerId,
          });
      }
      /**
       * initiate drag and drop.
       * @method
       * @name Konva.Node#startDrag
       */
      startDrag(evt, bubbleEvent = true) {
          if (!DD._dragElements.has(this._id)) {
              this._createDragElement(evt);
          }
          const elem = DD._dragElements.get(this._id);
          elem.dragStatus = 'dragging';
          this.fire('dragstart', {
              type: 'dragstart',
              target: this,
              evt: evt && evt.evt,
          }, bubbleEvent);
      }
      _setDragPosition(evt, elem) {
          // const pointers = this.getStage().getPointersPositions();
          // const pos = pointers.find(p => p.id === this._dragEventId);
          const pos = this.getStage()._getPointerById(elem.pointerId);
          if (!pos) {
              return;
          }
          let newNodePos = {
              x: pos.x - elem.offset.x,
              y: pos.y - elem.offset.y,
          };
          const dbf = this.dragBoundFunc();
          if (dbf !== undefined) {
              const bounded = dbf.call(this, newNodePos, evt);
              if (!bounded) {
                  Util.warn('dragBoundFunc did not return any value. That is unexpected behavior. You must return new absolute position from dragBoundFunc.');
              }
              else {
                  newNodePos = bounded;
              }
          }
          if (!this._lastPos ||
              this._lastPos.x !== newNodePos.x ||
              this._lastPos.y !== newNodePos.y) {
              this.setAbsolutePosition(newNodePos);
              this._requestDraw();
          }
          this._lastPos = newNodePos;
      }
      /**
       * stop drag and drop
       * @method
       * @name Konva.Node#stopDrag
       */
      stopDrag(evt) {
          const elem = DD._dragElements.get(this._id);
          if (elem) {
              elem.dragStatus = 'stopped';
          }
          DD._endDragBefore(evt);
          DD._endDragAfter(evt);
      }
      setDraggable(draggable) {
          this._setAttr('draggable', draggable);
          this._dragChange();
      }
      /**
       * determine if node is currently in drag and drop mode
       * @method
       * @name Konva.Node#isDragging
       */
      isDragging() {
          const elem = DD._dragElements.get(this._id);
          return elem ? elem.dragStatus === 'dragging' : false;
      }
      _listenDrag() {
          this._dragCleanup();
          this.on('mousedown.konva touchstart.konva', function (evt) {
              const shouldCheckButton = evt.evt['button'] !== undefined;
              const canDrag = !shouldCheckButton || Konva$2.dragButtons.indexOf(evt.evt['button']) >= 0;
              if (!canDrag) {
                  return;
              }
              if (this.isDragging()) {
                  return;
              }
              let hasDraggingChild = false;
              DD._dragElements.forEach((elem) => {
                  if (this.isAncestorOf(elem.node)) {
                      hasDraggingChild = true;
                  }
              });
              // nested drag can be started
              // in that case we don't need to start new drag
              if (!hasDraggingChild) {
                  this._createDragElement(evt);
              }
          });
      }
      _dragChange() {
          if (this.attrs.draggable) {
              this._listenDrag();
          }
          else {
              // remove event listeners
              this._dragCleanup();
              /*
               * force drag and drop to end
               * if this node is currently in
               * drag and drop mode
               */
              const stage = this.getStage();
              if (!stage) {
                  return;
              }
              const dragElement = DD._dragElements.get(this._id);
              const isDragging = dragElement && dragElement.dragStatus === 'dragging';
              const isReady = dragElement && dragElement.dragStatus === 'ready';
              if (isDragging) {
                  this.stopDrag();
              }
              else if (isReady) {
                  DD._dragElements.delete(this._id);
              }
          }
      }
      _dragCleanup() {
          this.off('mousedown.konva');
          this.off('touchstart.konva');
      }
      /**
       * determine if node (at least partially) is currently in user-visible area
       * @method
       * @param {(Number | Object)} margin optional margin in pixels
       * @param {Number} margin.x
       * @param {Number} margin.y
       * @returns {Boolean}
       * @name Konva.Node#isClientRectOnScreen
       * @example
       * // get index
       * // default calculations
       * var isOnScreen = node.isClientRectOnScreen()
       * // increase object size (or screen size) for cases when objects close to the screen still need to be marked as "visible"
       * var isOnScreen = node.isClientRectOnScreen({ x: stage.width(), y: stage.height() })
       */
      isClientRectOnScreen(margin = { x: 0, y: 0 }) {
          const stage = this.getStage();
          if (!stage) {
              return false;
          }
          const screenRect = {
              x: -margin.x,
              y: -margin.y,
              width: stage.width() + 2 * margin.x,
              height: stage.height() + 2 * margin.y,
          };
          return Util.haveIntersection(screenRect, this.getClientRect());
      }
      /**
       * create node with JSON string or an Object.  De-serializtion does not generate custom
       *  shape drawing functions, images, or event handlers (this would make the
       *  serialized object huge).  If your app uses custom shapes, images, and
       *  event handlers (it probably does), then you need to select the appropriate
       *  shapes after loading the stage and set these properties via on(), setSceneFunc(),
       *  and setImage() methods
       * @method
       * @memberof Konva.Node
       * @param {String|Object} json string or object
       * @param {Element} [container] optional container dom element used only if you're
       *  creating a stage node
       */
      static create(data, container) {
          if (Util._isString(data)) {
              data = JSON.parse(data);
          }
          return this._createNode(data, container);
      }
      static _createNode(obj, container) {
          let className = Node.prototype.getClassName.call(obj), children = obj.children, no, len, n;
          // if container was passed in, add it to attrs
          if (container) {
              obj.attrs.container = container;
          }
          if (!Konva$2[className]) {
              Util.warn('Can not find a node with class name "' +
                  className +
                  '". Fallback to "Shape".');
              className = 'Shape';
          }
          const Class = Konva$2[className];
          no = new Class(obj.attrs);
          if (children) {
              len = children.length;
              for (n = 0; n < len; n++) {
                  no.add(Node._createNode(children[n]));
              }
          }
          return no;
      }
  }
  Node.prototype.nodeType = 'Node';
  Node.prototype._attrsAffectingSize = [];
  // attache events listeners once into prototype
  // that way we don't spend too much time on making an new instance
  Node.prototype.eventListeners = {};
  Node.prototype.on.call(Node.prototype, TRANSFORM_CHANGE_STR$1, function () {
      if (this._batchingTransformChange) {
          this._needClearTransformCache = true;
          return;
      }
      this._clearCache(TRANSFORM);
      this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
  });
  Node.prototype.on.call(Node.prototype, 'visibleChange.konva', function () {
      this._clearSelfAndDescendantCache(VISIBLE);
  });
  Node.prototype.on.call(Node.prototype, 'listeningChange.konva', function () {
      this._clearSelfAndDescendantCache(LISTENING);
  });
  Node.prototype.on.call(Node.prototype, 'opacityChange.konva', function () {
      this._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
  });
  const addGetterSetter = Factory.addGetterSetter;
  /**
   * get/set zIndex relative to the node's siblings who share the same parent.
   * Please remember that zIndex is not absolute (like in CSS). It is relative to parent element only.
   * @name Konva.Node#zIndex
   * @method
   * @param {Number} index
   * @returns {Number}
   * @example
   * // get index
   * var index = node.zIndex();
   *
   * // set index
   * node.zIndex(2);
   */
  addGetterSetter(Node, 'zIndex');
  /**
   * get/set node absolute position
   * @name Konva.Node#absolutePosition
   * @method
   * @param {Object} pos
   * @param {Number} pos.x
   * @param {Number} pos.y
   * @returns {Object}
   * @example
   * // get position
   * var position = node.absolutePosition();
   *
   * // set position
   * node.absolutePosition({
   *   x: 5,
   *   y: 10
   * });
   */
  addGetterSetter(Node, 'absolutePosition');
  addGetterSetter(Node, 'position');
  /**
   * get/set node position relative to parent
   * @name Konva.Node#position
   * @method
   * @param {Object} pos
   * @param {Number} pos.x
   * @param {Number} pos.y
   * @returns {Object}
   * @example
   * // get position
   * var position = node.position();
   *
   * // set position
   * node.position({
   *   x: 5,
   *   y: 10
   * });
   */
  addGetterSetter(Node, 'x', 0, getNumberValidator());
  /**
   * get/set x position
   * @name Konva.Node#x
   * @method
   * @param {Number} x
   * @returns {Object}
   * @example
   * // get x
   * var x = node.x();
   *
   * // set x
   * node.x(5);
   */
  addGetterSetter(Node, 'y', 0, getNumberValidator());
  /**
   * get/set y position
   * @name Konva.Node#y
   * @method
   * @param {Number} y
   * @returns {Integer}
   * @example
   * // get y
   * var y = node.y();
   *
   * // set y
   * node.y(5);
   */
  addGetterSetter(Node, 'globalCompositeOperation', 'source-over', getStringValidator());
  /**
   * get/set globalCompositeOperation of a node. globalCompositeOperation DOESN'T affect hit graph of nodes. So they are still trigger to events as they have default "source-over" globalCompositeOperation.
   * @name Konva.Node#globalCompositeOperation
   * @method
   * @param {String} type
   * @returns {String}
   * @example
   * // get globalCompositeOperation
   * var globalCompositeOperation = shape.globalCompositeOperation();
   *
   * // set globalCompositeOperation
   * shape.globalCompositeOperation('source-in');
   */
  addGetterSetter(Node, 'opacity', 1, getNumberValidator());
  /**
   * get/set opacity.  Opacity values range from 0 to 1.
   *  A node with an opacity of 0 is fully transparent, and a node
   *  with an opacity of 1 is fully opaque
   * @name Konva.Node#opacity
   * @method
   * @param {Object} opacity
   * @returns {Number}
   * @example
   * // get opacity
   * var opacity = node.opacity();
   *
   * // set opacity
   * node.opacity(0.5);
   */
  addGetterSetter(Node, 'name', '', getStringValidator());
  /**
   * get/set name.
   * @name Konva.Node#name
   * @method
   * @param {String} name
   * @returns {String}
   * @example
   * // get name
   * var name = node.name();
   *
   * // set name
   * node.name('foo');
   *
   * // also node may have multiple names (as css classes)
   * node.name('foo bar');
   */
  addGetterSetter(Node, 'id', '', getStringValidator());
  /**
   * get/set id. Id is global for whole page.
   * @name Konva.Node#id
   * @method
   * @param {String} id
   * @returns {String}
   * @example
   * // get id
   * var name = node.id();
   *
   * // set id
   * node.id('foo');
   */
  addGetterSetter(Node, 'rotation', 0, getNumberValidator());
  /**
   * get/set rotation in degrees
   * @name Konva.Node#rotation
   * @method
   * @param {Number} rotation
   * @returns {Number}
   * @example
   * // get rotation in degrees
   * var rotation = node.rotation();
   *
   * // set rotation in degrees
   * node.rotation(45);
   */
  Factory.addComponentsGetterSetter(Node, 'scale', ['x', 'y']);
  /**
   * get/set scale
   * @name Konva.Node#scale
   * @param {Object} scale
   * @param {Number} scale.x
   * @param {Number} scale.y
   * @method
   * @returns {Object}
   * @example
   * // get scale
   * var scale = node.scale();
   *
   * // set scale
   * shape.scale({
   *   x: 2,
   *   y: 3
   * });
   */
  addGetterSetter(Node, 'scaleX', 1, getNumberValidator());
  /**
   * get/set scale x
   * @name Konva.Node#scaleX
   * @param {Number} x
   * @method
   * @returns {Number}
   * @example
   * // get scale x
   * var scaleX = node.scaleX();
   *
   * // set scale x
   * node.scaleX(2);
   */
  addGetterSetter(Node, 'scaleY', 1, getNumberValidator());
  /**
   * get/set scale y
   * @name Konva.Node#scaleY
   * @param {Number} y
   * @method
   * @returns {Number}
   * @example
   * // get scale y
   * var scaleY = node.scaleY();
   *
   * // set scale y
   * node.scaleY(2);
   */
  Factory.addComponentsGetterSetter(Node, 'skew', ['x', 'y']);
  /**
   * get/set skew
   * @name Konva.Node#skew
   * @param {Object} skew
   * @param {Number} skew.x
   * @param {Number} skew.y
   * @method
   * @returns {Object}
   * @example
   * // get skew
   * var skew = node.skew();
   *
   * // set skew
   * node.skew({
   *   x: 20,
   *   y: 10
   * });
   */
  addGetterSetter(Node, 'skewX', 0, getNumberValidator());
  /**
   * get/set skew x
   * @name Konva.Node#skewX
   * @param {Number} x
   * @method
   * @returns {Number}
   * @example
   * // get skew x
   * var skewX = node.skewX();
   *
   * // set skew x
   * node.skewX(3);
   */
  addGetterSetter(Node, 'skewY', 0, getNumberValidator());
  /**
   * get/set skew y
   * @name Konva.Node#skewY
   * @param {Number} y
   * @method
   * @returns {Number}
   * @example
   * // get skew y
   * var skewY = node.skewY();
   *
   * // set skew y
   * node.skewY(3);
   */
  Factory.addComponentsGetterSetter(Node, 'offset', ['x', 'y']);
  /**
   * get/set offset.  Offsets the default position and rotation point
   * @method
   * @param {Object} offset
   * @param {Number} offset.x
   * @param {Number} offset.y
   * @returns {Object}
   * @example
   * // get offset
   * var offset = node.offset();
   *
   * // set offset
   * node.offset({
   *   x: 20,
   *   y: 10
   * });
   */
  addGetterSetter(Node, 'offsetX', 0, getNumberValidator());
  /**
   * get/set offset x
   * @name Konva.Node#offsetX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get offset x
   * var offsetX = node.offsetX();
   *
   * // set offset x
   * node.offsetX(3);
   */
  addGetterSetter(Node, 'offsetY', 0, getNumberValidator());
  /**
   * get/set offset y
   * @name Konva.Node#offsetY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get offset y
   * var offsetY = node.offsetY();
   *
   * // set offset y
   * node.offsetY(3);
   */
  addGetterSetter(Node, 'dragDistance', undefined, getNumberValidator());
  /**
   * get/set drag distance
   * @name Konva.Node#dragDistance
   * @method
   * @param {Number} distance
   * @returns {Number}
   * @example
   * // get drag distance
   * var dragDistance = node.dragDistance();
   *
   * // set distance
   * // node starts dragging only if pointer moved more then 3 pixels
   * node.dragDistance(3);
   * // or set globally
   * Konva.dragDistance = 3;
   */
  addGetterSetter(Node, 'width', 0, getNumberValidator());
  /**
   * get/set width
   * @name Konva.Node#width
   * @method
   * @param {Number} width
   * @returns {Number}
   * @example
   * // get width
   * var width = node.width();
   *
   * // set width
   * node.width(100);
   */
  addGetterSetter(Node, 'height', 0, getNumberValidator());
  /**
   * get/set height
   * @name Konva.Node#height
   * @method
   * @param {Number} height
   * @returns {Number}
   * @example
   * // get height
   * var height = node.height();
   *
   * // set height
   * node.height(100);
   */
  addGetterSetter(Node, 'listening', true, getBooleanValidator());
  /**
   * get/set listening attr.  If you need to determine if a node is listening or not
   *   by taking into account its parents, use the isListening() method
   *   nodes with listening set to false will not be detected in hit graph
   *   so they will be ignored in container.getIntersection() method
   * @name Konva.Node#listening
   * @method
   * @param {Boolean} listening Can be true, or false.  The default is true.
   * @returns {Boolean}
   * @example
   * // get listening attr
   * var listening = node.listening();
   *
   * // stop listening for events, remove node and all its children from hit graph
   * node.listening(false);
   *
   * // listen to events according to the parent
   * node.listening(true);
   */
  /**
   * get/set preventDefault
   * By default all shapes will prevent default behavior
   * of a browser on a pointer move or tap.
   * that will prevent native scrolling when you are trying to drag&drop a node
   * but sometimes you may need to enable default actions
   * in that case you can set the property to false
   * @name Konva.Node#preventDefault
   * @method
   * @param {Boolean} preventDefault
   * @returns {Boolean}
   * @example
   * // get preventDefault
   * var shouldPrevent = shape.preventDefault();
   *
   * // set preventDefault
   * shape.preventDefault(false);
   */
  addGetterSetter(Node, 'preventDefault', true, getBooleanValidator());
  addGetterSetter(Node, 'filters', undefined, function (val) {
      this._filterUpToDate = false;
      return val;
  });
  /**
   * get/set filters.  Filters are applied to cached canvases
   * @name Konva.Node#filters
   * @method
   * @param {Array} filters array of filters
   * @returns {Array}
   * @example
   * // get filters
   * var filters = node.filters();
   *
   * // set a single filter
   * node.cache();
   * node.filters([Konva.Filters.Blur]);
   *
   * // set multiple filters
   * node.cache();
   * node.filters([
   *   Konva.Filters.Blur,
   *   Konva.Filters.Sepia,
   *   Konva.Filters.Invert
   * ]);
   */
  addGetterSetter(Node, 'visible', true, getBooleanValidator());
  /**
   * get/set visible attr.  Can be true, or false.  The default is true.
   *   If you need to determine if a node is visible or not
   *   by taking into account its parents, use the isVisible() method
   * @name Konva.Node#visible
   * @method
   * @param {Boolean} visible
   * @returns {Boolean}
   * @example
   * // get visible attr
   * var visible = node.visible();
   *
   * // make invisible
   * node.visible(false);
   *
   * // make visible (according to the parent)
   * node.visible(true);
   *
   */
  addGetterSetter(Node, 'transformsEnabled', 'all', getStringValidator());
  /**
   * get/set transforms that are enabled.  Can be "all", "none", or "position".  The default
   *  is "all"
   * @name Konva.Node#transformsEnabled
   * @method
   * @param {String} enabled
   * @returns {String}
   * @example
   * // enable position transform only to improve draw performance
   * node.transformsEnabled('position');
   *
   * // enable all transforms
   * node.transformsEnabled('all');
   */
  /**
   * get/set node size
   * @name Konva.Node#size
   * @method
   * @param {Object} size
   * @param {Number} size.width
   * @param {Number} size.height
   * @returns {Object}
   * @example
   * // get node size
   * var size = node.size();
   * var width = size.width;
   * var height = size.height;
   *
   * // set size
   * node.size({
   *   width: 100,
   *   height: 200
   * });
   */
  addGetterSetter(Node, 'size');
  /**
   * get/set drag bound function.  This is used to override the default
   *  drag and drop position.
   * @name Konva.Node#dragBoundFunc
   * @method
   * @param {Function} dragBoundFunc
   * @returns {Function}
   * @example
   * // get drag bound function
   * var dragBoundFunc = node.dragBoundFunc();
   *
   * // create vertical drag and drop
   * node.dragBoundFunc(function(pos){
   *   // important pos - is absolute position of the node
   *   // you should return absolute position too
   *   return {
   *     x: this.absolutePosition().x,
   *     y: pos.y
   *   };
   * });
   */
  addGetterSetter(Node, 'dragBoundFunc');
  /**
   * get/set draggable flag
   * @name Konva.Node#draggable
   * @method
   * @param {Boolean} draggable
   * @returns {Boolean}
   * @example
   * // get draggable flag
   * var draggable = node.draggable();
   *
   * // enable drag and drop
   * node.draggable(true);
   *
   * // disable drag and drop
   * node.draggable(false);
   */
  addGetterSetter(Node, 'draggable', false, getBooleanValidator());
  Factory.backCompat(Node, {
      rotateDeg: 'rotate',
      setRotationDeg: 'setRotation',
      getRotationDeg: 'getRotation',
  });

  /**
   * Container constructor.&nbsp; Containers are used to contain nodes or other containers
   * @constructor
   * @memberof Konva
   * @augments Konva.Node
   * @abstract
   * @param {Object} config
   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * * @param {Object} [config.clip] set clip
     * @param {Number} [config.clipX] set clip x
     * @param {Number} [config.clipY] set clip y
     * @param {Number} [config.clipWidth] set clip width
     * @param {Number} [config.clipHeight] set clip height
     * @param {Function} [config.clipFunc] set clip func

   */
  class Container extends Node {
      constructor() {
          super(...arguments);
          this.children = [];
      }
      /**
       * returns an array of direct descendant nodes
       * @method
       * @name Konva.Container#getChildren
       * @param {Function} [filterFunc] filter function
       * @returns {Array}
       * @example
       * // get all children
       * var children = layer.getChildren();
       *
       * // get only circles
       * var circles = layer.getChildren(function(node){
       *    return node.getClassName() === 'Circle';
       * });
       */
      getChildren(filterFunc) {
          const children = this.children || [];
          if (filterFunc) {
              return children.filter(filterFunc);
          }
          return children;
      }
      /**
       * determine if node has children
       * @method
       * @name Konva.Container#hasChildren
       * @returns {Boolean}
       */
      hasChildren() {
          return this.getChildren().length > 0;
      }
      /**
       * remove all children. Children will be still in memory.
       * If you want to completely destroy all children please use "destroyChildren" method instead
       * @method
       * @name Konva.Container#removeChildren
       */
      removeChildren() {
          this.getChildren().forEach((child) => {
              // reset parent to prevent many _setChildrenIndices calls
              child.parent = null;
              child.index = 0;
              child.remove();
          });
          this.children = [];
          // because all children were detached from parent, request draw via container
          this._requestDraw();
          return this;
      }
      /**
       * destroy all children nodes.
       * @method
       * @name Konva.Container#destroyChildren
       */
      destroyChildren() {
          this.getChildren().forEach((child) => {
              // reset parent to prevent many _setChildrenIndices calls
              child.parent = null;
              child.index = 0;
              child.destroy();
          });
          this.children = [];
          // because all children were detached from parent, request draw via container
          this._requestDraw();
          return this;
      }
      /**
       * add a child and children into container
       * @name Konva.Container#add
       * @method
       * @param {...Konva.Node} children
       * @returns {Container}
       * @example
       * layer.add(rect);
       * layer.add(shape1, shape2, shape3);
       * // empty arrays are accepted, though each individual child must be defined
       * layer.add(...shapes);
       */
      add(...children) {
          if (children.length === 0) {
              return this;
          }
          if (children.length > 1) {
              for (let i = 0; i < children.length; i++) {
                  this.add(children[i]);
              }
              return this;
          }
          const child = children[0];
          if (child.getParent()) {
              child.moveTo(this);
              return this;
          }
          this._validateAdd(child);
          child.index = this.getChildren().length;
          child.parent = this;
          child._clearCaches();
          this.getChildren().push(child);
          this._fire('add', {
              child: child,
          });
          this._requestDraw();
          // chainable
          return this;
      }
      destroy() {
          if (this.hasChildren()) {
              this.destroyChildren();
          }
          super.destroy();
          return this;
      }
      /**
       * return an array of nodes that match the selector.
       * You can provide a string with '#' for id selections and '.' for name selections.
       * Or a function that will return true/false when a node is passed through.  See example below.
       * With strings you can also select by type or class name. Pass multiple selectors
       * separated by a comma.
       * @method
       * @name Konva.Container#find
       * @param {String | Function} selector
       * @returns {Array}
       * @example
       *
       * Passing a string as a selector
       * // select node with id foo
       * var node = stage.find('#foo');
       *
       * // select nodes with name bar inside layer
       * var nodes = layer.find('.bar');
       *
       * // select all groups inside layer
       * var nodes = layer.find('Group');
       *
       * // select all rectangles inside layer
       * var nodes = layer.find('Rect');
       *
       * // select node with an id of foo or a name of bar inside layer
       * var nodes = layer.find('#foo, .bar');
       *
       * Passing a function as a selector
       *
       * // get all groups with a function
       * var groups = stage.find(node => {
       *  return node.getType() === 'Group';
       * });
       *
       * // get only Nodes with partial opacity
       * var alphaNodes = layer.find(node => {
       *  return node.getType() === 'Node' && node.getAbsoluteOpacity() < 1;
       * });
       */
      find(selector) {
          // protecting _generalFind to prevent user from accidentally adding
          // second argument and getting unexpected `findOne` result
          return this._generalFind(selector, false);
      }
      /**
       * return a first node from `find` method
       * @method
       * @name Konva.Container#findOne
       * @param {String | Function} selector
       * @returns {Konva.Node | Undefined}
       * @example
       * // select node with id foo
       * var node = stage.findOne('#foo');
       *
       * // select node with name bar inside layer
       * var nodes = layer.findOne('.bar');
       *
       * // select the first node to return true in a function
       * var node = stage.findOne(node => {
       *  return node.getType() === 'Shape'
       * })
       */
      findOne(selector) {
          const result = this._generalFind(selector, true);
          return result.length > 0 ? result[0] : undefined;
      }
      _generalFind(selector, findOne) {
          const retArr = [];
          this._descendants((node) => {
              const valid = node._isMatch(selector);
              if (valid) {
                  retArr.push(node);
              }
              if (valid && findOne) {
                  return true;
              }
              return false;
          });
          return retArr;
      }
      _descendants(fn) {
          let shouldStop = false;
          const children = this.getChildren();
          for (const child of children) {
              shouldStop = fn(child);
              if (shouldStop) {
                  return true;
              }
              if (!child.hasChildren()) {
                  continue;
              }
              shouldStop = child._descendants(fn);
              if (shouldStop) {
                  return true;
              }
          }
          return false;
      }
      // extenders
      toObject() {
          const obj = Node.prototype.toObject.call(this);
          obj.children = [];
          this.getChildren().forEach((child) => {
              obj.children.push(child.toObject());
          });
          return obj;
      }
      /**
       * determine if node is an ancestor
       * of descendant
       * @method
       * @name Konva.Container#isAncestorOf
       * @param {Konva.Node} node
       */
      isAncestorOf(node) {
          let parent = node.getParent();
          while (parent) {
              if (parent._id === this._id) {
                  return true;
              }
              parent = parent.getParent();
          }
          return false;
      }
      clone(obj) {
          // call super method
          const node = Node.prototype.clone.call(this, obj);
          this.getChildren().forEach(function (no) {
              node.add(no.clone());
          });
          return node;
      }
      /**
       * get all shapes that intersect a point.  Note: because this method must clear a temporary
       * canvas and redraw every shape inside the container, it should only be used for special situations
       * because it performs very poorly.  Please use the {@link Konva.Stage#getIntersection} method if at all possible
       * because it performs much better
       * nodes with listening set to false will not be detected
       * @method
       * @name Konva.Container#getAllIntersections
       * @param {Object} pos
       * @param {Number} pos.x
       * @param {Number} pos.y
       * @returns {Array} array of shapes
       */
      getAllIntersections(pos) {
          const arr = [];
          this.find('Shape').forEach((shape) => {
              if (shape.isVisible() && shape.intersects(pos)) {
                  arr.push(shape);
              }
          });
          return arr;
      }
      _clearSelfAndDescendantCache(attr) {
          var _a;
          super._clearSelfAndDescendantCache(attr);
          // skip clearing if node is cached with canvas
          // for performance reasons !!!
          if (this.isCached()) {
              return;
          }
          (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function (node) {
              node._clearSelfAndDescendantCache(attr);
          });
      }
      _setChildrenIndices() {
          var _a;
          (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function (child, n) {
              child.index = n;
          });
          this._requestDraw();
      }
      drawScene(can, top, bufferCanvas) {
          const layer = this.getLayer(), canvas = can || (layer && layer.getCanvas()), context = canvas && canvas.getContext(), cachedCanvas = this._getCanvasCache(), cachedSceneCanvas = cachedCanvas && cachedCanvas.scene;
          const caching = canvas && canvas.isCache;
          if (!this.isVisible() && !caching) {
              return this;
          }
          if (cachedSceneCanvas) {
              context.save();
              const m = this.getAbsoluteTransform(top).getMatrix();
              context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
              this._drawCachedSceneCanvas(context);
              context.restore();
          }
          else {
              this._drawChildren('drawScene', canvas, top, bufferCanvas);
          }
          return this;
      }
      drawHit(can, top) {
          if (!this.shouldDrawHit(top)) {
              return this;
          }
          const layer = this.getLayer(), canvas = can || (layer && layer.hitCanvas), context = canvas && canvas.getContext(), cachedCanvas = this._getCanvasCache(), cachedHitCanvas = cachedCanvas && cachedCanvas.hit;
          if (cachedHitCanvas) {
              context.save();
              const m = this.getAbsoluteTransform(top).getMatrix();
              context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
              this._drawCachedHitCanvas(context);
              context.restore();
          }
          else {
              this._drawChildren('drawHit', canvas, top);
          }
          return this;
      }
      _drawChildren(drawMethod, canvas, top, bufferCanvas) {
          var _a;
          const context = canvas && canvas.getContext(), clipWidth = this.clipWidth(), clipHeight = this.clipHeight(), clipFunc = this.clipFunc(), hasClip = (typeof clipWidth === 'number' && typeof clipHeight === 'number') ||
              clipFunc;
          const selfCache = top === this;
          if (hasClip) {
              context.save();
              const transform = this.getAbsoluteTransform(top);
              let m = transform.getMatrix();
              context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
              context.beginPath();
              let clipArgs;
              if (clipFunc) {
                  clipArgs = clipFunc.call(this, context, this);
              }
              else {
                  const clipX = this.clipX();
                  const clipY = this.clipY();
                  context.rect(clipX || 0, clipY || 0, clipWidth, clipHeight);
              }
              context.clip.apply(context, clipArgs);
              m = transform.copy().invert().getMatrix();
              context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
          }
          const hasComposition = !selfCache &&
              this.globalCompositeOperation() !== 'source-over' &&
              drawMethod === 'drawScene';
          if (hasComposition) {
              context.save();
              context._applyGlobalCompositeOperation(this);
          }
          (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function (child) {
              child[drawMethod](canvas, top, bufferCanvas);
          });
          if (hasComposition) {
              context.restore();
          }
          if (hasClip) {
              context.restore();
          }
      }
      getClientRect(config = {}) {
          var _a;
          const skipTransform = config.skipTransform;
          const relativeTo = config.relativeTo;
          let minX, minY, maxX, maxY;
          let selfRect = {
              x: Infinity,
              y: Infinity,
              width: 0,
              height: 0,
          };
          const that = this;
          (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function (child) {
              // skip invisible children
              if (!child.visible()) {
                  return;
              }
              const rect = child.getClientRect({
                  relativeTo: that,
                  skipShadow: config.skipShadow,
                  skipStroke: config.skipStroke,
              });
              // skip invisible children (like empty groups)
              if (rect.width === 0 && rect.height === 0) {
                  return;
              }
              if (minX === undefined) {
                  // initial value for first child
                  minX = rect.x;
                  minY = rect.y;
                  maxX = rect.x + rect.width;
                  maxY = rect.y + rect.height;
              }
              else {
                  minX = Math.min(minX, rect.x);
                  minY = Math.min(minY, rect.y);
                  maxX = Math.max(maxX, rect.x + rect.width);
                  maxY = Math.max(maxY, rect.y + rect.height);
              }
          });
          // if child is group we need to make sure it has visible shapes inside
          const shapes = this.find('Shape');
          let hasVisible = false;
          for (let i = 0; i < shapes.length; i++) {
              const shape = shapes[i];
              if (shape._isVisible(this)) {
                  hasVisible = true;
                  break;
              }
          }
          if (hasVisible && minX !== undefined) {
              selfRect = {
                  x: minX,
                  y: minY,
                  width: maxX - minX,
                  height: maxY - minY,
              };
          }
          else {
              selfRect = {
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 0,
              };
          }
          if (!skipTransform) {
              return this._transformedRect(selfRect, relativeTo);
          }
          return selfRect;
      }
  }
  // add getters setters
  Factory.addComponentsGetterSetter(Container, 'clip', [
      'x',
      'y',
      'width',
      'height',
  ]);
  /**
   * get/set clip
   * @method
   * @name Konva.Container#clip
   * @param {Object} clip
   * @param {Number} clip.x
   * @param {Number} clip.y
   * @param {Number} clip.width
   * @param {Number} clip.height
   * @returns {Object}
   * @example
   * // get clip
   * var clip = container.clip();
   *
   * // set clip
   * container.clip({
   *   x: 20,
   *   y: 20,
   *   width: 20,
   *   height: 20
   * });
   */
  Factory.addGetterSetter(Container, 'clipX', undefined, getNumberValidator());
  /**
   * get/set clip x
   * @name Konva.Container#clipX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get clip x
   * var clipX = container.clipX();
   *
   * // set clip x
   * container.clipX(10);
   */
  Factory.addGetterSetter(Container, 'clipY', undefined, getNumberValidator());
  /**
   * get/set clip y
   * @name Konva.Container#clipY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get clip y
   * var clipY = container.clipY();
   *
   * // set clip y
   * container.clipY(10);
   */
  Factory.addGetterSetter(Container, 'clipWidth', undefined, getNumberValidator());
  /**
   * get/set clip width
   * @name Konva.Container#clipWidth
   * @method
   * @param {Number} width
   * @returns {Number}
   * @example
   * // get clip width
   * var clipWidth = container.clipWidth();
   *
   * // set clip width
   * container.clipWidth(100);
   */
  Factory.addGetterSetter(Container, 'clipHeight', undefined, getNumberValidator());
  /**
   * get/set clip height
   * @name Konva.Container#clipHeight
   * @method
   * @param {Number} height
   * @returns {Number}
   * @example
   * // get clip height
   * var clipHeight = container.clipHeight();
   *
   * // set clip height
   * container.clipHeight(100);
   */
  Factory.addGetterSetter(Container, 'clipFunc');
  /**
   * get/set clip function
   * @name Konva.Container#clipFunc
   * @method
   * @param {Function} function
   * @returns {Function}
   * @example
   * // get clip function
   * var clipFunction = container.clipFunc();
   *
   * // set clip function
   * container.clipFunc(function(ctx) {
   *   ctx.rect(0, 0, 100, 100);
   * });
   *
   * container.clipFunc(function(ctx) {
   *   // optionally return a clip Path2D and clip-rule or just the clip-rule
   *   return [new Path2D('M0 0v50h50Z'), 'evenodd']
   * });
   */

  const Captures = new Map();
  // we may use this module for capturing touch events too
  // so make sure we don't do something super specific to pointer
  const SUPPORT_POINTER_EVENTS = Konva$2._global['PointerEvent'] !== undefined;
  function getCapturedShape(pointerId) {
      return Captures.get(pointerId);
  }
  function createEvent(evt) {
      return {
          evt,
          pointerId: evt.pointerId,
      };
  }
  function hasPointerCapture(pointerId, shape) {
      return Captures.get(pointerId) === shape;
  }
  function setPointerCapture(pointerId, shape) {
      releaseCapture(pointerId);
      const stage = shape.getStage();
      if (!stage)
          return;
      Captures.set(pointerId, shape);
      if (SUPPORT_POINTER_EVENTS) {
          shape._fire('gotpointercapture', createEvent(new PointerEvent('gotpointercapture')));
      }
  }
  function releaseCapture(pointerId, target) {
      const shape = Captures.get(pointerId);
      if (!shape)
          return;
      const stage = shape.getStage();
      if (stage && stage.content) ;
      Captures.delete(pointerId);
      if (SUPPORT_POINTER_EVENTS) {
          shape._fire('lostpointercapture', createEvent(new PointerEvent('lostpointercapture')));
      }
  }

  // CONSTANTS
  const STAGE = 'Stage', STRING = 'string', PX = 'px', MOUSEOUT = 'mouseout', MOUSELEAVE = 'mouseleave', MOUSEOVER = 'mouseover', MOUSEENTER = 'mouseenter', MOUSEMOVE = 'mousemove', MOUSEDOWN = 'mousedown', MOUSEUP = 'mouseup', POINTERMOVE = 'pointermove', POINTERDOWN = 'pointerdown', POINTERUP = 'pointerup', POINTERCANCEL = 'pointercancel', LOSTPOINTERCAPTURE = 'lostpointercapture', POINTEROUT = 'pointerout', POINTERLEAVE = 'pointerleave', POINTEROVER = 'pointerover', POINTERENTER = 'pointerenter', CONTEXTMENU = 'contextmenu', TOUCHSTART = 'touchstart', TOUCHEND = 'touchend', TOUCHMOVE = 'touchmove', TOUCHCANCEL = 'touchcancel', WHEEL = 'wheel', MAX_LAYERS_NUMBER = 5, EVENTS = [
      [MOUSEENTER, '_pointerenter'],
      [MOUSEDOWN, '_pointerdown'],
      [MOUSEMOVE, '_pointermove'],
      [MOUSEUP, '_pointerup'],
      [MOUSELEAVE, '_pointerleave'],
      [TOUCHSTART, '_pointerdown'],
      [TOUCHMOVE, '_pointermove'],
      [TOUCHEND, '_pointerup'],
      [TOUCHCANCEL, '_pointercancel'],
      [MOUSEOVER, '_pointerover'],
      [WHEEL, '_wheel'],
      [CONTEXTMENU, '_contextmenu'],
      [POINTERDOWN, '_pointerdown'],
      [POINTERMOVE, '_pointermove'],
      [POINTERUP, '_pointerup'],
      [POINTERCANCEL, '_pointercancel'],
      [POINTERLEAVE, '_pointerleave'],
      [LOSTPOINTERCAPTURE, '_lostpointercapture'],
  ];
  const EVENTS_MAP = {
      mouse: {
          [POINTEROUT]: MOUSEOUT,
          [POINTERLEAVE]: MOUSELEAVE,
          [POINTEROVER]: MOUSEOVER,
          [POINTERENTER]: MOUSEENTER,
          [POINTERMOVE]: MOUSEMOVE,
          [POINTERDOWN]: MOUSEDOWN,
          [POINTERUP]: MOUSEUP,
          [POINTERCANCEL]: 'mousecancel',
          pointerclick: 'click',
          pointerdblclick: 'dblclick',
      },
      touch: {
          [POINTEROUT]: 'touchout',
          [POINTERLEAVE]: 'touchleave',
          [POINTEROVER]: 'touchover',
          [POINTERENTER]: 'touchenter',
          [POINTERMOVE]: TOUCHMOVE,
          [POINTERDOWN]: TOUCHSTART,
          [POINTERUP]: TOUCHEND,
          [POINTERCANCEL]: TOUCHCANCEL,
          pointerclick: 'tap',
          pointerdblclick: 'dbltap',
      },
      pointer: {
          [POINTEROUT]: POINTEROUT,
          [POINTERLEAVE]: POINTERLEAVE,
          [POINTEROVER]: POINTEROVER,
          [POINTERENTER]: POINTERENTER,
          [POINTERMOVE]: POINTERMOVE,
          [POINTERDOWN]: POINTERDOWN,
          [POINTERUP]: POINTERUP,
          [POINTERCANCEL]: POINTERCANCEL,
          pointerclick: 'pointerclick',
          pointerdblclick: 'pointerdblclick',
      },
  };
  const getEventType = (type) => {
      if (type.indexOf('pointer') >= 0) {
          return 'pointer';
      }
      if (type.indexOf('touch') >= 0) {
          return 'touch';
      }
      return 'mouse';
  };
  const getEventsMap = (eventType) => {
      const type = getEventType(eventType);
      if (type === 'pointer') {
          return Konva$2.pointerEventsEnabled && EVENTS_MAP.pointer;
      }
      if (type === 'touch') {
          return EVENTS_MAP.touch;
      }
      if (type === 'mouse') {
          return EVENTS_MAP.mouse;
      }
  };
  function checkNoClip(attrs = {}) {
      if (attrs.clipFunc || attrs.clipWidth || attrs.clipHeight) {
          Util.warn('Stage does not support clipping. Please use clip for Layers or Groups.');
      }
      return attrs;
  }
  const NO_POINTERS_MESSAGE = `Pointer position is missing and not registered by the stage. Looks like it is outside of the stage container. You can set it manually from event: stage.setPointersPositions(event);`;
  const stages = [];
  /**
   * Stage constructor.  A stage is used to contain multiple layers
   * @constructor
   * @memberof Konva
   * @augments Konva.Container
   * @param {Object} config
   * @param {String|Element} config.container Container selector or DOM element
   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var stage = new Konva.Stage({
   *   width: 500,
   *   height: 800,
   *   container: 'containerId' // or "#containerId" or ".containerClass"
   * });
   */
  class Stage extends Container {
      constructor(config) {
          super(checkNoClip(config));
          this._pointerPositions = [];
          this._changedPointerPositions = [];
          this._buildDOM();
          this._bindContentEvents();
          stages.push(this);
          this.on('widthChange.konva heightChange.konva', this._resizeDOM);
          this.on('visibleChange.konva', this._checkVisibility);
          this.on('clipWidthChange.konva clipHeightChange.konva clipFuncChange.konva', () => {
              checkNoClip(this.attrs);
          });
          this._checkVisibility();
      }
      _validateAdd(child) {
          const isLayer = child.getType() === 'Layer';
          const isFastLayer = child.getType() === 'FastLayer';
          const valid = isLayer || isFastLayer;
          if (!valid) {
              Util.throw('You may only add layers to the stage.');
          }
      }
      _checkVisibility() {
          if (!this.content) {
              return;
          }
          const style = this.visible() ? '' : 'none';
          this.content.style.display = style;
      }
      /**
       * set container dom element which contains the stage wrapper div element
       * @method
       * @name Konva.Stage#setContainer
       * @param {DomElement} container can pass in a dom element or id string
       */
      setContainer(container) {
          if (typeof container === STRING) {
              let id;
              if (container.charAt(0) === '.') {
                  const className = container.slice(1);
                  container = document.getElementsByClassName(className)[0];
              }
              else {
                  if (container.charAt(0) !== '#') {
                      id = container;
                  }
                  else {
                      id = container.slice(1);
                  }
                  container = document.getElementById(id);
              }
              if (!container) {
                  throw 'Can not find container in document with id ' + id;
              }
          }
          this._setAttr('container', container);
          if (this.content) {
              if (this.content.parentElement) {
                  this.content.parentElement.removeChild(this.content);
              }
              container.appendChild(this.content);
          }
          return this;
      }
      shouldDrawHit() {
          return true;
      }
      /**
       * clear all layers
       * @method
       * @name Konva.Stage#clear
       */
      clear() {
          const layers = this.children, len = layers.length;
          for (let n = 0; n < len; n++) {
              layers[n].clear();
          }
          return this;
      }
      clone(obj) {
          if (!obj) {
              obj = {};
          }
          obj.container =
              typeof document !== 'undefined' && document.createElement('div');
          return Container.prototype.clone.call(this, obj);
      }
      destroy() {
          super.destroy();
          const content = this.content;
          if (content && Util._isInDocument(content)) {
              this.container().removeChild(content);
          }
          const index = stages.indexOf(this);
          if (index > -1) {
              stages.splice(index, 1);
          }
          Util.releaseCanvas(this.bufferCanvas._canvas, this.bufferHitCanvas._canvas);
          return this;
      }
      /**
       * returns ABSOLUTE pointer position which can be a touch position or mouse position
       * pointer position doesn't include any transforms (such as scale) of the stage
       * it is just a plain position of pointer relative to top-left corner of the canvas
       * @method
       * @name Konva.Stage#getPointerPosition
       * @returns {Vector2d|null}
       */
      getPointerPosition() {
          const pos = this._pointerPositions[0] || this._changedPointerPositions[0];
          if (!pos) {
              Util.warn(NO_POINTERS_MESSAGE);
              return null;
          }
          return {
              x: pos.x,
              y: pos.y,
          };
      }
      _getPointerById(id) {
          return this._pointerPositions.find((p) => p.id === id);
      }
      getPointersPositions() {
          return this._pointerPositions;
      }
      getStage() {
          return this;
      }
      getContent() {
          return this.content;
      }
      _toKonvaCanvas(config) {
          config = config || {};
          config.x = config.x || 0;
          config.y = config.y || 0;
          config.width = config.width || this.width();
          config.height = config.height || this.height();
          const canvas = new SceneCanvas({
              width: config.width,
              height: config.height,
              pixelRatio: config.pixelRatio || 1,
          });
          const _context = canvas.getContext()._context;
          const layers = this.children;
          if (config.x || config.y) {
              _context.translate(-1 * config.x, -1 * config.y);
          }
          layers.forEach(function (layer) {
              if (!layer.isVisible()) {
                  return;
              }
              const layerCanvas = layer._toKonvaCanvas(config);
              _context.drawImage(layerCanvas._canvas, config.x, config.y, layerCanvas.getWidth() / layerCanvas.getPixelRatio(), layerCanvas.getHeight() / layerCanvas.getPixelRatio());
          });
          return canvas;
      }
      /**
       * get visible intersection shape. This is the preferred
       *  method for determining if a point intersects a shape or not
       * nodes with listening set to false will not be detected
       * @method
       * @name Konva.Stage#getIntersection
       * @param {Object} pos
       * @param {Number} pos.x
       * @param {Number} pos.y
       * @returns {Konva.Node}
       * @example
       * var shape = stage.getIntersection({x: 50, y: 50});
       */
      getIntersection(pos) {
          if (!pos) {
              return null;
          }
          const layers = this.children, len = layers.length, end = len - 1;
          for (let n = end; n >= 0; n--) {
              const shape = layers[n].getIntersection(pos);
              if (shape) {
                  return shape;
              }
          }
          return null;
      }
      _resizeDOM() {
          const width = this.width();
          const height = this.height();
          if (this.content) {
              // set content dimensions
              this.content.style.width = width + PX;
              this.content.style.height = height + PX;
          }
          this.bufferCanvas.setSize(width, height);
          this.bufferHitCanvas.setSize(width, height);
          // set layer dimensions
          this.children.forEach((layer) => {
              layer.setSize({ width, height });
              layer.draw();
          });
      }
      add(layer, ...rest) {
          if (arguments.length > 1) {
              for (let i = 0; i < arguments.length; i++) {
                  this.add(arguments[i]);
              }
              return this;
          }
          super.add(layer);
          const length = this.children.length;
          if (length > MAX_LAYERS_NUMBER) {
              Util.warn('The stage has ' +
                  length +
                  ' layers. Recommended maximum number of layers is 3-5. Adding more layers into the stage may drop the performance. Rethink your tree structure, you can use Konva.Group.');
          }
          layer.setSize({ width: this.width(), height: this.height() });
          // draw layer and append canvas to container
          layer.draw();
          if (Konva$2.isBrowser) {
              this.content.appendChild(layer.canvas._canvas);
          }
          // chainable
          return this;
      }
      getParent() {
          return null;
      }
      getLayer() {
          return null;
      }
      hasPointerCapture(pointerId) {
          return hasPointerCapture(pointerId, this);
      }
      setPointerCapture(pointerId) {
          setPointerCapture(pointerId, this);
      }
      releaseCapture(pointerId) {
          releaseCapture(pointerId);
      }
      /**
       * returns an array of layers
       * @method
       * @name Konva.Stage#getLayers
       */
      getLayers() {
          return this.children;
      }
      _bindContentEvents() {
          if (!Konva$2.isBrowser) {
              return;
          }
          EVENTS.forEach(([event, methodName]) => {
              this.content.addEventListener(event, (evt) => {
                  this[methodName](evt);
              }, { passive: false });
          });
      }
      _pointerenter(evt) {
          this.setPointersPositions(evt);
          const events = getEventsMap(evt.type);
          if (events) {
              this._fire(events.pointerenter, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
              });
          }
      }
      _pointerover(evt) {
          this.setPointersPositions(evt);
          const events = getEventsMap(evt.type);
          if (events) {
              this._fire(events.pointerover, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
              });
          }
      }
      _getTargetShape(evenType) {
          let shape = this[evenType + 'targetShape'];
          if (shape && !shape.getStage()) {
              shape = null;
          }
          return shape;
      }
      _pointerleave(evt) {
          const events = getEventsMap(evt.type);
          const eventType = getEventType(evt.type);
          if (!events) {
              return;
          }
          this.setPointersPositions(evt);
          const targetShape = this._getTargetShape(eventType);
          const eventsEnabled = !(Konva$2.isDragging() || Konva$2.isTransforming()) || Konva$2.hitOnDragEnabled;
          if (targetShape && eventsEnabled) {
              targetShape._fireAndBubble(events.pointerout, { evt: evt });
              targetShape._fireAndBubble(events.pointerleave, { evt: evt });
              this._fire(events.pointerleave, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
              });
              this[eventType + 'targetShape'] = null;
          }
          else if (eventsEnabled) {
              this._fire(events.pointerleave, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
              });
              this._fire(events.pointerout, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
              });
          }
          this.pointerPos = null;
          this._pointerPositions = [];
      }
      _pointerdown(evt) {
          const events = getEventsMap(evt.type);
          const eventType = getEventType(evt.type);
          if (!events) {
              return;
          }
          this.setPointersPositions(evt);
          let triggeredOnShape = false;
          this._changedPointerPositions.forEach((pos) => {
              const shape = this.getIntersection(pos);
              DD.justDragged = false;
              // probably we are staring a click
              Konva$2['_' + eventType + 'ListenClick'] = true;
              // no shape detected? do nothing
              if (!shape || !shape.isListening()) {
                  this[eventType + 'ClickStartShape'] = undefined;
                  return;
              }
              if (Konva$2.capturePointerEventsEnabled) {
                  shape.setPointerCapture(pos.id);
              }
              // save where we started the click
              this[eventType + 'ClickStartShape'] = shape;
              shape._fireAndBubble(events.pointerdown, {
                  evt: evt,
                  pointerId: pos.id,
              });
              triggeredOnShape = true;
              // TODO: test in iframe
              // only call preventDefault if the shape is listening for events
              const isTouch = evt.type.indexOf('touch') >= 0;
              if (shape.preventDefault() && evt.cancelable && isTouch) {
                  evt.preventDefault();
              }
          });
          // trigger down on stage if not already
          if (!triggeredOnShape) {
              this._fire(events.pointerdown, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
                  pointerId: this._pointerPositions[0].id,
              });
          }
      }
      _pointermove(evt) {
          const events = getEventsMap(evt.type);
          const eventType = getEventType(evt.type);
          if (!events) {
              return;
          }
          if (Konva$2.isDragging() && DD.node.preventDefault() && evt.cancelable) {
              evt.preventDefault();
          }
          this.setPointersPositions(evt);
          const eventsEnabled = !(Konva$2.isDragging() || Konva$2.isTransforming()) || Konva$2.hitOnDragEnabled;
          if (!eventsEnabled) {
              return;
          }
          const processedShapesIds = {};
          let triggeredOnShape = false;
          const targetShape = this._getTargetShape(eventType);
          this._changedPointerPositions.forEach((pos) => {
              const shape = (getCapturedShape(pos.id) ||
                  this.getIntersection(pos));
              const pointerId = pos.id;
              const event = { evt: evt, pointerId };
              const differentTarget = targetShape !== shape;
              if (differentTarget && targetShape) {
                  targetShape._fireAndBubble(events.pointerout, { ...event }, shape);
                  targetShape._fireAndBubble(events.pointerleave, { ...event }, shape);
              }
              if (shape) {
                  if (processedShapesIds[shape._id]) {
                      return;
                  }
                  processedShapesIds[shape._id] = true;
              }
              if (shape && shape.isListening()) {
                  triggeredOnShape = true;
                  if (differentTarget) {
                      shape._fireAndBubble(events.pointerover, { ...event }, targetShape);
                      shape._fireAndBubble(events.pointerenter, { ...event }, targetShape);
                      this[eventType + 'targetShape'] = shape;
                  }
                  shape._fireAndBubble(events.pointermove, { ...event });
              }
              else {
                  if (targetShape) {
                      this._fire(events.pointerover, {
                          evt: evt,
                          target: this,
                          currentTarget: this,
                          pointerId,
                      });
                      this[eventType + 'targetShape'] = null;
                  }
              }
          });
          if (!triggeredOnShape) {
              this._fire(events.pointermove, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
                  pointerId: this._changedPointerPositions[0].id,
              });
          }
      }
      _pointerup(evt) {
          const events = getEventsMap(evt.type);
          const eventType = getEventType(evt.type);
          if (!events) {
              return;
          }
          this.setPointersPositions(evt);
          const clickStartShape = this[eventType + 'ClickStartShape'];
          const clickEndShape = this[eventType + 'ClickEndShape'];
          const processedShapesIds = {};
          let triggeredOnShape = false;
          this._changedPointerPositions.forEach((pos) => {
              const shape = (getCapturedShape(pos.id) ||
                  this.getIntersection(pos));
              if (shape) {
                  shape.releaseCapture(pos.id);
                  if (processedShapesIds[shape._id]) {
                      return;
                  }
                  processedShapesIds[shape._id] = true;
              }
              const pointerId = pos.id;
              const event = { evt: evt, pointerId };
              let fireDblClick = false;
              if (Konva$2['_' + eventType + 'InDblClickWindow']) {
                  fireDblClick = true;
                  clearTimeout(this[eventType + 'DblTimeout']);
              }
              else if (!DD.justDragged) {
                  // don't set inDblClickWindow after dragging
                  Konva$2['_' + eventType + 'InDblClickWindow'] = true;
                  clearTimeout(this[eventType + 'DblTimeout']);
              }
              this[eventType + 'DblTimeout'] = setTimeout(function () {
                  Konva$2['_' + eventType + 'InDblClickWindow'] = false;
              }, Konva$2.dblClickWindow);
              if (shape && shape.isListening()) {
                  triggeredOnShape = true;
                  this[eventType + 'ClickEndShape'] = shape;
                  shape._fireAndBubble(events.pointerup, { ...event });
                  // detect if click or double click occurred
                  if (Konva$2['_' + eventType + 'ListenClick'] &&
                      clickStartShape &&
                      clickStartShape === shape) {
                      shape._fireAndBubble(events.pointerclick, { ...event });
                      if (fireDblClick && clickEndShape && clickEndShape === shape) {
                          shape._fireAndBubble(events.pointerdblclick, { ...event });
                      }
                  }
              }
              else {
                  this[eventType + 'ClickEndShape'] = null;
                  if (Konva$2['_' + eventType + 'ListenClick']) {
                      this._fire(events.pointerclick, {
                          evt: evt,
                          target: this,
                          currentTarget: this,
                          pointerId,
                      });
                  }
                  if (fireDblClick) {
                      this._fire(events.pointerdblclick, {
                          evt: evt,
                          target: this,
                          currentTarget: this,
                          pointerId,
                      });
                  }
              }
          });
          if (!triggeredOnShape) {
              this._fire(events.pointerup, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
                  pointerId: this._changedPointerPositions[0].id,
              });
          }
          Konva$2['_' + eventType + 'ListenClick'] = false;
          // always call preventDefault for desktop events because some browsers
          // try to drag and drop the canvas element
          // TODO: are we sure we need to prevent default at all?
          // do not call this function on mobile because it prevent "click" event on all parent containers
          // but apps may listen to it.
          if (evt.cancelable && eventType !== 'touch' && eventType !== 'pointer') {
              evt.preventDefault();
          }
      }
      _contextmenu(evt) {
          this.setPointersPositions(evt);
          const shape = this.getIntersection(this.getPointerPosition());
          if (shape && shape.isListening()) {
              shape._fireAndBubble(CONTEXTMENU, { evt: evt });
          }
          else {
              this._fire(CONTEXTMENU, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
              });
          }
      }
      _wheel(evt) {
          this.setPointersPositions(evt);
          const shape = this.getIntersection(this.getPointerPosition());
          if (shape && shape.isListening()) {
              shape._fireAndBubble(WHEEL, { evt: evt });
          }
          else {
              this._fire(WHEEL, {
                  evt: evt,
                  target: this,
                  currentTarget: this,
              });
          }
      }
      _pointercancel(evt) {
          this.setPointersPositions(evt);
          const shape = getCapturedShape(evt.pointerId) ||
              this.getIntersection(this.getPointerPosition());
          if (shape) {
              shape._fireAndBubble(POINTERUP, createEvent(evt));
          }
          releaseCapture(evt.pointerId);
      }
      _lostpointercapture(evt) {
          releaseCapture(evt.pointerId);
      }
      /**
       * manually register pointers positions (mouse/touch) in the stage.
       * So you can use stage.getPointerPosition(). Usually you don't need to use that method
       * because all internal events are automatically registered. It may be useful if event
       * is triggered outside of the stage, but you still want to use Konva methods to get pointers position.
       * @method
       * @name Konva.Stage#setPointersPositions
       * @param {Object} event Event object
       * @example
       *
       * window.addEventListener('mousemove', (e) => {
       *   stage.setPointersPositions(e);
       * });
       */
      setPointersPositions(evt) {
          const contentPosition = this._getContentPosition();
          let x = null, y = null;
          evt = evt ? evt : window.event;
          // touch events
          if (evt.touches !== undefined) {
              // touchlist has not support for map method
              // so we have to iterate
              this._pointerPositions = [];
              this._changedPointerPositions = [];
              Array.prototype.forEach.call(evt.touches, (touch) => {
                  this._pointerPositions.push({
                      id: touch.identifier,
                      x: (touch.clientX - contentPosition.left) / contentPosition.scaleX,
                      y: (touch.clientY - contentPosition.top) / contentPosition.scaleY,
                  });
              });
              Array.prototype.forEach.call(evt.changedTouches || evt.touches, (touch) => {
                  this._changedPointerPositions.push({
                      id: touch.identifier,
                      x: (touch.clientX - contentPosition.left) / contentPosition.scaleX,
                      y: (touch.clientY - contentPosition.top) / contentPosition.scaleY,
                  });
              });
          }
          else {
              // mouse events
              x = (evt.clientX - contentPosition.left) / contentPosition.scaleX;
              y = (evt.clientY - contentPosition.top) / contentPosition.scaleY;
              this.pointerPos = {
                  x: x,
                  y: y,
              };
              this._pointerPositions = [{ x, y, id: Util._getFirstPointerId(evt) }];
              this._changedPointerPositions = [
                  { x, y, id: Util._getFirstPointerId(evt) },
              ];
          }
      }
      _setPointerPosition(evt) {
          Util.warn('Method _setPointerPosition is deprecated. Use "stage.setPointersPositions(event)" instead.');
          this.setPointersPositions(evt);
      }
      _getContentPosition() {
          if (!this.content || !this.content.getBoundingClientRect) {
              return {
                  top: 0,
                  left: 0,
                  scaleX: 1,
                  scaleY: 1,
              };
          }
          const rect = this.content.getBoundingClientRect();
          return {
              top: rect.top,
              left: rect.left,
              // sometimes clientWidth can be equals to 0
              // i saw it in react-konva test, looks like it is because of hidden testing element
              scaleX: rect.width / this.content.clientWidth || 1,
              scaleY: rect.height / this.content.clientHeight || 1,
          };
      }
      _buildDOM() {
          this.bufferCanvas = new SceneCanvas({
              width: this.width(),
              height: this.height(),
          });
          this.bufferHitCanvas = new HitCanvas({
              pixelRatio: 1,
              width: this.width(),
              height: this.height(),
          });
          if (!Konva$2.isBrowser) {
              return;
          }
          const container = this.container();
          if (!container) {
              throw 'Stage has no container. A container is required.';
          }
          // clear content inside container
          container.innerHTML = '';
          // content
          this.content = document.createElement('div');
          this.content.style.position = 'relative';
          this.content.style.userSelect = 'none';
          this.content.className = 'konvajs-content';
          this.content.setAttribute('role', 'presentation');
          container.appendChild(this.content);
          this._resizeDOM();
      }
      // currently cache function is now working for stage, because stage has no its own canvas element
      cache() {
          Util.warn('Cache function is not allowed for stage. You may use cache only for layers, groups and shapes.');
          return this;
      }
      clearCache() {
          return this;
      }
      /**
       * batch draw
       * @method
       * @name Konva.Stage#batchDraw
       * @return {Konva.Stage} this
       */
      batchDraw() {
          this.getChildren().forEach(function (layer) {
              layer.batchDraw();
          });
          return this;
      }
  }
  Stage.prototype.nodeType = STAGE;
  _registerNode(Stage);
  /**
   * get/set container DOM element
   * @method
   * @name Konva.Stage#container
   * @returns {DomElement} container
   * @example
   * // get container
   * var container = stage.container();
   * // set container
   * var container = document.createElement('div');
   * body.appendChild(container);
   * stage.container(container);
   */
  Factory.addGetterSetter(Stage, 'container');
  // chrome is clearing canvas in inactive browser window, causing layer content to be erased
  // so let's redraw layers as soon as window becomes active
  // TODO: any other way to solve this issue?
  // TODO: should we remove it if chrome fixes the issue?
  if (Konva$2.isBrowser) {
      document.addEventListener('visibilitychange', () => {
          stages.forEach((stage) => {
              stage.batchDraw();
          });
      });
  }

  const HAS_SHADOW = 'hasShadow';
  const SHADOW_RGBA = 'shadowRGBA';
  const patternImage = 'patternImage';
  const linearGradient = 'linearGradient';
  const radialGradient = 'radialGradient';
  let dummyContext$1;
  function getDummyContext$1() {
      if (dummyContext$1) {
          return dummyContext$1;
      }
      dummyContext$1 = Util.createCanvasElement().getContext('2d');
      return dummyContext$1;
  }
  const shapes = {};
  // TODO: idea - use only "remove" (or destroy method)
  // how? on add, check that every inner shape has reference in konva store with color
  // on remove - clear that reference
  // the approach is good. But what if we want to cache the shape before we add it into the stage
  // what color to use for hit test?
  function _fillFunc$2(context) {
      const fillRule = this.attrs.fillRule;
      if (fillRule) {
          context.fill(fillRule);
      }
      else {
          context.fill();
      }
  }
  function _strokeFunc$2(context) {
      context.stroke();
  }
  function _fillFuncHit(context) {
      const fillRule = this.attrs.fillRule;
      if (fillRule) {
          context.fill(fillRule);
      }
      else {
          context.fill();
      }
  }
  function _strokeFuncHit(context) {
      context.stroke();
  }
  function _clearHasShadowCache() {
      this._clearCache(HAS_SHADOW);
  }
  function _clearGetShadowRGBACache() {
      this._clearCache(SHADOW_RGBA);
  }
  function _clearFillPatternCache() {
      this._clearCache(patternImage);
  }
  function _clearLinearGradientCache() {
      this._clearCache(linearGradient);
  }
  function _clearRadialGradientCache() {
      this._clearCache(radialGradient);
  }
  /**
   * Shape constructor.  Shapes are primitive objects such as rectangles,
   *  circles, text, lines, etc.
   * @constructor
   * @memberof Konva
   * @augments Konva.Node
   * @param {Object} config
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var customShape = new Konva.Shape({
   *   x: 5,
   *   y: 10,
   *   fill: 'red',
   *   // a Konva.Canvas renderer is passed into the sceneFunc function
   *   sceneFunc (context, shape) {
   *     context.beginPath();
   *     context.moveTo(200, 50);
   *     context.lineTo(420, 80);
   *     context.quadraticCurveTo(300, 100, 260, 170);
   *     context.closePath();
   *     // Konva specific method
   *     context.fillStrokeShape(shape);
   *   }
   *});
   */
  class Shape extends Node {
      constructor(config) {
          super(config);
          // set colorKey
          let key;
          while (true) {
              key = Util.getRandomColor();
              if (key && !(key in shapes)) {
                  break;
              }
          }
          this.colorKey = key;
          shapes[key] = this;
      }
      /**
       * @deprecated
       */
      getContext() {
          Util.warn('shape.getContext() method is deprecated. Please do not use it.');
          return this.getLayer().getContext();
      }
      /**
       * @deprecated
       */
      getCanvas() {
          Util.warn('shape.getCanvas() method is deprecated. Please do not use it.');
          return this.getLayer().getCanvas();
      }
      getSceneFunc() {
          return this.attrs.sceneFunc || this['_sceneFunc'];
      }
      getHitFunc() {
          return this.attrs.hitFunc || this['_hitFunc'];
      }
      /**
       * returns whether or not a shadow will be rendered
       * @method
       * @name Konva.Shape#hasShadow
       * @returns {Boolean}
       */
      hasShadow() {
          return this._getCache(HAS_SHADOW, this._hasShadow);
      }
      _hasShadow() {
          return (this.shadowEnabled() &&
              this.shadowOpacity() !== 0 &&
              !!(this.shadowColor() ||
                  this.shadowBlur() ||
                  this.shadowOffsetX() ||
                  this.shadowOffsetY()));
      }
      _getFillPattern() {
          return this._getCache(patternImage, this.__getFillPattern);
      }
      __getFillPattern() {
          if (this.fillPatternImage()) {
              const ctx = getDummyContext$1();
              const pattern = ctx.createPattern(this.fillPatternImage(), this.fillPatternRepeat() || 'repeat');
              if (pattern && pattern.setTransform) {
                  const tr = new Transform();
                  tr.translate(this.fillPatternX(), this.fillPatternY());
                  tr.rotate(Konva$2.getAngle(this.fillPatternRotation()));
                  tr.scale(this.fillPatternScaleX(), this.fillPatternScaleY());
                  tr.translate(-1 * this.fillPatternOffsetX(), -1 * this.fillPatternOffsetY());
                  const m = tr.getMatrix();
                  const matrix = typeof DOMMatrix === 'undefined'
                      ? {
                          a: m[0], // Horizontal scaling. A value of 1 results in no scaling.
                          b: m[1], // Vertical skewing.
                          c: m[2], // Horizontal skewing.
                          d: m[3],
                          e: m[4], // Horizontal translation (moving).
                          f: m[5], // Vertical translation (moving).
                      }
                      : new DOMMatrix(m);
                  pattern.setTransform(matrix);
              }
              return pattern;
          }
      }
      _getLinearGradient() {
          return this._getCache(linearGradient, this.__getLinearGradient);
      }
      __getLinearGradient() {
          const colorStops = this.fillLinearGradientColorStops();
          if (colorStops) {
              const ctx = getDummyContext$1();
              const start = this.fillLinearGradientStartPoint();
              const end = this.fillLinearGradientEndPoint();
              const grd = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
              // build color stops
              for (let n = 0; n < colorStops.length; n += 2) {
                  grd.addColorStop(colorStops[n], colorStops[n + 1]);
              }
              return grd;
          }
      }
      _getRadialGradient() {
          return this._getCache(radialGradient, this.__getRadialGradient);
      }
      __getRadialGradient() {
          const colorStops = this.fillRadialGradientColorStops();
          if (colorStops) {
              const ctx = getDummyContext$1();
              const start = this.fillRadialGradientStartPoint();
              const end = this.fillRadialGradientEndPoint();
              const grd = ctx.createRadialGradient(start.x, start.y, this.fillRadialGradientStartRadius(), end.x, end.y, this.fillRadialGradientEndRadius());
              // build color stops
              for (let n = 0; n < colorStops.length; n += 2) {
                  grd.addColorStop(colorStops[n], colorStops[n + 1]);
              }
              return grd;
          }
      }
      getShadowRGBA() {
          return this._getCache(SHADOW_RGBA, this._getShadowRGBA);
      }
      _getShadowRGBA() {
          if (!this.hasShadow()) {
              return;
          }
          const rgba = Util.colorToRGBA(this.shadowColor());
          if (rgba) {
              return ('rgba(' +
                  rgba.r +
                  ',' +
                  rgba.g +
                  ',' +
                  rgba.b +
                  ',' +
                  rgba.a * (this.shadowOpacity() || 1) +
                  ')');
          }
      }
      /**
       * returns whether or not the shape will be filled
       * @method
       * @name Konva.Shape#hasFill
       * @returns {Boolean}
       */
      hasFill() {
          return this._calculate('hasFill', [
              'fillEnabled',
              'fill',
              'fillPatternImage',
              'fillLinearGradientColorStops',
              'fillRadialGradientColorStops',
          ], () => {
              return (this.fillEnabled() &&
                  !!(this.fill() ||
                      this.fillPatternImage() ||
                      this.fillLinearGradientColorStops() ||
                      this.fillRadialGradientColorStops()));
          });
      }
      /**
       * returns whether or not the shape will be stroked
       * @method
       * @name Konva.Shape#hasStroke
       * @returns {Boolean}
       */
      hasStroke() {
          return this._calculate('hasStroke', [
              'strokeEnabled',
              'strokeWidth',
              'stroke',
              'strokeLinearGradientColorStops',
          ], () => {
              return (this.strokeEnabled() &&
                  this.strokeWidth() &&
                  !!(this.stroke() || this.strokeLinearGradientColorStops())
              // this.getStrokeRadialGradientColorStops()
              );
          });
          // return (
          //   this.strokeEnabled() &&
          //   this.strokeWidth() &&
          //   !!(this.stroke() || this.strokeLinearGradientColorStops())
          //   // this.getStrokeRadialGradientColorStops()
          // );
      }
      hasHitStroke() {
          const width = this.hitStrokeWidth();
          // on auto just check by stroke
          if (width === 'auto') {
              return this.hasStroke();
          }
          // we should enable hit stroke if stroke is enabled
          // and we have some value from width
          return this.strokeEnabled() && !!width;
      }
      /**
       * determines if point is in the shape, regardless if other shapes are on top of it.  Note: because
       *  this method clears a temporary canvas and then redraws the shape, it performs very poorly if executed many times
       *  consecutively.  Please use the {@link Konva.Stage#getIntersection} method if at all possible
       *  because it performs much better
       * @method
       * @name Konva.Shape#intersects
       * @param {Object} point
       * @param {Number} point.x
       * @param {Number} point.y
       * @returns {Boolean}
       */
      intersects(point) {
          const stage = this.getStage();
          if (!stage) {
              return false;
          }
          const bufferHitCanvas = stage.bufferHitCanvas;
          bufferHitCanvas.getContext().clear();
          this.drawHit(bufferHitCanvas, undefined, true);
          const p = bufferHitCanvas.context.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data;
          return p[3] > 0;
      }
      destroy() {
          Node.prototype.destroy.call(this);
          delete shapes[this.colorKey];
          delete this.colorKey;
          return this;
      }
      // why do we need buffer canvas?
      // it give better result when a shape has
      // stroke with fill and with some opacity
      _useBufferCanvas(forceFill) {
          // image and sprite still has "fill" as image
          // so they use that method with forced fill
          // it probably will be simpler, then copy/paste the code
          var _a;
          // force skip buffer canvas
          const perfectDrawEnabled = (_a = this.attrs.perfectDrawEnabled) !== null && _a !== void 0 ? _a : true;
          if (!perfectDrawEnabled) {
              return false;
          }
          const hasFill = forceFill || this.hasFill();
          const hasStroke = this.hasStroke();
          const isTransparent = this.getAbsoluteOpacity() !== 1;
          if (hasFill && hasStroke && isTransparent) {
              return true;
          }
          const hasShadow = this.hasShadow();
          const strokeForShadow = this.shadowForStrokeEnabled();
          if (hasFill && hasStroke && hasShadow && strokeForShadow) {
              return true;
          }
          return false;
      }
      setStrokeHitEnabled(val) {
          Util.warn('strokeHitEnabled property is deprecated. Please use hitStrokeWidth instead.');
          if (val) {
              this.hitStrokeWidth('auto');
          }
          else {
              this.hitStrokeWidth(0);
          }
      }
      getStrokeHitEnabled() {
          if (this.hitStrokeWidth() === 0) {
              return false;
          }
          else {
              return true;
          }
      }
      /**
       * return self rectangle (x, y, width, height) of shape.
       * This method are not taken into account transformation and styles.
       * @method
       * @name Konva.Shape#getSelfRect
       * @returns {Object} rect with {x, y, width, height} properties
       * @example
       *
       * rect.getSelfRect();  // return {x:0, y:0, width:rect.width(), height:rect.height()}
       * circle.getSelfRect();  // return {x: - circle.width() / 2, y: - circle.height() / 2, width:circle.width(), height:circle.height()}
       *
       */
      getSelfRect() {
          const size = this.size();
          return {
              x: this._centroid ? -size.width / 2 : 0,
              y: this._centroid ? -size.height / 2 : 0,
              width: size.width,
              height: size.height,
          };
      }
      getClientRect(config = {}) {
          // if we have a cached parent, it will use cached transform matrix
          // but we don't want to that
          let hasCachedParent = false;
          let parent = this.getParent();
          while (parent) {
              if (parent.isCached()) {
                  hasCachedParent = true;
                  break;
              }
              parent = parent.getParent();
          }
          const skipTransform = config.skipTransform;
          // force relative to stage if we have a cached parent
          const relativeTo = config.relativeTo || (hasCachedParent && this.getStage()) || undefined;
          const fillRect = this.getSelfRect();
          const applyStroke = !config.skipStroke && this.hasStroke();
          const strokeWidth = (applyStroke && this.strokeWidth()) || 0;
          const fillAndStrokeWidth = fillRect.width + strokeWidth;
          const fillAndStrokeHeight = fillRect.height + strokeWidth;
          const applyShadow = !config.skipShadow && this.hasShadow();
          const shadowOffsetX = applyShadow ? this.shadowOffsetX() : 0;
          const shadowOffsetY = applyShadow ? this.shadowOffsetY() : 0;
          const preWidth = fillAndStrokeWidth + Math.abs(shadowOffsetX);
          const preHeight = fillAndStrokeHeight + Math.abs(shadowOffsetY);
          const blurRadius = (applyShadow && this.shadowBlur()) || 0;
          const width = preWidth + blurRadius * 2;
          const height = preHeight + blurRadius * 2;
          const rect = {
              width: width,
              height: height,
              x: -(strokeWidth / 2 + blurRadius) +
                  Math.min(shadowOffsetX, 0) +
                  fillRect.x,
              y: -(strokeWidth / 2 + blurRadius) +
                  Math.min(shadowOffsetY, 0) +
                  fillRect.y,
          };
          if (!skipTransform) {
              return this._transformedRect(rect, relativeTo);
          }
          return rect;
      }
      drawScene(can, top, bufferCanvas) {
          // basically there are 3 drawing modes
          // 1 - simple drawing when nothing is cached.
          // 2 - when we are caching current
          // 3 - when node is cached and we need to draw it into layer
          const layer = this.getLayer();
          const canvas = can || layer.getCanvas(), context = canvas.getContext(), cachedCanvas = this._getCanvasCache(), drawFunc = this.getSceneFunc(), hasShadow = this.hasShadow();
          let stage;
          const cachingSelf = top === this;
          if (!this.isVisible() && !cachingSelf) {
              return this;
          }
          // if node is cached we just need to draw from cache
          if (cachedCanvas) {
              context.save();
              const m = this.getAbsoluteTransform(top).getMatrix();
              context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
              this._drawCachedSceneCanvas(context);
              context.restore();
              return this;
          }
          if (!drawFunc) {
              return this;
          }
          context.save();
          // if buffer canvas is needed
          if (this._useBufferCanvas() && true) {
              stage = this.getStage();
              const bc = bufferCanvas || stage.bufferCanvas;
              const bufferContext = bc.getContext();
              bufferContext.clear();
              bufferContext.save();
              bufferContext._applyLineJoin(this);
              // layer might be undefined if we are using cache before adding to layer
              const o = this.getAbsoluteTransform(top).getMatrix();
              bufferContext.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
              drawFunc.call(this, bufferContext, this);
              bufferContext.restore();
              const ratio = bc.pixelRatio;
              if (hasShadow) {
                  context._applyShadow(this);
              }
              context._applyOpacity(this);
              context._applyGlobalCompositeOperation(this);
              context.drawImage(bc._canvas, bc.x || 0, bc.y || 0, bc.width / ratio, bc.height / ratio);
          }
          else {
              context._applyLineJoin(this);
              if (!cachingSelf) {
                  const o = this.getAbsoluteTransform(top).getMatrix();
                  context.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
                  context._applyOpacity(this);
                  context._applyGlobalCompositeOperation(this);
              }
              if (hasShadow) {
                  context._applyShadow(this);
              }
              drawFunc.call(this, context, this);
          }
          context.restore();
          return this;
      }
      drawHit(can, top, skipDragCheck = false) {
          if (!this.shouldDrawHit(top, skipDragCheck)) {
              return this;
          }
          const layer = this.getLayer(), canvas = can || layer.hitCanvas, context = canvas && canvas.getContext(), drawFunc = this.hitFunc() || this.sceneFunc(), cachedCanvas = this._getCanvasCache(), cachedHitCanvas = cachedCanvas && cachedCanvas.hit;
          if (!this.colorKey) {
              Util.warn('Looks like your canvas has a destroyed shape in it. Do not reuse shape after you destroyed it. If you want to reuse shape you should call remove() instead of destroy()');
          }
          if (cachedHitCanvas) {
              context.save();
              const m = this.getAbsoluteTransform(top).getMatrix();
              context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
              this._drawCachedHitCanvas(context);
              context.restore();
              return this;
          }
          if (!drawFunc) {
              return this;
          }
          context.save();
          context._applyLineJoin(this);
          const selfCache = this === top;
          if (!selfCache) {
              const o = this.getAbsoluteTransform(top).getMatrix();
              context.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
          }
          drawFunc.call(this, context, this);
          context.restore();
          return this;
      }
      /**
       * draw hit graph using the cached scene canvas
       * @method
       * @name Konva.Shape#drawHitFromCache
       * @param {Integer} alphaThreshold alpha channel threshold that determines whether or not
       *  a pixel should be drawn onto the hit graph.  Must be a value between 0 and 255.
       *  The default is 0
       * @returns {Konva.Shape}
       * @example
       * shape.cache();
       * shape.drawHitFromCache();
       */
      drawHitFromCache(alphaThreshold = 0) {
          const cachedCanvas = this._getCanvasCache(), sceneCanvas = this._getCachedSceneCanvas(), hitCanvas = cachedCanvas.hit, hitContext = hitCanvas.getContext(), hitWidth = hitCanvas.getWidth(), hitHeight = hitCanvas.getHeight();
          hitContext.clear();
          hitContext.drawImage(sceneCanvas._canvas, 0, 0, hitWidth, hitHeight);
          try {
              const hitImageData = hitContext.getImageData(0, 0, hitWidth, hitHeight);
              const hitData = hitImageData.data;
              const len = hitData.length;
              const rgbColorKey = Util._hexToRgb(this.colorKey);
              // replace non transparent pixels with color key
              for (let i = 0; i < len; i += 4) {
                  const alpha = hitData[i + 3];
                  if (alpha > alphaThreshold) {
                      hitData[i] = rgbColorKey.r;
                      hitData[i + 1] = rgbColorKey.g;
                      hitData[i + 2] = rgbColorKey.b;
                      hitData[i + 3] = 255;
                  }
                  else {
                      hitData[i + 3] = 0;
                  }
              }
              hitContext.putImageData(hitImageData, 0, 0);
          }
          catch (e) {
              Util.error('Unable to draw hit graph from cached scene canvas. ' + e.message);
          }
          return this;
      }
      hasPointerCapture(pointerId) {
          return hasPointerCapture(pointerId, this);
      }
      setPointerCapture(pointerId) {
          setPointerCapture(pointerId, this);
      }
      releaseCapture(pointerId) {
          releaseCapture(pointerId);
      }
  }
  Shape.prototype._fillFunc = _fillFunc$2;
  Shape.prototype._strokeFunc = _strokeFunc$2;
  Shape.prototype._fillFuncHit = _fillFuncHit;
  Shape.prototype._strokeFuncHit = _strokeFuncHit;
  Shape.prototype._centroid = false;
  Shape.prototype.nodeType = 'Shape';
  _registerNode(Shape);
  Shape.prototype.eventListeners = {};
  Shape.prototype.on.call(Shape.prototype, 'shadowColorChange.konva shadowBlurChange.konva shadowOffsetChange.konva shadowOpacityChange.konva shadowEnabledChange.konva', _clearHasShadowCache);
  Shape.prototype.on.call(Shape.prototype, 'shadowColorChange.konva shadowOpacityChange.konva shadowEnabledChange.konva', _clearGetShadowRGBACache);
  Shape.prototype.on.call(Shape.prototype, 'fillPriorityChange.konva fillPatternImageChange.konva fillPatternRepeatChange.konva fillPatternScaleXChange.konva fillPatternScaleYChange.konva fillPatternOffsetXChange.konva fillPatternOffsetYChange.konva fillPatternXChange.konva fillPatternYChange.konva fillPatternRotationChange.konva', _clearFillPatternCache);
  Shape.prototype.on.call(Shape.prototype, 'fillPriorityChange.konva fillLinearGradientColorStopsChange.konva fillLinearGradientStartPointXChange.konva fillLinearGradientStartPointYChange.konva fillLinearGradientEndPointXChange.konva fillLinearGradientEndPointYChange.konva', _clearLinearGradientCache);
  Shape.prototype.on.call(Shape.prototype, 'fillPriorityChange.konva fillRadialGradientColorStopsChange.konva fillRadialGradientStartPointXChange.konva fillRadialGradientStartPointYChange.konva fillRadialGradientEndPointXChange.konva fillRadialGradientEndPointYChange.konva fillRadialGradientStartRadiusChange.konva fillRadialGradientEndRadiusChange.konva', _clearRadialGradientCache);
  // add getters and setters
  Factory.addGetterSetter(Shape, 'stroke', undefined, getStringOrGradientValidator());
  /**
   * get/set stroke color
   * @name Konva.Shape#stroke
   * @method
   * @param {String} color
   * @returns {String}
   * @example
   * // get stroke color
   * var stroke = shape.stroke();
   *
   * // set stroke color with color string
   * shape.stroke('green');
   *
   * // set stroke color with hex
   * shape.stroke('#00ff00');
   *
   * // set stroke color with rgb
   * shape.stroke('rgb(0,255,0)');
   *
   * // set stroke color with rgba and make it 50% opaque
   * shape.stroke('rgba(0,255,0,0.5');
   */
  Factory.addGetterSetter(Shape, 'strokeWidth', 2, getNumberValidator());
  /**
   * get/set stroke width
   * @name Konva.Shape#strokeWidth
   * @method
   * @param {Number} strokeWidth
   * @returns {Number}
   * @example
   * // get stroke width
   * var strokeWidth = shape.strokeWidth();
   *
   * // set stroke width
   * shape.strokeWidth(10);
   */
  Factory.addGetterSetter(Shape, 'fillAfterStrokeEnabled', false);
  /**
   * get/set fillAfterStrokeEnabled property. By default Konva is drawing filling first, then stroke on top of the fill.
   * In rare situations you may want a different behavior. When you have a stroke first then fill on top of it.
   * Especially useful for Text objects.
   * Default is false.
   * @name Konva.Shape#fillAfterStrokeEnabled
   * @method
   * @param {Boolean} fillAfterStrokeEnabled
   * @returns {Boolean}
   * @example
   * // get stroke width
   * var fillAfterStrokeEnabled = shape.fillAfterStrokeEnabled();
   *
   * // set stroke width
   * shape.fillAfterStrokeEnabled(true);
   */
  Factory.addGetterSetter(Shape, 'hitStrokeWidth', 'auto', getNumberOrAutoValidator());
  /**
   * get/set stroke width for hit detection. Default value is "auto", it means it will be equals to strokeWidth
   * @name Konva.Shape#hitStrokeWidth
   * @method
   * @param {Number} hitStrokeWidth
   * @returns {Number}
   * @example
   * // get stroke width
   * var hitStrokeWidth = shape.hitStrokeWidth();
   *
   * // set hit stroke width
   * shape.hitStrokeWidth(20);
   * // set hit stroke width always equals to scene stroke width
   * shape.hitStrokeWidth('auto');
   */
  Factory.addGetterSetter(Shape, 'strokeHitEnabled', true, getBooleanValidator());
  /**
   * **deprecated, use hitStrokeWidth instead!** get/set strokeHitEnabled property. Useful for performance optimization.
   * You may set `shape.strokeHitEnabled(false)`. In this case stroke will be no draw on hit canvas, so hit area
   * of shape will be decreased (by lineWidth / 2). Remember that non closed line with `strokeHitEnabled = false`
   * will be not drawn on hit canvas, that is mean line will no trigger pointer events (like mouseover)
   * Default value is true.
   * @name Konva.Shape#strokeHitEnabled
   * @method
   * @param {Boolean} strokeHitEnabled
   * @returns {Boolean}
   * @example
   * // get strokeHitEnabled
   * var strokeHitEnabled = shape.strokeHitEnabled();
   *
   * // set strokeHitEnabled
   * shape.strokeHitEnabled();
   */
  Factory.addGetterSetter(Shape, 'perfectDrawEnabled', true, getBooleanValidator());
  /**
   * get/set perfectDrawEnabled. If a shape has fill, stroke and opacity you may set `perfectDrawEnabled` to false to improve performance.
   * See http://konvajs.org/docs/performance/Disable_Perfect_Draw.html for more information.
   * Default value is true
   * @name Konva.Shape#perfectDrawEnabled
   * @method
   * @param {Boolean} perfectDrawEnabled
   * @returns {Boolean}
   * @example
   * // get perfectDrawEnabled
   * var perfectDrawEnabled = shape.perfectDrawEnabled();
   *
   * // set perfectDrawEnabled
   * shape.perfectDrawEnabled();
   */
  Factory.addGetterSetter(Shape, 'shadowForStrokeEnabled', true, getBooleanValidator());
  /**
   * get/set shadowForStrokeEnabled. Useful for performance optimization.
   * You may set `shape.shadowForStrokeEnabled(false)`. In this case stroke will no effect shadow.
   * Remember if you set `shadowForStrokeEnabled = false` for non closed line - that line will have no shadow!.
   * Default value is true
   * @name Konva.Shape#shadowForStrokeEnabled
   * @method
   * @param {Boolean} shadowForStrokeEnabled
   * @returns {Boolean}
   * @example
   * // get shadowForStrokeEnabled
   * var shadowForStrokeEnabled = shape.shadowForStrokeEnabled();
   *
   * // set shadowForStrokeEnabled
   * shape.shadowForStrokeEnabled();
   */
  Factory.addGetterSetter(Shape, 'lineJoin');
  /**
   * get/set line join.  Can be miter, round, or bevel.  The
   *  default is miter
   * @name Konva.Shape#lineJoin
   * @method
   * @param {String} lineJoin
   * @returns {String}
   * @example
   * // get line join
   * var lineJoin = shape.lineJoin();
   *
   * // set line join
   * shape.lineJoin('round');
   */
  Factory.addGetterSetter(Shape, 'lineCap');
  /**
   * get/set line cap.  Can be butt, round, or square
   * @name Konva.Shape#lineCap
   * @method
   * @param {String} lineCap
   * @returns {String}
   * @example
   * // get line cap
   * var lineCap = shape.lineCap();
   *
   * // set line cap
   * shape.lineCap('round');
   */
  Factory.addGetterSetter(Shape, 'sceneFunc');
  /**
   * get/set scene draw function. That function is used to draw the shape on a canvas.
   * Also that function will be used to draw hit area of the shape, in case if hitFunc is not defined.
   * @name Konva.Shape#sceneFunc
   * @method
   * @param {Function} drawFunc drawing function
   * @returns {Function}
   * @example
   * // get scene draw function
   * var sceneFunc = shape.sceneFunc();
   *
   * // set scene draw function
   * shape.sceneFunc(function(context, shape) {
   *   context.beginPath();
   *   context.rect(0, 0, shape.width(), shape.height());
   *   context.closePath();
   *   // important Konva method that fill and stroke shape from its properties
   *   // like stroke and fill
   *   context.fillStrokeShape(shape);
   * });
   */
  Factory.addGetterSetter(Shape, 'hitFunc');
  /**
   * get/set hit draw function. That function is used to draw custom hit area of a shape.
   * @name Konva.Shape#hitFunc
   * @method
   * @param {Function} drawFunc drawing function
   * @returns {Function}
   * @example
   * // get hit draw function
   * var hitFunc = shape.hitFunc();
   *
   * // set hit draw function
   * shape.hitFunc(function(context) {
   *   context.beginPath();
   *   context.rect(0, 0, shape.width(), shape.height());
   *   context.closePath();
   *   // important Konva method that fill and stroke shape from its properties
   *   context.fillStrokeShape(shape);
   * });
   */
  Factory.addGetterSetter(Shape, 'dash');
  /**
   * get/set dash array for stroke.
   * @name Konva.Shape#dash
   * @method
   * @param {Array} dash
   * @returns {Array}
   * @example
   *  // apply dashed stroke that is 10px long and 5 pixels apart
   *  line.dash([10, 5]);
   *  // apply dashed stroke that is made up of alternating dashed
   *  // lines that are 10px long and 20px apart, and dots that have
   *  // a radius of 5px and are 20px apart
   *  line.dash([10, 20, 0.001, 20]);
   */
  Factory.addGetterSetter(Shape, 'dashOffset', 0, getNumberValidator());
  /**
   * get/set dash offset for stroke.
   * @name Konva.Shape#dash
   * @method
   * @param {Number} dash offset
   * @returns {Number}
   * @example
   *  // apply dashed stroke that is 10px long and 5 pixels apart with an offset of 5px
   *  line.dash([10, 5]);
   *  line.dashOffset(5);
   */
  Factory.addGetterSetter(Shape, 'shadowColor', undefined, getStringValidator());
  /**
   * get/set shadow color
   * @name Konva.Shape#shadowColor
   * @method
   * @param {String} color
   * @returns {String}
   * @example
   * // get shadow color
   * var shadow = shape.shadowColor();
   *
   * // set shadow color with color string
   * shape.shadowColor('green');
   *
   * // set shadow color with hex
   * shape.shadowColor('#00ff00');
   *
   * // set shadow color with rgb
   * shape.shadowColor('rgb(0,255,0)');
   *
   * // set shadow color with rgba and make it 50% opaque
   * shape.shadowColor('rgba(0,255,0,0.5');
   */
  Factory.addGetterSetter(Shape, 'shadowBlur', 0, getNumberValidator());
  /**
   * get/set shadow blur
   * @name Konva.Shape#shadowBlur
   * @method
   * @param {Number} blur
   * @returns {Number}
   * @example
   * // get shadow blur
   * var shadowBlur = shape.shadowBlur();
   *
   * // set shadow blur
   * shape.shadowBlur(10);
   */
  Factory.addGetterSetter(Shape, 'shadowOpacity', 1, getNumberValidator());
  /**
   * get/set shadow opacity.  must be a value between 0 and 1
   * @name Konva.Shape#shadowOpacity
   * @method
   * @param {Number} opacity
   * @returns {Number}
   * @example
   * // get shadow opacity
   * var shadowOpacity = shape.shadowOpacity();
   *
   * // set shadow opacity
   * shape.shadowOpacity(0.5);
   */
  Factory.addComponentsGetterSetter(Shape, 'shadowOffset', ['x', 'y']);
  /**
   * get/set shadow offset
   * @name Konva.Shape#shadowOffset
   * @method
   * @param {Object} offset
   * @param {Number} offset.x
   * @param {Number} offset.y
   * @returns {Object}
   * @example
   * // get shadow offset
   * var shadowOffset = shape.shadowOffset();
   *
   * // set shadow offset
   * shape.shadowOffset({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addGetterSetter(Shape, 'shadowOffsetX', 0, getNumberValidator());
  /**
   * get/set shadow offset x
   * @name Konva.Shape#shadowOffsetX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get shadow offset x
   * var shadowOffsetX = shape.shadowOffsetX();
   *
   * // set shadow offset x
   * shape.shadowOffsetX(5);
   */
  Factory.addGetterSetter(Shape, 'shadowOffsetY', 0, getNumberValidator());
  /**
   * get/set shadow offset y
   * @name Konva.Shape#shadowOffsetY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get shadow offset y
   * var shadowOffsetY = shape.shadowOffsetY();
   *
   * // set shadow offset y
   * shape.shadowOffsetY(5);
   */
  Factory.addGetterSetter(Shape, 'fillPatternImage');
  /**
   * get/set fill pattern image
   * @name Konva.Shape#fillPatternImage
   * @method
   * @param {Image} image object
   * @returns {Image}
   * @example
   * // get fill pattern image
   * var fillPatternImage = shape.fillPatternImage();
   *
   * // set fill pattern image
   * var imageObj = new Image();
   * imageObj.onload = function() {
   *   shape.fillPatternImage(imageObj);
   * };
   * imageObj.src = 'path/to/image/jpg';
   */
  Factory.addGetterSetter(Shape, 'fill', undefined, getStringOrGradientValidator());
  /**
   * get/set fill color
   * @name Konva.Shape#fill
   * @method
   * @param {String} color
   * @returns {String}
   * @example
   * // get fill color
   * var fill = shape.fill();
   *
   * // set fill color with color string
   * shape.fill('green');
   *
   * // set fill color with hex
   * shape.fill('#00ff00');
   *
   * // set fill color with rgb
   * shape.fill('rgb(0,255,0)');
   *
   * // set fill color with rgba and make it 50% opaque
   * shape.fill('rgba(0,255,0,0.5');
   *
   * // shape without fill
   * shape.fill(null);
   */
  Factory.addGetterSetter(Shape, 'fillPatternX', 0, getNumberValidator());
  /**
   * get/set fill pattern x
   * @name Konva.Shape#fillPatternX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get fill pattern x
   * var fillPatternX = shape.fillPatternX();
   * // set fill pattern x
   * shape.fillPatternX(20);
   */
  Factory.addGetterSetter(Shape, 'fillPatternY', 0, getNumberValidator());
  /**
   * get/set fill pattern y
   * @name Konva.Shape#fillPatternY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get fill pattern y
   * var fillPatternY = shape.fillPatternY();
   * // set fill pattern y
   * shape.fillPatternY(20);
   */
  Factory.addGetterSetter(Shape, 'fillLinearGradientColorStops');
  /**
   * get/set fill linear gradient color stops
   * @name Konva.Shape#fillLinearGradientColorStops
   * @method
   * @param {Array} colorStops
   * @returns {Array} colorStops
   * @example
   * // get fill linear gradient color stops
   * var colorStops = shape.fillLinearGradientColorStops();
   *
   * // create a linear gradient that starts with red, changes to blue
   * // halfway through, and then changes to green
   * shape.fillLinearGradientColorStops(0, 'red', 0.5, 'blue', 1, 'green');
   */
  Factory.addGetterSetter(Shape, 'strokeLinearGradientColorStops');
  /**
   * get/set stroke linear gradient color stops
   * @name Konva.Shape#strokeLinearGradientColorStops
   * @method
   * @param {Array} colorStops
   * @returns {Array} colorStops
   * @example
   * // get stroke linear gradient color stops
   * var colorStops = shape.strokeLinearGradientColorStops();
   *
   * // create a linear gradient that starts with red, changes to blue
   * // halfway through, and then changes to green
   * shape.strokeLinearGradientColorStops([0, 'red', 0.5, 'blue', 1, 'green']);
   */
  Factory.addGetterSetter(Shape, 'fillRadialGradientStartRadius', 0);
  /**
   * get/set fill radial gradient start radius
   * @name Konva.Shape#fillRadialGradientStartRadius
   * @method
   * @param {Number} radius
   * @returns {Number}
   * @example
   * // get radial gradient start radius
   * var startRadius = shape.fillRadialGradientStartRadius();
   *
   * // set radial gradient start radius
   * shape.fillRadialGradientStartRadius(0);
   */
  Factory.addGetterSetter(Shape, 'fillRadialGradientEndRadius', 0);
  /**
   * get/set fill radial gradient end radius
   * @name Konva.Shape#fillRadialGradientEndRadius
   * @method
   * @param {Number} radius
   * @returns {Number}
   * @example
   * // get radial gradient end radius
   * var endRadius = shape.fillRadialGradientEndRadius();
   *
   * // set radial gradient end radius
   * shape.fillRadialGradientEndRadius(100);
   */
  Factory.addGetterSetter(Shape, 'fillRadialGradientColorStops');
  /**
   * get/set fill radial gradient color stops
   * @name Konva.Shape#fillRadialGradientColorStops
   * @method
   * @param {Number} colorStops
   * @returns {Array}
   * @example
   * // get fill radial gradient color stops
   * var colorStops = shape.fillRadialGradientColorStops();
   *
   * // create a radial gradient that starts with red, changes to blue
   * // halfway through, and then changes to green
   * shape.fillRadialGradientColorStops(0, 'red', 0.5, 'blue', 1, 'green');
   */
  Factory.addGetterSetter(Shape, 'fillPatternRepeat', 'repeat');
  /**
   * get/set fill pattern repeat.  Can be 'repeat', 'repeat-x', 'repeat-y', or 'no-repeat'.  The default is 'repeat'
   * @name Konva.Shape#fillPatternRepeat
   * @method
   * @param {String} repeat
   * @returns {String}
   * @example
   * // get fill pattern repeat
   * var repeat = shape.fillPatternRepeat();
   *
   * // repeat pattern in x direction only
   * shape.fillPatternRepeat('repeat-x');
   *
   * // do not repeat the pattern
   * shape.fillPatternRepeat('no-repeat');
   */
  Factory.addGetterSetter(Shape, 'fillEnabled', true);
  /**
   * get/set fill enabled flag
   * @name Konva.Shape#fillEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get fill enabled flag
   * var fillEnabled = shape.fillEnabled();
   *
   * // disable fill
   * shape.fillEnabled(false);
   *
   * // enable fill
   * shape.fillEnabled(true);
   */
  Factory.addGetterSetter(Shape, 'strokeEnabled', true);
  /**
   * get/set stroke enabled flag
   * @name Konva.Shape#strokeEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get stroke enabled flag
   * var strokeEnabled = shape.strokeEnabled();
   *
   * // disable stroke
   * shape.strokeEnabled(false);
   *
   * // enable stroke
   * shape.strokeEnabled(true);
   */
  Factory.addGetterSetter(Shape, 'shadowEnabled', true);
  /**
   * get/set shadow enabled flag
   * @name Konva.Shape#shadowEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get shadow enabled flag
   * var shadowEnabled = shape.shadowEnabled();
   *
   * // disable shadow
   * shape.shadowEnabled(false);
   *
   * // enable shadow
   * shape.shadowEnabled(true);
   */
  Factory.addGetterSetter(Shape, 'dashEnabled', true);
  /**
   * get/set dash enabled flag
   * @name Konva.Shape#dashEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get dash enabled flag
   * var dashEnabled = shape.dashEnabled();
   *
   * // disable dash
   * shape.dashEnabled(false);
   *
   * // enable dash
   * shape.dashEnabled(true);
   */
  Factory.addGetterSetter(Shape, 'strokeScaleEnabled', true);
  /**
   * get/set strokeScale enabled flag
   * @name Konva.Shape#strokeScaleEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get stroke scale enabled flag
   * var strokeScaleEnabled = shape.strokeScaleEnabled();
   *
   * // disable stroke scale
   * shape.strokeScaleEnabled(false);
   *
   * // enable stroke scale
   * shape.strokeScaleEnabled(true);
   */
  Factory.addGetterSetter(Shape, 'fillPriority', 'color');
  /**
   * get/set fill priority.  can be color, pattern, linear-gradient, or radial-gradient.  The default is color.
   *   This is handy if you want to toggle between different fill types.
   * @name Konva.Shape#fillPriority
   * @method
   * @param {String} priority
   * @returns {String}
   * @example
   * // get fill priority
   * var fillPriority = shape.fillPriority();
   *
   * // set fill priority
   * shape.fillPriority('linear-gradient');
   */
  Factory.addComponentsGetterSetter(Shape, 'fillPatternOffset', ['x', 'y']);
  /**
   * get/set fill pattern offset
   * @name Konva.Shape#fillPatternOffset
   * @method
   * @param {Object} offset
   * @param {Number} offset.x
   * @param {Number} offset.y
   * @returns {Object}
   * @example
   * // get fill pattern offset
   * var patternOffset = shape.fillPatternOffset();
   *
   * // set fill pattern offset
   * shape.fillPatternOffset({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addGetterSetter(Shape, 'fillPatternOffsetX', 0, getNumberValidator());
  /**
   * get/set fill pattern offset x
   * @name Konva.Shape#fillPatternOffsetX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get fill pattern offset x
   * var patternOffsetX = shape.fillPatternOffsetX();
   *
   * // set fill pattern offset x
   * shape.fillPatternOffsetX(20);
   */
  Factory.addGetterSetter(Shape, 'fillPatternOffsetY', 0, getNumberValidator());
  /**
   * get/set fill pattern offset y
   * @name Konva.Shape#fillPatternOffsetY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get fill pattern offset y
   * var patternOffsetY = shape.fillPatternOffsetY();
   *
   * // set fill pattern offset y
   * shape.fillPatternOffsetY(10);
   */
  Factory.addComponentsGetterSetter(Shape, 'fillPatternScale', ['x', 'y']);
  /**
   * get/set fill pattern scale
   * @name Konva.Shape#fillPatternScale
   * @method
   * @param {Object} scale
   * @param {Number} scale.x
   * @param {Number} scale.y
   * @returns {Object}
   * @example
   * // get fill pattern scale
   * var patternScale = shape.fillPatternScale();
   *
   * // set fill pattern scale
   * shape.fillPatternScale({
   *   x: 2,
   *   y: 2
   * });
   */
  Factory.addGetterSetter(Shape, 'fillPatternScaleX', 1, getNumberValidator());
  /**
   * get/set fill pattern scale x
   * @name Konva.Shape#fillPatternScaleX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get fill pattern scale x
   * var patternScaleX = shape.fillPatternScaleX();
   *
   * // set fill pattern scale x
   * shape.fillPatternScaleX(2);
   */
  Factory.addGetterSetter(Shape, 'fillPatternScaleY', 1, getNumberValidator());
  /**
   * get/set fill pattern scale y
   * @name Konva.Shape#fillPatternScaleY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get fill pattern scale y
   * var patternScaleY = shape.fillPatternScaleY();
   *
   * // set fill pattern scale y
   * shape.fillPatternScaleY(2);
   */
  Factory.addComponentsGetterSetter(Shape, 'fillLinearGradientStartPoint', [
      'x',
      'y',
  ]);
  /**
   * get/set fill linear gradient start point
   * @name Konva.Shape#fillLinearGradientStartPoint
   * @method
   * @param {Object} startPoint
   * @param {Number} startPoint.x
   * @param {Number} startPoint.y
   * @returns {Object}
   * @example
   * // get fill linear gradient start point
   * var startPoint = shape.fillLinearGradientStartPoint();
   *
   * // set fill linear gradient start point
   * shape.fillLinearGradientStartPoint({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addComponentsGetterSetter(Shape, 'strokeLinearGradientStartPoint', [
      'x',
      'y',
  ]);
  /**
   * get/set stroke linear gradient start point
   * @name Konva.Shape#strokeLinearGradientStartPoint
   * @method
   * @param {Object} startPoint
   * @param {Number} startPoint.x
   * @param {Number} startPoint.y
   * @returns {Object}
   * @example
   * // get stroke linear gradient start point
   * var startPoint = shape.strokeLinearGradientStartPoint();
   *
   * // set stroke linear gradient start point
   * shape.strokeLinearGradientStartPoint({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addGetterSetter(Shape, 'fillLinearGradientStartPointX', 0);
  /**
   * get/set fill linear gradient start point x
   * @name Konva.Shape#fillLinearGradientStartPointX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get fill linear gradient start point x
   * var startPointX = shape.fillLinearGradientStartPointX();
   *
   * // set fill linear gradient start point x
   * shape.fillLinearGradientStartPointX(20);
   */
  Factory.addGetterSetter(Shape, 'strokeLinearGradientStartPointX', 0);
  /**
   * get/set stroke linear gradient start point x
   * @name Konva.Shape#linearLinearGradientStartPointX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get stroke linear gradient start point x
   * var startPointX = shape.strokeLinearGradientStartPointX();
   *
   * // set stroke linear gradient start point x
   * shape.strokeLinearGradientStartPointX(20);
   */
  Factory.addGetterSetter(Shape, 'fillLinearGradientStartPointY', 0);
  /**
   * get/set fill linear gradient start point y
   * @name Konva.Shape#fillLinearGradientStartPointY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get fill linear gradient start point y
   * var startPointY = shape.fillLinearGradientStartPointY();
   *
   * // set fill linear gradient start point y
   * shape.fillLinearGradientStartPointY(20);
   */
  Factory.addGetterSetter(Shape, 'strokeLinearGradientStartPointY', 0);
  /**
   * get/set stroke linear gradient start point y
   * @name Konva.Shape#strokeLinearGradientStartPointY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get stroke linear gradient start point y
   * var startPointY = shape.strokeLinearGradientStartPointY();
   *
   * // set stroke linear gradient start point y
   * shape.strokeLinearGradientStartPointY(20);
   */
  Factory.addComponentsGetterSetter(Shape, 'fillLinearGradientEndPoint', [
      'x',
      'y',
  ]);
  /**
   * get/set fill linear gradient end point
   * @name Konva.Shape#fillLinearGradientEndPoint
   * @method
   * @param {Object} endPoint
   * @param {Number} endPoint.x
   * @param {Number} endPoint.y
   * @returns {Object}
   * @example
   * // get fill linear gradient end point
   * var endPoint = shape.fillLinearGradientEndPoint();
   *
   * // set fill linear gradient end point
   * shape.fillLinearGradientEndPoint({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addComponentsGetterSetter(Shape, 'strokeLinearGradientEndPoint', [
      'x',
      'y',
  ]);
  /**
   * get/set stroke linear gradient end point
   * @name Konva.Shape#strokeLinearGradientEndPoint
   * @method
   * @param {Object} endPoint
   * @param {Number} endPoint.x
   * @param {Number} endPoint.y
   * @returns {Object}
   * @example
   * // get stroke linear gradient end point
   * var endPoint = shape.strokeLinearGradientEndPoint();
   *
   * // set stroke linear gradient end point
   * shape.strokeLinearGradientEndPoint({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addGetterSetter(Shape, 'fillLinearGradientEndPointX', 0);
  /**
   * get/set fill linear gradient end point x
   * @name Konva.Shape#fillLinearGradientEndPointX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get fill linear gradient end point x
   * var endPointX = shape.fillLinearGradientEndPointX();
   *
   * // set fill linear gradient end point x
   * shape.fillLinearGradientEndPointX(20);
   */
  Factory.addGetterSetter(Shape, 'strokeLinearGradientEndPointX', 0);
  /**
   * get/set fill linear gradient end point x
   * @name Konva.Shape#strokeLinearGradientEndPointX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get stroke linear gradient end point x
   * var endPointX = shape.strokeLinearGradientEndPointX();
   *
   * // set stroke linear gradient end point x
   * shape.strokeLinearGradientEndPointX(20);
   */
  Factory.addGetterSetter(Shape, 'fillLinearGradientEndPointY', 0);
  /**
   * get/set fill linear gradient end point y
   * @name Konva.Shape#fillLinearGradientEndPointY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get fill linear gradient end point y
   * var endPointY = shape.fillLinearGradientEndPointY();
   *
   * // set fill linear gradient end point y
   * shape.fillLinearGradientEndPointY(20);
   */
  Factory.addGetterSetter(Shape, 'strokeLinearGradientEndPointY', 0);
  /**
   * get/set stroke linear gradient end point y
   * @name Konva.Shape#strokeLinearGradientEndPointY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get stroke linear gradient end point y
   * var endPointY = shape.strokeLinearGradientEndPointY();
   *
   * // set stroke linear gradient end point y
   * shape.strokeLinearGradientEndPointY(20);
   */
  Factory.addComponentsGetterSetter(Shape, 'fillRadialGradientStartPoint', [
      'x',
      'y',
  ]);
  /**
   * get/set fill radial gradient start point
   * @name Konva.Shape#fillRadialGradientStartPoint
   * @method
   * @param {Object} startPoint
   * @param {Number} startPoint.x
   * @param {Number} startPoint.y
   * @returns {Object}
   * @example
   * // get fill radial gradient start point
   * var startPoint = shape.fillRadialGradientStartPoint();
   *
   * // set fill radial gradient start point
   * shape.fillRadialGradientStartPoint({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addGetterSetter(Shape, 'fillRadialGradientStartPointX', 0);
  /**
   * get/set fill radial gradient start point x
   * @name Konva.Shape#fillRadialGradientStartPointX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get fill radial gradient start point x
   * var startPointX = shape.fillRadialGradientStartPointX();
   *
   * // set fill radial gradient start point x
   * shape.fillRadialGradientStartPointX(20);
   */
  Factory.addGetterSetter(Shape, 'fillRadialGradientStartPointY', 0);
  /**
   * get/set fill radial gradient start point y
   * @name Konva.Shape#fillRadialGradientStartPointY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get fill radial gradient start point y
   * var startPointY = shape.fillRadialGradientStartPointY();
   *
   * // set fill radial gradient start point y
   * shape.fillRadialGradientStartPointY(20);
   */
  Factory.addComponentsGetterSetter(Shape, 'fillRadialGradientEndPoint', [
      'x',
      'y',
  ]);
  /**
   * get/set fill radial gradient end point
   * @name Konva.Shape#fillRadialGradientEndPoint
   * @method
   * @param {Object} endPoint
   * @param {Number} endPoint.x
   * @param {Number} endPoint.y
   * @returns {Object}
   * @example
   * // get fill radial gradient end point
   * var endPoint = shape.fillRadialGradientEndPoint();
   *
   * // set fill radial gradient end point
   * shape.fillRadialGradientEndPoint({
   *   x: 20,
   *   y: 10
   * });
   */
  Factory.addGetterSetter(Shape, 'fillRadialGradientEndPointX', 0);
  /**
   * get/set fill radial gradient end point x
   * @name Konva.Shape#fillRadialGradientEndPointX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get fill radial gradient end point x
   * var endPointX = shape.fillRadialGradientEndPointX();
   *
   * // set fill radial gradient end point x
   * shape.fillRadialGradientEndPointX(20);
   */
  Factory.addGetterSetter(Shape, 'fillRadialGradientEndPointY', 0);
  /**
   * get/set fill radial gradient end point y
   * @name Konva.Shape#fillRadialGradientEndPointY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get fill radial gradient end point y
   * var endPointY = shape.fillRadialGradientEndPointY();
   *
   * // set fill radial gradient end point y
   * shape.fillRadialGradientEndPointY(20);
   */
  Factory.addGetterSetter(Shape, 'fillPatternRotation', 0);
  /**
   * get/set fill pattern rotation in degrees
   * @name Konva.Shape#fillPatternRotation
   * @method
   * @param {Number} rotation
   * @returns {Konva.Shape}
   * @example
   * // get fill pattern rotation
   * var patternRotation = shape.fillPatternRotation();
   *
   * // set fill pattern rotation
   * shape.fillPatternRotation(20);
   */
  Factory.addGetterSetter(Shape, 'fillRule', undefined, getStringValidator());
  /**
   * get/set fill rule
   * @name Konva.Shape#fillRule
   * @method
   * @param {CanvasFillRule} rotation
   * @returns {Konva.Shape}
   * @example
   * // get fill rule
   * var fillRule = shape.fillRule();
   *
   * // set fill rule
   * shape.fillRule('evenodd');
   */
  Factory.backCompat(Shape, {
      dashArray: 'dash',
      getDashArray: 'getDash',
      setDashArray: 'getDash',
      drawFunc: 'sceneFunc',
      getDrawFunc: 'getSceneFunc',
      setDrawFunc: 'setSceneFunc',
      drawHitFunc: 'hitFunc',
      getDrawHitFunc: 'getHitFunc',
      setDrawHitFunc: 'setHitFunc',
  });

  // constants
  const HASH = '#', BEFORE_DRAW = 'beforeDraw', DRAW = 'draw', 
  /*
   * 2 - 3 - 4
   * |       |
   * 1 - 0   5
   *         |
   * 8 - 7 - 6
   */
  INTERSECTION_OFFSETS = [
      { x: 0, y: 0 }, // 0
      { x: -1, y: -1 }, // 2
      { x: 1, y: -1 }, // 4
      { x: 1, y: 1 }, // 6
      { x: -1, y: 1 }, // 8
  ], INTERSECTION_OFFSETS_LEN = INTERSECTION_OFFSETS.length;
  /**
   * Layer constructor.  Layers are tied to their own canvas element and are used
   * to contain groups or shapes.
   * @constructor
   * @memberof Konva
   * @augments Konva.Container
   * @param {Object} config
   * @param {Boolean} [config.clearBeforeDraw] set this property to false if you don't want
   * to clear the canvas before each layer draw.  The default value is true.
   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * * @param {Object} [config.clip] set clip
     * @param {Number} [config.clipX] set clip x
     * @param {Number} [config.clipY] set clip y
     * @param {Number} [config.clipWidth] set clip width
     * @param {Number} [config.clipHeight] set clip height
     * @param {Function} [config.clipFunc] set clip func

   * @example
   * var layer = new Konva.Layer();
   * stage.add(layer);
   * // now you can add shapes, groups into the layer
   */
  class Layer extends Container {
      constructor(config) {
          super(config);
          this.canvas = new SceneCanvas();
          this.hitCanvas = new HitCanvas({
              pixelRatio: 1,
          });
          this._waitingForDraw = false;
          this.on('visibleChange.konva', this._checkVisibility);
          this._checkVisibility();
          this.on('imageSmoothingEnabledChange.konva', this._setSmoothEnabled);
          this._setSmoothEnabled();
      }
      // for nodejs?
      createPNGStream() {
          const c = this.canvas._canvas;
          return c.createPNGStream();
      }
      /**
       * get layer canvas wrapper
       * @method
       * @name Konva.Layer#getCanvas
       */
      getCanvas() {
          return this.canvas;
      }
      /**
       * get native canvas element
       * @method
       * @name Konva.Layer#getNativeCanvasElement
       */
      getNativeCanvasElement() {
          return this.canvas._canvas;
      }
      /**
       * get layer hit canvas
       * @method
       * @name Konva.Layer#getHitCanvas
       */
      getHitCanvas() {
          return this.hitCanvas;
      }
      /**
       * get layer canvas context
       * @method
       * @name Konva.Layer#getContext
       */
      getContext() {
          return this.getCanvas().getContext();
      }
      // TODO: deprecate this method
      clear(bounds) {
          this.getContext().clear(bounds);
          this.getHitCanvas().getContext().clear(bounds);
          return this;
      }
      // extend Node.prototype.setZIndex
      setZIndex(index) {
          super.setZIndex(index);
          const stage = this.getStage();
          if (stage && stage.content) {
              stage.content.removeChild(this.getNativeCanvasElement());
              if (index < stage.children.length - 1) {
                  stage.content.insertBefore(this.getNativeCanvasElement(), stage.children[index + 1].getCanvas()._canvas);
              }
              else {
                  stage.content.appendChild(this.getNativeCanvasElement());
              }
          }
          return this;
      }
      moveToTop() {
          Node.prototype.moveToTop.call(this);
          const stage = this.getStage();
          if (stage && stage.content) {
              stage.content.removeChild(this.getNativeCanvasElement());
              stage.content.appendChild(this.getNativeCanvasElement());
          }
          return true;
      }
      moveUp() {
          const moved = Node.prototype.moveUp.call(this);
          if (!moved) {
              return false;
          }
          const stage = this.getStage();
          if (!stage || !stage.content) {
              return false;
          }
          stage.content.removeChild(this.getNativeCanvasElement());
          if (this.index < stage.children.length - 1) {
              stage.content.insertBefore(this.getNativeCanvasElement(), stage.children[this.index + 1].getCanvas()._canvas);
          }
          else {
              stage.content.appendChild(this.getNativeCanvasElement());
          }
          return true;
      }
      // extend Node.prototype.moveDown
      moveDown() {
          if (Node.prototype.moveDown.call(this)) {
              const stage = this.getStage();
              if (stage) {
                  const children = stage.children;
                  if (stage.content) {
                      stage.content.removeChild(this.getNativeCanvasElement());
                      stage.content.insertBefore(this.getNativeCanvasElement(), children[this.index + 1].getCanvas()._canvas);
                  }
              }
              return true;
          }
          return false;
      }
      // extend Node.prototype.moveToBottom
      moveToBottom() {
          if (Node.prototype.moveToBottom.call(this)) {
              const stage = this.getStage();
              if (stage) {
                  const children = stage.children;
                  if (stage.content) {
                      stage.content.removeChild(this.getNativeCanvasElement());
                      stage.content.insertBefore(this.getNativeCanvasElement(), children[1].getCanvas()._canvas);
                  }
              }
              return true;
          }
          return false;
      }
      getLayer() {
          return this;
      }
      remove() {
          const _canvas = this.getNativeCanvasElement();
          Node.prototype.remove.call(this);
          if (_canvas && _canvas.parentNode && Util._isInDocument(_canvas)) {
              _canvas.parentNode.removeChild(_canvas);
          }
          return this;
      }
      getStage() {
          return this.parent;
      }
      setSize({ width, height }) {
          this.canvas.setSize(width, height);
          this.hitCanvas.setSize(width, height);
          this._setSmoothEnabled();
          return this;
      }
      _validateAdd(child) {
          const type = child.getType();
          if (type !== 'Group' && type !== 'Shape') {
              Util.throw('You may only add groups and shapes to a layer.');
          }
      }
      _toKonvaCanvas(config) {
          config = config || {};
          config.width = config.width || this.getWidth();
          config.height = config.height || this.getHeight();
          config.x = config.x !== undefined ? config.x : this.x();
          config.y = config.y !== undefined ? config.y : this.y();
          return Node.prototype._toKonvaCanvas.call(this, config);
      }
      _checkVisibility() {
          const visible = this.visible();
          if (visible) {
              this.canvas._canvas.style.display = 'block';
          }
          else {
              this.canvas._canvas.style.display = 'none';
          }
      }
      _setSmoothEnabled() {
          this.getContext()._context.imageSmoothingEnabled =
              this.imageSmoothingEnabled();
      }
      /**
       * get/set width of layer. getter return width of stage. setter doing nothing.
       * if you want change width use `stage.width(value);`
       * @name Konva.Layer#width
       * @method
       * @returns {Number}
       * @example
       * var width = layer.width();
       */
      getWidth() {
          if (this.parent) {
              return this.parent.width();
          }
      }
      setWidth() {
          Util.warn('Can not change width of layer. Use "stage.width(value)" function instead.');
      }
      /**
       * get/set height of layer.getter return height of stage. setter doing nothing.
       * if you want change height use `stage.height(value);`
       * @name Konva.Layer#height
       * @method
       * @returns {Number}
       * @example
       * var height = layer.height();
       */
      getHeight() {
          if (this.parent) {
              return this.parent.height();
          }
      }
      setHeight() {
          Util.warn('Can not change height of layer. Use "stage.height(value)" function instead.');
      }
      /**
       * batch draw. this function will not do immediate draw
       * but it will schedule drawing to next tick (requestAnimFrame)
       * @method
       * @name Konva.Layer#batchDraw
       * @return {Konva.Layer} this
       */
      batchDraw() {
          if (!this._waitingForDraw) {
              this._waitingForDraw = true;
              Util.requestAnimFrame(() => {
                  this.draw();
                  this._waitingForDraw = false;
              });
          }
          return this;
      }
      /**
       * get visible intersection shape. This is the preferred
       * method for determining if a point intersects a shape or not
       * also you may pass optional selector parameter to return ancestor of intersected shape
       * nodes with listening set to false will not be detected
       * @method
       * @name Konva.Layer#getIntersection
       * @param {Object} pos
       * @param {Number} pos.x
       * @param {Number} pos.y
       * @returns {Konva.Node}
       * @example
       * var shape = layer.getIntersection({x: 50, y: 50});
       */
      getIntersection(pos) {
          if (!this.isListening() || !this.isVisible()) {
              return null;
          }
          // in some cases antialiased area may be bigger than 1px
          // it is possible if we will cache node, then scale it a lot
          let spiralSearchDistance = 1;
          let continueSearch = false;
          while (true) {
              for (let i = 0; i < INTERSECTION_OFFSETS_LEN; i++) {
                  const intersectionOffset = INTERSECTION_OFFSETS[i];
                  const obj = this._getIntersection({
                      x: pos.x + intersectionOffset.x * spiralSearchDistance,
                      y: pos.y + intersectionOffset.y * spiralSearchDistance,
                  });
                  const shape = obj.shape;
                  if (shape) {
                      return shape;
                  }
                  // we should continue search if we found antialiased pixel
                  // that means our node somewhere very close
                  continueSearch = !!obj.antialiased;
                  // stop search if found empty pixel
                  if (!obj.antialiased) {
                      break;
                  }
              }
              // if no shape, and no antialiased pixel, we should end searching
              if (continueSearch) {
                  spiralSearchDistance += 1;
              }
              else {
                  return null;
              }
          }
      }
      _getIntersection(pos) {
          const ratio = this.hitCanvas.pixelRatio;
          const p = this.hitCanvas.context.getImageData(Math.round(pos.x * ratio), Math.round(pos.y * ratio), 1, 1).data;
          const p3 = p[3];
          // fully opaque pixel
          if (p3 === 255) {
              const colorKey = Util._rgbToHex(p[0], p[1], p[2]);
              const shape = shapes[HASH + colorKey];
              if (shape) {
                  return {
                      shape: shape,
                  };
              }
              return {
                  antialiased: true,
              };
          }
          else if (p3 > 0) {
              // antialiased pixel
              return {
                  antialiased: true,
              };
          }
          // empty pixel
          return {};
      }
      drawScene(can, top, bufferCanvas) {
          const layer = this.getLayer(), canvas = can || (layer && layer.getCanvas());
          this._fire(BEFORE_DRAW, {
              node: this,
          });
          if (this.clearBeforeDraw()) {
              canvas.getContext().clear();
          }
          Container.prototype.drawScene.call(this, canvas, top, bufferCanvas);
          this._fire(DRAW, {
              node: this,
          });
          return this;
      }
      drawHit(can, top) {
          const layer = this.getLayer(), canvas = can || (layer && layer.hitCanvas);
          if (layer && layer.clearBeforeDraw()) {
              layer.getHitCanvas().getContext().clear();
          }
          Container.prototype.drawHit.call(this, canvas, top);
          return this;
      }
      /**
       * enable hit graph. **DEPRECATED!** Use `layer.listening(true)` instead.
       * @name Konva.Layer#enableHitGraph
       * @method
       * @returns {Layer}
       */
      enableHitGraph() {
          this.hitGraphEnabled(true);
          return this;
      }
      /**
       * disable hit graph. **DEPRECATED!** Use `layer.listening(false)` instead.
       * @name Konva.Layer#disableHitGraph
       * @method
       * @returns {Layer}
       */
      disableHitGraph() {
          this.hitGraphEnabled(false);
          return this;
      }
      setHitGraphEnabled(val) {
          Util.warn('hitGraphEnabled method is deprecated. Please use layer.listening() instead.');
          this.listening(val);
      }
      getHitGraphEnabled(val) {
          Util.warn('hitGraphEnabled method is deprecated. Please use layer.listening() instead.');
          return this.listening();
      }
      /**
       * Show or hide hit canvas over the stage. May be useful for debugging custom hitFunc
       * @name Konva.Layer#toggleHitCanvas
       * @method
       */
      toggleHitCanvas() {
          if (!this.parent || !this.parent['content']) {
              return;
          }
          const parent = this.parent;
          const added = !!this.hitCanvas._canvas.parentNode;
          if (added) {
              parent.content.removeChild(this.hitCanvas._canvas);
          }
          else {
              parent.content.appendChild(this.hitCanvas._canvas);
          }
      }
      destroy() {
          Util.releaseCanvas(this.getNativeCanvasElement(), this.getHitCanvas()._canvas);
          return super.destroy();
      }
  }
  Layer.prototype.nodeType = 'Layer';
  _registerNode(Layer);
  /**
   * get/set imageSmoothingEnabled flag
   * For more info see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
   * @name Konva.Layer#imageSmoothingEnabled
   * @method
   * @param {Boolean} imageSmoothingEnabled
   * @returns {Boolean}
   * @example
   * // get imageSmoothingEnabled flag
   * var imageSmoothingEnabled = layer.imageSmoothingEnabled();
   *
   * layer.imageSmoothingEnabled(false);
   *
   * layer.imageSmoothingEnabled(true);
   */
  Factory.addGetterSetter(Layer, 'imageSmoothingEnabled', true);
  /**
   * get/set clearBeforeDraw flag which determines if the layer is cleared or not
   *  before drawing
   * @name Konva.Layer#clearBeforeDraw
   * @method
   * @param {Boolean} clearBeforeDraw
   * @returns {Boolean}
   * @example
   * // get clearBeforeDraw flag
   * var clearBeforeDraw = layer.clearBeforeDraw();
   *
   * // disable clear before draw
   * layer.clearBeforeDraw(false);
   *
   * // enable clear before draw
   * layer.clearBeforeDraw(true);
   */
  Factory.addGetterSetter(Layer, 'clearBeforeDraw', true);
  Factory.addGetterSetter(Layer, 'hitGraphEnabled', true, getBooleanValidator());
  /**
   * get/set hitGraphEnabled flag.  **DEPRECATED!** Use `layer.listening(false)` instead.
   *  Disabling the hit graph will greatly increase
   *  draw performance because the hit graph will not be redrawn each time the layer is
   *  drawn.  This, however, also disables mouse/touch event detection
   * @name Konva.Layer#hitGraphEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get hitGraphEnabled flag
   * var hitGraphEnabled = layer.hitGraphEnabled();
   *
   * // disable hit graph
   * layer.hitGraphEnabled(false);
   *
   * // enable hit graph
   * layer.hitGraphEnabled(true);
   */

  /**
   * FastLayer constructor. **DEPRECATED!** Please use `Konva.Layer({ listening: false})` instead. Layers are tied to their own canvas element and are used
   * to contain shapes only.  If you don't need node nesting, mouse and touch interactions,
   * or event pub/sub, you should use FastLayer instead of Layer to create your layers.
   * It renders about 2x faster than normal layers.
   *
   * @constructor
   * @memberof Konva
   * @augments Konva.Layer
   * @param {Object} [config.clip] set clip
     * @param {Number} [config.clipX] set clip x
     * @param {Number} [config.clipY] set clip y
     * @param {Number} [config.clipWidth] set clip width
     * @param {Number} [config.clipHeight] set clip height
     * @param {Function} [config.clipFunc] set clip func

   * @example
   * var layer = new Konva.FastLayer();
   */
  class FastLayer extends Layer {
      constructor(attrs) {
          super(attrs);
          this.listening(false);
          Util.warn('Konva.Fast layer is deprecated. Please use "new Konva.Layer({ listening: false })" instead.');
      }
  }
  FastLayer.prototype.nodeType = 'FastLayer';
  _registerNode(FastLayer);

  /**
   * Group constructor.  Groups are used to contain shapes or other groups.
   * @constructor
   * @memberof Konva
   * @augments Konva.Container
   * @param {Object} config
   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * * @param {Object} [config.clip] set clip
     * @param {Number} [config.clipX] set clip x
     * @param {Number} [config.clipY] set clip y
     * @param {Number} [config.clipWidth] set clip width
     * @param {Number} [config.clipHeight] set clip height
     * @param {Function} [config.clipFunc] set clip func

   * @example
   * var group = new Konva.Group();
   */
  class Group extends Container {
      _validateAdd(child) {
          const type = child.getType();
          if (type !== 'Group' && type !== 'Shape') {
              Util.throw('You may only add groups and shapes to groups.');
          }
      }
  }
  Group.prototype.nodeType = 'Group';
  _registerNode(Group);

  const now = (function () {
      if (glob.performance && glob.performance.now) {
          return function () {
              return glob.performance.now();
          };
      }
      return function () {
          return new Date().getTime();
      };
  })();
  /**
   * Animation constructor.
   * @constructor
   * @memberof Konva
   * @param {AnimationFn} func function executed on each animation frame.  The function is passed a frame object, which contains
   *  timeDiff, lastTime, time, and frameRate properties.  The timeDiff property is the number of milliseconds that have passed
   *  since the last animation frame. The time property is the time in milliseconds that elapsed from the moment the animation started
   *  to the current animation frame. The lastTime property is a `time` value from the previous frame.  The frameRate property is the current frame rate in frames / second.
   *  Return false from function, if you don't need to redraw layer/layers on some frames.
   * @param {Konva.Layer|Array} [layers] layer(s) to be redrawn on each animation frame. Can be a layer, an array of layers, or null.
   *  Not specifying a node will result in no redraw.
   * @example
   * // move a node to the right at 50 pixels / second
   * var velocity = 50;
   *
   * var anim = new Konva.Animation(function(frame) {
   *   var dist = velocity * (frame.timeDiff / 1000);
   *   node.move({x: dist, y: 0});
   * }, layer);
   *
   * anim.start();
   */
  class Animation {
      constructor(func, layers) {
          this.id = Animation.animIdCounter++;
          this.frame = {
              time: 0,
              timeDiff: 0,
              lastTime: now(),
              frameRate: 0,
          };
          this.func = func;
          this.setLayers(layers);
      }
      /**
       * set layers to be redrawn on each animation frame
       * @method
       * @name Konva.Animation#setLayers
       * @param {Konva.Layer|Array} [layers] layer(s) to be redrawn. Can be a layer, an array of layers, or null.  Not specifying a node will result in no redraw.
       * @return {Konva.Animation} this
       */
      setLayers(layers) {
          let lays = [];
          // if passing in no layers
          if (layers) {
              lays = Array.isArray(layers) ? layers : [layers];
          }
          this.layers = lays;
          return this;
      }
      /**
       * get layers
       * @method
       * @name Konva.Animation#getLayers
       * @return {Array} Array of Konva.Layer
       */
      getLayers() {
          return this.layers;
      }
      /**
       * add layer.  Returns true if the layer was added, and false if it was not
       * @method
       * @name Konva.Animation#addLayer
       * @param {Konva.Layer} layer to add
       * @return {Bool} true if layer is added to animation, otherwise false
       */
      addLayer(layer) {
          const layers = this.layers;
          const len = layers.length;
          // don't add the layer if it already exists
          for (let n = 0; n < len; n++) {
              if (layers[n]._id === layer._id) {
                  return false;
              }
          }
          this.layers.push(layer);
          return true;
      }
      /**
       * determine if animation is running or not.  returns true or false
       * @method
       * @name Konva.Animation#isRunning
       * @return {Bool} is animation running?
       */
      isRunning() {
          const a = Animation;
          const animations = a.animations;
          const len = animations.length;
          for (let n = 0; n < len; n++) {
              if (animations[n].id === this.id) {
                  return true;
              }
          }
          return false;
      }
      /**
       * start animation
       * @method
       * @name Konva.Animation#start
       * @return {Konva.Animation} this
       */
      start() {
          this.stop();
          this.frame.timeDiff = 0;
          this.frame.lastTime = now();
          Animation._addAnimation(this);
          return this;
      }
      /**
       * stop animation
       * @method
       * @name Konva.Animation#stop
       * @return {Konva.Animation} this
       */
      stop() {
          Animation._removeAnimation(this);
          return this;
      }
      _updateFrameObject(time) {
          this.frame.timeDiff = time - this.frame.lastTime;
          this.frame.lastTime = time;
          this.frame.time += this.frame.timeDiff;
          this.frame.frameRate = 1000 / this.frame.timeDiff;
      }
      static _addAnimation(anim) {
          this.animations.push(anim);
          this._handleAnimation();
      }
      static _removeAnimation(anim) {
          const id = anim.id;
          const animations = this.animations;
          const len = animations.length;
          for (let n = 0; n < len; n++) {
              if (animations[n].id === id) {
                  this.animations.splice(n, 1);
                  break;
              }
          }
      }
      static _runFrames() {
          const layerHash = {};
          const animations = this.animations;
          /*
           * loop through all animations and execute animation
           *  function.  if the animation object has specified node,
           *  we can add the node to the nodes hash to eliminate
           *  drawing the same node multiple times.  The node property
           *  can be the stage itself or a layer
           */
          /*
           * WARNING: don't cache animations.length because it could change while
           * the for loop is running, causing a JS error
           */
          for (let n = 0; n < animations.length; n++) {
              const anim = animations[n];
              const layers = anim.layers;
              const func = anim.func;
              anim._updateFrameObject(now());
              const layersLen = layers.length;
              // if animation object has a function, execute it
              let needRedraw;
              if (func) {
                  // allow anim bypassing drawing
                  needRedraw = func.call(anim, anim.frame) !== false;
              }
              else {
                  needRedraw = true;
              }
              if (!needRedraw) {
                  continue;
              }
              for (let i = 0; i < layersLen; i++) {
                  const layer = layers[i];
                  if (layer._id !== undefined) {
                      layerHash[layer._id] = layer;
                  }
              }
          }
          for (const key in layerHash) {
              if (!layerHash.hasOwnProperty(key)) {
                  continue;
              }
              layerHash[key].batchDraw();
          }
      }
      static _animationLoop() {
          const Anim = Animation;
          if (Anim.animations.length) {
              Anim._runFrames();
              Util.requestAnimFrame(Anim._animationLoop);
          }
          else {
              Anim.animRunning = false;
          }
      }
      static _handleAnimation() {
          if (!this.animRunning) {
              this.animRunning = true;
              Util.requestAnimFrame(this._animationLoop);
          }
      }
  }
  Animation.animations = [];
  Animation.animIdCounter = 0;
  Animation.animRunning = false;

  const blacklist = {
      node: 1,
      duration: 1,
      easing: 1,
      onFinish: 1,
      yoyo: 1,
  }, PAUSED = 1, PLAYING = 2, REVERSING = 3, colorAttrs = ['fill', 'stroke', 'shadowColor'];
  let idCounter = 0;
  class TweenEngine {
      constructor(prop, propFunc, func, begin, finish, duration, yoyo) {
          this.prop = prop;
          this.propFunc = propFunc;
          this.begin = begin;
          this._pos = begin;
          this.duration = duration;
          this._change = 0;
          this.prevPos = 0;
          this.yoyo = yoyo;
          this._time = 0;
          this._position = 0;
          this._startTime = 0;
          this._finish = 0;
          this.func = func;
          this._change = finish - this.begin;
          this.pause();
      }
      fire(str) {
          const handler = this[str];
          if (handler) {
              handler();
          }
      }
      setTime(t) {
          if (t > this.duration) {
              if (this.yoyo) {
                  this._time = this.duration;
                  this.reverse();
              }
              else {
                  this.finish();
              }
          }
          else if (t < 0) {
              if (this.yoyo) {
                  this._time = 0;
                  this.play();
              }
              else {
                  this.reset();
              }
          }
          else {
              this._time = t;
              this.update();
          }
      }
      getTime() {
          return this._time;
      }
      setPosition(p) {
          this.prevPos = this._pos;
          this.propFunc(p);
          this._pos = p;
      }
      getPosition(t) {
          if (t === undefined) {
              t = this._time;
          }
          return this.func(t, this.begin, this._change, this.duration);
      }
      play() {
          this.state = PLAYING;
          this._startTime = this.getTimer() - this._time;
          this.onEnterFrame();
          this.fire('onPlay');
      }
      reverse() {
          this.state = REVERSING;
          this._time = this.duration - this._time;
          this._startTime = this.getTimer() - this._time;
          this.onEnterFrame();
          this.fire('onReverse');
      }
      seek(t) {
          this.pause();
          this._time = t;
          this.update();
          this.fire('onSeek');
      }
      reset() {
          this.pause();
          this._time = 0;
          this.update();
          this.fire('onReset');
      }
      finish() {
          this.pause();
          this._time = this.duration;
          this.update();
          this.fire('onFinish');
      }
      update() {
          this.setPosition(this.getPosition(this._time));
          this.fire('onUpdate');
      }
      onEnterFrame() {
          const t = this.getTimer() - this._startTime;
          if (this.state === PLAYING) {
              this.setTime(t);
          }
          else if (this.state === REVERSING) {
              this.setTime(this.duration - t);
          }
      }
      pause() {
          this.state = PAUSED;
          this.fire('onPause');
      }
      getTimer() {
          return new Date().getTime();
      }
  }
  /**
   * Tween constructor.  Tweens enable you to animate a node between the current state and a new state.
   *  You can play, pause, reverse, seek, reset, and finish tweens.  By default, tweens are animated using
   *  a linear easing.  For more tweening options, check out {@link Konva.Easings}
   * @constructor
   * @memberof Konva
   * @example
   * // instantiate new tween which fully rotates a node in 1 second
   * var tween = new Konva.Tween({
   *   // list of tween specific properties
   *   node: node,
   *   duration: 1,
   *   easing: Konva.Easings.EaseInOut,
   *   onUpdate: () => console.log('node attrs updated')
   *   onFinish: () => console.log('finished'),
   *   // set new values for any attributes of a passed node
   *   rotation: 360,
   *   fill: 'red'
   * });
   *
   * // play tween
   * tween.play();
   *
   * // pause tween
   * tween.pause();
   */
  class Tween {
      constructor(config) {
          const that = this, node = config.node, nodeId = node._id, easing = config.easing || Easings.Linear, yoyo = !!config.yoyo;
          let duration, key;
          if (typeof config.duration === 'undefined') {
              duration = 0.3;
          }
          else if (config.duration === 0) {
              // zero is bad value for duration
              duration = 0.001;
          }
          else {
              duration = config.duration;
          }
          this.node = node;
          this._id = idCounter++;
          const layers = node.getLayer() ||
              (node instanceof Konva$2['Stage'] ? node.getLayers() : null);
          if (!layers) {
              Util.error('Tween constructor have `node` that is not in a layer. Please add node into layer first.');
          }
          this.anim = new Animation(function () {
              that.tween.onEnterFrame();
          }, layers);
          this.tween = new TweenEngine(key, function (i) {
              that._tweenFunc(i);
          }, easing, 0, 1, duration * 1000, yoyo);
          this._addListeners();
          // init attrs map
          if (!Tween.attrs[nodeId]) {
              Tween.attrs[nodeId] = {};
          }
          if (!Tween.attrs[nodeId][this._id]) {
              Tween.attrs[nodeId][this._id] = {};
          }
          // init tweens map
          if (!Tween.tweens[nodeId]) {
              Tween.tweens[nodeId] = {};
          }
          for (key in config) {
              if (blacklist[key] === undefined) {
                  this._addAttr(key, config[key]);
              }
          }
          this.reset();
          // callbacks
          this.onFinish = config.onFinish;
          this.onReset = config.onReset;
          this.onUpdate = config.onUpdate;
      }
      _addAttr(key, end) {
          const node = this.node, nodeId = node._id;
          let diff, len, trueEnd, trueStart, endRGBA;
          // remove conflict from tween map if it exists
          const tweenId = Tween.tweens[nodeId][key];
          if (tweenId) {
              delete Tween.attrs[nodeId][tweenId][key];
          }
          // add to tween map
          let start = node.getAttr(key);
          if (Util._isArray(end)) {
              diff = [];
              len = Math.max(end.length, start.length);
              if (key === 'points' && end.length !== start.length) {
                  // before tweening points we need to make sure that start.length === end.length
                  // Util._prepareArrayForTween thinking that end.length > start.length
                  if (end.length > start.length) {
                      // so in this case we will increase number of starting points
                      trueStart = start;
                      start = Util._prepareArrayForTween(start, end, node.closed());
                  }
                  else {
                      // in this case we will increase number of eding points
                      trueEnd = end;
                      end = Util._prepareArrayForTween(end, start, node.closed());
                  }
              }
              if (key.indexOf('fill') === 0) {
                  for (let n = 0; n < len; n++) {
                      if (n % 2 === 0) {
                          diff.push(end[n] - start[n]);
                      }
                      else {
                          const startRGBA = Util.colorToRGBA(start[n]);
                          endRGBA = Util.colorToRGBA(end[n]);
                          start[n] = startRGBA;
                          diff.push({
                              r: endRGBA.r - startRGBA.r,
                              g: endRGBA.g - startRGBA.g,
                              b: endRGBA.b - startRGBA.b,
                              a: endRGBA.a - startRGBA.a,
                          });
                      }
                  }
              }
              else {
                  for (let n = 0; n < len; n++) {
                      diff.push(end[n] - start[n]);
                  }
              }
          }
          else if (colorAttrs.indexOf(key) !== -1) {
              start = Util.colorToRGBA(start);
              endRGBA = Util.colorToRGBA(end);
              diff = {
                  r: endRGBA.r - start.r,
                  g: endRGBA.g - start.g,
                  b: endRGBA.b - start.b,
                  a: endRGBA.a - start.a,
              };
          }
          else {
              diff = end - start;
          }
          Tween.attrs[nodeId][this._id][key] = {
              start: start,
              diff: diff,
              end: end,
              trueEnd: trueEnd,
              trueStart: trueStart,
          };
          Tween.tweens[nodeId][key] = this._id;
      }
      _tweenFunc(i) {
          const node = this.node, attrs = Tween.attrs[node._id][this._id];
          let key, attr, start, diff, newVal, n, len, end;
          for (key in attrs) {
              attr = attrs[key];
              start = attr.start;
              diff = attr.diff;
              end = attr.end;
              if (Util._isArray(start)) {
                  newVal = [];
                  len = Math.max(start.length, end.length);
                  if (key.indexOf('fill') === 0) {
                      for (n = 0; n < len; n++) {
                          if (n % 2 === 0) {
                              newVal.push((start[n] || 0) + diff[n] * i);
                          }
                          else {
                              newVal.push('rgba(' +
                                  Math.round(start[n].r + diff[n].r * i) +
                                  ',' +
                                  Math.round(start[n].g + diff[n].g * i) +
                                  ',' +
                                  Math.round(start[n].b + diff[n].b * i) +
                                  ',' +
                                  (start[n].a + diff[n].a * i) +
                                  ')');
                          }
                      }
                  }
                  else {
                      for (n = 0; n < len; n++) {
                          newVal.push((start[n] || 0) + diff[n] * i);
                      }
                  }
              }
              else if (colorAttrs.indexOf(key) !== -1) {
                  newVal =
                      'rgba(' +
                          Math.round(start.r + diff.r * i) +
                          ',' +
                          Math.round(start.g + diff.g * i) +
                          ',' +
                          Math.round(start.b + diff.b * i) +
                          ',' +
                          (start.a + diff.a * i) +
                          ')';
              }
              else {
                  newVal = start + diff * i;
              }
              node.setAttr(key, newVal);
          }
      }
      _addListeners() {
          // start listeners
          this.tween.onPlay = () => {
              this.anim.start();
          };
          this.tween.onReverse = () => {
              this.anim.start();
          };
          // stop listeners
          this.tween.onPause = () => {
              this.anim.stop();
          };
          this.tween.onFinish = () => {
              const node = this.node;
              // after tweening  points of line we need to set original end
              const attrs = Tween.attrs[node._id][this._id];
              if (attrs.points && attrs.points.trueEnd) {
                  node.setAttr('points', attrs.points.trueEnd);
              }
              if (this.onFinish) {
                  this.onFinish.call(this);
              }
          };
          this.tween.onReset = () => {
              const node = this.node;
              // after tweening  points of line we need to set original start
              const attrs = Tween.attrs[node._id][this._id];
              if (attrs.points && attrs.points.trueStart) {
                  node.points(attrs.points.trueStart);
              }
              if (this.onReset) {
                  this.onReset();
              }
          };
          this.tween.onUpdate = () => {
              if (this.onUpdate) {
                  this.onUpdate.call(this);
              }
          };
      }
      /**
       * play
       * @method
       * @name Konva.Tween#play
       * @returns {Tween}
       */
      play() {
          this.tween.play();
          return this;
      }
      /**
       * reverse
       * @method
       * @name Konva.Tween#reverse
       * @returns {Tween}
       */
      reverse() {
          this.tween.reverse();
          return this;
      }
      /**
       * reset
       * @method
       * @name Konva.Tween#reset
       * @returns {Tween}
       */
      reset() {
          this.tween.reset();
          return this;
      }
      /**
       * seek
       * @method
       * @name Konva.Tween#seek(
       * @param {Integer} t time in seconds between 0 and the duration
       * @returns {Tween}
       */
      seek(t) {
          this.tween.seek(t * 1000);
          return this;
      }
      /**
       * pause
       * @method
       * @name Konva.Tween#pause
       * @returns {Tween}
       */
      pause() {
          this.tween.pause();
          return this;
      }
      /**
       * finish
       * @method
       * @name Konva.Tween#finish
       * @returns {Tween}
       */
      finish() {
          this.tween.finish();
          return this;
      }
      /**
       * destroy
       * @method
       * @name Konva.Tween#destroy
       */
      destroy() {
          const nodeId = this.node._id, thisId = this._id, attrs = Tween.tweens[nodeId];
          this.pause();
          // Clean up animation
          if (this.anim) {
              this.anim.stop();
          }
          // Clean up tween entries
          for (const key in attrs) {
              delete Tween.tweens[nodeId][key];
          }
          // Clean up attrs entry
          delete Tween.attrs[nodeId][thisId];
          // Clean up parent objects if empty
          if (Tween.tweens[nodeId]) {
              if (Object.keys(Tween.tweens[nodeId]).length === 0) {
                  delete Tween.tweens[nodeId];
              }
              if (Object.keys(Tween.attrs[nodeId]).length === 0) {
                  delete Tween.attrs[nodeId];
              }
          }
      }
  }
  Tween.attrs = {};
  Tween.tweens = {};
  /**
   * Tween node properties. Shorter usage of {@link Konva.Tween} object.
   *
   * @method Konva.Node#to
   * @param {Object} [params] tween params
   * @example
   *
   * circle.to({
   *   x : 50,
   *   duration : 0.5,
   *   onUpdate: () => console.log('props updated'),
   *   onFinish: () => console.log('finished'),
   * });
   */
  Node.prototype.to = function (params) {
      const onFinish = params.onFinish;
      params.node = this;
      params.onFinish = function () {
          this.destroy();
          if (onFinish) {
              onFinish();
          }
      };
      const tween = new Tween(params);
      tween.play();
  };
  /*
   * These eases were ported from an Adobe Flash tweening library to JavaScript
   * by Xaric
   */
  /**
   * @namespace Easings
   * @memberof Konva
   */
  const Easings = {
      /**
       * back ease in
       * @function
       * @memberof Konva.Easings
       */
      BackEaseIn(t, b, c, d) {
          const s = 1.70158;
          return c * (t /= d) * t * ((s + 1) * t - s) + b;
      },
      /**
       * back ease out
       * @function
       * @memberof Konva.Easings
       */
      BackEaseOut(t, b, c, d) {
          const s = 1.70158;
          return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
      },
      /**
       * back ease in out
       * @function
       * @memberof Konva.Easings
       */
      BackEaseInOut(t, b, c, d) {
          let s = 1.70158;
          if ((t /= d / 2) < 1) {
              return (c / 2) * (t * t * (((s *= 1.525) + 1) * t - s)) + b;
          }
          return (c / 2) * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
      },
      /**
       * elastic ease in
       * @function
       * @memberof Konva.Easings
       */
      ElasticEaseIn(t, b, c, d, a, p) {
          // added s = 0
          let s = 0;
          if (t === 0) {
              return b;
          }
          if ((t /= d) === 1) {
              return b + c;
          }
          if (!p) {
              p = d * 0.3;
          }
          if (!a || a < Math.abs(c)) {
              a = c;
              s = p / 4;
          }
          else {
              s = (p / (2 * Math.PI)) * Math.asin(c / a);
          }
          return (-(a *
              Math.pow(2, 10 * (t -= 1)) *
              Math.sin(((t * d - s) * (2 * Math.PI)) / p)) + b);
      },
      /**
       * elastic ease out
       * @function
       * @memberof Konva.Easings
       */
      ElasticEaseOut(t, b, c, d, a, p) {
          // added s = 0
          let s = 0;
          if (t === 0) {
              return b;
          }
          if ((t /= d) === 1) {
              return b + c;
          }
          if (!p) {
              p = d * 0.3;
          }
          if (!a || a < Math.abs(c)) {
              a = c;
              s = p / 4;
          }
          else {
              s = (p / (2 * Math.PI)) * Math.asin(c / a);
          }
          return (a * Math.pow(2, -10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) +
              c +
              b);
      },
      /**
       * elastic ease in out
       * @function
       * @memberof Konva.Easings
       */
      ElasticEaseInOut(t, b, c, d, a, p) {
          // added s = 0
          let s = 0;
          if (t === 0) {
              return b;
          }
          if ((t /= d / 2) === 2) {
              return b + c;
          }
          if (!p) {
              p = d * (0.3 * 1.5);
          }
          if (!a || a < Math.abs(c)) {
              a = c;
              s = p / 4;
          }
          else {
              s = (p / (2 * Math.PI)) * Math.asin(c / a);
          }
          if (t < 1) {
              return (-0.5 *
                  (a *
                      Math.pow(2, 10 * (t -= 1)) *
                      Math.sin(((t * d - s) * (2 * Math.PI)) / p)) +
                  b);
          }
          return (a *
              Math.pow(2, -10 * (t -= 1)) *
              Math.sin(((t * d - s) * (2 * Math.PI)) / p) *
              0.5 +
              c +
              b);
      },
      /**
       * bounce ease out
       * @function
       * @memberof Konva.Easings
       */
      BounceEaseOut(t, b, c, d) {
          if ((t /= d) < 1 / 2.75) {
              return c * (7.5625 * t * t) + b;
          }
          else if (t < 2 / 2.75) {
              return c * (7.5625 * (t -= 1.5 / 2.75) * t + 0.75) + b;
          }
          else if (t < 2.5 / 2.75) {
              return c * (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375) + b;
          }
          else {
              return c * (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375) + b;
          }
      },
      /**
       * bounce ease in
       * @function
       * @memberof Konva.Easings
       */
      BounceEaseIn(t, b, c, d) {
          return c - Easings.BounceEaseOut(d - t, 0, c, d) + b;
      },
      /**
       * bounce ease in out
       * @function
       * @memberof Konva.Easings
       */
      BounceEaseInOut(t, b, c, d) {
          if (t < d / 2) {
              return Easings.BounceEaseIn(t * 2, 0, c, d) * 0.5 + b;
          }
          else {
              return Easings.BounceEaseOut(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
          }
      },
      /**
       * ease in
       * @function
       * @memberof Konva.Easings
       */
      EaseIn(t, b, c, d) {
          return c * (t /= d) * t + b;
      },
      /**
       * ease out
       * @function
       * @memberof Konva.Easings
       */
      EaseOut(t, b, c, d) {
          return -c * (t /= d) * (t - 2) + b;
      },
      /**
       * ease in out
       * @function
       * @memberof Konva.Easings
       */
      EaseInOut(t, b, c, d) {
          if ((t /= d / 2) < 1) {
              return (c / 2) * t * t + b;
          }
          return (-c / 2) * (--t * (t - 2) - 1) + b;
      },
      /**
       * strong ease in
       * @function
       * @memberof Konva.Easings
       */
      StrongEaseIn(t, b, c, d) {
          return c * (t /= d) * t * t * t * t + b;
      },
      /**
       * strong ease out
       * @function
       * @memberof Konva.Easings
       */
      StrongEaseOut(t, b, c, d) {
          return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
      },
      /**
       * strong ease in out
       * @function
       * @memberof Konva.Easings
       */
      StrongEaseInOut(t, b, c, d) {
          if ((t /= d / 2) < 1) {
              return (c / 2) * t * t * t * t * t + b;
          }
          return (c / 2) * ((t -= 2) * t * t * t * t + 2) + b;
      },
      /**
       * linear
       * @function
       * @memberof Konva.Easings
       */
      Linear(t, b, c, d) {
          return (c * t) / d + b;
      },
  };

  // what is core parts of Konva?
  const Konva$1 = Util._assign(Konva$2, {
      Util,
      Transform,
      Node,
      Container,
      Stage,
      stages,
      Layer,
      FastLayer,
      Group,
      DD,
      Shape,
      shapes,
      Animation,
      Tween,
      Easings,
      Context,
      Canvas,
  });

  /**
   * Arc constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Number} config.angle in degrees
   * @param {Number} config.innerRadius
   * @param {Number} config.outerRadius
   * @param {Boolean} [config.clockwise]
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * // draw a Arc that's pointing downwards
   * var arc = new Konva.Arc({
   *   innerRadius: 40,
   *   outerRadius: 80,
   *   fill: 'red',
   *   stroke: 'black'
   *   strokeWidth: 5,
   *   angle: 60,
   *   rotationDeg: -120
   * });
   */
  class Arc extends Shape {
      _sceneFunc(context) {
          const angle = Konva$2.getAngle(this.angle()), clockwise = this.clockwise();
          context.beginPath();
          context.arc(0, 0, this.outerRadius(), 0, angle, clockwise);
          context.arc(0, 0, this.innerRadius(), angle, 0, !clockwise);
          context.closePath();
          context.fillStrokeShape(this);
      }
      getWidth() {
          return this.outerRadius() * 2;
      }
      getHeight() {
          return this.outerRadius() * 2;
      }
      setWidth(width) {
          this.outerRadius(width / 2);
      }
      setHeight(height) {
          this.outerRadius(height / 2);
      }
      getSelfRect() {
          const innerRadius = this.innerRadius();
          const outerRadius = this.outerRadius();
          const clockwise = this.clockwise();
          const angle = Konva$2.getAngle(clockwise ? 360 - this.angle() : this.angle());
          const boundLeftRatio = Math.cos(Math.min(angle, Math.PI));
          const boundRightRatio = 1;
          const boundTopRatio = Math.sin(Math.min(Math.max(Math.PI, angle), (3 * Math.PI) / 2));
          const boundBottomRatio = Math.sin(Math.min(angle, Math.PI / 2));
          const boundLeft = boundLeftRatio * (boundLeftRatio > 0 ? innerRadius : outerRadius);
          const boundRight = boundRightRatio * (outerRadius );
          const boundTop = boundTopRatio * (boundTopRatio > 0 ? innerRadius : outerRadius);
          const boundBottom = boundBottomRatio * (boundBottomRatio > 0 ? outerRadius : innerRadius);
          return {
              x: boundLeft,
              y: clockwise ? -1 * boundBottom : boundTop,
              width: boundRight - boundLeft,
              height: boundBottom - boundTop,
          };
      }
  }
  Arc.prototype._centroid = true;
  Arc.prototype.className = 'Arc';
  Arc.prototype._attrsAffectingSize = [
      'innerRadius',
      'outerRadius',
      'angle',
      'clockwise',
  ];
  _registerNode(Arc);
  // add getters setters
  Factory.addGetterSetter(Arc, 'innerRadius', 0, getNumberValidator());
  /**
   * get/set innerRadius
   * @name Konva.Arc#innerRadius
   * @method
   * @param {Number} innerRadius
   * @returns {Number}
   * @example
   * // get inner radius
   * var innerRadius = arc.innerRadius();
   *
   * // set inner radius
   * arc.innerRadius(20);
   */
  Factory.addGetterSetter(Arc, 'outerRadius', 0, getNumberValidator());
  /**
   * get/set outerRadius
   * @name Konva.Arc#outerRadius
   * @method
   * @param {Number} outerRadius
   * @returns {Number}
   * @example
   * // get outer radius
   * var outerRadius = arc.outerRadius();
   *
   * // set outer radius
   * arc.outerRadius(20);
   */
  Factory.addGetterSetter(Arc, 'angle', 0, getNumberValidator());
  /**
   * get/set angle in degrees
   * @name Konva.Arc#angle
   * @method
   * @param {Number} angle
   * @returns {Number}
   * @example
   * // get angle
   * var angle = arc.angle();
   *
   * // set angle
   * arc.angle(20);
   */
  Factory.addGetterSetter(Arc, 'clockwise', false, getBooleanValidator());
  /**
   * get/set clockwise flag
   * @name Konva.Arc#clockwise
   * @method
   * @param {Boolean} clockwise
   * @returns {Boolean}
   * @example
   * // get clockwise flag
   * var clockwise = arc.clockwise();
   *
   * // draw arc counter-clockwise
   * arc.clockwise(false);
   *
   * // draw arc clockwise
   * arc.clockwise(true);
   */

  function getControlPoints(x0, y0, x1, y1, x2, y2, t) {
      const d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)), d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), fa = (t * d01) / (d01 + d12), fb = (t * d12) / (d01 + d12), p1x = x1 - fa * (x2 - x0), p1y = y1 - fa * (y2 - y0), p2x = x1 + fb * (x2 - x0), p2y = y1 + fb * (y2 - y0);
      return [p1x, p1y, p2x, p2y];
  }
  function expandPoints(p, tension) {
      const len = p.length, allPoints = [];
      for (let n = 2; n < len - 2; n += 2) {
          const cp = getControlPoints(p[n - 2], p[n - 1], p[n], p[n + 1], p[n + 2], p[n + 3], tension);
          if (isNaN(cp[0])) {
              continue;
          }
          allPoints.push(cp[0]);
          allPoints.push(cp[1]);
          allPoints.push(p[n]);
          allPoints.push(p[n + 1]);
          allPoints.push(cp[2]);
          allPoints.push(cp[3]);
      }
      return allPoints;
  }
  /**
   * Line constructor.&nbsp; Lines are defined by an array of points and
   *  a tension
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Array} config.points Flat array of points coordinates. You should define them as [x1, y1, x2, y2, x3, y3].
   * @param {Number} [config.tension] Higher values will result in a more curvy line.  A value of 0 will result in no interpolation.
   *   The default is 0
   * @param {Boolean} [config.closed] defines whether or not the line shape is closed, creating a polygon or blob
   * @param {Boolean} [config.bezier] if no tension is provided but bezier=true, we draw the line as a bezier using the passed points
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var line = new Konva.Line({
   *   x: 100,
   *   y: 50,
   *   points: [73, 70, 340, 23, 450, 60, 500, 20],
   *   stroke: 'red',
   *   tension: 1
   * });
   */
  class Line extends Shape {
      constructor(config) {
          super(config);
          this.on('pointsChange.konva tensionChange.konva closedChange.konva bezierChange.konva', function () {
              this._clearCache('tensionPoints');
          });
      }
      _sceneFunc(context) {
          const points = this.points(), length = points.length, tension = this.tension(), closed = this.closed(), bezier = this.bezier();
          if (!length) {
              return;
          }
          let n = 0;
          context.beginPath();
          context.moveTo(points[0], points[1]);
          // tension
          if (tension !== 0 && length > 4) {
              const tp = this.getTensionPoints();
              const len = tp.length;
              n = closed ? 0 : 4;
              if (!closed) {
                  context.quadraticCurveTo(tp[0], tp[1], tp[2], tp[3]);
              }
              while (n < len - 2) {
                  context.bezierCurveTo(tp[n++], tp[n++], tp[n++], tp[n++], tp[n++], tp[n++]);
              }
              if (!closed) {
                  context.quadraticCurveTo(tp[len - 2], tp[len - 1], points[length - 2], points[length - 1]);
              }
          }
          else if (bezier) {
              // no tension but bezier
              n = 2;
              while (n < length) {
                  context.bezierCurveTo(points[n++], points[n++], points[n++], points[n++], points[n++], points[n++]);
              }
          }
          else {
              // no tension
              for (n = 2; n < length; n += 2) {
                  context.lineTo(points[n], points[n + 1]);
              }
          }
          // closed e.g. polygons and blobs
          if (closed) {
              context.closePath();
              context.fillStrokeShape(this);
          }
          else {
              // open e.g. lines and splines
              context.strokeShape(this);
          }
      }
      getTensionPoints() {
          return this._getCache('tensionPoints', this._getTensionPoints);
      }
      _getTensionPoints() {
          if (this.closed()) {
              return this._getTensionPointsClosed();
          }
          else {
              return expandPoints(this.points(), this.tension());
          }
      }
      _getTensionPointsClosed() {
          const p = this.points(), len = p.length, tension = this.tension(), firstControlPoints = getControlPoints(p[len - 2], p[len - 1], p[0], p[1], p[2], p[3], tension), lastControlPoints = getControlPoints(p[len - 4], p[len - 3], p[len - 2], p[len - 1], p[0], p[1], tension), middle = expandPoints(p, tension), tp = [firstControlPoints[2], firstControlPoints[3]]
              .concat(middle)
              .concat([
              lastControlPoints[0],
              lastControlPoints[1],
              p[len - 2],
              p[len - 1],
              lastControlPoints[2],
              lastControlPoints[3],
              firstControlPoints[0],
              firstControlPoints[1],
              p[0],
              p[1],
          ]);
          return tp;
      }
      getWidth() {
          return this.getSelfRect().width;
      }
      getHeight() {
          return this.getSelfRect().height;
      }
      // overload size detection
      getSelfRect() {
          let points = this.points();
          if (points.length < 4) {
              return {
                  x: points[0] || 0,
                  y: points[1] || 0,
                  width: 0,
                  height: 0,
              };
          }
          if (this.tension() !== 0) {
              points = [
                  points[0],
                  points[1],
                  ...this._getTensionPoints(),
                  points[points.length - 2],
                  points[points.length - 1],
              ];
          }
          else {
              points = this.points();
          }
          let minX = points[0];
          let maxX = points[0];
          let minY = points[1];
          let maxY = points[1];
          let x, y;
          for (let i = 0; i < points.length / 2; i++) {
              x = points[i * 2];
              y = points[i * 2 + 1];
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
          }
          return {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
          };
      }
  }
  Line.prototype.className = 'Line';
  Line.prototype._attrsAffectingSize = ['points', 'bezier', 'tension'];
  _registerNode(Line);
  // add getters setters
  Factory.addGetterSetter(Line, 'closed', false);
  /**
   * get/set closed flag.  The default is false
   * @name Konva.Line#closed
   * @method
   * @param {Boolean} closed
   * @returns {Boolean}
   * @example
   * // get closed flag
   * var closed = line.closed();
   *
   * // close the shape
   * line.closed(true);
   *
   * // open the shape
   * line.closed(false);
   */
  Factory.addGetterSetter(Line, 'bezier', false);
  /**
   * get/set bezier flag.  The default is false
   * @name Konva.Line#bezier
   * @method
   * @param {Boolean} bezier
   * @returns {Boolean}
   * @example
   * // get whether the line is a bezier
   * var isBezier = line.bezier();
   *
   * // set whether the line is a bezier
   * line.bezier(true);
   */
  Factory.addGetterSetter(Line, 'tension', 0, getNumberValidator());
  /**
   * get/set tension
   * @name Konva.Line#tension
   * @method
   * @param {Number} tension Higher values will result in a more curvy line.  A value of 0 will result in no interpolation. The default is 0
   * @returns {Number}
   * @example
   * // get tension
   * var tension = line.tension();
   *
   * // set tension
   * line.tension(3);
   */
  Factory.addGetterSetter(Line, 'points', [], getNumberArrayValidator());
  /**
   * get/set points array. Points is a flat array [x1, y1, x2, y2]. It is flat for performance reasons.
   * @name Konva.Line#points
   * @method
   * @param {Array} points
   * @returns {Array}
   * @example
   * // get points
   * var points = line.points();
   *
   * // set points
   * line.points([10, 20, 30, 40, 50, 60]);
   *
   * // push a new point
   * line.points(line.points().concat([70, 80]));
   */

  // Credits: rveciana/svg-path-properties
  // Legendre-Gauss abscissae (xi values, defined at i=n as the roots of the nth order Legendre polynomial Pn(x))
  const tValues = [
      [],
      [],
      [
          -0.5773502691896257,
          0.5773502691896257645091487805019574556476,
      ],
      [
          0, -0.7745966692414834,
          0.7745966692414833770358530799564799221665,
      ],
      [
          -0.33998104358485626,
          0.3399810435848562648026657591032446872005,
          -0.8611363115940526,
          0.8611363115940525752239464888928095050957,
      ],
      [
          0, -0.5384693101056831,
          0.5384693101056830910363144207002088049672,
          -0.906179845938664,
          0.9061798459386639927976268782993929651256,
      ],
      [
          0.6612093864662645136613995950199053470064,
          -0.6612093864662645,
          -0.2386191860831969,
          0.2386191860831969086305017216807119354186,
          -0.932469514203152,
          0.9324695142031520278123015544939946091347,
      ],
      [
          0, 0.4058451513773971669066064120769614633473,
          -0.4058451513773972,
          -0.7415311855993945,
          0.7415311855993944398638647732807884070741,
          -0.9491079123427585,
          0.9491079123427585245261896840478512624007,
      ],
      [
          -0.1834346424956498,
          0.1834346424956498049394761423601839806667,
          -0.525532409916329,
          0.5255324099163289858177390491892463490419,
          -0.7966664774136267,
          0.7966664774136267395915539364758304368371,
          -0.9602898564975363,
          0.9602898564975362316835608685694729904282,
      ],
      [
          0, -0.8360311073266358,
          0.8360311073266357942994297880697348765441,
          -0.9681602395076261,
          0.9681602395076260898355762029036728700494,
          -0.3242534234038089,
          0.3242534234038089290385380146433366085719,
          -0.6133714327005904,
          0.6133714327005903973087020393414741847857,
      ],
      [
          -0.14887433898163122,
          0.1488743389816312108848260011297199846175,
          -0.4333953941292472,
          0.4333953941292471907992659431657841622,
          -0.6794095682990244,
          0.6794095682990244062343273651148735757692,
          -0.8650633666889845,
          0.8650633666889845107320966884234930485275,
          -0.9739065285171717,
          0.9739065285171717200779640120844520534282,
      ],
      [
          0, -0.26954315595234496,
          0.2695431559523449723315319854008615246796,
          -0.5190961292068118,
          0.5190961292068118159257256694586095544802,
          -0.7301520055740494,
          0.7301520055740493240934162520311534580496,
          -0.8870625997680953,
          0.8870625997680952990751577693039272666316,
          -0.978228658146057,
          0.9782286581460569928039380011228573907714,
      ],
      [
          -0.1252334085114689,
          0.1252334085114689154724413694638531299833,
          -0.3678314989981802,
          0.3678314989981801937526915366437175612563,
          -0.5873179542866175,
          0.587317954286617447296702418940534280369,
          -0.7699026741943047,
          0.7699026741943046870368938332128180759849,
          -0.9041172563704749,
          0.9041172563704748566784658661190961925375,
          -0.9815606342467192,
          0.9815606342467192506905490901492808229601,
      ],
      [
          0, -0.2304583159551348,
          0.2304583159551347940655281210979888352115,
          -0.44849275103644687,
          0.4484927510364468528779128521276398678019,
          -0.6423493394403402,
          0.6423493394403402206439846069955156500716,
          -0.8015780907333099,
          0.8015780907333099127942064895828598903056,
          -0.9175983992229779,
          0.9175983992229779652065478365007195123904,
          -0.9841830547185881,
          0.9841830547185881494728294488071096110649,
      ],
      [
          -0.10805494870734367,
          0.1080549487073436620662446502198347476119,
          -0.31911236892788974,
          0.3191123689278897604356718241684754668342,
          -0.5152486363581541,
          0.5152486363581540919652907185511886623088,
          -0.6872929048116855,
          0.6872929048116854701480198030193341375384,
          -0.827201315069765,
          0.8272013150697649931897947426503949610397,
          -0.9284348836635735,
          0.928434883663573517336391139377874264477,
          -0.9862838086968123,
          0.986283808696812338841597266704052801676,
      ],
      [
          0, -0.20119409399743451,
          0.2011940939974345223006283033945962078128,
          -0.3941513470775634,
          0.3941513470775633698972073709810454683627,
          -0.5709721726085388,
          0.5709721726085388475372267372539106412383,
          -0.7244177313601701,
          0.7244177313601700474161860546139380096308,
          -0.8482065834104272,
          0.8482065834104272162006483207742168513662,
          -0.937273392400706,
          0.9372733924007059043077589477102094712439,
          -0.9879925180204854,
          0.9879925180204854284895657185866125811469,
      ],
      [
          -0.09501250983763744,
          0.0950125098376374401853193354249580631303,
          -0.2816035507792589,
          0.281603550779258913230460501460496106486,
          -0.45801677765722737,
          0.45801677765722738634241944298357757354,
          -0.6178762444026438,
          0.6178762444026437484466717640487910189918,
          -0.755404408355003,
          0.7554044083550030338951011948474422683538,
          -0.8656312023878318,
          0.8656312023878317438804678977123931323873,
          -0.9445750230732326,
          0.9445750230732325760779884155346083450911,
          -0.9894009349916499,
          0.9894009349916499325961541734503326274262,
      ],
      [
          0, -0.17848418149584785,
          0.1784841814958478558506774936540655574754,
          -0.3512317634538763,
          0.3512317634538763152971855170953460050405,
          -0.5126905370864769,
          0.5126905370864769678862465686295518745829,
          -0.6576711592166907,
          0.6576711592166907658503022166430023351478,
          -0.7815140038968014,
          0.7815140038968014069252300555204760502239,
          -0.8802391537269859,
          0.8802391537269859021229556944881556926234,
          -0.9506755217687678,
          0.9506755217687677612227169578958030214433,
          -0.9905754753144174,
          0.9905754753144173356754340199406652765077,
      ],
      [
          -0.0847750130417353,
          0.0847750130417353012422618529357838117333,
          -0.2518862256915055,
          0.2518862256915055095889728548779112301628,
          -0.41175116146284263,
          0.4117511614628426460359317938330516370789,
          -0.5597708310739475,
          0.5597708310739475346078715485253291369276,
          -0.6916870430603532,
          0.6916870430603532078748910812888483894522,
          -0.8037049589725231,
          0.8037049589725231156824174550145907971032,
          -0.8926024664975557,
          0.8926024664975557392060605911271455154078,
          -0.9558239495713977,
          0.9558239495713977551811958929297763099728,
          -0.9915651684209309,
          0.9915651684209309467300160047061507702525,
      ],
      [
          0, -0.16035864564022537,
          0.1603586456402253758680961157407435495048,
          -0.31656409996362983,
          0.3165640999636298319901173288498449178922,
          -0.46457074137596094,
          0.4645707413759609457172671481041023679762,
          -0.600545304661681,
          0.6005453046616810234696381649462392798683,
          -0.7209661773352294,
          0.7209661773352293786170958608237816296571,
          -0.8227146565371428,
          0.8227146565371428249789224867127139017745,
          -0.9031559036148179,
          0.9031559036148179016426609285323124878093,
          -0.96020815213483,
          0.960208152134830030852778840687651526615,
          -0.9924068438435844,
          0.9924068438435844031890176702532604935893,
      ],
      [
          -0.07652652113349734,
          0.0765265211334973337546404093988382110047,
          -0.22778585114164507,
          0.227785851141645078080496195368574624743,
          -0.37370608871541955,
          0.3737060887154195606725481770249272373957,
          -0.5108670019508271,
          0.5108670019508270980043640509552509984254,
          -0.636053680726515,
          0.6360536807265150254528366962262859367433,
          -0.7463319064601508,
          0.7463319064601507926143050703556415903107,
          -0.8391169718222188,
          0.8391169718222188233945290617015206853296,
          -0.912234428251326,
          0.9122344282513259058677524412032981130491,
          -0.9639719272779138,
          0.963971927277913791267666131197277221912,
          -0.9931285991850949,
          0.9931285991850949247861223884713202782226,
      ],
      [
          0, -0.1455618541608951,
          0.1455618541608950909370309823386863301163,
          -0.2880213168024011,
          0.288021316802401096600792516064600319909,
          -0.4243421202074388,
          0.4243421202074387835736688885437880520964,
          -0.5516188358872198,
          0.551618835887219807059018796724313286622,
          -0.6671388041974123,
          0.667138804197412319305966669990339162597,
          -0.7684399634756779,
          0.7684399634756779086158778513062280348209,
          -0.8533633645833173,
          0.8533633645833172836472506385875676702761,
          -0.9200993341504008,
          0.9200993341504008287901871337149688941591,
          -0.9672268385663063,
          0.9672268385663062943166222149076951614246,
          -0.9937521706203895,
          0.9937521706203895002602420359379409291933,
      ],
      [
          -0.06973927331972223,
          0.0697392733197222212138417961186280818222,
          -0.20786042668822127,
          0.2078604266882212854788465339195457342156,
          -0.34193582089208424,
          0.3419358208920842251581474204273796195591,
          -0.469355837986757,
          0.4693558379867570264063307109664063460953,
          -0.5876404035069116,
          0.5876404035069115929588769276386473488776,
          -0.6944872631866827,
          0.6944872631866827800506898357622567712673,
          -0.7878168059792081,
          0.7878168059792081620042779554083515213881,
          -0.8658125777203002,
          0.8658125777203001365364256370193787290847,
          -0.926956772187174,
          0.9269567721871740005206929392590531966353,
          -0.9700604978354287,
          0.9700604978354287271239509867652687108059,
          -0.9942945854823992,
          0.994294585482399292073031421161298980393,
      ],
      [
          0, -0.1332568242984661,
          0.1332568242984661109317426822417661370104,
          -0.26413568097034495,
          0.264135680970344930533869538283309602979,
          -0.3903010380302908,
          0.390301038030290831421488872880605458578,
          -0.5095014778460075,
          0.5095014778460075496897930478668464305448,
          -0.6196098757636461,
          0.6196098757636461563850973116495956533871,
          -0.7186613631319502,
          0.7186613631319501944616244837486188483299,
          -0.8048884016188399,
          0.8048884016188398921511184069967785579414,
          -0.8767523582704416,
          0.8767523582704416673781568859341456716389,
          -0.9329710868260161,
          0.9329710868260161023491969890384229782357,
          -0.9725424712181152,
          0.9725424712181152319560240768207773751816,
          -0.9947693349975522,
          0.9947693349975521235239257154455743605736,
      ],
      [
          -0.06405689286260563,
          0.0640568928626056260850430826247450385909,
          -0.1911188674736163,
          0.1911188674736163091586398207570696318404,
          -0.3150426796961634,
          0.3150426796961633743867932913198102407864,
          -0.4337935076260451,
          0.4337935076260451384870842319133497124524,
          -0.5454214713888396,
          0.5454214713888395356583756172183723700107,
          -0.6480936519369755,
          0.6480936519369755692524957869107476266696,
          -0.7401241915785544,
          0.7401241915785543642438281030999784255232,
          -0.820001985973903,
          0.8200019859739029219539498726697452080761,
          -0.8864155270044011,
          0.8864155270044010342131543419821967550873,
          -0.9382745520027328,
          0.9382745520027327585236490017087214496548,
          -0.9747285559713095,
          0.9747285559713094981983919930081690617411,
          -0.9951872199970213,
          0.9951872199970213601799974097007368118745,
      ],
  ];
  // Legendre-Gauss weights (wi values, defined by a function linked to in the Bezier primer article)
  const cValues = [
      [],
      [],
      [1.0, 1.0],
      [
          0.8888888888888888888888888888888888888888,
          0.5555555555555555555555555555555555555555,
          0.5555555555555555555555555555555555555555,
      ],
      [
          0.6521451548625461426269360507780005927646,
          0.6521451548625461426269360507780005927646,
          0.3478548451374538573730639492219994072353,
          0.3478548451374538573730639492219994072353,
      ],
      [
          0.5688888888888888888888888888888888888888,
          0.4786286704993664680412915148356381929122,
          0.4786286704993664680412915148356381929122,
          0.2369268850561890875142640407199173626432,
          0.2369268850561890875142640407199173626432,
      ],
      [
          0.3607615730481386075698335138377161116615,
          0.3607615730481386075698335138377161116615,
          0.4679139345726910473898703439895509948116,
          0.4679139345726910473898703439895509948116,
          0.1713244923791703450402961421727328935268,
          0.1713244923791703450402961421727328935268,
      ],
      [
          0.4179591836734693877551020408163265306122,
          0.3818300505051189449503697754889751338783,
          0.3818300505051189449503697754889751338783,
          0.2797053914892766679014677714237795824869,
          0.2797053914892766679014677714237795824869,
          0.1294849661688696932706114326790820183285,
          0.1294849661688696932706114326790820183285,
      ],
      [
          0.3626837833783619829651504492771956121941,
          0.3626837833783619829651504492771956121941,
          0.3137066458778872873379622019866013132603,
          0.3137066458778872873379622019866013132603,
          0.2223810344533744705443559944262408844301,
          0.2223810344533744705443559944262408844301,
          0.1012285362903762591525313543099621901153,
          0.1012285362903762591525313543099621901153,
      ],
      [
          0.3302393550012597631645250692869740488788,
          0.1806481606948574040584720312429128095143,
          0.1806481606948574040584720312429128095143,
          0.0812743883615744119718921581105236506756,
          0.0812743883615744119718921581105236506756,
          0.3123470770400028400686304065844436655987,
          0.3123470770400028400686304065844436655987,
          0.2606106964029354623187428694186328497718,
          0.2606106964029354623187428694186328497718,
      ],
      [
          0.295524224714752870173892994651338329421,
          0.295524224714752870173892994651338329421,
          0.2692667193099963550912269215694693528597,
          0.2692667193099963550912269215694693528597,
          0.2190863625159820439955349342281631924587,
          0.2190863625159820439955349342281631924587,
          0.1494513491505805931457763396576973324025,
          0.1494513491505805931457763396576973324025,
          0.0666713443086881375935688098933317928578,
          0.0666713443086881375935688098933317928578,
      ],
      [
          0.272925086777900630714483528336342189156,
          0.2628045445102466621806888698905091953727,
          0.2628045445102466621806888698905091953727,
          0.2331937645919904799185237048431751394317,
          0.2331937645919904799185237048431751394317,
          0.1862902109277342514260976414316558916912,
          0.1862902109277342514260976414316558916912,
          0.1255803694649046246346942992239401001976,
          0.1255803694649046246346942992239401001976,
          0.0556685671161736664827537204425485787285,
          0.0556685671161736664827537204425485787285,
      ],
      [
          0.2491470458134027850005624360429512108304,
          0.2491470458134027850005624360429512108304,
          0.2334925365383548087608498989248780562594,
          0.2334925365383548087608498989248780562594,
          0.2031674267230659217490644558097983765065,
          0.2031674267230659217490644558097983765065,
          0.160078328543346226334652529543359071872,
          0.160078328543346226334652529543359071872,
          0.1069393259953184309602547181939962242145,
          0.1069393259953184309602547181939962242145,
          0.047175336386511827194615961485017060317,
          0.047175336386511827194615961485017060317,
      ],
      [
          0.2325515532308739101945895152688359481566,
          0.2262831802628972384120901860397766184347,
          0.2262831802628972384120901860397766184347,
          0.2078160475368885023125232193060527633865,
          0.2078160475368885023125232193060527633865,
          0.1781459807619457382800466919960979955128,
          0.1781459807619457382800466919960979955128,
          0.1388735102197872384636017768688714676218,
          0.1388735102197872384636017768688714676218,
          0.0921214998377284479144217759537971209236,
          0.0921214998377284479144217759537971209236,
          0.0404840047653158795200215922009860600419,
          0.0404840047653158795200215922009860600419,
      ],
      [
          0.2152638534631577901958764433162600352749,
          0.2152638534631577901958764433162600352749,
          0.2051984637212956039659240656612180557103,
          0.2051984637212956039659240656612180557103,
          0.1855383974779378137417165901251570362489,
          0.1855383974779378137417165901251570362489,
          0.1572031671581935345696019386238421566056,
          0.1572031671581935345696019386238421566056,
          0.1215185706879031846894148090724766259566,
          0.1215185706879031846894148090724766259566,
          0.0801580871597602098056332770628543095836,
          0.0801580871597602098056332770628543095836,
          0.0351194603317518630318328761381917806197,
          0.0351194603317518630318328761381917806197,
      ],
      [
          0.2025782419255612728806201999675193148386,
          0.1984314853271115764561183264438393248186,
          0.1984314853271115764561183264438393248186,
          0.1861610000155622110268005618664228245062,
          0.1861610000155622110268005618664228245062,
          0.1662692058169939335532008604812088111309,
          0.1662692058169939335532008604812088111309,
          0.1395706779261543144478047945110283225208,
          0.1395706779261543144478047945110283225208,
          0.1071592204671719350118695466858693034155,
          0.1071592204671719350118695466858693034155,
          0.0703660474881081247092674164506673384667,
          0.0703660474881081247092674164506673384667,
          0.0307532419961172683546283935772044177217,
          0.0307532419961172683546283935772044177217,
      ],
      [
          0.1894506104550684962853967232082831051469,
          0.1894506104550684962853967232082831051469,
          0.1826034150449235888667636679692199393835,
          0.1826034150449235888667636679692199393835,
          0.1691565193950025381893120790303599622116,
          0.1691565193950025381893120790303599622116,
          0.1495959888165767320815017305474785489704,
          0.1495959888165767320815017305474785489704,
          0.1246289712555338720524762821920164201448,
          0.1246289712555338720524762821920164201448,
          0.0951585116824927848099251076022462263552,
          0.0951585116824927848099251076022462263552,
          0.0622535239386478928628438369943776942749,
          0.0622535239386478928628438369943776942749,
          0.0271524594117540948517805724560181035122,
          0.0271524594117540948517805724560181035122,
      ],
      [
          0.1794464703562065254582656442618856214487,
          0.1765627053669926463252709901131972391509,
          0.1765627053669926463252709901131972391509,
          0.1680041021564500445099706637883231550211,
          0.1680041021564500445099706637883231550211,
          0.1540457610768102880814315948019586119404,
          0.1540457610768102880814315948019586119404,
          0.1351363684685254732863199817023501973721,
          0.1351363684685254732863199817023501973721,
          0.1118838471934039710947883856263559267358,
          0.1118838471934039710947883856263559267358,
          0.0850361483171791808835353701910620738504,
          0.0850361483171791808835353701910620738504,
          0.0554595293739872011294401653582446605128,
          0.0554595293739872011294401653582446605128,
          0.0241483028685479319601100262875653246916,
          0.0241483028685479319601100262875653246916,
      ],
      [
          0.1691423829631435918406564701349866103341,
          0.1691423829631435918406564701349866103341,
          0.1642764837458327229860537764659275904123,
          0.1642764837458327229860537764659275904123,
          0.1546846751262652449254180038363747721932,
          0.1546846751262652449254180038363747721932,
          0.1406429146706506512047313037519472280955,
          0.1406429146706506512047313037519472280955,
          0.1225552067114784601845191268002015552281,
          0.1225552067114784601845191268002015552281,
          0.1009420441062871655628139849248346070628,
          0.1009420441062871655628139849248346070628,
          0.0764257302548890565291296776166365256053,
          0.0764257302548890565291296776166365256053,
          0.0497145488949697964533349462026386416808,
          0.0497145488949697964533349462026386416808,
          0.0216160135264833103133427102664524693876,
          0.0216160135264833103133427102664524693876,
      ],
      [
          0.1610544498487836959791636253209167350399,
          0.1589688433939543476499564394650472016787,
          0.1589688433939543476499564394650472016787,
          0.152766042065859666778855400897662998461,
          0.152766042065859666778855400897662998461,
          0.1426067021736066117757461094419029724756,
          0.1426067021736066117757461094419029724756,
          0.1287539625393362276755157848568771170558,
          0.1287539625393362276755157848568771170558,
          0.1115666455473339947160239016817659974813,
          0.1115666455473339947160239016817659974813,
          0.0914900216224499994644620941238396526609,
          0.0914900216224499994644620941238396526609,
          0.0690445427376412265807082580060130449618,
          0.0690445427376412265807082580060130449618,
          0.0448142267656996003328381574019942119517,
          0.0448142267656996003328381574019942119517,
          0.0194617882297264770363120414644384357529,
          0.0194617882297264770363120414644384357529,
      ],
      [
          0.1527533871307258506980843319550975934919,
          0.1527533871307258506980843319550975934919,
          0.1491729864726037467878287370019694366926,
          0.1491729864726037467878287370019694366926,
          0.1420961093183820513292983250671649330345,
          0.1420961093183820513292983250671649330345,
          0.1316886384491766268984944997481631349161,
          0.1316886384491766268984944997481631349161,
          0.118194531961518417312377377711382287005,
          0.118194531961518417312377377711382287005,
          0.1019301198172404350367501354803498761666,
          0.1019301198172404350367501354803498761666,
          0.0832767415767047487247581432220462061001,
          0.0832767415767047487247581432220462061001,
          0.0626720483341090635695065351870416063516,
          0.0626720483341090635695065351870416063516,
          0.040601429800386941331039952274932109879,
          0.040601429800386941331039952274932109879,
          0.0176140071391521183118619623518528163621,
          0.0176140071391521183118619623518528163621,
      ],
      [
          0.1460811336496904271919851476833711882448,
          0.1445244039899700590638271665537525436099,
          0.1445244039899700590638271665537525436099,
          0.1398873947910731547221334238675831108927,
          0.1398873947910731547221334238675831108927,
          0.132268938633337461781052574496775604329,
          0.132268938633337461781052574496775604329,
          0.1218314160537285341953671771257335983563,
          0.1218314160537285341953671771257335983563,
          0.1087972991671483776634745780701056420336,
          0.1087972991671483776634745780701056420336,
          0.0934444234560338615532897411139320884835,
          0.0934444234560338615532897411139320884835,
          0.0761001136283793020170516533001831792261,
          0.0761001136283793020170516533001831792261,
          0.0571344254268572082836358264724479574912,
          0.0571344254268572082836358264724479574912,
          0.0369537897708524937999506682993296661889,
          0.0369537897708524937999506682993296661889,
          0.0160172282577743333242246168584710152658,
          0.0160172282577743333242246168584710152658,
      ],
      [
          0.1392518728556319933754102483418099578739,
          0.1392518728556319933754102483418099578739,
          0.1365414983460151713525738312315173965863,
          0.1365414983460151713525738312315173965863,
          0.1311735047870623707329649925303074458757,
          0.1311735047870623707329649925303074458757,
          0.1232523768105124242855609861548144719594,
          0.1232523768105124242855609861548144719594,
          0.1129322960805392183934006074217843191142,
          0.1129322960805392183934006074217843191142,
          0.1004141444428809649320788378305362823508,
          0.1004141444428809649320788378305362823508,
          0.0859416062170677274144436813727028661891,
          0.0859416062170677274144436813727028661891,
          0.0697964684245204880949614189302176573987,
          0.0697964684245204880949614189302176573987,
          0.0522933351526832859403120512732112561121,
          0.0522933351526832859403120512732112561121,
          0.0337749015848141547933022468659129013491,
          0.0337749015848141547933022468659129013491,
          0.0146279952982722006849910980471854451902,
          0.0146279952982722006849910980471854451902,
      ],
      [
          0.1336545721861061753514571105458443385831,
          0.132462039404696617371642464703316925805,
          0.132462039404696617371642464703316925805,
          0.1289057221880821499785953393997936532597,
          0.1289057221880821499785953393997936532597,
          0.1230490843067295304675784006720096548158,
          0.1230490843067295304675784006720096548158,
          0.1149966402224113649416435129339613014914,
          0.1149966402224113649416435129339613014914,
          0.1048920914645414100740861850147438548584,
          0.1048920914645414100740861850147438548584,
          0.0929157660600351474770186173697646486034,
          0.0929157660600351474770186173697646486034,
          0.0792814117767189549228925247420432269137,
          0.0792814117767189549228925247420432269137,
          0.0642324214085258521271696151589109980391,
          0.0642324214085258521271696151589109980391,
          0.0480376717310846685716410716320339965612,
          0.0480376717310846685716410716320339965612,
          0.0309880058569794443106942196418845053837,
          0.0309880058569794443106942196418845053837,
          0.0134118594871417720813094934586150649766,
          0.0134118594871417720813094934586150649766,
      ],
      [
          0.1279381953467521569740561652246953718517,
          0.1279381953467521569740561652246953718517,
          0.1258374563468282961213753825111836887264,
          0.1258374563468282961213753825111836887264,
          0.121670472927803391204463153476262425607,
          0.121670472927803391204463153476262425607,
          0.1155056680537256013533444839067835598622,
          0.1155056680537256013533444839067835598622,
          0.1074442701159656347825773424466062227946,
          0.1074442701159656347825773424466062227946,
          0.0976186521041138882698806644642471544279,
          0.0976186521041138882698806644642471544279,
          0.086190161531953275917185202983742667185,
          0.086190161531953275917185202983742667185,
          0.0733464814110803057340336152531165181193,
          0.0733464814110803057340336152531165181193,
          0.0592985849154367807463677585001085845412,
          0.0592985849154367807463677585001085845412,
          0.0442774388174198061686027482113382288593,
          0.0442774388174198061686027482113382288593,
          0.0285313886289336631813078159518782864491,
          0.0285313886289336631813078159518782864491,
          0.0123412297999871995468056670700372915759,
          0.0123412297999871995468056670700372915759,
      ],
  ];
  // LUT for binomial coefficient arrays per curve order 'n'
  const binomialCoefficients = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1]];
  const getCubicArcLength = (xs, ys, t) => {
      let sum;
      let correctedT;
      /*if (xs.length >= tValues.length) {
            throw new Error('too high n bezier');
          }*/
      const n = 20;
      const z = t / 2;
      sum = 0;
      for (let i = 0; i < n; i++) {
          correctedT = z * tValues[n][i] + z;
          sum += cValues[n][i] * BFunc(xs, ys, correctedT);
      }
      return z * sum;
  };
  const getQuadraticArcLength = (xs, ys, t) => {
      if (t === undefined) {
          t = 1;
      }
      const ax = xs[0] - 2 * xs[1] + xs[2];
      const ay = ys[0] - 2 * ys[1] + ys[2];
      const bx = 2 * xs[1] - 2 * xs[0];
      const by = 2 * ys[1] - 2 * ys[0];
      const A = 4 * (ax * ax + ay * ay);
      const B = 4 * (ax * bx + ay * by);
      const C = bx * bx + by * by;
      if (A === 0) {
          return (t * Math.sqrt(Math.pow(xs[2] - xs[0], 2) + Math.pow(ys[2] - ys[0], 2)));
      }
      const b = B / (2 * A);
      const c = C / A;
      const u = t + b;
      const k = c - b * b;
      const uuk = u * u + k > 0 ? Math.sqrt(u * u + k) : 0;
      const bbk = b * b + k > 0 ? Math.sqrt(b * b + k) : 0;
      const term = b + Math.sqrt(b * b + k) !== 0
          ? k * Math.log(Math.abs((u + uuk) / (b + bbk)))
          : 0;
      return (Math.sqrt(A) / 2) * (u * uuk - b * bbk + term);
  };
  function BFunc(xs, ys, t) {
      const xbase = getDerivative(1, t, xs);
      const ybase = getDerivative(1, t, ys);
      const combined = xbase * xbase + ybase * ybase;
      return Math.sqrt(combined);
  }
  /**
   * Compute the curve derivative (hodograph) at t.
   */
  const getDerivative = (derivative, t, vs) => {
      // the derivative of any 't'-less function is zero.
      const n = vs.length - 1;
      let _vs;
      let value;
      if (n === 0) {
          return 0;
      }
      // direct values? compute!
      if (derivative === 0) {
          value = 0;
          for (let k = 0; k <= n; k++) {
              value +=
                  binomialCoefficients[n][k] *
                      Math.pow(1 - t, n - k) *
                      Math.pow(t, k) *
                      vs[k];
          }
          return value;
      }
      else {
          // Still some derivative? go down one order, then try
          // for the lower order curve's.
          _vs = new Array(n);
          for (let k = 0; k < n; k++) {
              _vs[k] = n * (vs[k + 1] - vs[k]);
          }
          return getDerivative(derivative - 1, t, _vs);
      }
  };
  const t2length = (length, totalLength, func) => {
      let error = 1;
      let t = length / totalLength;
      let step = (length - func(t)) / totalLength;
      let numIterations = 0;
      while (error > 0.001) {
          const increasedTLength = func(t + step);
          const increasedTError = Math.abs(length - increasedTLength) / totalLength;
          if (increasedTError < error) {
              error = increasedTError;
              t += step;
          }
          else {
              const decreasedTLength = func(t - step);
              const decreasedTError = Math.abs(length - decreasedTLength) / totalLength;
              if (decreasedTError < error) {
                  error = decreasedTError;
                  t -= step;
              }
              else {
                  step /= 2;
              }
          }
          numIterations++;
          if (numIterations > 500) {
              break;
          }
      }
      return t;
  };

  /**
   * Path constructor.
   * @author Jason Follas
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {String} config.data SVG data string
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var path = new Konva.Path({
   *   x: 240,
   *   y: 40,
   *   data: 'M12.582,9.551C3.251,16.237,0.921,29.021,7.08,38.564l-2.36,1.689l4.893,2.262l4.893,2.262l-0.568-5.36l-0.567-5.359l-2.365,1.694c-4.657-7.375-2.83-17.185,4.352-22.33c7.451-5.338,17.817-3.625,23.156,3.824c5.337,7.449,3.625,17.813-3.821,23.152l2.857,3.988c9.617-6.893,11.827-20.277,4.935-29.896C35.591,4.87,22.204,2.658,12.582,9.551z',
   *   fill: 'green',
   *   scaleX: 2,
   *   scaleY: 2
   * });
   */
  class Path extends Shape {
      constructor(config) {
          super(config);
          this.dataArray = [];
          this.pathLength = 0;
          this._readDataAttribute();
          this.on('dataChange.konva', function () {
              this._readDataAttribute();
          });
      }
      _readDataAttribute() {
          this.dataArray = Path.parsePathData(this.data());
          this.pathLength = Path.getPathLength(this.dataArray);
      }
      _sceneFunc(context) {
          const ca = this.dataArray;
          // context position
          context.beginPath();
          let isClosed = false;
          for (let n = 0; n < ca.length; n++) {
              const c = ca[n].command;
              const p = ca[n].points;
              switch (c) {
                  case 'L':
                      context.lineTo(p[0], p[1]);
                      break;
                  case 'M':
                      context.moveTo(p[0], p[1]);
                      break;
                  case 'C':
                      context.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
                      break;
                  case 'Q':
                      context.quadraticCurveTo(p[0], p[1], p[2], p[3]);
                      break;
                  case 'A':
                      const cx = p[0], cy = p[1], rx = p[2], ry = p[3], theta = p[4], dTheta = p[5], psi = p[6], fs = p[7];
                      const r = rx > ry ? rx : ry;
                      const scaleX = rx > ry ? 1 : rx / ry;
                      const scaleY = rx > ry ? ry / rx : 1;
                      context.translate(cx, cy);
                      context.rotate(psi);
                      context.scale(scaleX, scaleY);
                      context.arc(0, 0, r, theta, theta + dTheta, 1 - fs);
                      context.scale(1 / scaleX, 1 / scaleY);
                      context.rotate(-psi);
                      context.translate(-cx, -cy);
                      break;
                  case 'z':
                      isClosed = true;
                      context.closePath();
                      break;
              }
          }
          if (!isClosed && !this.hasFill()) {
              context.strokeShape(this);
          }
          else {
              context.fillStrokeShape(this);
          }
      }
      getSelfRect() {
          let points = [];
          this.dataArray.forEach(function (data) {
              if (data.command === 'A') {
                  // Approximates by breaking curve into line segments
                  const start = data.points[4];
                  // 4 = theta
                  const dTheta = data.points[5];
                  // 5 = dTheta
                  const end = data.points[4] + dTheta;
                  let inc = Math.PI / 180.0;
                  // 1 degree resolution
                  if (Math.abs(start - end) < inc) {
                      inc = Math.abs(start - end);
                  }
                  if (dTheta < 0) {
                      // clockwise
                      for (let t = start - inc; t > end; t -= inc) {
                          const point = Path.getPointOnEllipticalArc(data.points[0], data.points[1], data.points[2], data.points[3], t, 0);
                          points.push(point.x, point.y);
                      }
                  }
                  else {
                      // counter-clockwise
                      for (let t = start + inc; t < end; t += inc) {
                          const point = Path.getPointOnEllipticalArc(data.points[0], data.points[1], data.points[2], data.points[3], t, 0);
                          points.push(point.x, point.y);
                      }
                  }
              }
              else if (data.command === 'C') {
                  // Approximates by breaking curve into 100 line segments
                  for (let t = 0.0; t <= 1; t += 0.01) {
                      const point = Path.getPointOnCubicBezier(t, data.start.x, data.start.y, data.points[0], data.points[1], data.points[2], data.points[3], data.points[4], data.points[5]);
                      points.push(point.x, point.y);
                  }
              }
              else {
                  // TODO: how can we calculate bezier curves better?
                  points = points.concat(data.points);
              }
          });
          let minX = points[0];
          let maxX = points[0];
          let minY = points[1];
          let maxY = points[1];
          let x, y;
          for (let i = 0; i < points.length / 2; i++) {
              x = points[i * 2];
              y = points[i * 2 + 1];
              // skip bad values
              if (!isNaN(x)) {
                  minX = Math.min(minX, x);
                  maxX = Math.max(maxX, x);
              }
              if (!isNaN(y)) {
                  minY = Math.min(minY, y);
                  maxY = Math.max(maxY, y);
              }
          }
          return {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
          };
      }
      /**
       * Return length of the path.
       * @method
       * @name Konva.Path#getLength
       * @returns {Number} length
       * @example
       * var length = path.getLength();
       */
      getLength() {
          return this.pathLength;
      }
      /**
       * Get point on path at specific length of the path
       * @method
       * @name Konva.Path#getPointAtLength
       * @param {Number} length length
       * @returns {Object} point {x,y} point
       * @example
       * var point = path.getPointAtLength(10);
       */
      getPointAtLength(length) {
          return Path.getPointAtLengthOfDataArray(length, this.dataArray);
      }
      static getLineLength(x1, y1, x2, y2) {
          return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
      }
      static getPathLength(dataArray) {
          let pathLength = 0;
          for (let i = 0; i < dataArray.length; ++i) {
              pathLength += dataArray[i].pathLength;
          }
          return pathLength;
      }
      static getPointAtLengthOfDataArray(length, dataArray) {
          let points, i = 0, ii = dataArray.length;
          if (!ii) {
              return null;
          }
          while (i < ii && length > dataArray[i].pathLength) {
              length -= dataArray[i].pathLength;
              ++i;
          }
          if (i === ii) {
              points = dataArray[i - 1].points.slice(-2);
              return {
                  x: points[0],
                  y: points[1],
              };
          }
          if (length < 0.01) {
              const cmd = dataArray[i].command;
              if (cmd === 'M') {
                  points = dataArray[i].points.slice(0, 2);
                  return {
                      x: points[0],
                      y: points[1],
                  };
              }
              else {
                  return {
                      x: dataArray[i].start.x,
                      y: dataArray[i].start.y,
                  };
              }
          }
          const cp = dataArray[i];
          const p = cp.points;
          switch (cp.command) {
              case 'L':
                  return Path.getPointOnLine(length, cp.start.x, cp.start.y, p[0], p[1]);
              case 'C':
                  return Path.getPointOnCubicBezier(t2length(length, Path.getPathLength(dataArray), (i) => {
                      return getCubicArcLength([cp.start.x, p[0], p[2], p[4]], [cp.start.y, p[1], p[3], p[5]], i);
                  }), cp.start.x, cp.start.y, p[0], p[1], p[2], p[3], p[4], p[5]);
              case 'Q':
                  return Path.getPointOnQuadraticBezier(t2length(length, Path.getPathLength(dataArray), (i) => {
                      return getQuadraticArcLength([cp.start.x, p[0], p[2]], [cp.start.y, p[1], p[3]], i);
                  }), cp.start.x, cp.start.y, p[0], p[1], p[2], p[3]);
              case 'A':
                  const cx = p[0], cy = p[1], rx = p[2], ry = p[3], dTheta = p[5], psi = p[6];
                  let theta = p[4];
                  theta += (dTheta * length) / cp.pathLength;
                  return Path.getPointOnEllipticalArc(cx, cy, rx, ry, theta, psi);
          }
          return null;
      }
      static getPointOnLine(dist, P1x, P1y, P2x, P2y, fromX, fromY) {
          fromX = fromX !== null && fromX !== void 0 ? fromX : P1x;
          fromY = fromY !== null && fromY !== void 0 ? fromY : P1y;
          const len = this.getLineLength(P1x, P1y, P2x, P2y);
          if (len < 1e-10) {
              return { x: P1x, y: P1y };
          }
          if (P2x === P1x) {
              // Vertical line
              return { x: fromX, y: fromY + (P2y > P1y ? dist : -dist) };
          }
          const m = (P2y - P1y) / (P2x - P1x);
          const run = Math.sqrt((dist * dist) / (1 + m * m)) * (P2x < P1x ? -1 : 1);
          const rise = m * run;
          if (Math.abs(fromY - P1y - m * (fromX - P1x)) < 1e-10) {
              return { x: fromX + run, y: fromY + rise };
          }
          const u = ((fromX - P1x) * (P2x - P1x) + (fromY - P1y) * (P2y - P1y)) / (len * len);
          const ix = P1x + u * (P2x - P1x);
          const iy = P1y + u * (P2y - P1y);
          const pRise = this.getLineLength(fromX, fromY, ix, iy);
          const pRun = Math.sqrt(dist * dist - pRise * pRise);
          const adjustedRun = Math.sqrt((pRun * pRun) / (1 + m * m)) * (P2x < P1x ? -1 : 1);
          const adjustedRise = m * adjustedRun;
          return { x: ix + adjustedRun, y: iy + adjustedRise };
      }
      static getPointOnCubicBezier(pct, P1x, P1y, P2x, P2y, P3x, P3y, P4x, P4y) {
          function CB1(t) {
              return t * t * t;
          }
          function CB2(t) {
              return 3 * t * t * (1 - t);
          }
          function CB3(t) {
              return 3 * t * (1 - t) * (1 - t);
          }
          function CB4(t) {
              return (1 - t) * (1 - t) * (1 - t);
          }
          const x = P4x * CB1(pct) + P3x * CB2(pct) + P2x * CB3(pct) + P1x * CB4(pct);
          const y = P4y * CB1(pct) + P3y * CB2(pct) + P2y * CB3(pct) + P1y * CB4(pct);
          return { x, y };
      }
      static getPointOnQuadraticBezier(pct, P1x, P1y, P2x, P2y, P3x, P3y) {
          function QB1(t) {
              return t * t;
          }
          function QB2(t) {
              return 2 * t * (1 - t);
          }
          function QB3(t) {
              return (1 - t) * (1 - t);
          }
          const x = P3x * QB1(pct) + P2x * QB2(pct) + P1x * QB3(pct);
          const y = P3y * QB1(pct) + P2y * QB2(pct) + P1y * QB3(pct);
          return { x, y };
      }
      static getPointOnEllipticalArc(cx, cy, rx, ry, theta, psi) {
          const cosPsi = Math.cos(psi), sinPsi = Math.sin(psi);
          const pt = {
              x: rx * Math.cos(theta),
              y: ry * Math.sin(theta),
          };
          return {
              x: cx + (pt.x * cosPsi - pt.y * sinPsi),
              y: cy + (pt.x * sinPsi + pt.y * cosPsi),
          };
      }
      /*
       * get parsed data array from the data
       *  string.  V, v, H, h, and l data are converted to
       *  L data for the purpose of high performance Path
       *  rendering
       */
      static parsePathData(data) {
          // Path Data Segment must begin with a moveTo
          //m (x y)+  Relative moveTo (subsequent points are treated as lineTo)
          //M (x y)+  Absolute moveTo (subsequent points are treated as lineTo)
          //l (x y)+  Relative lineTo
          //L (x y)+  Absolute LineTo
          //h (x)+    Relative horizontal lineTo
          //H (x)+    Absolute horizontal lineTo
          //v (y)+    Relative vertical lineTo
          //V (y)+    Absolute vertical lineTo
          //z (closepath)
          //Z (closepath)
          //c (x1 y1 x2 y2 x y)+ Relative Bezier curve
          //C (x1 y1 x2 y2 x y)+ Absolute Bezier curve
          //q (x1 y1 x y)+       Relative Quadratic Bezier
          //Q (x1 y1 x y)+       Absolute Quadratic Bezier
          //t (x y)+    Shorthand/Smooth Relative Quadratic Bezier
          //T (x y)+    Shorthand/Smooth Absolute Quadratic Bezier
          //s (x2 y2 x y)+       Shorthand/Smooth Relative Bezier curve
          //S (x2 y2 x y)+       Shorthand/Smooth Absolute Bezier curve
          //a (rx ry x-axis-rotation large-arc-flag sweep-flag x y)+     Relative Elliptical Arc
          //A (rx ry x-axis-rotation large-arc-flag sweep-flag x y)+  Absolute Elliptical Arc
          // return early if data is not defined
          if (!data) {
              return [];
          }
          // command string
          let cs = data;
          // command chars
          const cc = [
              'm',
              'M',
              'l',
              'L',
              'v',
              'V',
              'h',
              'H',
              'z',
              'Z',
              'c',
              'C',
              'q',
              'Q',
              't',
              'T',
              's',
              'S',
              'a',
              'A',
          ];
          // convert white spaces to commas
          cs = cs.replace(new RegExp(' ', 'g'), ',');
          // create pipes so that we can split the data
          for (let n = 0; n < cc.length; n++) {
              cs = cs.replace(new RegExp(cc[n], 'g'), '|' + cc[n]);
          }
          // create array
          const arr = cs.split('|');
          const ca = [];
          const coords = [];
          // init context point
          let cpx = 0;
          let cpy = 0;
          const re = /([-+]?((\d+\.\d+)|((\d+)|(\.\d+)))(?:e[-+]?\d+)?)/gi;
          let match;
          for (let n = 1; n < arr.length; n++) {
              let str = arr[n];
              let c = str.charAt(0);
              str = str.slice(1);
              coords.length = 0;
              while ((match = re.exec(str))) {
                  coords.push(match[0]);
              }
              // while ((match = re.exec(str))) {
              //   coords.push(match[0]);
              // }
              const p = [];
              for (let j = 0, jlen = coords.length; j < jlen; j++) {
                  // extra case for merged flags
                  if (coords[j] === '00') {
                      p.push(0, 0);
                      continue;
                  }
                  const parsed = parseFloat(coords[j]);
                  if (!isNaN(parsed)) {
                      p.push(parsed);
                  }
                  else {
                      p.push(0);
                  }
              }
              while (p.length > 0) {
                  if (isNaN(p[0])) {
                      // case for a trailing comma before next command
                      break;
                  }
                  let cmd = '';
                  let points = [];
                  const startX = cpx, startY = cpy;
                  // Move var from within the switch to up here (jshint)
                  let prevCmd, ctlPtx, ctlPty; // Ss, Tt
                  let rx, ry, psi, fa, fs, x1, y1; // Aa
                  // convert l, H, h, V, and v to L
                  switch (c) {
                      // Note: Keep the lineTo's above the moveTo's in this switch
                      case 'l':
                          cpx += p.shift();
                          cpy += p.shift();
                          cmd = 'L';
                          points.push(cpx, cpy);
                          break;
                      case 'L':
                          cpx = p.shift();
                          cpy = p.shift();
                          points.push(cpx, cpy);
                          break;
                      // Note: lineTo handlers need to be above this point
                      case 'm':
                          const dx = p.shift();
                          const dy = p.shift();
                          cpx += dx;
                          cpy += dy;
                          cmd = 'M';
                          // After closing the path move the current position
                          // to the the first point of the path (if any).
                          if (ca.length > 2 && ca[ca.length - 1].command === 'z') {
                              for (let idx = ca.length - 2; idx >= 0; idx--) {
                                  if (ca[idx].command === 'M') {
                                      cpx = ca[idx].points[0] + dx;
                                      cpy = ca[idx].points[1] + dy;
                                      break;
                                  }
                              }
                          }
                          points.push(cpx, cpy);
                          c = 'l';
                          // subsequent points are treated as relative lineTo
                          break;
                      case 'M':
                          cpx = p.shift();
                          cpy = p.shift();
                          cmd = 'M';
                          points.push(cpx, cpy);
                          c = 'L';
                          // subsequent points are treated as absolute lineTo
                          break;
                      case 'h':
                          cpx += p.shift();
                          cmd = 'L';
                          points.push(cpx, cpy);
                          break;
                      case 'H':
                          cpx = p.shift();
                          cmd = 'L';
                          points.push(cpx, cpy);
                          break;
                      case 'v':
                          cpy += p.shift();
                          cmd = 'L';
                          points.push(cpx, cpy);
                          break;
                      case 'V':
                          cpy = p.shift();
                          cmd = 'L';
                          points.push(cpx, cpy);
                          break;
                      case 'C':
                          points.push(p.shift(), p.shift(), p.shift(), p.shift());
                          cpx = p.shift();
                          cpy = p.shift();
                          points.push(cpx, cpy);
                          break;
                      case 'c':
                          points.push(cpx + p.shift(), cpy + p.shift(), cpx + p.shift(), cpy + p.shift());
                          cpx += p.shift();
                          cpy += p.shift();
                          cmd = 'C';
                          points.push(cpx, cpy);
                          break;
                      case 'S':
                          ctlPtx = cpx;
                          ctlPty = cpy;
                          prevCmd = ca[ca.length - 1];
                          if (prevCmd.command === 'C') {
                              ctlPtx = cpx + (cpx - prevCmd.points[2]);
                              ctlPty = cpy + (cpy - prevCmd.points[3]);
                          }
                          points.push(ctlPtx, ctlPty, p.shift(), p.shift());
                          cpx = p.shift();
                          cpy = p.shift();
                          cmd = 'C';
                          points.push(cpx, cpy);
                          break;
                      case 's':
                          ctlPtx = cpx;
                          ctlPty = cpy;
                          prevCmd = ca[ca.length - 1];
                          if (prevCmd.command === 'C') {
                              ctlPtx = cpx + (cpx - prevCmd.points[2]);
                              ctlPty = cpy + (cpy - prevCmd.points[3]);
                          }
                          points.push(ctlPtx, ctlPty, cpx + p.shift(), cpy + p.shift());
                          cpx += p.shift();
                          cpy += p.shift();
                          cmd = 'C';
                          points.push(cpx, cpy);
                          break;
                      case 'Q':
                          points.push(p.shift(), p.shift());
                          cpx = p.shift();
                          cpy = p.shift();
                          points.push(cpx, cpy);
                          break;
                      case 'q':
                          points.push(cpx + p.shift(), cpy + p.shift());
                          cpx += p.shift();
                          cpy += p.shift();
                          cmd = 'Q';
                          points.push(cpx, cpy);
                          break;
                      case 'T':
                          ctlPtx = cpx;
                          ctlPty = cpy;
                          prevCmd = ca[ca.length - 1];
                          if (prevCmd.command === 'Q') {
                              ctlPtx = cpx + (cpx - prevCmd.points[0]);
                              ctlPty = cpy + (cpy - prevCmd.points[1]);
                          }
                          cpx = p.shift();
                          cpy = p.shift();
                          cmd = 'Q';
                          points.push(ctlPtx, ctlPty, cpx, cpy);
                          break;
                      case 't':
                          ctlPtx = cpx;
                          ctlPty = cpy;
                          prevCmd = ca[ca.length - 1];
                          if (prevCmd.command === 'Q') {
                              ctlPtx = cpx + (cpx - prevCmd.points[0]);
                              ctlPty = cpy + (cpy - prevCmd.points[1]);
                          }
                          cpx += p.shift();
                          cpy += p.shift();
                          cmd = 'Q';
                          points.push(ctlPtx, ctlPty, cpx, cpy);
                          break;
                      case 'A':
                          rx = p.shift();
                          ry = p.shift();
                          psi = p.shift();
                          fa = p.shift();
                          fs = p.shift();
                          x1 = cpx;
                          y1 = cpy;
                          cpx = p.shift();
                          cpy = p.shift();
                          cmd = 'A';
                          points = this.convertEndpointToCenterParameterization(x1, y1, cpx, cpy, fa, fs, rx, ry, psi);
                          break;
                      case 'a':
                          rx = p.shift();
                          ry = p.shift();
                          psi = p.shift();
                          fa = p.shift();
                          fs = p.shift();
                          x1 = cpx;
                          y1 = cpy;
                          cpx += p.shift();
                          cpy += p.shift();
                          cmd = 'A';
                          points = this.convertEndpointToCenterParameterization(x1, y1, cpx, cpy, fa, fs, rx, ry, psi);
                          break;
                  }
                  ca.push({
                      command: cmd || c,
                      points: points,
                      start: {
                          x: startX,
                          y: startY,
                      },
                      pathLength: this.calcLength(startX, startY, cmd || c, points),
                  });
              }
              if (c === 'z' || c === 'Z') {
                  ca.push({
                      command: 'z',
                      points: [],
                      start: undefined,
                      pathLength: 0,
                  });
              }
          }
          return ca;
      }
      static calcLength(x, y, cmd, points) {
          let len, p1, p2, t;
          const path = Path;
          switch (cmd) {
              case 'L':
                  return path.getLineLength(x, y, points[0], points[1]);
              case 'C':
                  return getCubicArcLength([x, points[0], points[2], points[4]], [y, points[1], points[3], points[5]], 1);
              case 'Q':
                  return getQuadraticArcLength([x, points[0], points[2]], [y, points[1], points[3]], 1);
              case 'A':
                  // Approximates by breaking curve into line segments
                  len = 0.0;
                  const start = points[4];
                  // 4 = theta
                  const dTheta = points[5];
                  // 5 = dTheta
                  const end = points[4] + dTheta;
                  let inc = Math.PI / 180.0;
                  // 1 degree resolution
                  if (Math.abs(start - end) < inc) {
                      inc = Math.abs(start - end);
                  }
                  // Note: for purpose of calculating arc length, not going to worry about rotating X-axis by angle psi
                  p1 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], start, 0);
                  if (dTheta < 0) {
                      // clockwise
                      for (t = start - inc; t > end; t -= inc) {
                          p2 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], t, 0);
                          len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
                          p1 = p2;
                      }
                  }
                  else {
                      // counter-clockwise
                      for (t = start + inc; t < end; t += inc) {
                          p2 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], t, 0);
                          len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
                          p1 = p2;
                      }
                  }
                  p2 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], end, 0);
                  len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
                  return len;
          }
          return 0;
      }
      static convertEndpointToCenterParameterization(x1, y1, x2, y2, fa, fs, rx, ry, psiDeg) {
          // Derived from: http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
          const psi = psiDeg * (Math.PI / 180.0);
          const xp = (Math.cos(psi) * (x1 - x2)) / 2.0 + (Math.sin(psi) * (y1 - y2)) / 2.0;
          const yp = (-1 * Math.sin(psi) * (x1 - x2)) / 2.0 +
              (Math.cos(psi) * (y1 - y2)) / 2.0;
          const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
          if (lambda > 1) {
              rx *= Math.sqrt(lambda);
              ry *= Math.sqrt(lambda);
          }
          let f = Math.sqrt((rx * rx * (ry * ry) - rx * rx * (yp * yp) - ry * ry * (xp * xp)) /
              (rx * rx * (yp * yp) + ry * ry * (xp * xp)));
          if (fa === fs) {
              f *= -1;
          }
          if (isNaN(f)) {
              f = 0;
          }
          const cxp = (f * rx * yp) / ry;
          const cyp = (f * -ry * xp) / rx;
          const cx = (x1 + x2) / 2.0 + Math.cos(psi) * cxp - Math.sin(psi) * cyp;
          const cy = (y1 + y2) / 2.0 + Math.sin(psi) * cxp + Math.cos(psi) * cyp;
          const vMag = function (v) {
              return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
          };
          const vRatio = function (u, v) {
              return (u[0] * v[0] + u[1] * v[1]) / (vMag(u) * vMag(v));
          };
          const vAngle = function (u, v) {
              return (u[0] * v[1] < u[1] * v[0] ? -1 : 1) * Math.acos(vRatio(u, v));
          };
          const theta = vAngle([1, 0], [(xp - cxp) / rx, (yp - cyp) / ry]);
          const u = [(xp - cxp) / rx, (yp - cyp) / ry];
          const v = [(-1 * xp - cxp) / rx, (-1 * yp - cyp) / ry];
          let dTheta = vAngle(u, v);
          if (vRatio(u, v) <= -1) {
              dTheta = Math.PI;
          }
          if (vRatio(u, v) >= 1) {
              dTheta = 0;
          }
          if (fs === 0 && dTheta > 0) {
              dTheta = dTheta - 2 * Math.PI;
          }
          if (fs === 1 && dTheta < 0) {
              dTheta = dTheta + 2 * Math.PI;
          }
          return [cx, cy, rx, ry, theta, dTheta, psi, fs];
      }
  }
  Path.prototype.className = 'Path';
  Path.prototype._attrsAffectingSize = ['data'];
  _registerNode(Path);
  /**
   * get/set SVG path data string.  This method
   *  also automatically parses the data string
   *  into a data array.  Currently supported SVG data:
   *  M, m, L, l, H, h, V, v, Q, q, T, t, C, c, S, s, A, a, Z, z
   * @name Konva.Path#data
   * @method
   * @param {String} data svg path string
   * @returns {String}
   * @example
   * // get data
   * var data = path.data();
   *
   * // set data
   * path.data('M200,100h100v50z');
   */
  Factory.addGetterSetter(Path, 'data');

  /**
   * Arrow constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Line
   * @param {Object} config
   * @param {Array} config.points Flat array of points coordinates. You should define them as [x1, y1, x2, y2, x3, y3].
   * @param {Number} [config.tension] Higher values will result in a more curvy line.  A value of 0 will result in no interpolation.
   *   The default is 0
   * @param {Number} config.pointerLength Arrow pointer length. Default value is 10.
   * @param {Number} config.pointerWidth Arrow pointer width. Default value is 10.
   * @param {Boolean} config.pointerAtBeginning Do we need to draw pointer on beginning position?. Default false.
   * @param {Boolean} config.pointerAtEnding Do we need to draw pointer on ending position?. Default true.
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var line = new Konva.Line({
   *   points: [73, 70, 340, 23, 450, 60, 500, 20],
   *   stroke: 'red',
   *   tension: 1,
   *   pointerLength : 10,
   *   pointerWidth : 12
   * });
   */
  class Arrow extends Line {
      _sceneFunc(ctx) {
          super._sceneFunc(ctx);
          const PI2 = Math.PI * 2;
          const points = this.points();
          let tp = points;
          const fromTension = this.tension() !== 0 && points.length > 4;
          if (fromTension) {
              tp = this.getTensionPoints();
          }
          const length = this.pointerLength();
          const n = points.length;
          let dx, dy;
          if (fromTension) {
              const lp = [
                  tp[tp.length - 4],
                  tp[tp.length - 3],
                  tp[tp.length - 2],
                  tp[tp.length - 1],
                  points[n - 2],
                  points[n - 1],
              ];
              const lastLength = Path.calcLength(tp[tp.length - 4], tp[tp.length - 3], 'C', lp);
              const previous = Path.getPointOnQuadraticBezier(Math.min(1, 1 - length / lastLength), lp[0], lp[1], lp[2], lp[3], lp[4], lp[5]);
              dx = points[n - 2] - previous.x;
              dy = points[n - 1] - previous.y;
          }
          else {
              dx = points[n - 2] - points[n - 4];
              dy = points[n - 1] - points[n - 3];
          }
          const radians = (Math.atan2(dy, dx) + PI2) % PI2;
          const width = this.pointerWidth();
          if (this.pointerAtEnding()) {
              ctx.save();
              ctx.beginPath();
              ctx.translate(points[n - 2], points[n - 1]);
              ctx.rotate(radians);
              ctx.moveTo(0, 0);
              ctx.lineTo(-length, width / 2);
              ctx.lineTo(-length, -width / 2);
              ctx.closePath();
              ctx.restore();
              this.__fillStroke(ctx);
          }
          if (this.pointerAtBeginning()) {
              ctx.save();
              ctx.beginPath();
              ctx.translate(points[0], points[1]);
              if (fromTension) {
                  dx = (tp[0] + tp[2]) / 2 - points[0];
                  dy = (tp[1] + tp[3]) / 2 - points[1];
              }
              else {
                  dx = points[2] - points[0];
                  dy = points[3] - points[1];
              }
              ctx.rotate((Math.atan2(-dy, -dx) + PI2) % PI2);
              ctx.moveTo(0, 0);
              ctx.lineTo(-length, width / 2);
              ctx.lineTo(-length, -width / 2);
              ctx.closePath();
              ctx.restore();
              this.__fillStroke(ctx);
          }
      }
      __fillStroke(ctx) {
          // here is a tricky part
          // we need to disable dash for arrow pointers
          const isDashEnabled = this.dashEnabled();
          if (isDashEnabled) {
              // manually disable dash for head
              // it is better not to use setter here,
              // because it will trigger attr change event
              this.attrs.dashEnabled = false;
              ctx.setLineDash([]);
          }
          ctx.fillStrokeShape(this);
          // restore old value
          if (isDashEnabled) {
              this.attrs.dashEnabled = true;
          }
      }
      getSelfRect() {
          const lineRect = super.getSelfRect();
          const offset = this.pointerWidth() / 2;
          return {
              x: lineRect.x,
              y: lineRect.y - offset,
              width: lineRect.width,
              height: lineRect.height + offset * 2,
          };
      }
  }
  Arrow.prototype.className = 'Arrow';
  _registerNode(Arrow);
  /**
   * get/set pointerLength
   * @name Konva.Arrow#pointerLength
   * @method
   * @param {Number} Length of pointer of arrow. The default is 10.
   * @returns {Number}
   * @example
   * // get length
   * var pointerLength = line.pointerLength();
   *
   * // set length
   * line.pointerLength(15);
   */
  Factory.addGetterSetter(Arrow, 'pointerLength', 10, getNumberValidator());
  /**
   * get/set pointerWidth
   * @name Konva.Arrow#pointerWidth
   * @method
   * @param {Number} Width of pointer of arrow.
   *   The default is 10.
   * @returns {Number}
   * @example
   * // get width
   * var pointerWidth = line.pointerWidth();
   *
   * // set width
   * line.pointerWidth(15);
   */
  Factory.addGetterSetter(Arrow, 'pointerWidth', 10, getNumberValidator());
  /**
   * get/set pointerAtBeginning
   * @name Konva.Arrow#pointerAtBeginning
   * @method
   * @param {Number} Should pointer displayed at beginning of arrow. The default is false.
   * @returns {Boolean}
   * @example
   * // get value
   * var pointerAtBeginning = line.pointerAtBeginning();
   *
   * // set value
   * line.pointerAtBeginning(true);
   */
  Factory.addGetterSetter(Arrow, 'pointerAtBeginning', false);
  /**
   * get/set pointerAtEnding
   * @name Konva.Arrow#pointerAtEnding
   * @method
   * @param {Number} Should pointer displayed at ending of arrow. The default is true.
   * @returns {Boolean}
   * @example
   * // get value
   * var pointerAtEnding = line.pointerAtEnding();
   *
   * // set value
   * line.pointerAtEnding(false);
   */
  Factory.addGetterSetter(Arrow, 'pointerAtEnding', true);

  /**
   * Circle constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Number} config.radius
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * // create circle
   * var circle = new Konva.Circle({
   *   radius: 40,
   *   fill: 'red',
   *   stroke: 'black',
   *   strokeWidth: 5
   * });
   */
  class Circle extends Shape {
      _sceneFunc(context) {
          context.beginPath();
          context.arc(0, 0, this.attrs.radius || 0, 0, Math.PI * 2, false);
          context.closePath();
          context.fillStrokeShape(this);
      }
      getWidth() {
          return this.radius() * 2;
      }
      getHeight() {
          return this.radius() * 2;
      }
      setWidth(width) {
          if (this.radius() !== width / 2) {
              this.radius(width / 2);
          }
      }
      setHeight(height) {
          if (this.radius() !== height / 2) {
              this.radius(height / 2);
          }
      }
  }
  Circle.prototype._centroid = true;
  Circle.prototype.className = 'Circle';
  Circle.prototype._attrsAffectingSize = ['radius'];
  _registerNode(Circle);
  /**
   * get/set radius
   * @name Konva.Circle#radius
   * @method
   * @param {Number} radius
   * @returns {Number}
   * @example
   * // get radius
   * var radius = circle.radius();
   *
   * // set radius
   * circle.radius(10);
   */
  Factory.addGetterSetter(Circle, 'radius', 0, getNumberValidator());

  /**
   * Ellipse constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Object} config.radius defines x and y radius
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var ellipse = new Konva.Ellipse({
   *   radius : {
   *     x : 50,
   *     y : 50
   *   },
   *   fill: 'red'
   * });
   */
  class Ellipse extends Shape {
      _sceneFunc(context) {
          const rx = this.radiusX(), ry = this.radiusY();
          context.beginPath();
          context.save();
          if (rx !== ry) {
              context.scale(1, ry / rx);
          }
          context.arc(0, 0, rx, 0, Math.PI * 2, false);
          context.restore();
          context.closePath();
          context.fillStrokeShape(this);
      }
      getWidth() {
          return this.radiusX() * 2;
      }
      getHeight() {
          return this.radiusY() * 2;
      }
      setWidth(width) {
          this.radiusX(width / 2);
      }
      setHeight(height) {
          this.radiusY(height / 2);
      }
  }
  Ellipse.prototype.className = 'Ellipse';
  Ellipse.prototype._centroid = true;
  Ellipse.prototype._attrsAffectingSize = ['radiusX', 'radiusY'];
  _registerNode(Ellipse);
  // add getters setters
  Factory.addComponentsGetterSetter(Ellipse, 'radius', ['x', 'y']);
  /**
   * get/set radius
   * @name Konva.Ellipse#radius
   * @method
   * @param {Object} radius
   * @param {Number} radius.x
   * @param {Number} radius.y
   * @returns {Object}
   * @example
   * // get radius
   * var radius = ellipse.radius();
   *
   * // set radius
   * ellipse.radius({
   *   x: 200,
   *   y: 100
   * });
   */
  Factory.addGetterSetter(Ellipse, 'radiusX', 0, getNumberValidator());
  /**
   * get/set radius x
   * @name Konva.Ellipse#radiusX
   * @method
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get radius x
   * var radiusX = ellipse.radiusX();
   *
   * // set radius x
   * ellipse.radiusX(200);
   */
  Factory.addGetterSetter(Ellipse, 'radiusY', 0, getNumberValidator());
  /**
   * get/set radius y
   * @name Konva.Ellipse#radiusY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get radius y
   * var radiusY = ellipse.radiusY();
   *
   * // set radius y
   * ellipse.radiusY(200);
   */

  /**
   * Image constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Image} config.image
   * @param {Object} [config.crop]
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var imageObj = new Image();
   * imageObj.onload = function() {
   *   var image = new Konva.Image({
   *     x: 200,
   *     y: 50,
   *     image: imageObj,
   *     width: 100,
   *     height: 100
   *   });
   * };
   * imageObj.src = '/path/to/image.jpg'
   */
  class Image extends Shape {
      constructor(attrs) {
          super(attrs);
          this._loadListener = () => {
              this._requestDraw();
          };
          this.on('imageChange.konva', (props) => {
              this._removeImageLoad(props.oldVal);
              this._setImageLoad();
          });
          this._setImageLoad();
      }
      _setImageLoad() {
          const image = this.image();
          // check is image is already loaded
          if (image && image.complete) {
              return;
          }
          // check is video is already loaded
          if (image && image.readyState === 4) {
              return;
          }
          if (image && image['addEventListener']) {
              image['addEventListener']('load', this._loadListener);
          }
      }
      _removeImageLoad(image) {
          if (image && image['removeEventListener']) {
              image['removeEventListener']('load', this._loadListener);
          }
      }
      destroy() {
          this._removeImageLoad(this.image());
          super.destroy();
          return this;
      }
      _useBufferCanvas() {
          const hasCornerRadius = !!this.cornerRadius();
          const hasShadow = this.hasShadow();
          if (hasCornerRadius && hasShadow) {
              return true;
          }
          return super._useBufferCanvas(true);
      }
      _sceneFunc(context) {
          const width = this.getWidth();
          const height = this.getHeight();
          const cornerRadius = this.cornerRadius();
          const image = this.attrs.image;
          let params;
          if (image) {
              const cropWidth = this.attrs.cropWidth;
              const cropHeight = this.attrs.cropHeight;
              if (cropWidth && cropHeight) {
                  params = [
                      image,
                      this.cropX(),
                      this.cropY(),
                      cropWidth,
                      cropHeight,
                      0,
                      0,
                      width,
                      height,
                  ];
              }
              else {
                  params = [image, 0, 0, width, height];
              }
          }
          if (this.hasFill() || this.hasStroke() || cornerRadius) {
              context.beginPath();
              cornerRadius
                  ? Util.drawRoundedRectPath(context, width, height, cornerRadius)
                  : context.rect(0, 0, width, height);
              context.closePath();
              context.fillStrokeShape(this);
          }
          if (image) {
              if (cornerRadius) {
                  context.clip();
              }
              context.drawImage.apply(context, params);
          }
          // If you need to draw later, you need to execute save/restore
      }
      _hitFunc(context) {
          const width = this.width(), height = this.height(), cornerRadius = this.cornerRadius();
          context.beginPath();
          if (!cornerRadius) {
              context.rect(0, 0, width, height);
          }
          else {
              Util.drawRoundedRectPath(context, width, height, cornerRadius);
          }
          context.closePath();
          context.fillStrokeShape(this);
      }
      getWidth() {
          var _a, _b;
          return (_a = this.attrs.width) !== null && _a !== void 0 ? _a : (_b = this.image()) === null || _b === void 0 ? void 0 : _b.width;
      }
      getHeight() {
          var _a, _b;
          return (_a = this.attrs.height) !== null && _a !== void 0 ? _a : (_b = this.image()) === null || _b === void 0 ? void 0 : _b.height;
      }
      /**
       * load image from given url and create `Konva.Image` instance
       * @method
       * @memberof Konva.Image
       * @param {String} url image source
       * @param {Function} callback with Konva.Image instance as first argument
       * @param {Function} onError optional error handler
       * @example
       *  Konva.Image.fromURL(imageURL, function(image){
       *    // image is Konva.Image instance
       *    layer.add(image);
       *  });
       */
      static fromURL(url, callback, onError = null) {
          const img = Util.createImageElement();
          img.onload = function () {
              const image = new Image({
                  image: img,
              });
              callback(image);
          };
          img.onerror = onError;
          img.crossOrigin = 'Anonymous';
          img.src = url;
      }
  }
  Image.prototype.className = 'Image';
  _registerNode(Image);
  /**
   * get/set corner radius
   * @method
   * @name Konva.Image#cornerRadius
   * @param {Number} cornerRadius
   * @returns {Number}
   * @example
   * // get corner radius
   * var cornerRadius = image.cornerRadius();
   *
   * // set corner radius
   * image.cornerRadius(10);
   *
   * // set different corner radius values
   * // top-left, top-right, bottom-right, bottom-left
   * image.cornerRadius([0, 10, 20, 30]);
   */
  Factory.addGetterSetter(Image, 'cornerRadius', 0, getNumberOrArrayOfNumbersValidator(4));
  /**
   * get/set image source. It can be image, canvas or video element
   * @name Konva.Image#image
   * @method
   * @param {Object} image source
   * @returns {Object}
   * @example
   * // get value
   * var image = shape.image();
   *
   * // set value
   * shape.image(img);
   */
  Factory.addGetterSetter(Image, 'image');
  Factory.addComponentsGetterSetter(Image, 'crop', ['x', 'y', 'width', 'height']);
  /**
   * get/set crop
   * @method
   * @name Konva.Image#crop
   * @param {Object} crop
   * @param {Number} crop.x
   * @param {Number} crop.y
   * @param {Number} crop.width
   * @param {Number} crop.height
   * @returns {Object}
   * @example
   * // get crop
   * var crop = image.crop();
   *
   * // set crop
   * image.crop({
   *   x: 20,
   *   y: 20,
   *   width: 20,
   *   height: 20
   * });
   */
  Factory.addGetterSetter(Image, 'cropX', 0, getNumberValidator());
  /**
   * get/set crop x
   * @method
   * @name Konva.Image#cropX
   * @param {Number} x
   * @returns {Number}
   * @example
   * // get crop x
   * var cropX = image.cropX();
   *
   * // set crop x
   * image.cropX(20);
   */
  Factory.addGetterSetter(Image, 'cropY', 0, getNumberValidator());
  /**
   * get/set crop y
   * @name Konva.Image#cropY
   * @method
   * @param {Number} y
   * @returns {Number}
   * @example
   * // get crop y
   * var cropY = image.cropY();
   *
   * // set crop y
   * image.cropY(20);
   */
  Factory.addGetterSetter(Image, 'cropWidth', 0, getNumberValidator());
  /**
   * get/set crop width
   * @name Konva.Image#cropWidth
   * @method
   * @param {Number} width
   * @returns {Number}
   * @example
   * // get crop width
   * var cropWidth = image.cropWidth();
   *
   * // set crop width
   * image.cropWidth(20);
   */
  Factory.addGetterSetter(Image, 'cropHeight', 0, getNumberValidator());
  /**
   * get/set crop height
   * @name Konva.Image#cropHeight
   * @method
   * @param {Number} height
   * @returns {Number}
   * @example
   * // get crop height
   * var cropHeight = image.cropHeight();
   *
   * // set crop height
   * image.cropHeight(20);
   */

  // constants
  const ATTR_CHANGE_LIST$2 = [
      'fontFamily',
      'fontSize',
      'fontStyle',
      'padding',
      'lineHeight',
      'text',
      'width',
      'height',
      'pointerDirection',
      'pointerWidth',
      'pointerHeight',
  ], CHANGE_KONVA$1 = 'Change.konva', NONE$1 = 'none', UP = 'up', RIGHT$1 = 'right', DOWN = 'down', LEFT$1 = 'left', 
  // cached variables
  attrChangeListLen$1 = ATTR_CHANGE_LIST$2.length;
  /**
   * Label constructor.&nbsp; Labels are groups that contain a Text and Tag shape
   * @constructor
   * @memberof Konva
   * @param {Object} config
   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * // create label
   * var label = new Konva.Label({
   *   x: 100,
   *   y: 100,
   *   draggable: true
   * });
   *
   * // add a tag to the label
   * label.add(new Konva.Tag({
   *   fill: '#bbb',
   *   stroke: '#333',
   *   shadowColor: 'black',
   *   shadowBlur: 10,
   *   shadowOffset: [10, 10],
   *   shadowOpacity: 0.2,
   *   lineJoin: 'round',
   *   pointerDirection: 'up',
   *   pointerWidth: 20,
   *   pointerHeight: 20,
   *   cornerRadius: 5
   * }));
   *
   * // add text to the label
   * label.add(new Konva.Text({
   *   text: 'Hello World!',
   *   fontSize: 50,
   *   lineHeight: 1.2,
   *   padding: 10,
   *   fill: 'green'
   *  }));
   */
  class Label extends Group {
      constructor(config) {
          super(config);
          this.on('add.konva', function (evt) {
              this._addListeners(evt.child);
              this._sync();
          });
      }
      /**
       * get Text shape for the label.  You need to access the Text shape in order to update
       * the text properties
       * @name Konva.Label#getText
       * @method
       * @example
       * label.getText().fill('red')
       */
      getText() {
          return this.find('Text')[0];
      }
      /**
       * get Tag shape for the label.  You need to access the Tag shape in order to update
       * the pointer properties and the corner radius
       * @name Konva.Label#getTag
       * @method
       */
      getTag() {
          return this.find('Tag')[0];
      }
      _addListeners(text) {
          let that = this, n;
          const func = function () {
              that._sync();
          };
          // update text data for certain attr changes
          for (n = 0; n < attrChangeListLen$1; n++) {
              text.on(ATTR_CHANGE_LIST$2[n] + CHANGE_KONVA$1, func);
          }
      }
      getWidth() {
          return this.getText().width();
      }
      getHeight() {
          return this.getText().height();
      }
      _sync() {
          let text = this.getText(), tag = this.getTag(), width, height, pointerDirection, pointerWidth, x, y, pointerHeight;
          if (text && tag) {
              width = text.width();
              height = text.height();
              pointerDirection = tag.pointerDirection();
              pointerWidth = tag.pointerWidth();
              pointerHeight = tag.pointerHeight();
              x = 0;
              y = 0;
              switch (pointerDirection) {
                  case UP:
                      x = width / 2;
                      y = -1 * pointerHeight;
                      break;
                  case RIGHT$1:
                      x = width + pointerWidth;
                      y = height / 2;
                      break;
                  case DOWN:
                      x = width / 2;
                      y = height + pointerHeight;
                      break;
                  case LEFT$1:
                      x = -1 * pointerWidth;
                      y = height / 2;
                      break;
              }
              tag.setAttrs({
                  x: -1 * x,
                  y: -1 * y,
                  width: width,
                  height: height,
              });
              text.setAttrs({
                  x: -1 * x,
                  y: -1 * y,
              });
          }
      }
  }
  Label.prototype.className = 'Label';
  _registerNode(Label);
  /**
   * Tag constructor.&nbsp; A Tag can be configured
   *  to have a pointer element that points up, right, down, or left
   * @constructor
   * @memberof Konva
   * @param {Object} config
   * @param {String} [config.pointerDirection] can be up, right, down, left, or none; the default
   *  is none.  When a pointer is present, the positioning of the label is relative to the tip of the pointer.
   * @param {Number} [config.pointerWidth]
   * @param {Number} [config.pointerHeight]
   * @param {Number} [config.cornerRadius]
   */
  class Tag extends Shape {
      _sceneFunc(context) {
          const width = this.width(), height = this.height(), pointerDirection = this.pointerDirection(), pointerWidth = this.pointerWidth(), pointerHeight = this.pointerHeight(), cornerRadius = this.cornerRadius();
          let topLeft = 0;
          let topRight = 0;
          let bottomLeft = 0;
          let bottomRight = 0;
          if (typeof cornerRadius === 'number') {
              topLeft =
                  topRight =
                      bottomLeft =
                          bottomRight =
                              Math.min(cornerRadius, width / 2, height / 2);
          }
          else {
              topLeft = Math.min(cornerRadius[0] || 0, width / 2, height / 2);
              topRight = Math.min(cornerRadius[1] || 0, width / 2, height / 2);
              bottomRight = Math.min(cornerRadius[2] || 0, width / 2, height / 2);
              bottomLeft = Math.min(cornerRadius[3] || 0, width / 2, height / 2);
          }
          context.beginPath();
          context.moveTo(topLeft, 0);
          if (pointerDirection === UP) {
              context.lineTo((width - pointerWidth) / 2, 0);
              context.lineTo(width / 2, -1 * pointerHeight);
              context.lineTo((width + pointerWidth) / 2, 0);
          }
          context.lineTo(width - topRight, 0);
          context.arc(width - topRight, topRight, topRight, (Math.PI * 3) / 2, 0, false);
          if (pointerDirection === RIGHT$1) {
              context.lineTo(width, (height - pointerHeight) / 2);
              context.lineTo(width + pointerWidth, height / 2);
              context.lineTo(width, (height + pointerHeight) / 2);
          }
          context.lineTo(width, height - bottomRight);
          context.arc(width - bottomRight, height - bottomRight, bottomRight, 0, Math.PI / 2, false);
          if (pointerDirection === DOWN) {
              context.lineTo((width + pointerWidth) / 2, height);
              context.lineTo(width / 2, height + pointerHeight);
              context.lineTo((width - pointerWidth) / 2, height);
          }
          context.lineTo(bottomLeft, height);
          context.arc(bottomLeft, height - bottomLeft, bottomLeft, Math.PI / 2, Math.PI, false);
          if (pointerDirection === LEFT$1) {
              context.lineTo(0, (height + pointerHeight) / 2);
              context.lineTo(-1 * pointerWidth, height / 2);
              context.lineTo(0, (height - pointerHeight) / 2);
          }
          context.lineTo(0, topLeft);
          context.arc(topLeft, topLeft, topLeft, Math.PI, (Math.PI * 3) / 2, false);
          context.closePath();
          context.fillStrokeShape(this);
      }
      getSelfRect() {
          let x = 0, y = 0, pointerWidth = this.pointerWidth(), pointerHeight = this.pointerHeight(), direction = this.pointerDirection(), width = this.width(), height = this.height();
          if (direction === UP) {
              y -= pointerHeight;
              height += pointerHeight;
          }
          else if (direction === DOWN) {
              height += pointerHeight;
          }
          else if (direction === LEFT$1) {
              // ARGH!!! I have no idea why should I used magic 1.5!!!!!!!!!
              x -= pointerWidth * 1.5;
              width += pointerWidth;
          }
          else if (direction === RIGHT$1) {
              width += pointerWidth * 1.5;
          }
          return {
              x: x,
              y: y,
              width: width,
              height: height,
          };
      }
  }
  Tag.prototype.className = 'Tag';
  _registerNode(Tag);
  /**
   * get/set pointer direction
   * @name Konva.Tag#pointerDirection
   * @method
   * @param {String} pointerDirection can be up, right, down, left, or none.  The default is none.
   * @returns {String}
   * @example
   * tag.pointerDirection('right');
   */
  Factory.addGetterSetter(Tag, 'pointerDirection', NONE$1);
  /**
   * get/set pointer width
   * @name Konva.Tag#pointerWidth
   * @method
   * @param {Number} pointerWidth
   * @returns {Number}
   * @example
   * tag.pointerWidth(20);
   */
  Factory.addGetterSetter(Tag, 'pointerWidth', 0, getNumberValidator());
  /**
   * get/set pointer height
   * @method
   * @name Konva.Tag#pointerHeight
   * @param {Number} pointerHeight
   * @returns {Number}
   * @example
   * tag.pointerHeight(20);
   */
  Factory.addGetterSetter(Tag, 'pointerHeight', 0, getNumberValidator());
  /**
   * get/set cornerRadius
   * @name Konva.Tag#cornerRadius
   * @method
   * @param {Number} cornerRadius
   * @returns {Number}
   * @example
   * tag.cornerRadius(20);
   *
   * // set different corner radius values
   * // top-left, top-right, bottom-right, bottom-left
   * tag.cornerRadius([0, 10, 20, 30]);
   */
  Factory.addGetterSetter(Tag, 'cornerRadius', 0, getNumberOrArrayOfNumbersValidator(4));

  /**
   * Rect constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Number} [config.cornerRadius]
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var rect = new Konva.Rect({
   *   width: 100,
   *   height: 50,
   *   fill: 'red',
   *   stroke: 'black',
   *   strokeWidth: 5
   * });
   */
  class Rect extends Shape {
      _sceneFunc(context) {
          const cornerRadius = this.cornerRadius(), width = this.width(), height = this.height();
          context.beginPath();
          if (!cornerRadius) {
              // simple rect - don't bother doing all that complicated maths stuff.
              context.rect(0, 0, width, height);
          }
          else {
              Util.drawRoundedRectPath(context, width, height, cornerRadius);
          }
          context.closePath();
          context.fillStrokeShape(this);
      }
  }
  Rect.prototype.className = 'Rect';
  _registerNode(Rect);
  /**
   * get/set corner radius
   * @method
   * @name Konva.Rect#cornerRadius
   * @param {Number} cornerRadius
   * @returns {Number}
   * @example
   * // get corner radius
   * var cornerRadius = rect.cornerRadius();
   *
   * // set corner radius
   * rect.cornerRadius(10);
   *
   * // set different corner radius values
   * // top-left, top-right, bottom-right, bottom-left
   * rect.cornerRadius([0, 10, 20, 30]);
   */
  Factory.addGetterSetter(Rect, 'cornerRadius', 0, getNumberOrArrayOfNumbersValidator(4));

  /**
   * RegularPolygon constructor. Examples include triangles, squares, pentagons, hexagons, etc.
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Number} config.sides
   * @param {Number} config.radius
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var hexagon = new Konva.RegularPolygon({
   *   x: 100,
   *   y: 200,
   *   sides: 6,
   *   radius: 70,
   *   fill: 'red',
   *   stroke: 'black',
   *   strokeWidth: 4
   * });
   */
  class RegularPolygon extends Shape {
      _sceneFunc(context) {
          const points = this._getPoints();
          context.beginPath();
          context.moveTo(points[0].x, points[0].y);
          for (let n = 1; n < points.length; n++) {
              context.lineTo(points[n].x, points[n].y);
          }
          context.closePath();
          context.fillStrokeShape(this);
      }
      _getPoints() {
          const sides = this.attrs.sides;
          const radius = this.attrs.radius || 0;
          const points = [];
          for (let n = 0; n < sides; n++) {
              points.push({
                  x: radius * Math.sin((n * 2 * Math.PI) / sides),
                  y: -1 * radius * Math.cos((n * 2 * Math.PI) / sides),
              });
          }
          return points;
      }
      getSelfRect() {
          const points = this._getPoints();
          let minX = points[0].x;
          let maxX = points[0].y;
          let minY = points[0].x;
          let maxY = points[0].y;
          points.forEach((point) => {
              minX = Math.min(minX, point.x);
              maxX = Math.max(maxX, point.x);
              minY = Math.min(minY, point.y);
              maxY = Math.max(maxY, point.y);
          });
          return {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
          };
      }
      getWidth() {
          return this.radius() * 2;
      }
      getHeight() {
          return this.radius() * 2;
      }
      setWidth(width) {
          this.radius(width / 2);
      }
      setHeight(height) {
          this.radius(height / 2);
      }
  }
  RegularPolygon.prototype.className = 'RegularPolygon';
  RegularPolygon.prototype._centroid = true;
  RegularPolygon.prototype._attrsAffectingSize = ['radius'];
  _registerNode(RegularPolygon);
  /**
   * get/set radius
   * @method
   * @name Konva.RegularPolygon#radius
   * @param {Number} radius
   * @returns {Number}
   * @example
   * // get radius
   * var radius = shape.radius();
   *
   * // set radius
   * shape.radius(10);
   */
  Factory.addGetterSetter(RegularPolygon, 'radius', 0, getNumberValidator());
  /**
   * get/set sides
   * @method
   * @name Konva.RegularPolygon#sides
   * @param {Number} sides
   * @returns {Number}
   * @example
   * // get sides
   * var sides = shape.sides();
   *
   * // set sides
   * shape.sides(10);
   */
  Factory.addGetterSetter(RegularPolygon, 'sides', 0, getNumberValidator());

  const PIx2 = Math.PI * 2;
  /**
   * Ring constructor
   * @constructor
   * @augments Konva.Shape
   * @memberof Konva
   * @param {Object} config
   * @param {Number} config.innerRadius
   * @param {Number} config.outerRadius
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var ring = new Konva.Ring({
   *   innerRadius: 40,
   *   outerRadius: 80,
   *   fill: 'red',
   *   stroke: 'black',
   *   strokeWidth: 5
   * });
   */
  class Ring extends Shape {
      _sceneFunc(context) {
          context.beginPath();
          context.arc(0, 0, this.innerRadius(), 0, PIx2, false);
          context.moveTo(this.outerRadius(), 0);
          context.arc(0, 0, this.outerRadius(), PIx2, 0, true);
          context.closePath();
          context.fillStrokeShape(this);
      }
      getWidth() {
          return this.outerRadius() * 2;
      }
      getHeight() {
          return this.outerRadius() * 2;
      }
      setWidth(width) {
          this.outerRadius(width / 2);
      }
      setHeight(height) {
          this.outerRadius(height / 2);
      }
  }
  Ring.prototype.className = 'Ring';
  Ring.prototype._centroid = true;
  Ring.prototype._attrsAffectingSize = ['innerRadius', 'outerRadius'];
  _registerNode(Ring);
  /**
   * get/set innerRadius
   * @method
   * @name Konva.Ring#innerRadius
   * @param {Number} innerRadius
   * @returns {Number}
   * @example
   * // get inner radius
   * var innerRadius = ring.innerRadius();
   *
   * // set inner radius
   * ring.innerRadius(20);
   */
  Factory.addGetterSetter(Ring, 'innerRadius', 0, getNumberValidator());
  /**
   * get/set outerRadius
   * @name Konva.Ring#outerRadius
   * @method
   * @param {Number} outerRadius
   * @returns {Number}
   * @example
   * // get outer radius
   * var outerRadius = ring.outerRadius();
   *
   * // set outer radius
   * ring.outerRadius(20);
   */
  Factory.addGetterSetter(Ring, 'outerRadius', 0, getNumberValidator());

  /**
   * Sprite constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {String} config.animation animation key
   * @param {Object} config.animations animation map
   * @param {Integer} [config.frameIndex] animation frame index
   * @param {Image} config.image image object
   * @param {Integer} [config.frameRate] animation frame rate
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var imageObj = new Image();
   * imageObj.onload = function() {
   *   var sprite = new Konva.Sprite({
   *     x: 200,
   *     y: 100,
   *     image: imageObj,
   *     animation: 'standing',
   *     animations: {
   *       standing: [
   *         // x, y, width, height (6 frames)
   *         0, 0, 49, 109,
   *         52, 0, 49, 109,
   *         105, 0, 49, 109,
   *         158, 0, 49, 109,
   *         210, 0, 49, 109,
   *         262, 0, 49, 109
   *       ],
   *       kicking: [
   *         // x, y, width, height (6 frames)
   *         0, 109, 45, 98,
   *         45, 109, 45, 98,
   *         95, 109, 63, 98,
   *         156, 109, 70, 98,
   *         229, 109, 60, 98,
   *         287, 109, 41, 98
   *       ]
   *     },
   *     frameRate: 7,
   *     frameIndex: 0
   *   });
   * };
   * imageObj.src = '/path/to/image.jpg'
   */
  class Sprite extends Shape {
      constructor(config) {
          super(config);
          this._updated = true;
          this.anim = new Animation(() => {
              // if we don't need to redraw layer we should return false
              const updated = this._updated;
              this._updated = false;
              return updated;
          });
          this.on('animationChange.konva', function () {
              // reset index when animation changes
              this.frameIndex(0);
          });
          this.on('frameIndexChange.konva', function () {
              this._updated = true;
          });
          // smooth change for frameRate
          this.on('frameRateChange.konva', function () {
              if (!this.anim.isRunning()) {
                  return;
              }
              clearInterval(this.interval);
              this._setInterval();
          });
      }
      _sceneFunc(context) {
          const anim = this.animation(), index = this.frameIndex(), ix4 = index * 4, set = this.animations()[anim], offsets = this.frameOffsets(), x = set[ix4 + 0], y = set[ix4 + 1], width = set[ix4 + 2], height = set[ix4 + 3], image = this.image();
          if (this.hasFill() || this.hasStroke()) {
              context.beginPath();
              context.rect(0, 0, width, height);
              context.closePath();
              context.fillStrokeShape(this);
          }
          if (image) {
              if (offsets) {
                  const offset = offsets[anim], ix2 = index * 2;
                  context.drawImage(image, x, y, width, height, offset[ix2 + 0], offset[ix2 + 1], width, height);
              }
              else {
                  context.drawImage(image, x, y, width, height, 0, 0, width, height);
              }
          }
      }
      _hitFunc(context) {
          const anim = this.animation(), index = this.frameIndex(), ix4 = index * 4, set = this.animations()[anim], offsets = this.frameOffsets(), width = set[ix4 + 2], height = set[ix4 + 3];
          context.beginPath();
          if (offsets) {
              const offset = offsets[anim];
              const ix2 = index * 2;
              context.rect(offset[ix2 + 0], offset[ix2 + 1], width, height);
          }
          else {
              context.rect(0, 0, width, height);
          }
          context.closePath();
          context.fillShape(this);
      }
      _useBufferCanvas() {
          return super._useBufferCanvas(true);
      }
      _setInterval() {
          const that = this;
          this.interval = setInterval(function () {
              that._updateIndex();
          }, 1000 / this.frameRate());
      }
      /**
       * start sprite animation
       * @method
       * @name Konva.Sprite#start
       */
      start() {
          if (this.isRunning()) {
              return;
          }
          const layer = this.getLayer();
          /*
           * animation object has no executable function because
           *  the updates are done with a fixed FPS with the setInterval
           *  below.  The anim object only needs the layer reference for
           *  redraw
           */
          this.anim.setLayers(layer);
          this._setInterval();
          this.anim.start();
      }
      /**
       * stop sprite animation
       * @method
       * @name Konva.Sprite#stop
       */
      stop() {
          this.anim.stop();
          clearInterval(this.interval);
      }
      /**
       * determine if animation of sprite is running or not.  returns true or false
       * @method
       * @name Konva.Sprite#isRunning
       * @returns {Boolean}
       */
      isRunning() {
          return this.anim.isRunning();
      }
      _updateIndex() {
          const index = this.frameIndex(), animation = this.animation(), animations = this.animations(), anim = animations[animation], len = anim.length / 4;
          if (index < len - 1) {
              this.frameIndex(index + 1);
          }
          else {
              this.frameIndex(0);
          }
      }
  }
  Sprite.prototype.className = 'Sprite';
  _registerNode(Sprite);
  // add getters setters
  Factory.addGetterSetter(Sprite, 'animation');
  /**
   * get/set animation key
   * @name Konva.Sprite#animation
   * @method
   * @param {String} anim animation key
   * @returns {String}
   * @example
   * // get animation key
   * var animation = sprite.animation();
   *
   * // set animation key
   * sprite.animation('kicking');
   */
  Factory.addGetterSetter(Sprite, 'animations');
  /**
   * get/set animations map
   * @name Konva.Sprite#animations
   * @method
   * @param {Object} animations
   * @returns {Object}
   * @example
   * // get animations map
   * var animations = sprite.animations();
   *
   * // set animations map
   * sprite.animations({
   *   standing: [
   *     // x, y, width, height (6 frames)
   *     0, 0, 49, 109,
   *     52, 0, 49, 109,
   *     105, 0, 49, 109,
   *     158, 0, 49, 109,
   *     210, 0, 49, 109,
   *     262, 0, 49, 109
   *   ],
   *   kicking: [
   *     // x, y, width, height (6 frames)
   *     0, 109, 45, 98,
   *     45, 109, 45, 98,
   *     95, 109, 63, 98,
   *     156, 109, 70, 98,
   *     229, 109, 60, 98,
   *     287, 109, 41, 98
   *   ]
   * });
   */
  Factory.addGetterSetter(Sprite, 'frameOffsets');
  /**
   * get/set offsets map
   * @name Konva.Sprite#offsets
   * @method
   * @param {Object} offsets
   * @returns {Object}
   * @example
   * // get offsets map
   * var offsets = sprite.offsets();
   *
   * // set offsets map
   * sprite.offsets({
   *   standing: [
   *     // x, y (6 frames)
   *     0, 0,
   *     0, 0,
   *     5, 0,
   *     0, 0,
   *     0, 3,
   *     2, 0
   *   ],
   *   kicking: [
   *     // x, y (6 frames)
   *     0, 5,
   *     5, 0,
   *     10, 0,
   *     0, 0,
   *     2, 1,
   *     0, 0
   *   ]
   * });
   */
  Factory.addGetterSetter(Sprite, 'image');
  /**
   * get/set image
   * @name Konva.Sprite#image
   * @method
   * @param {Image} image
   * @returns {Image}
   * @example
   * // get image
   * var image = sprite.image();
   *
   * // set image
   * sprite.image(imageObj);
   */
  Factory.addGetterSetter(Sprite, 'frameIndex', 0, getNumberValidator());
  /**
   * set/set animation frame index
   * @name Konva.Sprite#frameIndex
   * @method
   * @param {Integer} frameIndex
   * @returns {Integer}
   * @example
   * // get animation frame index
   * var frameIndex = sprite.frameIndex();
   *
   * // set animation frame index
   * sprite.frameIndex(3);
   */
  Factory.addGetterSetter(Sprite, 'frameRate', 17, getNumberValidator());
  /**
   * get/set frame rate in frames per second.  Increase this number to make the sprite
   *  animation run faster, and decrease the number to make the sprite animation run slower
   *  The default is 17 frames per second
   * @name Konva.Sprite#frameRate
   * @method
   * @param {Integer} frameRate
   * @returns {Integer}
   * @example
   * // get frame rate
   * var frameRate = sprite.frameRate();
   *
   * // set frame rate to 2 frames per second
   * sprite.frameRate(2);
   */
  Factory.backCompat(Sprite, {
      index: 'frameIndex',
      getIndex: 'getFrameIndex',
      setIndex: 'setFrameIndex',
  });

  /**
   * Star constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Integer} config.numPoints
   * @param {Number} config.innerRadius
   * @param {Number} config.outerRadius
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var star = new Konva.Star({
   *   x: 100,
   *   y: 200,
   *   numPoints: 5,
   *   innerRadius: 70,
   *   outerRadius: 70,
   *   fill: 'red',
   *   stroke: 'black',
   *   strokeWidth: 4
   * });
   */
  class Star extends Shape {
      _sceneFunc(context) {
          const innerRadius = this.innerRadius(), outerRadius = this.outerRadius(), numPoints = this.numPoints();
          context.beginPath();
          context.moveTo(0, 0 - outerRadius);
          for (let n = 1; n < numPoints * 2; n++) {
              const radius = n % 2 === 0 ? outerRadius : innerRadius;
              const x = radius * Math.sin((n * Math.PI) / numPoints);
              const y = -1 * radius * Math.cos((n * Math.PI) / numPoints);
              context.lineTo(x, y);
          }
          context.closePath();
          context.fillStrokeShape(this);
      }
      getWidth() {
          return this.outerRadius() * 2;
      }
      getHeight() {
          return this.outerRadius() * 2;
      }
      setWidth(width) {
          this.outerRadius(width / 2);
      }
      setHeight(height) {
          this.outerRadius(height / 2);
      }
  }
  Star.prototype.className = 'Star';
  Star.prototype._centroid = true;
  Star.prototype._attrsAffectingSize = ['innerRadius', 'outerRadius'];
  _registerNode(Star);
  /**
   * get/set number of points
   * @name Konva.Star#numPoints
   * @method
   * @param {Number} numPoints
   * @returns {Number}
   * @example
   * // get inner radius
   * var numPoints = star.numPoints();
   *
   * // set inner radius
   * star.numPoints(20);
   */
  Factory.addGetterSetter(Star, 'numPoints', 5, getNumberValidator());
  /**
   * get/set innerRadius
   * @name Konva.Star#innerRadius
   * @method
   * @param {Number} innerRadius
   * @returns {Number}
   * @example
   * // get inner radius
   * var innerRadius = star.innerRadius();
   *
   * // set inner radius
   * star.innerRadius(20);
   */
  Factory.addGetterSetter(Star, 'innerRadius', 0, getNumberValidator());
  /**
   * get/set outerRadius
   * @name Konva.Star#outerRadius
   * @method
   * @param {Number} outerRadius
   * @returns {Number}
   * @example
   * // get inner radius
   * var outerRadius = star.outerRadius();
   *
   * // set inner radius
   * star.outerRadius(20);
   */
  Factory.addGetterSetter(Star, 'outerRadius', 0, getNumberValidator());

  function stringToArray(string) {
      // Use Unicode-aware splitting
      return [...string].reduce((acc, char, index, array) => {
          // Handle emoji with skin tone modifiers and ZWJ sequences
          if (/\p{Emoji}/u.test(char)) {
              // Check if next character is a modifier or ZWJ sequence
              const nextChar = array[index + 1];
              if (nextChar && /\p{Emoji_Modifier}|\u200D/u.test(nextChar)) {
                  // If we have a modifier, combine with current emoji
                  acc.push(char + nextChar);
                  // Skip the next character since we've used it
                  array[index + 1] = '';
              }
              else {
                  // No modifier - treat as separate emoji
                  acc.push(char);
              }
          }
          // Handle regional indicator symbols (flags)
          else if (/\p{Regional_Indicator}{2}/u.test(char + (array[index + 1] || ''))) {
              acc.push(char + array[index + 1]);
          }
          // Handle Indic scripts and other combining characters
          else if (index > 0 && /\p{Mn}|\p{Me}|\p{Mc}/u.test(char)) {
              acc[acc.length - 1] += char;
          }
          // Handle other characters
          else if (char) {
              // Only push if not an empty string (skipped modifier)
              acc.push(char);
          }
          return acc;
      }, []);
  }
  // constants
  const AUTO = 'auto', 
  //CANVAS = 'canvas',
  CENTER = 'center', INHERIT = 'inherit', JUSTIFY = 'justify', CHANGE_KONVA = 'Change.konva', CONTEXT_2D = '2d', DASH = '-', LEFT = 'left', TEXT = 'text', TEXT_UPPER = 'Text', TOP = 'top', BOTTOM = 'bottom', MIDDLE = 'middle', NORMAL$1 = 'normal', PX_SPACE = 'px ', SPACE = ' ', RIGHT = 'right', RTL = 'rtl', WORD = 'word', CHAR = 'char', NONE = 'none', ELLIPSIS = '…', ATTR_CHANGE_LIST$1 = [
      'direction',
      'fontFamily',
      'fontSize',
      'fontStyle',
      'fontVariant',
      'padding',
      'align',
      'verticalAlign',
      'lineHeight',
      'text',
      'width',
      'height',
      'wrap',
      'ellipsis',
      'letterSpacing',
  ], 
  // cached variables
  attrChangeListLen = ATTR_CHANGE_LIST$1.length;
  function normalizeFontFamily(fontFamily) {
      return fontFamily
          .split(',')
          .map((family) => {
          family = family.trim();
          const hasSpace = family.indexOf(' ') >= 0;
          const hasQuotes = family.indexOf('"') >= 0 || family.indexOf("'") >= 0;
          if (hasSpace && !hasQuotes) {
              family = `"${family}"`;
          }
          return family;
      })
          .join(', ');
  }
  let dummyContext;
  function getDummyContext() {
      if (dummyContext) {
          return dummyContext;
      }
      dummyContext = Util.createCanvasElement().getContext(CONTEXT_2D);
      return dummyContext;
  }
  function _fillFunc$1(context) {
      context.fillText(this._partialText, this._partialTextX, this._partialTextY);
  }
  function _strokeFunc$1(context) {
      context.setAttr('miterLimit', 2);
      context.strokeText(this._partialText, this._partialTextX, this._partialTextY);
  }
  function checkDefaultFill(config) {
      config = config || {};
      // set default color to black
      if (!config.fillLinearGradientColorStops &&
          !config.fillRadialGradientColorStops &&
          !config.fillPatternImage) {
          config.fill = config.fill || 'black';
      }
      return config;
  }
  /**
   * Text constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {String} [config.direction] default is inherit
   * @param {String} [config.fontFamily] default is Arial
   * @param {Number} [config.fontSize] in pixels.  Default is 12
   * @param {String} [config.fontStyle] can be 'normal', 'italic', or 'bold', '500' or even 'italic bold'.  'normal' is the default.
   * @param {String} [config.fontVariant] can be normal or small-caps.  Default is normal
   * @param {String} [config.textDecoration] can be line-through, underline or empty string. Default is empty string.
   * @param {String} config.text
   * @param {String} [config.align] can be left, center, right or justify
   * @param {String} [config.verticalAlign] can be top, middle or bottom
   * @param {Number} [config.padding]
   * @param {Number} [config.lineHeight] default is 1
   * @param {String} [config.wrap] can be "word", "char", or "none". Default is word
   * @param {Boolean} [config.ellipsis] can be true or false. Default is false. if Konva.Text config is set to wrap="none" and ellipsis=true, then it will add "..." to the end
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var text = new Konva.Text({
   *   x: 10,
   *   y: 15,
   *   text: 'Simple Text',
   *   fontSize: 30,
   *   fontFamily: 'Calibri',
   *   fill: 'green'
   * });
   */
  class Text extends Shape {
      constructor(config) {
          super(checkDefaultFill(config));
          this._partialTextX = 0;
          this._partialTextY = 0;
          // update text data for certain attr changes
          for (let n = 0; n < attrChangeListLen; n++) {
              this.on(ATTR_CHANGE_LIST$1[n] + CHANGE_KONVA, this._setTextData);
          }
          this._setTextData();
      }
      _sceneFunc(context) {
          const textArr = this.textArr, textArrLen = textArr.length;
          if (!this.text()) {
              return;
          }
          let padding = this.padding(), fontSize = this.fontSize(), lineHeightPx = this.lineHeight() * fontSize, verticalAlign = this.verticalAlign(), direction = this.direction(), alignY = 0, align = this.align(), totalWidth = this.getWidth(), letterSpacing = this.letterSpacing(), fill = this.fill(), textDecoration = this.textDecoration(), shouldUnderline = textDecoration.indexOf('underline') !== -1, shouldLineThrough = textDecoration.indexOf('line-through') !== -1, n;
          direction = direction === INHERIT ? context.direction : direction;
          let translateY = lineHeightPx / 2;
          let baseline = MIDDLE;
          if (Konva$2._fixTextRendering) {
              const metrics = this.measureSize('M'); // Use a sample character to get the ascent
              baseline = 'alphabetic';
              translateY =
                  (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 +
                      lineHeightPx / 2;
          }
          if (direction === RTL) {
              context.setAttr('direction', direction);
          }
          context.setAttr('font', this._getContextFont());
          context.setAttr('textBaseline', baseline);
          context.setAttr('textAlign', LEFT);
          // handle vertical alignment
          if (verticalAlign === MIDDLE) {
              alignY = (this.getHeight() - textArrLen * lineHeightPx - padding * 2) / 2;
          }
          else if (verticalAlign === BOTTOM) {
              alignY = this.getHeight() - textArrLen * lineHeightPx - padding * 2;
          }
          context.translate(padding, alignY + padding);
          // draw text lines
          for (n = 0; n < textArrLen; n++) {
              let lineTranslateX = 0;
              let lineTranslateY = 0;
              const obj = textArr[n], text = obj.text, width = obj.width, lastLine = obj.lastInParagraph;
              // horizontal alignment
              context.save();
              if (align === RIGHT) {
                  lineTranslateX += totalWidth - width - padding * 2;
              }
              else if (align === CENTER) {
                  lineTranslateX += (totalWidth - width - padding * 2) / 2;
              }
              if (shouldUnderline) {
                  context.save();
                  context.beginPath();
                  const yOffset = Konva$2._fixTextRendering
                      ? Math.round(fontSize / 4)
                      : Math.round(fontSize / 2);
                  const x = lineTranslateX;
                  const y = translateY + lineTranslateY + yOffset;
                  context.moveTo(x, y);
                  const lineWidth = align === JUSTIFY && !lastLine ? totalWidth - padding * 2 : width;
                  context.lineTo(x + Math.round(lineWidth), y);
                  // I have no idea what is real ratio
                  // just /15 looks good enough
                  context.lineWidth = fontSize / 15;
                  const gradient = this._getLinearGradient();
                  context.strokeStyle = gradient || fill;
                  context.stroke();
                  context.restore();
              }
              if (shouldLineThrough) {
                  context.save();
                  context.beginPath();
                  const yOffset = Konva$2._fixTextRendering ? -Math.round(fontSize / 4) : 0;
                  context.moveTo(lineTranslateX, translateY + lineTranslateY + yOffset);
                  const lineWidth = align === JUSTIFY && !lastLine ? totalWidth - padding * 2 : width;
                  context.lineTo(lineTranslateX + Math.round(lineWidth), translateY + lineTranslateY + yOffset);
                  context.lineWidth = fontSize / 15;
                  const gradient = this._getLinearGradient();
                  context.strokeStyle = gradient || fill;
                  context.stroke();
                  context.restore();
              }
              // As `letterSpacing` isn't supported on Safari, we use this polyfill.
              // The exception is for RTL text, which we rely on native as it cannot
              // be supported otherwise.
              if (direction !== RTL && (letterSpacing !== 0 || align === JUSTIFY)) {
                  //   var words = text.split(' ');
                  const spacesNumber = text.split(' ').length - 1;
                  const array = stringToArray(text);
                  for (let li = 0; li < array.length; li++) {
                      const letter = array[li];
                      // skip justify for the last line
                      if (letter === ' ' && !lastLine && align === JUSTIFY) {
                          lineTranslateX += (totalWidth - padding * 2 - width) / spacesNumber;
                          // context.translate(
                          //   Math.floor((totalWidth - padding * 2 - width) / spacesNumber),
                          //   0
                          // );
                      }
                      this._partialTextX = lineTranslateX;
                      this._partialTextY = translateY + lineTranslateY;
                      this._partialText = letter;
                      context.fillStrokeShape(this);
                      lineTranslateX += this.measureSize(letter).width + letterSpacing;
                  }
              }
              else {
                  if (letterSpacing !== 0) {
                      context.setAttr('letterSpacing', `${letterSpacing}px`);
                  }
                  this._partialTextX = lineTranslateX;
                  this._partialTextY = translateY + lineTranslateY;
                  this._partialText = text;
                  context.fillStrokeShape(this);
              }
              context.restore();
              if (textArrLen > 1) {
                  translateY += lineHeightPx;
              }
          }
      }
      _hitFunc(context) {
          const width = this.getWidth(), height = this.getHeight();
          context.beginPath();
          context.rect(0, 0, width, height);
          context.closePath();
          context.fillStrokeShape(this);
      }
      setText(text) {
          const str = Util._isString(text)
              ? text
              : text === null || text === undefined
                  ? ''
                  : text + '';
          this._setAttr(TEXT, str);
          return this;
      }
      getWidth() {
          const isAuto = this.attrs.width === AUTO || this.attrs.width === undefined;
          return isAuto ? this.getTextWidth() + this.padding() * 2 : this.attrs.width;
      }
      getHeight() {
          const isAuto = this.attrs.height === AUTO || this.attrs.height === undefined;
          return isAuto
              ? this.fontSize() * this.textArr.length * this.lineHeight() +
                  this.padding() * 2
              : this.attrs.height;
      }
      /**
       * get pure text width without padding
       * @method
       * @name Konva.Text#getTextWidth
       * @returns {Number}
       */
      getTextWidth() {
          return this.textWidth;
      }
      getTextHeight() {
          Util.warn('text.getTextHeight() method is deprecated. Use text.height() - for full height and text.fontSize() - for one line height.');
          return this.textHeight;
      }
      /**
       * measure string with the font of current text shape.
       * That method can't handle multiline text.
       * @method
       * @name Konva.Text#measureSize
       * @param {String} text text to measure
       * @returns {Object} { width , height } of measured text
       */
      measureSize(text) {
          var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
          let _context = getDummyContext(), fontSize = this.fontSize(), metrics;
          _context.save();
          _context.font = this._getContextFont();
          metrics = _context.measureText(text);
          _context.restore();
          // Scale the fallback values based on the provided fontSize compared to the sample size (100 in your new case)
          const scaleFactor = fontSize / 100;
          // Note, fallback values are from chrome browser with 100px font size and font-family "Arial"
          return {
              actualBoundingBoxAscent: (_a = metrics.actualBoundingBoxAscent) !== null && _a !== void 0 ? _a : 71.58203125 * scaleFactor,
              actualBoundingBoxDescent: (_b = metrics.actualBoundingBoxDescent) !== null && _b !== void 0 ? _b : 0, // Remains zero as there is no descent in the provided metrics
              actualBoundingBoxLeft: (_c = metrics.actualBoundingBoxLeft) !== null && _c !== void 0 ? _c : -7.421875 * scaleFactor,
              actualBoundingBoxRight: (_d = metrics.actualBoundingBoxRight) !== null && _d !== void 0 ? _d : 75.732421875 * scaleFactor,
              alphabeticBaseline: (_e = metrics.alphabeticBaseline) !== null && _e !== void 0 ? _e : 0, // Remains zero as it's typically relative to the baseline itself
              emHeightAscent: (_f = metrics.emHeightAscent) !== null && _f !== void 0 ? _f : 100 * scaleFactor,
              emHeightDescent: (_g = metrics.emHeightDescent) !== null && _g !== void 0 ? _g : -20 * scaleFactor,
              fontBoundingBoxAscent: (_h = metrics.fontBoundingBoxAscent) !== null && _h !== void 0 ? _h : 91 * scaleFactor,
              fontBoundingBoxDescent: (_j = metrics.fontBoundingBoxDescent) !== null && _j !== void 0 ? _j : 21 * scaleFactor,
              hangingBaseline: (_k = metrics.hangingBaseline) !== null && _k !== void 0 ? _k : 72.80000305175781 * scaleFactor,
              ideographicBaseline: (_l = metrics.ideographicBaseline) !== null && _l !== void 0 ? _l : -21 * scaleFactor,
              width: metrics.width,
              height: fontSize, // Typically set to the font size
          };
      }
      _getContextFont() {
          return (this.fontStyle() +
              SPACE +
              this.fontVariant() +
              SPACE +
              (this.fontSize() + PX_SPACE) +
              // wrap font family into " so font families with spaces works ok
              normalizeFontFamily(this.fontFamily()));
      }
      _addTextLine(line) {
          const align = this.align();
          if (align === JUSTIFY) {
              line = line.trim();
          }
          const width = this._getTextWidth(line);
          return this.textArr.push({
              text: line,
              width: width,
              lastInParagraph: false,
          });
      }
      _getTextWidth(text) {
          const letterSpacing = this.letterSpacing();
          const length = text.length;
          // letterSpacing * length is the total letter spacing for the text
          // previously we used letterSpacing * (length - 1) but it doesn't match DOM behavior
          return getDummyContext().measureText(text).width + letterSpacing * length;
      }
      _setTextData() {
          let lines = this.text().split('\n'), fontSize = +this.fontSize(), textWidth = 0, lineHeightPx = this.lineHeight() * fontSize, width = this.attrs.width, height = this.attrs.height, fixedWidth = width !== AUTO && width !== undefined, fixedHeight = height !== AUTO && height !== undefined, padding = this.padding(), maxWidth = width - padding * 2, maxHeightPx = height - padding * 2, currentHeightPx = 0, wrap = this.wrap(), 
          // align = this.align(),
          shouldWrap = wrap !== NONE, wrapAtWord = wrap !== CHAR && shouldWrap, shouldAddEllipsis = this.ellipsis();
          this.textArr = [];
          getDummyContext().font = this._getContextFont();
          const additionalWidth = shouldAddEllipsis
              ? this._getTextWidth(ELLIPSIS)
              : 0;
          for (let i = 0, max = lines.length; i < max; ++i) {
              let line = lines[i];
              let lineWidth = this._getTextWidth(line);
              if (fixedWidth && lineWidth > maxWidth) {
                  /*
                   * if width is fixed and line does not fit entirely
                   * break the line into multiple fitting lines
                   */
                  while (line.length > 0) {
                      /*
                       * use binary search to find the longest substring that
                       * that would fit in the specified width
                       */
                      let low = 0, high = stringToArray(line).length, // Convert to array for proper emoji handling
                      match = '', matchWidth = 0;
                      while (low < high) {
                          const mid = (low + high) >>> 1, 
                          // Convert array indices to string
                          lineArray = stringToArray(line), substr = lineArray.slice(0, mid + 1).join(''), substrWidth = this._getTextWidth(substr);
                          // Only add ellipsis width when we need to consider truncation
                          // for the current line (when it might be the last visible line)
                          const shouldConsiderEllipsis = shouldAddEllipsis &&
                              fixedHeight &&
                              currentHeightPx + lineHeightPx > maxHeightPx;
                          const effectiveWidth = shouldConsiderEllipsis
                              ? substrWidth + additionalWidth
                              : substrWidth;
                          if (effectiveWidth <= maxWidth) {
                              low = mid + 1;
                              match = substr;
                              matchWidth = substrWidth; // Store actual text width without ellipsis
                          }
                          else {
                              high = mid;
                          }
                      }
                      /*
                       * 'low' is now the index of the substring end
                       * 'match' is the substring
                       * 'matchWidth' is the substring width in px
                       */
                      if (match) {
                          // a fitting substring was found
                          if (wrapAtWord) {
                              // try to find a space or dash where wrapping could be done
                              const lineArray = stringToArray(line);
                              const matchArray = stringToArray(match);
                              const nextChar = lineArray[matchArray.length];
                              const nextIsSpaceOrDash = nextChar === SPACE || nextChar === DASH;
                              let wrapIndex;
                              if (nextIsSpaceOrDash && matchWidth <= maxWidth) {
                                  wrapIndex = matchArray.length;
                              }
                              else {
                                  // Find last space or dash in the array
                                  const lastSpaceIndex = matchArray.lastIndexOf(SPACE);
                                  const lastDashIndex = matchArray.lastIndexOf(DASH);
                                  wrapIndex = Math.max(lastSpaceIndex, lastDashIndex) + 1;
                              }
                              if (wrapIndex > 0) {
                                  low = wrapIndex;
                                  match = lineArray.slice(0, low).join('');
                                  matchWidth = this._getTextWidth(match);
                              }
                          }
                          // if (align === 'right') {
                          match = match.trimRight();
                          // }
                          this._addTextLine(match);
                          textWidth = Math.max(textWidth, matchWidth);
                          currentHeightPx += lineHeightPx;
                          const shouldHandleEllipsis = this._shouldHandleEllipsis(currentHeightPx);
                          if (shouldHandleEllipsis) {
                              this._tryToAddEllipsisToLastLine();
                              /*
                               * stop wrapping if wrapping is disabled or if adding
                               * one more line would overflow the fixed height
                               */
                              break;
                          }
                          // Convert remaining text using array operations
                          const lineArray = stringToArray(line);
                          line = lineArray.slice(low).join('').trimLeft();
                          if (line.length > 0) {
                              lineWidth = this._getTextWidth(line);
                              if (lineWidth <= maxWidth) {
                                  this._addTextLine(line);
                                  currentHeightPx += lineHeightPx;
                                  textWidth = Math.max(textWidth, lineWidth);
                                  break;
                              }
                          }
                      }
                      else {
                          // not even one character could fit in the element, abort
                          break;
                      }
                  }
              }
              else {
                  // element width is automatically adjusted to max line width
                  this._addTextLine(line);
                  currentHeightPx += lineHeightPx;
                  textWidth = Math.max(textWidth, lineWidth);
                  if (this._shouldHandleEllipsis(currentHeightPx) && i < max - 1) {
                      this._tryToAddEllipsisToLastLine();
                  }
              }
              // if element height is fixed, abort if adding one more line would overflow
              if (this.textArr[this.textArr.length - 1]) {
                  this.textArr[this.textArr.length - 1].lastInParagraph = true;
              }
              if (fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx) {
                  break;
              }
          }
          this.textHeight = fontSize;
          // var maxTextWidth = 0;
          // for(var j = 0; j < this.textArr.length; j++) {
          //     maxTextWidth = Math.max(maxTextWidth, this.textArr[j].width);
          // }
          this.textWidth = textWidth;
      }
      /**
       * whether to handle ellipsis, there are two cases:
       * 1. the current line is the last line
       * 2. wrap is NONE
       * @param {Number} currentHeightPx
       * @returns {Boolean}
       */
      _shouldHandleEllipsis(currentHeightPx) {
          const fontSize = +this.fontSize(), lineHeightPx = this.lineHeight() * fontSize, height = this.attrs.height, fixedHeight = height !== AUTO && height !== undefined, padding = this.padding(), maxHeightPx = height - padding * 2, wrap = this.wrap(), shouldWrap = wrap !== NONE;
          return (!shouldWrap ||
              (fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx));
      }
      _tryToAddEllipsisToLastLine() {
          const width = this.attrs.width, fixedWidth = width !== AUTO && width !== undefined, padding = this.padding(), maxWidth = width - padding * 2, shouldAddEllipsis = this.ellipsis();
          const lastLine = this.textArr[this.textArr.length - 1];
          if (!lastLine || !shouldAddEllipsis) {
              return;
          }
          if (fixedWidth) {
              const haveSpace = this._getTextWidth(lastLine.text + ELLIPSIS) < maxWidth;
              if (!haveSpace) {
                  lastLine.text = lastLine.text.slice(0, lastLine.text.length - 3);
              }
          }
          this.textArr.splice(this.textArr.length - 1, 1);
          this._addTextLine(lastLine.text + ELLIPSIS);
      }
      // for text we can't disable stroke scaling
      // if we do, the result will be unexpected
      getStrokeScaleEnabled() {
          return true;
      }
      _useBufferCanvas() {
          const hasLine = this.textDecoration().indexOf('underline') !== -1 ||
              this.textDecoration().indexOf('line-through') !== -1;
          const hasShadow = this.hasShadow();
          if (hasLine && hasShadow) {
              return true;
          }
          return super._useBufferCanvas();
      }
  }
  Text.prototype._fillFunc = _fillFunc$1;
  Text.prototype._strokeFunc = _strokeFunc$1;
  Text.prototype.className = TEXT_UPPER;
  Text.prototype._attrsAffectingSize = [
      'text',
      'fontSize',
      'padding',
      'wrap',
      'lineHeight',
      'letterSpacing',
  ];
  _registerNode(Text);
  /**
   * get/set width of text area, which includes padding.
   * @name Konva.Text#width
   * @method
   * @param {Number} width
   * @returns {Number}
   * @example
   * // get width
   * var width = text.width();
   *
   * // set width
   * text.width(20);
   *
   * // set to auto
   * text.width('auto');
   * text.width() // will return calculated width, and not "auto"
   */
  Factory.overWriteSetter(Text, 'width', getNumberOrAutoValidator());
  /**
   * get/set the height of the text area, which takes into account multi-line text, line heights, and padding.
   * @name Konva.Text#height
   * @method
   * @param {Number} height
   * @returns {Number}
   * @example
   * // get height
   * var height = text.height();
   *
   * // set height
   * text.height(20);
   *
   * // set to auto
   * text.height('auto');
   * text.height() // will return calculated height, and not "auto"
   */
  Factory.overWriteSetter(Text, 'height', getNumberOrAutoValidator());
  /**
   * get/set direction
   * @name Konva.Text#direction
   * @method
   * @param {String} direction
   * @returns {String}
   * @example
   * // get direction
   * var direction = text.direction();
   *
   * // set direction
   * text.direction('rtl');
   */
  Factory.addGetterSetter(Text, 'direction', INHERIT);
  /**
   * get/set font family
   * @name Konva.Text#fontFamily
   * @method
   * @param {String} fontFamily
   * @returns {String}
   * @example
   * // get font family
   * var fontFamily = text.fontFamily();
   *
   * // set font family
   * text.fontFamily('Arial');
   */
  Factory.addGetterSetter(Text, 'fontFamily', 'Arial');
  /**
   * get/set font size in pixels
   * @name Konva.Text#fontSize
   * @method
   * @param {Number} fontSize
   * @returns {Number}
   * @example
   * // get font size
   * var fontSize = text.fontSize();
   *
   * // set font size to 22px
   * text.fontSize(22);
   */
  Factory.addGetterSetter(Text, 'fontSize', 12, getNumberValidator());
  /**
   * get/set font style.  Can be 'normal', 'italic', or 'bold', '500' or even 'italic bold'.  'normal' is the default.
   * @name Konva.Text#fontStyle
   * @method
   * @param {String} fontStyle
   * @returns {String}
   * @example
   * // get font style
   * var fontStyle = text.fontStyle();
   *
   * // set font style
   * text.fontStyle('bold');
   */
  Factory.addGetterSetter(Text, 'fontStyle', NORMAL$1);
  /**
   * get/set font variant.  Can be 'normal' or 'small-caps'.  'normal' is the default.
   * @name Konva.Text#fontVariant
   * @method
   * @param {String} fontVariant
   * @returns {String}
   * @example
   * // get font variant
   * var fontVariant = text.fontVariant();
   *
   * // set font variant
   * text.fontVariant('small-caps');
   */
  Factory.addGetterSetter(Text, 'fontVariant', NORMAL$1);
  /**
   * get/set padding
   * @name Konva.Text#padding
   * @method
   * @param {Number} padding
   * @returns {Number}
   * @example
   * // get padding
   * var padding = text.padding();
   *
   * // set padding to 10 pixels
   * text.padding(10);
   */
  Factory.addGetterSetter(Text, 'padding', 0, getNumberValidator());
  /**
   * get/set horizontal align of text.  Can be 'left', 'center', 'right' or 'justify'
   * @name Konva.Text#align
   * @method
   * @param {String} align
   * @returns {String}
   * @example
   * // get text align
   * var align = text.align();
   *
   * // center text
   * text.align('center');
   *
   * // align text to right
   * text.align('right');
   *
   * // justify text
   */
  Factory.addGetterSetter(Text, 'align', LEFT);
  /**
   * get/set vertical align of text.  Can be 'top', 'middle', 'bottom'.
   * @name Konva.Text#verticalAlign
   * @method
   * @param {String} verticalAlign
   * @returns {String}
   * @example
   * // get text vertical align
   * var verticalAlign = text.verticalAlign();
   *
   * // center text
   * text.verticalAlign('middle');
   */
  Factory.addGetterSetter(Text, 'verticalAlign', TOP);
  /**
   * get/set line height.  The default is 1.
   * @name Konva.Text#lineHeight
   * @method
   * @param {Number} lineHeight
   * @returns {Number}
   * @example
   * // get line height
   * var lineHeight = text.lineHeight();
   *
   * // set the line height
   * text.lineHeight(2);
   */
  Factory.addGetterSetter(Text, 'lineHeight', 1, getNumberValidator());
  /**
   * get/set wrap.  Can be "word", "char", or "none". Default is "word".
   * In "word" wrapping any word still can be wrapped if it can't be placed in the required width
   * without breaks.
   * @name Konva.Text#wrap
   * @method
   * @param {String} wrap
   * @returns {String}
   * @example
   * // get wrap
   * var wrap = text.wrap();
   *
   * // set wrap
   * text.wrap('word');
   */
  Factory.addGetterSetter(Text, 'wrap', WORD);
  /**
   * get/set ellipsis. Can be true or false. Default is false. If ellipses is true,
   * Konva will add "..." at the end of the text if it doesn't have enough space to write characters.
   * That is possible only when you limit both width and height of the text
   * @name Konva.Text#ellipsis
   * @method
   * @param {Boolean} ellipsis
   * @returns {Boolean}
   * @example
   * // get ellipsis param, returns true or false
   * var ellipsis = text.ellipsis();
   *
   * // set ellipsis
   * text.ellipsis(true);
   */
  Factory.addGetterSetter(Text, 'ellipsis', false, getBooleanValidator());
  /**
   * set letter spacing property. Default value is 0.
   * @name Konva.Text#letterSpacing
   * @method
   * @param {Number} letterSpacing
   */
  Factory.addGetterSetter(Text, 'letterSpacing', 0, getNumberValidator());
  /**
   * get/set text
   * @name Konva.Text#text
   * @method
   * @param {String} text
   * @returns {String}
   * @example
   * // get text
   * var text = text.text();
   *
   * // set text
   * text.text('Hello world!');
   */
  Factory.addGetterSetter(Text, 'text', '', getStringValidator());
  /**
   * get/set text decoration of a text.  Possible values are 'underline', 'line-through' or combination of these values separated by space
   * @name Konva.Text#textDecoration
   * @method
   * @param {String} textDecoration
   * @returns {String}
   * @example
   * // get text decoration
   * var textDecoration = text.textDecoration();
   *
   * // underline text
   * text.textDecoration('underline');
   *
   * // strike text
   * text.textDecoration('line-through');
   *
   * // underline and strike text
   * text.textDecoration('underline line-through');
   */
  Factory.addGetterSetter(Text, 'textDecoration', '');

  const EMPTY_STRING = '', NORMAL = 'normal';
  function _fillFunc(context) {
      context.fillText(this.partialText, 0, 0);
  }
  function _strokeFunc(context) {
      context.strokeText(this.partialText, 0, 0);
  }
  /**
   * Path constructor.
   * @author Jason Follas
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {String} [config.fontFamily] default is Arial
   * @param {Number} [config.fontSize] default is 12
   * @param {String} [config.fontStyle] Can be 'normal', 'italic', or 'bold', '500' or even 'italic bold'.  'normal' is the default.
   * @param {String} [config.fontVariant] can be normal or small-caps.  Default is normal
   * @param {String} [config.textBaseline] Can be 'top', 'bottom', 'middle', 'alphabetic', 'hanging'. Default is middle
   * @param {String} config.text
   * @param {String} config.data SVG data string
   * @param {Function} config.kerningFunc a getter for kerning values for the specified characters
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * var kerningPairs = {
   *   'A': {
   *     ' ': -0.05517578125,
   *     'T': -0.07421875,
   *     'V': -0.07421875
   *   }
   *   'V': {
   *     ',': -0.091796875,
   *     ":": -0.037109375,
   *     ";": -0.037109375,
   *     "A": -0.07421875
   *   }
   * }
   * var textpath = new Konva.TextPath({
   *   x: 100,
   *   y: 50,
   *   fill: '#333',
   *   fontSize: '24',
   *   fontFamily: 'Arial',
   *   text: 'All the world\'s a stage, and all the men and women merely players.',
   *   data: 'M10,10 C0,0 10,150 100,100 S300,150 400,50',
   *   kerningFunc(leftChar, rightChar) {
   *     return kerningPairs.hasOwnProperty(leftChar) ? pairs[leftChar][rightChar] || 0 : 0
   *   }
   * });
   */
  class TextPath extends Shape {
      constructor(config) {
          // call super constructor
          super(config);
          this.dummyCanvas = Util.createCanvasElement();
          this.dataArray = [];
          this._readDataAttribute();
          this.on('dataChange.konva', function () {
              this._readDataAttribute();
              this._setTextData();
          });
          // update text data for certain attr changes
          this.on('textChange.konva alignChange.konva letterSpacingChange.konva kerningFuncChange.konva fontSizeChange.konva fontFamilyChange.konva', this._setTextData);
          this._setTextData();
      }
      _getTextPathLength() {
          return Path.getPathLength(this.dataArray);
      }
      _getPointAtLength(length) {
          // if path is not defined yet, do nothing
          if (!this.attrs.data) {
              return null;
          }
          const totalLength = this.pathLength;
          // -1px for rounding of the last symbol
          if (length - 1 > totalLength) {
              return null;
          }
          return Path.getPointAtLengthOfDataArray(length, this.dataArray);
      }
      _readDataAttribute() {
          this.dataArray = Path.parsePathData(this.attrs.data);
          this.pathLength = this._getTextPathLength();
      }
      _sceneFunc(context) {
          context.setAttr('font', this._getContextFont());
          context.setAttr('textBaseline', this.textBaseline());
          context.setAttr('textAlign', 'left');
          context.save();
          const textDecoration = this.textDecoration();
          const fill = this.fill();
          const fontSize = this.fontSize();
          const glyphInfo = this.glyphInfo;
          if (textDecoration === 'underline') {
              context.beginPath();
          }
          for (let i = 0; i < glyphInfo.length; i++) {
              context.save();
              const p0 = glyphInfo[i].p0;
              context.translate(p0.x, p0.y);
              context.rotate(glyphInfo[i].rotation);
              this.partialText = glyphInfo[i].text;
              context.fillStrokeShape(this);
              if (textDecoration === 'underline') {
                  if (i === 0) {
                      context.moveTo(0, fontSize / 2 + 1);
                  }
                  context.lineTo(fontSize, fontSize / 2 + 1);
              }
              context.restore();
              //// To assist with debugging visually, uncomment following
              //
              // if (i % 2) context.strokeStyle = 'cyan';
              // else context.strokeStyle = 'green';
              // var p1 = glyphInfo[i].p1;
              // context.moveTo(p0.x, p0.y);
              // context.lineTo(p1.x, p1.y);
              // context.stroke();
          }
          if (textDecoration === 'underline') {
              context.strokeStyle = fill;
              context.lineWidth = fontSize / 20;
              context.stroke();
          }
          context.restore();
      }
      _hitFunc(context) {
          context.beginPath();
          const glyphInfo = this.glyphInfo;
          if (glyphInfo.length >= 1) {
              const p0 = glyphInfo[0].p0;
              context.moveTo(p0.x, p0.y);
          }
          for (let i = 0; i < glyphInfo.length; i++) {
              const p1 = glyphInfo[i].p1;
              context.lineTo(p1.x, p1.y);
          }
          context.setAttr('lineWidth', this.fontSize());
          context.setAttr('strokeStyle', this.colorKey);
          context.stroke();
      }
      /**
       * get text width in pixels
       * @method
       * @name Konva.TextPath#getTextWidth
       */
      getTextWidth() {
          return this.textWidth;
      }
      getTextHeight() {
          Util.warn('text.getTextHeight() method is deprecated. Use text.height() - for full height and text.fontSize() - for one line height.');
          return this.textHeight;
      }
      setText(text) {
          return Text.prototype.setText.call(this, text);
      }
      _getContextFont() {
          return Text.prototype._getContextFont.call(this);
      }
      _getTextSize(text) {
          const dummyCanvas = this.dummyCanvas;
          const _context = dummyCanvas.getContext('2d');
          _context.save();
          _context.font = this._getContextFont();
          const metrics = _context.measureText(text);
          _context.restore();
          return {
              width: metrics.width,
              height: parseInt(`${this.fontSize()}`, 10),
          };
      }
      _setTextData() {
          const { width, height } = this._getTextSize(this.attrs.text);
          this.textWidth = width;
          this.textHeight = height;
          this.glyphInfo = [];
          if (!this.attrs.data) {
              return null;
          }
          const letterSpacing = this.letterSpacing();
          const align = this.align();
          const kerningFunc = this.kerningFunc();
          // defines the width of the text on a straight line
          const textWidth = Math.max(this.textWidth + ((this.attrs.text || '').length - 1) * letterSpacing, 0);
          let offset = 0;
          if (align === 'center') {
              offset = Math.max(0, this.pathLength / 2 - textWidth / 2);
          }
          if (align === 'right') {
              offset = Math.max(0, this.pathLength - textWidth);
          }
          const charArr = stringToArray(this.text());
          // Algorithm for calculating glyph positions:
          // 1. Get the begging point of the glyph on the path using the offsetToGlyph,
          // 2. Get the ending point of the glyph on the path using the offsetToGlyph plus glyph width,
          // 3. Calculate the rotation, width, and midpoint of the glyph using the start and end points,
          // 4. Add glyph width to the offsetToGlyph and repeat
          let offsetToGlyph = offset;
          for (let i = 0; i < charArr.length; i++) {
              const charStartPoint = this._getPointAtLength(offsetToGlyph);
              if (!charStartPoint)
                  return;
              let glyphWidth = this._getTextSize(charArr[i]).width + letterSpacing;
              if (charArr[i] === ' ' && align === 'justify') {
                  const numberOfSpaces = this.text().split(' ').length - 1;
                  glyphWidth += (this.pathLength - textWidth) / numberOfSpaces;
              }
              const charEndPoint = this._getPointAtLength(offsetToGlyph + glyphWidth);
              if (!charEndPoint)
                  return;
              const width = Path.getLineLength(charStartPoint.x, charStartPoint.y, charEndPoint.x, charEndPoint.y);
              let kern = 0;
              if (kerningFunc) {
                  try {
                      // getKerning is a user provided getter. Make sure it never breaks our logic
                      kern = kerningFunc(charArr[i - 1], charArr[i]) * this.fontSize();
                  }
                  catch (e) {
                      kern = 0;
                  }
              }
              charStartPoint.x += kern;
              charEndPoint.x += kern;
              this.textWidth += kern;
              const midpoint = Path.getPointOnLine(kern + width / 2.0, charStartPoint.x, charStartPoint.y, charEndPoint.x, charEndPoint.y);
              const rotation = Math.atan2(charEndPoint.y - charStartPoint.y, charEndPoint.x - charStartPoint.x);
              this.glyphInfo.push({
                  transposeX: midpoint.x,
                  transposeY: midpoint.y,
                  text: charArr[i],
                  rotation: rotation,
                  p0: charStartPoint,
                  p1: charEndPoint,
              });
              offsetToGlyph += glyphWidth;
          }
      }
      getSelfRect() {
          if (!this.glyphInfo.length) {
              return {
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 0,
              };
          }
          const points = [];
          this.glyphInfo.forEach(function (info) {
              points.push(info.p0.x);
              points.push(info.p0.y);
              points.push(info.p1.x);
              points.push(info.p1.y);
          });
          let minX = points[0] || 0;
          let maxX = points[0] || 0;
          let minY = points[1] || 0;
          let maxY = points[1] || 0;
          let x, y;
          for (let i = 0; i < points.length / 2; i++) {
              x = points[i * 2];
              y = points[i * 2 + 1];
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
          }
          const fontSize = this.fontSize();
          return {
              x: minX - fontSize / 2,
              y: minY - fontSize / 2,
              width: maxX - minX + fontSize,
              height: maxY - minY + fontSize,
          };
      }
      destroy() {
          Util.releaseCanvas(this.dummyCanvas);
          return super.destroy();
      }
  }
  TextPath.prototype._fillFunc = _fillFunc;
  TextPath.prototype._strokeFunc = _strokeFunc;
  TextPath.prototype._fillFuncHit = _fillFunc;
  TextPath.prototype._strokeFuncHit = _strokeFunc;
  TextPath.prototype.className = 'TextPath';
  TextPath.prototype._attrsAffectingSize = ['text', 'fontSize', 'data'];
  _registerNode(TextPath);
  /**
   * get/set SVG path data string.  This method
   *  also automatically parses the data string
   *  into a data array.  Currently supported SVG data:
   *  M, m, L, l, H, h, V, v, Q, q, T, t, C, c, S, s, A, a, Z, z
   * @name Konva.TextPath#data
   * @method
   * @param {String} data svg path string
   * @returns {String}
   * @example
   * // get data
   * var data = shape.data();
   *
   * // set data
   * shape.data('M200,100h100v50z');
   */
  Factory.addGetterSetter(TextPath, 'data');
  /**
   * get/set font family
   * @name Konva.TextPath#fontFamily
   * @method
   * @param {String} fontFamily
   * @returns {String}
   * @example
   * // get font family
   * var fontFamily = shape.fontFamily();
   *
   * // set font family
   * shape.fontFamily('Arial');
   */
  Factory.addGetterSetter(TextPath, 'fontFamily', 'Arial');
  /**
   * get/set font size in pixels
   * @name Konva.TextPath#fontSize
   * @method
   * @param {Number} fontSize
   * @returns {Number}
   * @example
   * // get font size
   * var fontSize = shape.fontSize();
   *
   * // set font size to 22px
   * shape.fontSize(22);
   */
  Factory.addGetterSetter(TextPath, 'fontSize', 12, getNumberValidator());
  /**
   * get/set font style.  Can be 'normal', 'italic', or 'bold', '500' or even 'italic bold'.  'normal' is the default.
   * @name Konva.TextPath#fontStyle
   * @method
   * @param {String} fontStyle
   * @returns {String}
   * @example
   * // get font style
   * var fontStyle = shape.fontStyle();
   *
   * // set font style
   * shape.fontStyle('bold');
   */
  Factory.addGetterSetter(TextPath, 'fontStyle', NORMAL);
  /**
   * get/set horizontal align of text.  Can be 'left', 'center', 'right' or 'justify'
   * @name Konva.TextPath#align
   * @method
   * @param {String} align
   * @returns {String}
   * @example
   * // get text align
   * var align = text.align();
   *
   * // center text
   * text.align('center');
   *
   * // align text to right
   * text.align('right');
   */
  Factory.addGetterSetter(TextPath, 'align', 'left');
  /**
   * get/set letter spacing.  The default is 0.
   * @name Konva.TextPath#letterSpacing
   * @method
   * @param {Number} letterSpacing
   * @returns {Number}
   * @example
   * // get letter spacing value
   * var letterSpacing = shape.letterSpacing();
   *
   * // set the letter spacing value
   * shape.letterSpacing(2);
   */
  Factory.addGetterSetter(TextPath, 'letterSpacing', 0, getNumberValidator());
  /**
   * get/set text baseline.  The default is 'middle'. Can be 'top', 'bottom', 'middle', 'alphabetic', 'hanging'
   * @name Konva.TextPath#textBaseline
   * @method
   * @param {String} textBaseline
   * @returns {String}
   * @example
   * // get current text baseline
   * var textBaseline = shape.textBaseline();
   *
   * // set new text baseline
   * shape.textBaseline('top');
   */
  Factory.addGetterSetter(TextPath, 'textBaseline', 'middle');
  /**
   * get/set font variant.  Can be 'normal' or 'small-caps'.  'normal' is the default.
   * @name Konva.TextPath#fontVariant
   * @method
   * @param {String} fontVariant
   * @returns {String}
   * @example
   * // get font variant
   * var fontVariant = shape.fontVariant();
   *
   * // set font variant
   * shape.fontVariant('small-caps');
   */
  Factory.addGetterSetter(TextPath, 'fontVariant', NORMAL);
  /**
   * get/set text
   * @name Konva.TextPath#getText
   * @method
   * @param {String} text
   * @returns {String}
   * @example
   * // get text
   * var text = text.text();
   *
   * // set text
   * text.text('Hello world!');
   */
  Factory.addGetterSetter(TextPath, 'text', EMPTY_STRING);
  /**
   * get/set text decoration of a text.  Can be '' or 'underline'.
   * @name Konva.TextPath#textDecoration
   * @method
   * @param {String} textDecoration
   * @returns {String}
   * @example
   * // get text decoration
   * var textDecoration = shape.textDecoration();
   *
   * // underline text
   * shape.textDecoration('underline');
   */
  Factory.addGetterSetter(TextPath, 'textDecoration', '');
  /**
   * get/set kerning function.
   * @name Konva.TextPath#kerningFunc
   * @method
   * @param {String} kerningFunc
   * @returns {String}
   * @example
   * // get text decoration
   * var kerningFunc = text.kerningFunc();
   *
   * // center text
   * text.kerningFunc(function(leftChar, rightChar) {
   *   return 1;
   * });
   */
  Factory.addGetterSetter(TextPath, 'kerningFunc', undefined);

  const EVENTS_NAME = 'tr-konva';
  const ATTR_CHANGE_LIST = [
      'resizeEnabledChange',
      'rotateAnchorOffsetChange',
      'rotateEnabledChange',
      'enabledAnchorsChange',
      'anchorSizeChange',
      'borderEnabledChange',
      'borderStrokeChange',
      'borderStrokeWidthChange',
      'borderDashChange',
      'anchorStrokeChange',
      'anchorStrokeWidthChange',
      'anchorFillChange',
      'anchorCornerRadiusChange',
      'ignoreStrokeChange',
      'anchorStyleFuncChange',
  ]
      .map((e) => e + `.${EVENTS_NAME}`)
      .join(' ');
  const NODES_RECT = 'nodesRect';
  const TRANSFORM_CHANGE_STR = [
      'widthChange',
      'heightChange',
      'scaleXChange',
      'scaleYChange',
      'skewXChange',
      'skewYChange',
      'rotationChange',
      'offsetXChange',
      'offsetYChange',
      'transformsEnabledChange',
      'strokeWidthChange',
  ];
  const ANGLES = {
      'top-left': -45,
      'top-center': 0,
      'top-right': 45,
      'middle-right': -90,
      'middle-left': 90,
      'bottom-left': -135,
      'bottom-center': 180,
      'bottom-right': 135,
  };
  const TOUCH_DEVICE = 'ontouchstart' in Konva$2._global;
  function getCursor(anchorName, rad, rotateCursor) {
      if (anchorName === 'rotater') {
          return rotateCursor;
      }
      rad += Util.degToRad(ANGLES[anchorName] || 0);
      const angle = ((Util.radToDeg(rad) % 360) + 360) % 360;
      if (Util._inRange(angle, 315 + 22.5, 360) || Util._inRange(angle, 0, 22.5)) {
          // TOP
          return 'ns-resize';
      }
      else if (Util._inRange(angle, 45 - 22.5, 45 + 22.5)) {
          // TOP - RIGHT
          return 'nesw-resize';
      }
      else if (Util._inRange(angle, 90 - 22.5, 90 + 22.5)) {
          // RIGHT
          return 'ew-resize';
      }
      else if (Util._inRange(angle, 135 - 22.5, 135 + 22.5)) {
          // BOTTOM - RIGHT
          return 'nwse-resize';
      }
      else if (Util._inRange(angle, 180 - 22.5, 180 + 22.5)) {
          // BOTTOM
          return 'ns-resize';
      }
      else if (Util._inRange(angle, 225 - 22.5, 225 + 22.5)) {
          // BOTTOM - LEFT
          return 'nesw-resize';
      }
      else if (Util._inRange(angle, 270 - 22.5, 270 + 22.5)) {
          // RIGHT
          return 'ew-resize';
      }
      else if (Util._inRange(angle, 315 - 22.5, 315 + 22.5)) {
          // BOTTOM - RIGHT
          return 'nwse-resize';
      }
      else {
          // how can we can there?
          Util.error('Transformer has unknown angle for cursor detection: ' + angle);
          return 'pointer';
      }
  }
  const ANCHORS_NAMES = [
      'top-left',
      'top-center',
      'top-right',
      'middle-right',
      'middle-left',
      'bottom-left',
      'bottom-center',
      'bottom-right',
  ];
  function getCenter(shape) {
      return {
          x: shape.x +
              (shape.width / 2) * Math.cos(shape.rotation) +
              (shape.height / 2) * Math.sin(-shape.rotation),
          y: shape.y +
              (shape.height / 2) * Math.cos(shape.rotation) +
              (shape.width / 2) * Math.sin(shape.rotation),
      };
  }
  function rotateAroundPoint(shape, angleRad, point) {
      const x = point.x +
          (shape.x - point.x) * Math.cos(angleRad) -
          (shape.y - point.y) * Math.sin(angleRad);
      const y = point.y +
          (shape.x - point.x) * Math.sin(angleRad) +
          (shape.y - point.y) * Math.cos(angleRad);
      return {
          ...shape,
          rotation: shape.rotation + angleRad,
          x,
          y,
      };
  }
  function rotateAroundCenter(shape, deltaRad) {
      const center = getCenter(shape);
      return rotateAroundPoint(shape, deltaRad, center);
  }
  function getSnap(snaps, newRotationRad, tol) {
      let snapped = newRotationRad;
      for (let i = 0; i < snaps.length; i++) {
          const angle = Konva$2.getAngle(snaps[i]);
          const absDiff = Math.abs(angle - newRotationRad) % (Math.PI * 2);
          const dif = Math.min(absDiff, Math.PI * 2 - absDiff);
          if (dif < tol) {
              snapped = angle;
          }
      }
      return snapped;
  }
  let activeTransformersCount = 0;
  /**
   * Transformer constructor.  Transformer is a special type of group that allow you transform Konva
   * primitives and shapes. Transforming tool is not changing `width` and `height` properties of nodes
   * when you resize them. Instead it changes `scaleX` and `scaleY` properties.
   * @constructor
   * @memberof Konva
   * @param {Object} config
   * @param {Boolean} [config.resizeEnabled] Default is true
   * @param {Boolean} [config.rotateEnabled] Default is true
   * @param {Boolean} [config.rotateLineVisible] Default is true
   * @param {Array} [config.rotationSnaps] Array of angles for rotation snaps. Default is []
   * @param {Number} [config.rotationSnapTolerance] Snapping tolerance. If closer than this it will snap. Default is 5
   * @param {Number} [config.rotateAnchorOffset] Default is 50
   * @param {String} [config.rotateAnchorCursor] Default is crosshair
   * @param {Number} [config.padding] Default is 0
   * @param {Boolean} [config.borderEnabled] Should we draw border? Default is true
   * @param {String} [config.borderStroke] Border stroke color
   * @param {Number} [config.borderStrokeWidth] Border stroke size
   * @param {Array} [config.borderDash] Array for border dash.
   * @param {String} [config.anchorFill] Anchor fill color
   * @param {String} [config.anchorStroke] Anchor stroke color
   * @param {String} [config.anchorCornerRadius] Anchor corner radius
   * @param {Number} [config.anchorStrokeWidth] Anchor stroke size
   * @param {Number} [config.anchorSize] Default is 10
   * @param {Boolean} [config.keepRatio] Should we keep ratio when we are moving edges? Default is true
   * @param {String} [config.shiftBehavior] How does transformer react on shift key press when we are moving edges? Default is 'default'
   * @param {Boolean} [config.centeredScaling] Should we resize relative to node's center? Default is false
   * @param {Array} [config.enabledAnchors] Array of names of enabled handles
   * @param {Boolean} [config.flipEnabled] Can we flip/mirror shape on transform?. True by default
   * @param {Function} [config.boundBoxFunc] Bounding box function
   * @param {Function} [config.ignoreStroke] Should we ignore stroke size? Default is false
   * @param {Boolean} [config.useSingleNodeRotation] When just one node attached, should we use its rotation for transformer?
   * @param {Boolean} [config.shouldOverdrawWholeArea] Should we fill whole transformer area with fake transparent shape to enable dragging from empty spaces?
   * @example
   * var transformer = new Konva.Transformer({
   *   nodes: [rectangle],
   *   rotateAnchorOffset: 60,
   *   enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
   * });
   * layer.add(transformer);
   */
  class Transformer extends Group {
      constructor(config) {
          // call super constructor
          super(config);
          this._movingAnchorName = null;
          this._transforming = false;
          this._createElements();
          // bindings
          this._handleMouseMove = this._handleMouseMove.bind(this);
          this._handleMouseUp = this._handleMouseUp.bind(this);
          this.update = this.update.bind(this);
          // update transformer data for certain attr changes
          this.on(ATTR_CHANGE_LIST, this.update);
          if (this.getNode()) {
              this.update();
          }
      }
      /**
       * alias to `tr.nodes([shape])`/ This method is deprecated and will be removed soon.
       * @method
       * @name Konva.Transformer#attachTo
       * @returns {Konva.Transformer}
       * @example
       * transformer.attachTo(shape);
       */
      attachTo(node) {
          this.setNode(node);
          return this;
      }
      setNode(node) {
          Util.warn('tr.setNode(shape), tr.node(shape) and tr.attachTo(shape) methods are deprecated. Please use tr.nodes(nodesArray) instead.');
          return this.setNodes([node]);
      }
      getNode() {
          return this._nodes && this._nodes[0];
      }
      _getEventNamespace() {
          return EVENTS_NAME + this._id;
      }
      setNodes(nodes = []) {
          if (this._nodes && this._nodes.length) {
              this.detach();
          }
          const filteredNodes = nodes.filter((node) => {
              // check if ancestor of the transformer
              if (node.isAncestorOf(this)) {
                  Util.error('Konva.Transformer cannot be an a child of the node you are trying to attach');
                  return false;
              }
              return true;
          });
          this._nodes = nodes = filteredNodes;
          if (nodes.length === 1 && this.useSingleNodeRotation()) {
              this.rotation(nodes[0].getAbsoluteRotation());
          }
          else {
              this.rotation(0);
          }
          this._nodes.forEach((node) => {
              const onChange = () => {
                  if (this.nodes().length === 1 && this.useSingleNodeRotation()) {
                      this.rotation(this.nodes()[0].getAbsoluteRotation());
                  }
                  this._resetTransformCache();
                  if (!this._transforming && !this.isDragging()) {
                      this.update();
                  }
              };
              if (node._attrsAffectingSize.length) {
                  const additionalEvents = node._attrsAffectingSize
                      .map((prop) => prop + 'Change.' + this._getEventNamespace())
                      .join(' ');
                  node.on(additionalEvents, onChange);
              }
              node.on(TRANSFORM_CHANGE_STR.map((e) => e + `.${this._getEventNamespace()}`).join(' '), onChange);
              node.on(`absoluteTransformChange.${this._getEventNamespace()}`, onChange);
              this._proxyDrag(node);
          });
          this._resetTransformCache();
          // we may need it if we set node in initial props
          // so elements are not defined yet
          const elementsCreated = !!this.findOne('.top-left');
          if (elementsCreated) {
              this.update();
          }
          return this;
      }
      _proxyDrag(node) {
          let lastPos;
          node.on(`dragstart.${this._getEventNamespace()}`, (e) => {
              lastPos = node.getAbsolutePosition();
              // actual dragging of Transformer doesn't make sense
              // but we need to make sure it also has all drag events
              if (!this.isDragging() && node !== this.findOne('.back')) {
                  this.startDrag(e, false);
              }
          });
          node.on(`dragmove.${this._getEventNamespace()}`, (e) => {
              if (!lastPos) {
                  return;
              }
              const abs = node.getAbsolutePosition();
              const dx = abs.x - lastPos.x;
              const dy = abs.y - lastPos.y;
              this.nodes().forEach((otherNode) => {
                  if (otherNode === node) {
                      return;
                  }
                  if (otherNode.isDragging()) {
                      return;
                  }
                  const otherAbs = otherNode.getAbsolutePosition();
                  otherNode.setAbsolutePosition({
                      x: otherAbs.x + dx,
                      y: otherAbs.y + dy,
                  });
                  otherNode.startDrag(e);
              });
              lastPos = null;
          });
      }
      getNodes() {
          return this._nodes || [];
      }
      /**
       * return the name of current active anchor
       * @method
       * @name Konva.Transformer#getActiveAnchor
       * @returns {String | Null}
       * @example
       * transformer.getActiveAnchor();
       */
      getActiveAnchor() {
          return this._movingAnchorName;
      }
      /**
       * detach transformer from an attached node
       * @method
       * @name Konva.Transformer#detach
       * @returns {Konva.Transformer}
       * @example
       * transformer.detach();
       */
      detach() {
          // remove events
          if (this._nodes) {
              this._nodes.forEach((node) => {
                  node.off('.' + this._getEventNamespace());
              });
          }
          this._nodes = [];
          this._resetTransformCache();
      }
      /**
       * bind events to the Transformer. You can use events: `transform`, `transformstart`, `transformend`, `dragstart`, `dragmove`, `dragend`
       * @method
       * @name Konva.Transformer#on
       * @param {String} evtStr e.g. 'transform'
       * @param {Function} handler The handler function. The first argument of that function is event object. Event object has `target` as main target of the event, `currentTarget` as current node listener and `evt` as native browser event.
       * @returns {Konva.Transformer}
       * @example
       * // add click listener
       * tr.on('transformstart', function() {
       *   console.log('transform started');
       * });
       */
      _resetTransformCache() {
          this._clearCache(NODES_RECT);
          this._clearCache('transform');
          this._clearSelfAndDescendantCache('absoluteTransform');
      }
      _getNodeRect() {
          return this._getCache(NODES_RECT, this.__getNodeRect);
      }
      // return absolute rotated bounding rectangle
      __getNodeShape(node, rot = this.rotation(), relative) {
          const rect = node.getClientRect({
              skipTransform: true,
              skipShadow: true,
              skipStroke: this.ignoreStroke(),
          });
          const absScale = node.getAbsoluteScale(relative);
          const absPos = node.getAbsolutePosition(relative);
          const dx = rect.x * absScale.x - node.offsetX() * absScale.x;
          const dy = rect.y * absScale.y - node.offsetY() * absScale.y;
          const rotation = (Konva$2.getAngle(node.getAbsoluteRotation()) + Math.PI * 2) %
              (Math.PI * 2);
          const box = {
              x: absPos.x + dx * Math.cos(rotation) + dy * Math.sin(-rotation),
              y: absPos.y + dy * Math.cos(rotation) + dx * Math.sin(rotation),
              width: rect.width * absScale.x,
              height: rect.height * absScale.y,
              rotation: rotation,
          };
          return rotateAroundPoint(box, -Konva$2.getAngle(rot), {
              x: 0,
              y: 0,
          });
      }
      // returns box + rotation of all shapes
      __getNodeRect() {
          const node = this.getNode();
          if (!node) {
              return {
                  x: -1e8,
                  y: -1e8,
                  width: 0,
                  height: 0,
                  rotation: 0,
              };
          }
          const totalPoints = [];
          this.nodes().map((node) => {
              const box = node.getClientRect({
                  skipTransform: true,
                  skipShadow: true,
                  skipStroke: this.ignoreStroke(),
              });
              const points = [
                  { x: box.x, y: box.y },
                  { x: box.x + box.width, y: box.y },
                  { x: box.x + box.width, y: box.y + box.height },
                  { x: box.x, y: box.y + box.height },
              ];
              const trans = node.getAbsoluteTransform();
              points.forEach(function (point) {
                  const transformed = trans.point(point);
                  totalPoints.push(transformed);
              });
          });
          const tr = new Transform();
          tr.rotate(-Konva$2.getAngle(this.rotation()));
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          totalPoints.forEach(function (point) {
              const transformed = tr.point(point);
              if (minX === undefined) {
                  minX = maxX = transformed.x;
                  minY = maxY = transformed.y;
              }
              minX = Math.min(minX, transformed.x);
              minY = Math.min(minY, transformed.y);
              maxX = Math.max(maxX, transformed.x);
              maxY = Math.max(maxY, transformed.y);
          });
          tr.invert();
          const p = tr.point({ x: minX, y: minY });
          return {
              x: p.x,
              y: p.y,
              width: maxX - minX,
              height: maxY - minY,
              rotation: Konva$2.getAngle(this.rotation()),
          };
          // const shapes = this.nodes().map(node => {
          //   return this.__getNodeShape(node);
          // });
          // const box = getShapesRect(shapes);
          // return rotateAroundPoint(box, Konva.getAngle(this.rotation()), {
          //   x: 0,
          //   y: 0
          // });
      }
      getX() {
          return this._getNodeRect().x;
      }
      getY() {
          return this._getNodeRect().y;
      }
      getWidth() {
          return this._getNodeRect().width;
      }
      getHeight() {
          return this._getNodeRect().height;
      }
      _createElements() {
          this._createBack();
          ANCHORS_NAMES.forEach((name) => {
              this._createAnchor(name);
          });
          this._createAnchor('rotater');
      }
      _createAnchor(name) {
          const anchor = new Rect({
              stroke: 'rgb(0, 161, 255)',
              fill: 'white',
              strokeWidth: 1,
              name: name + ' _anchor',
              dragDistance: 0,
              // make it draggable,
              // so activating the anchor will not start drag&drop of any parent
              draggable: true,
              hitStrokeWidth: TOUCH_DEVICE ? 10 : 'auto',
          });
          const self = this;
          anchor.on('mousedown touchstart', function (e) {
              self._handleMouseDown(e);
          });
          anchor.on('dragstart', (e) => {
              anchor.stopDrag();
              e.cancelBubble = true;
          });
          anchor.on('dragend', (e) => {
              e.cancelBubble = true;
          });
          // add hover styling
          anchor.on('mouseenter', () => {
              const rad = Konva$2.getAngle(this.rotation());
              const rotateCursor = this.rotateAnchorCursor();
              const cursor = getCursor(name, rad, rotateCursor);
              anchor.getStage().content &&
                  (anchor.getStage().content.style.cursor = cursor);
              this._cursorChange = true;
          });
          anchor.on('mouseout', () => {
              anchor.getStage().content &&
                  (anchor.getStage().content.style.cursor = '');
              this._cursorChange = false;
          });
          this.add(anchor);
      }
      _createBack() {
          const back = new Shape({
              name: 'back',
              width: 0,
              height: 0,
              draggable: true,
              sceneFunc(ctx, shape) {
                  const tr = shape.getParent();
                  const padding = tr.padding();
                  ctx.beginPath();
                  ctx.rect(-padding, -padding, shape.width() + padding * 2, shape.height() + padding * 2);
                  ctx.moveTo(shape.width() / 2, -padding);
                  if (tr.rotateEnabled() && tr.rotateLineVisible()) {
                      ctx.lineTo(shape.width() / 2, -tr.rotateAnchorOffset() * Util._sign(shape.height()) - padding);
                  }
                  ctx.fillStrokeShape(shape);
              },
              hitFunc: (ctx, shape) => {
                  if (!this.shouldOverdrawWholeArea()) {
                      return;
                  }
                  const padding = this.padding();
                  ctx.beginPath();
                  ctx.rect(-padding, -padding, shape.width() + padding * 2, shape.height() + padding * 2);
                  ctx.fillStrokeShape(shape);
              },
          });
          this.add(back);
          this._proxyDrag(back);
          // do not bubble drag from the back shape
          // because we already "drag" whole transformer
          // so we don't want to trigger drag twice on transformer
          back.on('dragstart', (e) => {
              e.cancelBubble = true;
          });
          back.on('dragmove', (e) => {
              e.cancelBubble = true;
          });
          back.on('dragend', (e) => {
              e.cancelBubble = true;
          });
          // force self update when we drag with shouldOverDrawWholeArea setting
          this.on('dragmove', (e) => {
              this.update();
          });
      }
      _handleMouseDown(e) {
          // do nothing if we already transforming
          // that is possible to trigger with multitouch
          if (this._transforming) {
              return;
          }
          this._movingAnchorName = e.target.name().split(' ')[0];
          const attrs = this._getNodeRect();
          const width = attrs.width;
          const height = attrs.height;
          const hypotenuse = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
          this.sin = Math.abs(height / hypotenuse);
          this.cos = Math.abs(width / hypotenuse);
          if (typeof window !== 'undefined') {
              window.addEventListener('mousemove', this._handleMouseMove);
              window.addEventListener('touchmove', this._handleMouseMove);
              window.addEventListener('mouseup', this._handleMouseUp, true);
              window.addEventListener('touchend', this._handleMouseUp, true);
          }
          this._transforming = true;
          const ap = e.target.getAbsolutePosition();
          const pos = e.target.getStage().getPointerPosition();
          this._anchorDragOffset = {
              x: pos.x - ap.x,
              y: pos.y - ap.y,
          };
          activeTransformersCount++;
          this._fire('transformstart', { evt: e.evt, target: this.getNode() });
          this._nodes.forEach((target) => {
              target._fire('transformstart', { evt: e.evt, target });
          });
      }
      _handleMouseMove(e) {
          let x, y, newHypotenuse;
          const anchorNode = this.findOne('.' + this._movingAnchorName);
          const stage = anchorNode.getStage();
          stage.setPointersPositions(e);
          const pp = stage.getPointerPosition();
          let newNodePos = {
              x: pp.x - this._anchorDragOffset.x,
              y: pp.y - this._anchorDragOffset.y,
          };
          const oldAbs = anchorNode.getAbsolutePosition();
          if (this.anchorDragBoundFunc()) {
              newNodePos = this.anchorDragBoundFunc()(oldAbs, newNodePos, e);
          }
          anchorNode.setAbsolutePosition(newNodePos);
          const newAbs = anchorNode.getAbsolutePosition();
          // console.log(oldAbs, newNodePos, newAbs);
          if (oldAbs.x === newAbs.x && oldAbs.y === newAbs.y) {
              return;
          }
          // rotater is working very differently, so do it first
          if (this._movingAnchorName === 'rotater') {
              const attrs = this._getNodeRect();
              x = anchorNode.x() - attrs.width / 2;
              y = -anchorNode.y() + attrs.height / 2;
              // hor angle is changed?
              let delta = Math.atan2(-y, x) + Math.PI / 2;
              if (attrs.height < 0) {
                  delta -= Math.PI;
              }
              const oldRotation = Konva$2.getAngle(this.rotation());
              const newRotation = oldRotation + delta;
              const tol = Konva$2.getAngle(this.rotationSnapTolerance());
              const snappedRot = getSnap(this.rotationSnaps(), newRotation, tol);
              const diff = snappedRot - attrs.rotation;
              const shape = rotateAroundCenter(attrs, diff);
              this._fitNodesInto(shape, e);
              return;
          }
          const shiftBehavior = this.shiftBehavior();
          let keepProportion;
          if (shiftBehavior === 'inverted') {
              keepProportion = this.keepRatio() && !e.shiftKey;
          }
          else if (shiftBehavior === 'none') {
              keepProportion = this.keepRatio();
          }
          else {
              keepProportion = this.keepRatio() || e.shiftKey;
          }
          let centeredScaling = this.centeredScaling() || e.altKey;
          if (this._movingAnchorName === 'top-left') {
              if (keepProportion) {
                  const comparePoint = centeredScaling
                      ? {
                          x: this.width() / 2,
                          y: this.height() / 2,
                      }
                      : {
                          x: this.findOne('.bottom-right').x(),
                          y: this.findOne('.bottom-right').y(),
                      };
                  newHypotenuse = Math.sqrt(Math.pow(comparePoint.x - anchorNode.x(), 2) +
                      Math.pow(comparePoint.y - anchorNode.y(), 2));
                  const reverseX = this.findOne('.top-left').x() > comparePoint.x ? -1 : 1;
                  const reverseY = this.findOne('.top-left').y() > comparePoint.y ? -1 : 1;
                  x = newHypotenuse * this.cos * reverseX;
                  y = newHypotenuse * this.sin * reverseY;
                  this.findOne('.top-left').x(comparePoint.x - x);
                  this.findOne('.top-left').y(comparePoint.y - y);
              }
          }
          else if (this._movingAnchorName === 'top-center') {
              this.findOne('.top-left').y(anchorNode.y());
          }
          else if (this._movingAnchorName === 'top-right') {
              if (keepProportion) {
                  const comparePoint = centeredScaling
                      ? {
                          x: this.width() / 2,
                          y: this.height() / 2,
                      }
                      : {
                          x: this.findOne('.bottom-left').x(),
                          y: this.findOne('.bottom-left').y(),
                      };
                  newHypotenuse = Math.sqrt(Math.pow(anchorNode.x() - comparePoint.x, 2) +
                      Math.pow(comparePoint.y - anchorNode.y(), 2));
                  const reverseX = this.findOne('.top-right').x() < comparePoint.x ? -1 : 1;
                  const reverseY = this.findOne('.top-right').y() > comparePoint.y ? -1 : 1;
                  x = newHypotenuse * this.cos * reverseX;
                  y = newHypotenuse * this.sin * reverseY;
                  this.findOne('.top-right').x(comparePoint.x + x);
                  this.findOne('.top-right').y(comparePoint.y - y);
              }
              var pos = anchorNode.position();
              this.findOne('.top-left').y(pos.y);
              this.findOne('.bottom-right').x(pos.x);
          }
          else if (this._movingAnchorName === 'middle-left') {
              this.findOne('.top-left').x(anchorNode.x());
          }
          else if (this._movingAnchorName === 'middle-right') {
              this.findOne('.bottom-right').x(anchorNode.x());
          }
          else if (this._movingAnchorName === 'bottom-left') {
              if (keepProportion) {
                  const comparePoint = centeredScaling
                      ? {
                          x: this.width() / 2,
                          y: this.height() / 2,
                      }
                      : {
                          x: this.findOne('.top-right').x(),
                          y: this.findOne('.top-right').y(),
                      };
                  newHypotenuse = Math.sqrt(Math.pow(comparePoint.x - anchorNode.x(), 2) +
                      Math.pow(anchorNode.y() - comparePoint.y, 2));
                  const reverseX = comparePoint.x < anchorNode.x() ? -1 : 1;
                  const reverseY = anchorNode.y() < comparePoint.y ? -1 : 1;
                  x = newHypotenuse * this.cos * reverseX;
                  y = newHypotenuse * this.sin * reverseY;
                  anchorNode.x(comparePoint.x - x);
                  anchorNode.y(comparePoint.y + y);
              }
              pos = anchorNode.position();
              this.findOne('.top-left').x(pos.x);
              this.findOne('.bottom-right').y(pos.y);
          }
          else if (this._movingAnchorName === 'bottom-center') {
              this.findOne('.bottom-right').y(anchorNode.y());
          }
          else if (this._movingAnchorName === 'bottom-right') {
              if (keepProportion) {
                  const comparePoint = centeredScaling
                      ? {
                          x: this.width() / 2,
                          y: this.height() / 2,
                      }
                      : {
                          x: this.findOne('.top-left').x(),
                          y: this.findOne('.top-left').y(),
                      };
                  newHypotenuse = Math.sqrt(Math.pow(anchorNode.x() - comparePoint.x, 2) +
                      Math.pow(anchorNode.y() - comparePoint.y, 2));
                  const reverseX = this.findOne('.bottom-right').x() < comparePoint.x ? -1 : 1;
                  const reverseY = this.findOne('.bottom-right').y() < comparePoint.y ? -1 : 1;
                  x = newHypotenuse * this.cos * reverseX;
                  y = newHypotenuse * this.sin * reverseY;
                  this.findOne('.bottom-right').x(comparePoint.x + x);
                  this.findOne('.bottom-right').y(comparePoint.y + y);
              }
          }
          else {
              console.error(new Error('Wrong position argument of selection resizer: ' +
                  this._movingAnchorName));
          }
          centeredScaling = this.centeredScaling() || e.altKey;
          if (centeredScaling) {
              const topLeft = this.findOne('.top-left');
              const bottomRight = this.findOne('.bottom-right');
              const topOffsetX = topLeft.x();
              const topOffsetY = topLeft.y();
              const bottomOffsetX = this.getWidth() - bottomRight.x();
              const bottomOffsetY = this.getHeight() - bottomRight.y();
              bottomRight.move({
                  x: -topOffsetX,
                  y: -topOffsetY,
              });
              topLeft.move({
                  x: bottomOffsetX,
                  y: bottomOffsetY,
              });
          }
          const absPos = this.findOne('.top-left').getAbsolutePosition();
          x = absPos.x;
          y = absPos.y;
          const width = this.findOne('.bottom-right').x() - this.findOne('.top-left').x();
          const height = this.findOne('.bottom-right').y() - this.findOne('.top-left').y();
          this._fitNodesInto({
              x: x,
              y: y,
              width: width,
              height: height,
              rotation: Konva$2.getAngle(this.rotation()),
          }, e);
      }
      _handleMouseUp(e) {
          this._removeEvents(e);
      }
      getAbsoluteTransform() {
          return this.getTransform();
      }
      _removeEvents(e) {
          var _a;
          if (this._transforming) {
              this._transforming = false;
              if (typeof window !== 'undefined') {
                  window.removeEventListener('mousemove', this._handleMouseMove);
                  window.removeEventListener('touchmove', this._handleMouseMove);
                  window.removeEventListener('mouseup', this._handleMouseUp, true);
                  window.removeEventListener('touchend', this._handleMouseUp, true);
              }
              const node = this.getNode();
              activeTransformersCount--;
              this._fire('transformend', { evt: e, target: node });
              // redraw layer to restore hit graph
              (_a = this.getLayer()) === null || _a === void 0 ? void 0 : _a.batchDraw();
              if (node) {
                  this._nodes.forEach((target) => {
                      var _a;
                      target._fire('transformend', { evt: e, target });
                      // redraw layer to restore hit graph
                      (_a = target.getLayer()) === null || _a === void 0 ? void 0 : _a.batchDraw();
                  });
              }
              this._movingAnchorName = null;
          }
      }
      _fitNodesInto(newAttrs, evt) {
          const oldAttrs = this._getNodeRect();
          const minSize = 1;
          if (Util._inRange(newAttrs.width, -this.padding() * 2 - minSize, minSize)) {
              this.update();
              return;
          }
          if (Util._inRange(newAttrs.height, -this.padding() * 2 - minSize, minSize)) {
              this.update();
              return;
          }
          const t = new Transform();
          t.rotate(Konva$2.getAngle(this.rotation()));
          if (this._movingAnchorName &&
              newAttrs.width < 0 &&
              this._movingAnchorName.indexOf('left') >= 0) {
              const offset = t.point({
                  x: -this.padding() * 2,
                  y: 0,
              });
              newAttrs.x += offset.x;
              newAttrs.y += offset.y;
              newAttrs.width += this.padding() * 2;
              this._movingAnchorName = this._movingAnchorName.replace('left', 'right');
              this._anchorDragOffset.x -= offset.x;
              this._anchorDragOffset.y -= offset.y;
          }
          else if (this._movingAnchorName &&
              newAttrs.width < 0 &&
              this._movingAnchorName.indexOf('right') >= 0) {
              const offset = t.point({
                  x: this.padding() * 2,
                  y: 0,
              });
              this._movingAnchorName = this._movingAnchorName.replace('right', 'left');
              this._anchorDragOffset.x -= offset.x;
              this._anchorDragOffset.y -= offset.y;
              newAttrs.width += this.padding() * 2;
          }
          if (this._movingAnchorName &&
              newAttrs.height < 0 &&
              this._movingAnchorName.indexOf('top') >= 0) {
              const offset = t.point({
                  x: 0,
                  y: -this.padding() * 2,
              });
              newAttrs.x += offset.x;
              newAttrs.y += offset.y;
              this._movingAnchorName = this._movingAnchorName.replace('top', 'bottom');
              this._anchorDragOffset.x -= offset.x;
              this._anchorDragOffset.y -= offset.y;
              newAttrs.height += this.padding() * 2;
          }
          else if (this._movingAnchorName &&
              newAttrs.height < 0 &&
              this._movingAnchorName.indexOf('bottom') >= 0) {
              const offset = t.point({
                  x: 0,
                  y: this.padding() * 2,
              });
              this._movingAnchorName = this._movingAnchorName.replace('bottom', 'top');
              this._anchorDragOffset.x -= offset.x;
              this._anchorDragOffset.y -= offset.y;
              newAttrs.height += this.padding() * 2;
          }
          if (this.boundBoxFunc()) {
              const bounded = this.boundBoxFunc()(oldAttrs, newAttrs);
              if (bounded) {
                  newAttrs = bounded;
              }
              else {
                  Util.warn('boundBoxFunc returned falsy. You should return new bound rect from it!');
              }
          }
          // base size value doesn't really matter
          // we just need to think about bounding boxes as transforms
          // but how?
          // the idea is that we have a transformed rectangle with the size of "baseSize"
          const baseSize = 10000000;
          const oldTr = new Transform();
          oldTr.translate(oldAttrs.x, oldAttrs.y);
          oldTr.rotate(oldAttrs.rotation);
          oldTr.scale(oldAttrs.width / baseSize, oldAttrs.height / baseSize);
          const newTr = new Transform();
          const newScaleX = newAttrs.width / baseSize;
          const newScaleY = newAttrs.height / baseSize;
          if (this.flipEnabled() === false) {
              newTr.translate(newAttrs.x, newAttrs.y);
              newTr.rotate(newAttrs.rotation);
              newTr.translate(newAttrs.width < 0 ? newAttrs.width : 0, newAttrs.height < 0 ? newAttrs.height : 0);
              newTr.scale(Math.abs(newScaleX), Math.abs(newScaleY));
          }
          else {
              newTr.translate(newAttrs.x, newAttrs.y);
              newTr.rotate(newAttrs.rotation);
              newTr.scale(newScaleX, newScaleY);
          }
          // now lets think we had [old transform] and n ow we have [new transform]
          // Now, the questions is: how can we transform "parent" to go from [old transform] into [new transform]
          // in equation it will be:
          // [delta transform] * [old transform] = [new transform]
          // that means that
          // [delta transform] = [new transform] * [old transform inverted]
          const delta = newTr.multiply(oldTr.invert());
          this._nodes.forEach((node) => {
              var _a;
              // for each node we have the same [delta transform]
              // the equations is
              // [delta transform] * [parent transform] * [old local transform] = [parent transform] * [new local transform]
              // and we need to find [new local transform]
              // [new local] = [parent inverted] * [delta] * [parent] * [old local]
              const parentTransform = node.getParent().getAbsoluteTransform();
              const localTransform = node.getTransform().copy();
              // skip offset:
              localTransform.translate(node.offsetX(), node.offsetY());
              const newLocalTransform = new Transform();
              newLocalTransform
                  .multiply(parentTransform.copy().invert())
                  .multiply(delta)
                  .multiply(parentTransform)
                  .multiply(localTransform);
              const attrs = newLocalTransform.decompose();
              node.setAttrs(attrs);
              (_a = node.getLayer()) === null || _a === void 0 ? void 0 : _a.batchDraw();
          });
          this.rotation(Util._getRotation(newAttrs.rotation));
          // trigger transform event AFTER we update rotation
          this._nodes.forEach((node) => {
              this._fire('transform', { evt: evt, target: node });
              node._fire('transform', { evt: evt, target: node });
          });
          this._resetTransformCache();
          this.update();
          this.getLayer().batchDraw();
      }
      /**
       * force update of Konva.Transformer.
       * Use it when you updated attached Konva.Group and now you need to reset transformer size
       * @method
       * @name Konva.Transformer#forceUpdate
       */
      forceUpdate() {
          this._resetTransformCache();
          this.update();
      }
      _batchChangeChild(selector, attrs) {
          const anchor = this.findOne(selector);
          anchor.setAttrs(attrs);
      }
      update() {
          var _a;
          const attrs = this._getNodeRect();
          this.rotation(Util._getRotation(attrs.rotation));
          const width = attrs.width;
          const height = attrs.height;
          const enabledAnchors = this.enabledAnchors();
          const resizeEnabled = this.resizeEnabled();
          const padding = this.padding();
          const anchorSize = this.anchorSize();
          const anchors = this.find('._anchor');
          anchors.forEach((node) => {
              node.setAttrs({
                  width: anchorSize,
                  height: anchorSize,
                  offsetX: anchorSize / 2,
                  offsetY: anchorSize / 2,
                  stroke: this.anchorStroke(),
                  strokeWidth: this.anchorStrokeWidth(),
                  fill: this.anchorFill(),
                  cornerRadius: this.anchorCornerRadius(),
              });
          });
          this._batchChangeChild('.top-left', {
              x: 0,
              y: 0,
              offsetX: anchorSize / 2 + padding,
              offsetY: anchorSize / 2 + padding,
              visible: resizeEnabled && enabledAnchors.indexOf('top-left') >= 0,
          });
          this._batchChangeChild('.top-center', {
              x: width / 2,
              y: 0,
              offsetY: anchorSize / 2 + padding,
              visible: resizeEnabled && enabledAnchors.indexOf('top-center') >= 0,
          });
          this._batchChangeChild('.top-right', {
              x: width,
              y: 0,
              offsetX: anchorSize / 2 - padding,
              offsetY: anchorSize / 2 + padding,
              visible: resizeEnabled && enabledAnchors.indexOf('top-right') >= 0,
          });
          this._batchChangeChild('.middle-left', {
              x: 0,
              y: height / 2,
              offsetX: anchorSize / 2 + padding,
              visible: resizeEnabled && enabledAnchors.indexOf('middle-left') >= 0,
          });
          this._batchChangeChild('.middle-right', {
              x: width,
              y: height / 2,
              offsetX: anchorSize / 2 - padding,
              visible: resizeEnabled && enabledAnchors.indexOf('middle-right') >= 0,
          });
          this._batchChangeChild('.bottom-left', {
              x: 0,
              y: height,
              offsetX: anchorSize / 2 + padding,
              offsetY: anchorSize / 2 - padding,
              visible: resizeEnabled && enabledAnchors.indexOf('bottom-left') >= 0,
          });
          this._batchChangeChild('.bottom-center', {
              x: width / 2,
              y: height,
              offsetY: anchorSize / 2 - padding,
              visible: resizeEnabled && enabledAnchors.indexOf('bottom-center') >= 0,
          });
          this._batchChangeChild('.bottom-right', {
              x: width,
              y: height,
              offsetX: anchorSize / 2 - padding,
              offsetY: anchorSize / 2 - padding,
              visible: resizeEnabled && enabledAnchors.indexOf('bottom-right') >= 0,
          });
          this._batchChangeChild('.rotater', {
              x: width / 2,
              y: -this.rotateAnchorOffset() * Util._sign(height) - padding,
              visible: this.rotateEnabled(),
          });
          this._batchChangeChild('.back', {
              width: width,
              height: height,
              visible: this.borderEnabled(),
              stroke: this.borderStroke(),
              strokeWidth: this.borderStrokeWidth(),
              dash: this.borderDash(),
              x: 0,
              y: 0,
          });
          const styleFunc = this.anchorStyleFunc();
          if (styleFunc) {
              anchors.forEach((node) => {
                  styleFunc(node);
              });
          }
          (_a = this.getLayer()) === null || _a === void 0 ? void 0 : _a.batchDraw();
      }
      /**
       * determine if transformer is in active transform
       * @method
       * @name Konva.Transformer#isTransforming
       * @returns {Boolean}
       */
      isTransforming() {
          return this._transforming;
      }
      /**
       * Stop active transform action
       * @method
       * @name Konva.Transformer#stopTransform
       * @returns {Boolean}
       */
      stopTransform() {
          if (this._transforming) {
              this._removeEvents();
              const anchorNode = this.findOne('.' + this._movingAnchorName);
              if (anchorNode) {
                  anchorNode.stopDrag();
              }
          }
      }
      destroy() {
          if (this.getStage() && this._cursorChange) {
              this.getStage().content && (this.getStage().content.style.cursor = '');
          }
          Group.prototype.destroy.call(this);
          this.detach();
          this._removeEvents();
          return this;
      }
      // do not work as a container
      // we will recreate inner nodes manually
      toObject() {
          return Node.prototype.toObject.call(this);
      }
      // overwrite clone to NOT use method from Container
      clone(obj) {
          const node = Node.prototype.clone.call(this, obj);
          return node;
      }
      getClientRect() {
          if (this.nodes().length > 0) {
              return super.getClientRect();
          }
          else {
              // if we are detached return zero size
              // so it will be skipped in calculations
              return { x: 0, y: 0, width: 0, height: 0 };
          }
      }
  }
  Transformer.isTransforming = () => {
      return activeTransformersCount > 0;
  };
  function validateAnchors(val) {
      if (!(val instanceof Array)) {
          Util.warn('enabledAnchors value should be an array');
      }
      if (val instanceof Array) {
          val.forEach(function (name) {
              if (ANCHORS_NAMES.indexOf(name) === -1) {
                  Util.warn('Unknown anchor name: ' +
                      name +
                      '. Available names are: ' +
                      ANCHORS_NAMES.join(', '));
              }
          });
      }
      return val || [];
  }
  Transformer.prototype.className = 'Transformer';
  _registerNode(Transformer);
  /**
   * get/set enabled handlers
   * @name Konva.Transformer#enabledAnchors
   * @method
   * @param {Array} array
   * @returns {Array}
   * @example
   * // get list of handlers
   * var enabledAnchors = transformer.enabledAnchors();
   *
   * // set handlers
   * transformer.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
   */
  Factory.addGetterSetter(Transformer, 'enabledAnchors', ANCHORS_NAMES, validateAnchors);
  /**
   * get/set flip enabled
   * @name Konva.Transformer#flipEnabled
   * @method
   * @param {Boolean} flag
   * @returns {Boolean}
   * @example
   * // get flip enabled property
   * var flipEnabled = transformer.flipEnabled();
   *
   * // set flip enabled property
   * transformer.flipEnabled(false);
   */
  Factory.addGetterSetter(Transformer, 'flipEnabled', true, getBooleanValidator());
  /**
   * get/set resize ability. If false it will automatically hide resizing handlers
   * @name Konva.Transformer#resizeEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get
   * var resizeEnabled = transformer.resizeEnabled();
   *
   * // set
   * transformer.resizeEnabled(false);
   */
  Factory.addGetterSetter(Transformer, 'resizeEnabled', true);
  /**
   * get/set anchor size. Default is 10
   * @name Konva.Transformer#anchorSize
   * @method
   * @param {Number} size
   * @returns {Number}
   * @example
   * // get
   * var anchorSize = transformer.anchorSize();
   *
   * // set
   * transformer.anchorSize(20)
   */
  Factory.addGetterSetter(Transformer, 'anchorSize', 10, getNumberValidator());
  /**
   * get/set ability to rotate.
   * @name Konva.Transformer#rotateEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get
   * var rotateEnabled = transformer.rotateEnabled();
   *
   * // set
   * transformer.rotateEnabled(false);
   */
  Factory.addGetterSetter(Transformer, 'rotateEnabled', true);
  /**
   * get/set visibility of a little line that connects transformer and rotate anchor.
   * @name Konva.Transformer#rotateLineVisible
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get
   * var rotateLineVisible = transformer.rotateLineVisible();
   *
   * // set
   * transformer.rotateLineVisible(false);
   */
  Factory.addGetterSetter(Transformer, 'rotateLineVisible', true);
  /**
   * get/set rotation snaps angles.
   * @name Konva.Transformer#rotationSnaps
   * @method
   * @param {Array} array
   * @returns {Array}
   * @example
   * // get
   * var rotationSnaps = transformer.rotationSnaps();
   *
   * // set
   * transformer.rotationSnaps([0, 90, 180, 270]);
   */
  Factory.addGetterSetter(Transformer, 'rotationSnaps', []);
  /**
   * get/set distance for rotation handler
   * @name Konva.Transformer#rotateAnchorOffset
   * @method
   * @param {Number} offset
   * @returns {Number}
   * @example
   * // get
   * var rotateAnchorOffset = transformer.rotateAnchorOffset();
   *
   * // set
   * transformer.rotateAnchorOffset(100);
   */
  Factory.addGetterSetter(Transformer, 'rotateAnchorOffset', 50, getNumberValidator());
  /**
   * get/set rotation anchor cursor
   * @name Konva.Transformer#rotateAnchorCursor
   * @method
   * @param {String} cursorName
   * @returns {String}
   * @example
   * // get
   * var currentRotationAnchorCursor = transformer.rotateAnchorCursor();
   *
   * // set
   * transformer.rotateAnchorCursor('grab');
   */
  Factory.addGetterSetter(Transformer, 'rotateAnchorCursor', 'crosshair');
  /**
   * get/set distance for rotation tolerance
   * @name Konva.Transformer#rotationSnapTolerance
   * @method
   * @param {Number} tolerance
   * @returns {Number}
   * @example
   * // get
   * var rotationSnapTolerance = transformer.rotationSnapTolerance();
   *
   * // set
   * transformer.rotationSnapTolerance(100);
   */
  Factory.addGetterSetter(Transformer, 'rotationSnapTolerance', 5, getNumberValidator());
  /**
   * get/set visibility of border
   * @name Konva.Transformer#borderEnabled
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get
   * var borderEnabled = transformer.borderEnabled();
   *
   * // set
   * transformer.borderEnabled(false);
   */
  Factory.addGetterSetter(Transformer, 'borderEnabled', true);
  /**
   * get/set anchor stroke color
   * @name Konva.Transformer#anchorStroke
   * @method
   * @param {String} strokeColor
   * @returns {String}
   * @example
   * // get
   * var anchorStroke = transformer.anchorStroke();
   *
   * // set
   * transformer.anchorStroke('red');
   */
  Factory.addGetterSetter(Transformer, 'anchorStroke', 'rgb(0, 161, 255)');
  /**
   * get/set anchor stroke width
   * @name Konva.Transformer#anchorStrokeWidth
   * @method
   * @param {Number} anchorStrokeWidth
   * @returns {Number}
   * @example
   * // get
   * var anchorStrokeWidth = transformer.anchorStrokeWidth();
   *
   * // set
   * transformer.anchorStrokeWidth(3);
   */
  Factory.addGetterSetter(Transformer, 'anchorStrokeWidth', 1, getNumberValidator());
  /**
   * get/set anchor fill color
   * @name Konva.Transformer#anchorFill
   * @method
   * @param {String} anchorFill
   * @returns {String}
   * @example
   * // get
   * var anchorFill = transformer.anchorFill();
   *
   * // set
   * transformer.anchorFill('red');
   */
  Factory.addGetterSetter(Transformer, 'anchorFill', 'white');
  /**
   * get/set anchor corner radius
   * @name Konva.Transformer#anchorCornerRadius
   * @method
   * @param {Number} radius
   * @returns {Number}
   * @example
   * // get
   * var anchorCornerRadius = transformer.anchorCornerRadius();
   *
   * // set
   * transformer.anchorCornerRadius(3);
   */
  Factory.addGetterSetter(Transformer, 'anchorCornerRadius', 0, getNumberValidator());
  /**
   * get/set border stroke color
   * @name Konva.Transformer#borderStroke
   * @method
   * @param {Boolean} enabled
   * @returns {Boolean}
   * @example
   * // get
   * var borderStroke = transformer.borderStroke();
   *
   * // set
   * transformer.borderStroke('red');
   */
  Factory.addGetterSetter(Transformer, 'borderStroke', 'rgb(0, 161, 255)');
  /**
   * get/set border stroke width
   * @name Konva.Transformer#borderStrokeWidth
   * @method
   * @param {Number} strokeWidth
   * @returns {Number}
   * @example
   * // get
   * var borderStrokeWidth = transformer.borderStrokeWidth();
   *
   * // set
   * transformer.borderStrokeWidth(3);
   */
  Factory.addGetterSetter(Transformer, 'borderStrokeWidth', 1, getNumberValidator());
  /**
   * get/set border dash array
   * @name Konva.Transformer#borderDash
   * @method
   * @param {Array} dash array
   * @returns {Array}
   * @example
   * // get
   * var borderDash = transformer.borderDash();
   *
   * // set
   * transformer.borderDash([2, 2]);
   */
  Factory.addGetterSetter(Transformer, 'borderDash');
  /**
   * get/set should we keep ratio while resize anchors at corners
   * @name Konva.Transformer#keepRatio
   * @method
   * @param {Boolean} keepRatio
   * @returns {Boolean}
   * @example
   * // get
   * var keepRatio = transformer.keepRatio();
   *
   * // set
   * transformer.keepRatio(false);
   */
  Factory.addGetterSetter(Transformer, 'keepRatio', true);
  /**
   * get/set how to react on skift key while resizing anchors at corners
   * @name Konva.Transformer#shiftBehavior
   * @method
   * @param {String} shiftBehavior
   * @returns {String}
   * @example
   * // get
   * var shiftBehavior = transformer.shiftBehavior();
   *
   * // set
   * transformer.shiftBehavior('none');
   */
  Factory.addGetterSetter(Transformer, 'shiftBehavior', 'default');
  /**
   * get/set should we resize relative to node's center?
   * @name Konva.Transformer#centeredScaling
   * @method
   * @param {Boolean} centeredScaling
   * @returns {Boolean}
   * @example
   * // get
   * var centeredScaling = transformer.centeredScaling();
   *
   * // set
   * transformer.centeredScaling(true);
   */
  Factory.addGetterSetter(Transformer, 'centeredScaling', false);
  /**
   * get/set should we think about stroke while resize? Good to use when a shape has strokeScaleEnabled = false
   * default is false
   * @name Konva.Transformer#ignoreStroke
   * @method
   * @param {Boolean} ignoreStroke
   * @returns {Boolean}
   * @example
   * // get
   * var ignoreStroke = transformer.ignoreStroke();
   *
   * // set
   * transformer.ignoreStroke(true);
   */
  Factory.addGetterSetter(Transformer, 'ignoreStroke', false);
  /**
   * get/set padding
   * @name Konva.Transformer#padding
   * @method
   * @param {Number} padding
   * @returns {Number}
   * @example
   * // get
   * var padding = transformer.padding();
   *
   * // set
   * transformer.padding(10);
   */
  Factory.addGetterSetter(Transformer, 'padding', 0, getNumberValidator());
  /**
   * get/set attached nodes of the Transformer. Transformer will adapt to their size and listen to their events
   * @method
   * @name Konva.Transformer#nodes
   * @returns {Konva.Node}
   * @example
   * // get
   * const nodes = transformer.nodes();
   *
   * // set
   * transformer.nodes([rect, circle]);
   *
   * // push new item:
   * const oldNodes = transformer.nodes();
   * const newNodes = oldNodes.concat([newShape]);
   * // it is important to set new array instance (and concat method above will create it)
   * transformer.nodes(newNodes);
   */
  Factory.addGetterSetter(Transformer, 'nodes');
  // @ts-ignore
  // deprecated
  Factory.addGetterSetter(Transformer, 'node');
  /**
   * get/set bounding box function. **IMPORTANT!** boundBondFunc operates in absolute coordinates.
   * @name Konva.Transformer#boundBoxFunc
   * @method
   * @param {Function} func
   * @returns {Function}
   * @example
   * // get
   * var boundBoxFunc = transformer.boundBoxFunc();
   *
   * // set
   * transformer.boundBoxFunc(function(oldBox, newBox) {
   *   // width and height of the boxes are corresponding to total absolute width and height of all nodes combined
   *   // so it includes scale of the node.
   *   if (newBox.width > 200) {
   *     return oldBox;
   *   }
   *   return newBox;
   * });
   */
  Factory.addGetterSetter(Transformer, 'boundBoxFunc');
  /**
   * get/set dragging func for transformer anchors
   * @name Konva.Transformer#anchorDragBoundFunc
   * @method
   * @param {Function} func
   * @returns {Function}
   * @example
   * // get
   * var anchorDragBoundFunc = transformer.anchorDragBoundFunc();
   *
   * // set
   * transformer.anchorDragBoundFunc(function(oldAbsPos, newAbsPos, event) {
   *  return {
   *   x: 0,
   *   y: newAbsolutePosition.y
   *  }
   * });
   */
  Factory.addGetterSetter(Transformer, 'anchorDragBoundFunc');
  /**
   * get/set styling function for transformer anchors to overwrite default styles
   * @name Konva.Transformer#anchorStyleFunc
   * @method
   * @param {Function} func
   * @returns {Function}
   * @example
   * // get
   * var anchorStyleFunc = transformer.anchorStyleFunc();
   *
   * // set
   * transformer.anchorStyleFunc(function(anchor) {
   *  // anchor is a simple Konva.Rect instance
   *  // it will be executed AFTER all attributes are set, like 'anchorStrokeWidth' or 'anchorFill'
   *  if (anchor.hasName('.rotater')) {
   *    // make rotater anchor filled black and looks like a circle
   *    anchor.fill('black');
   *    anchor.cornerRadius(anchor.width() / 2);
   *  }
   * });
   */
  Factory.addGetterSetter(Transformer, 'anchorStyleFunc');
  /**
   * using this setting you can drag transformer group by dragging empty space between attached nodes
   * shouldOverdrawWholeArea = true may temporary disable all events on attached nodes
   * @name Konva.Transformer#shouldOverdrawWholeArea
   * @method
   * @param {Boolean} shouldOverdrawWholeArea
   * @returns {Boolean}
   * @example
   * // get
   * var shouldOverdrawWholeArea = transformer.shouldOverdrawWholeArea();
   *
   * // set
   * transformer.shouldOverdrawWholeArea(true);
   */
  Factory.addGetterSetter(Transformer, 'shouldOverdrawWholeArea', false);
  /**
   * If you have just one attached node to Transformer it will set its initial rotation to the rotation of that node.
   * In some cases you may need to set a different rotation.
   * @name Konva.Transformer#useSingleNodeRotation
   * @method
   * @param {Boolean} useSingleNodeRotation
   * @returns {Boolean}
   * @example
   * // set flag to false
   * transformer.useSingleNodeRotation(false);
   * // attach a shape
   * transformer.nodes([shape]);
   * transformer.rotation(45);
   * transformer.update();
   */
  Factory.addGetterSetter(Transformer, 'useSingleNodeRotation', true);
  Factory.backCompat(Transformer, {
      lineEnabled: 'borderEnabled',
      rotateHandlerOffset: 'rotateAnchorOffset',
      enabledHandlers: 'enabledAnchors',
  });

  /**
   * Wedge constructor
   * @constructor
   * @memberof Konva
   * @augments Konva.Shape
   * @param {Object} config
   * @param {Number} config.angle in degrees
   * @param {Number} config.radius
   * @param {Boolean} [config.clockwise]
   * @param {String} [config.fill] fill color
     * @param {Image} [config.fillPatternImage] fill pattern image
     * @param {Number} [config.fillPatternX]
     * @param {Number} [config.fillPatternY]
     * @param {Object} [config.fillPatternOffset] object with x and y component
     * @param {Number} [config.fillPatternOffsetX] 
     * @param {Number} [config.fillPatternOffsetY] 
     * @param {Object} [config.fillPatternScale] object with x and y component
     * @param {Number} [config.fillPatternScaleX]
     * @param {Number} [config.fillPatternScaleY]
     * @param {Number} [config.fillPatternRotation]
     * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
     * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientStartPointX]
     * @param {Number} [config.fillLinearGradientStartPointY]
     * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
     * @param {Number} [config.fillLinearGradientEndPointX]
     * @param {Number} [config.fillLinearGradientEndPointY]
     * @param {Array} [config.fillLinearGradientColorStops] array of color stops
     * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientStartPointX]
     * @param {Number} [config.fillRadialGradientStartPointY]
     * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
     * @param {Number} [config.fillRadialGradientEndPointX] 
     * @param {Number} [config.fillRadialGradientEndPointY] 
     * @param {Number} [config.fillRadialGradientStartRadius]
     * @param {Number} [config.fillRadialGradientEndRadius]
     * @param {Array} [config.fillRadialGradientColorStops] array of color stops
     * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
     * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
     * @param {String} [config.stroke] stroke color
     * @param {Number} [config.strokeWidth] stroke width
     * @param {Boolean} [config.fillAfterStrokeEnabled]. Should we draw fill AFTER stroke? Default is false.
     * @param {Number} [config.hitStrokeWidth] size of the stroke on hit canvas.  The default is "auto" - equals to strokeWidth
     * @param {Boolean} [config.strokeHitEnabled] flag which enables or disables stroke hit region.  The default is true
     * @param {Boolean} [config.perfectDrawEnabled] flag which enables or disables using buffer canvas.  The default is true
     * @param {Boolean} [config.shadowForStrokeEnabled] flag which enables or disables shadow for stroke.  The default is true
     * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
     * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
     * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
     *  is miter
     * @param {String} [config.lineCap] can be butt, round, or square.  The default
     *  is butt
     * @param {String} [config.shadowColor]
     * @param {Number} [config.shadowBlur]
     * @param {Object} [config.shadowOffset] object with x and y component
     * @param {Number} [config.shadowOffsetX]
     * @param {Number} [config.shadowOffsetY]
     * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
     *  between 0 and 1
     * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
     * @param {Array} [config.dash]
     * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true

   * @param {Number} [config.x]
     * @param {Number} [config.y]
     * @param {Number} [config.width]
     * @param {Number} [config.height]
     * @param {Boolean} [config.visible]
     * @param {Boolean} [config.listening] whether or not the node is listening for events
     * @param {String} [config.id] unique id
     * @param {String} [config.name] non-unique name
     * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
     * @param {Object} [config.scale] set scale
     * @param {Number} [config.scaleX] set scale x
     * @param {Number} [config.scaleY] set scale y
     * @param {Number} [config.rotation] rotation in degrees
     * @param {Object} [config.offset] offset from center point and rotation point
     * @param {Number} [config.offsetX] set offset x
     * @param {Number} [config.offsetY] set offset y
     * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
     *  the entire stage by dragging any portion of the stage
     * @param {Number} [config.dragDistance]
     * @param {Function} [config.dragBoundFunc]
   * @example
   * // draw a wedge that's pointing downwards
   * var wedge = new Konva.Wedge({
   *   radius: 40,
   *   fill: 'red',
   *   stroke: 'black'
   *   strokeWidth: 5,
   *   angleDeg: 60,
   *   rotationDeg: -120
   * });
   */
  class Wedge extends Shape {
      _sceneFunc(context) {
          context.beginPath();
          context.arc(0, 0, this.radius(), 0, Konva$2.getAngle(this.angle()), this.clockwise());
          context.lineTo(0, 0);
          context.closePath();
          context.fillStrokeShape(this);
      }
      getWidth() {
          return this.radius() * 2;
      }
      getHeight() {
          return this.radius() * 2;
      }
      setWidth(width) {
          this.radius(width / 2);
      }
      setHeight(height) {
          this.radius(height / 2);
      }
  }
  Wedge.prototype.className = 'Wedge';
  Wedge.prototype._centroid = true;
  Wedge.prototype._attrsAffectingSize = ['radius'];
  _registerNode(Wedge);
  /**
   * get/set radius
   * @name Konva.Wedge#radius
   * @method
   * @param {Number} radius
   * @returns {Number}
   * @example
   * // get radius
   * var radius = wedge.radius();
   *
   * // set radius
   * wedge.radius(10);
   */
  Factory.addGetterSetter(Wedge, 'radius', 0, getNumberValidator());
  /**
   * get/set angle in degrees
   * @name Konva.Wedge#angle
   * @method
   * @param {Number} angle
   * @returns {Number}
   * @example
   * // get angle
   * var angle = wedge.angle();
   *
   * // set angle
   * wedge.angle(20);
   */
  Factory.addGetterSetter(Wedge, 'angle', 0, getNumberValidator());
  /**
   * get/set clockwise flag
   * @name Konva.Wedge#clockwise
   * @method
   * @param {Number} clockwise
   * @returns {Number}
   * @example
   * // get clockwise flag
   * var clockwise = wedge.clockwise();
   *
   * // draw wedge counter-clockwise
   * wedge.clockwise(false);
   *
   * // draw wedge clockwise
   * wedge.clockwise(true);
   */
  Factory.addGetterSetter(Wedge, 'clockwise', false);
  Factory.backCompat(Wedge, {
      angleDeg: 'angle',
      getAngleDeg: 'getAngle',
      setAngleDeg: 'setAngle',
  });

  /*
   the Gauss filter
   master repo: https://github.com/pavelpower/kineticjsGaussFilter
  */
  /*

       StackBlur - a fast almost Gaussian Blur For Canvas

       Version:   0.5
       Author:    Mario Klingemann
       Contact:   mario@quasimondo.com
       Website:   http://www.quasimondo.com/StackBlurForCanvas
       Twitter:   @quasimondo

       In case you find this class useful - especially in commercial projects -
       I am not totally unhappy for a small donation to my PayPal account
       mario@quasimondo.de

       Or support me on flattr:
       https://flattr.com/thing/72791/StackBlur-a-fast-almost-Gaussian-Blur-Effect-for-CanvasJavascript

       Copyright (c) 2010 Mario Klingemann

       Permission is hereby granted, free of charge, to any person
       obtaining a copy of this software and associated documentation
       files (the "Software"), to deal in the Software without
       restriction, including without limitation the rights to use,
       copy, modify, merge, publish, distribute, sublicense, and/or sell
       copies of the Software, and to permit persons to whom the
       Software is furnished to do so, subject to the following
       conditions:

       The above copyright notice and this permission notice shall be
       included in all copies or substantial portions of the Software.

       THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
       EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
       OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
       NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
       HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
       WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
       FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
       OTHER DEALINGS IN THE SOFTWARE.
       */
  function BlurStack() {
      this.r = 0;
      this.g = 0;
      this.b = 0;
      this.a = 0;
      this.next = null;
  }
  const mul_table = [
      512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292,
      512, 454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292,
      273, 512, 482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259,
      496, 475, 456, 437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292,
      282, 273, 265, 512, 497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373,
      364, 354, 345, 337, 328, 320, 312, 305, 298, 291, 284, 278, 271, 265, 259,
      507, 496, 485, 475, 465, 456, 446, 437, 428, 420, 412, 404, 396, 388, 381,
      374, 367, 360, 354, 347, 341, 335, 329, 323, 318, 312, 307, 302, 297, 292,
      287, 282, 278, 273, 269, 265, 261, 512, 505, 497, 489, 482, 475, 468, 461,
      454, 447, 441, 435, 428, 422, 417, 411, 405, 399, 394, 389, 383, 378, 373,
      368, 364, 359, 354, 350, 345, 341, 337, 332, 328, 324, 320, 316, 312, 309,
      305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271, 268, 265, 262, 259,
      257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456, 451, 446, 442,
      437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388, 385, 381,
      377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335, 332,
      329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
      289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259,
  ];
  const shg_table = [
      9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 17,
      17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19,
      19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
      21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23,
      23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
      23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
      23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24,
  ];
  function filterGaussBlurRGBA(imageData, radius) {
      const pixels = imageData.data, width = imageData.width, height = imageData.height;
      let p, yi, yw, r_sum, g_sum, b_sum, a_sum, r_out_sum, g_out_sum, b_out_sum, a_out_sum, r_in_sum, g_in_sum, b_in_sum, a_in_sum, pr, pg, pb, pa, rbs;
      const div = radius + radius + 1, widthMinus1 = width - 1, heightMinus1 = height - 1, radiusPlus1 = radius + 1, sumFactor = (radiusPlus1 * (radiusPlus1 + 1)) / 2, stackStart = new BlurStack(), mul_sum = mul_table[radius], shg_sum = shg_table[radius];
      let stackEnd = null, stack = stackStart, stackIn = null, stackOut = null;
      for (let i = 1; i < div; i++) {
          stack = stack.next = new BlurStack();
          if (i === radiusPlus1) {
              stackEnd = stack;
          }
      }
      stack.next = stackStart;
      yw = yi = 0;
      for (let y = 0; y < height; y++) {
          r_in_sum =
              g_in_sum =
                  b_in_sum =
                      a_in_sum =
                          r_sum =
                              g_sum =
                                  b_sum =
                                      a_sum =
                                          0;
          r_out_sum = radiusPlus1 * (pr = pixels[yi]);
          g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
          b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
          a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);
          r_sum += sumFactor * pr;
          g_sum += sumFactor * pg;
          b_sum += sumFactor * pb;
          a_sum += sumFactor * pa;
          stack = stackStart;
          for (let i = 0; i < radiusPlus1; i++) {
              stack.r = pr;
              stack.g = pg;
              stack.b = pb;
              stack.a = pa;
              stack = stack.next;
          }
          for (let i = 1; i < radiusPlus1; i++) {
              p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
              r_sum += (stack.r = pr = pixels[p]) * (rbs = radiusPlus1 - i);
              g_sum += (stack.g = pg = pixels[p + 1]) * rbs;
              b_sum += (stack.b = pb = pixels[p + 2]) * rbs;
              a_sum += (stack.a = pa = pixels[p + 3]) * rbs;
              r_in_sum += pr;
              g_in_sum += pg;
              b_in_sum += pb;
              a_in_sum += pa;
              stack = stack.next;
          }
          stackIn = stackStart;
          stackOut = stackEnd;
          for (let x = 0; x < width; x++) {
              pixels[yi + 3] = pa = (a_sum * mul_sum) >> shg_sum;
              if (pa !== 0) {
                  pa = 255 / pa;
                  pixels[yi] = ((r_sum * mul_sum) >> shg_sum) * pa;
                  pixels[yi + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
                  pixels[yi + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
              }
              else {
                  pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0;
              }
              r_sum -= r_out_sum;
              g_sum -= g_out_sum;
              b_sum -= b_out_sum;
              a_sum -= a_out_sum;
              r_out_sum -= stackIn.r;
              g_out_sum -= stackIn.g;
              b_out_sum -= stackIn.b;
              a_out_sum -= stackIn.a;
              p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;
              r_in_sum += stackIn.r = pixels[p];
              g_in_sum += stackIn.g = pixels[p + 1];
              b_in_sum += stackIn.b = pixels[p + 2];
              a_in_sum += stackIn.a = pixels[p + 3];
              r_sum += r_in_sum;
              g_sum += g_in_sum;
              b_sum += b_in_sum;
              a_sum += a_in_sum;
              stackIn = stackIn.next;
              r_out_sum += pr = stackOut.r;
              g_out_sum += pg = stackOut.g;
              b_out_sum += pb = stackOut.b;
              a_out_sum += pa = stackOut.a;
              r_in_sum -= pr;
              g_in_sum -= pg;
              b_in_sum -= pb;
              a_in_sum -= pa;
              stackOut = stackOut.next;
              yi += 4;
          }
          yw += width;
      }
      for (let x = 0; x < width; x++) {
          g_in_sum =
              b_in_sum =
                  a_in_sum =
                      r_in_sum =
                          g_sum =
                              b_sum =
                                  a_sum =
                                      r_sum =
                                          0;
          yi = x << 2;
          r_out_sum = radiusPlus1 * (pr = pixels[yi]);
          g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
          b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
          a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);
          r_sum += sumFactor * pr;
          g_sum += sumFactor * pg;
          b_sum += sumFactor * pb;
          a_sum += sumFactor * pa;
          stack = stackStart;
          for (let i = 0; i < radiusPlus1; i++) {
              stack.r = pr;
              stack.g = pg;
              stack.b = pb;
              stack.a = pa;
              stack = stack.next;
          }
          let yp = width;
          for (let i = 1; i <= radius; i++) {
              yi = (yp + x) << 2;
              r_sum += (stack.r = pr = pixels[yi]) * (rbs = radiusPlus1 - i);
              g_sum += (stack.g = pg = pixels[yi + 1]) * rbs;
              b_sum += (stack.b = pb = pixels[yi + 2]) * rbs;
              a_sum += (stack.a = pa = pixels[yi + 3]) * rbs;
              r_in_sum += pr;
              g_in_sum += pg;
              b_in_sum += pb;
              a_in_sum += pa;
              stack = stack.next;
              if (i < heightMinus1) {
                  yp += width;
              }
          }
          yi = x;
          stackIn = stackStart;
          stackOut = stackEnd;
          for (let y = 0; y < height; y++) {
              p = yi << 2;
              pixels[p + 3] = pa = (a_sum * mul_sum) >> shg_sum;
              if (pa > 0) {
                  pa = 255 / pa;
                  pixels[p] = ((r_sum * mul_sum) >> shg_sum) * pa;
                  pixels[p + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
                  pixels[p + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
              }
              else {
                  pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
              }
              r_sum -= r_out_sum;
              g_sum -= g_out_sum;
              b_sum -= b_out_sum;
              a_sum -= a_out_sum;
              r_out_sum -= stackIn.r;
              g_out_sum -= stackIn.g;
              b_out_sum -= stackIn.b;
              a_out_sum -= stackIn.a;
              p =
                  (x +
                      ((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width) <<
                      2;
              r_sum += r_in_sum += stackIn.r = pixels[p];
              g_sum += g_in_sum += stackIn.g = pixels[p + 1];
              b_sum += b_in_sum += stackIn.b = pixels[p + 2];
              a_sum += a_in_sum += stackIn.a = pixels[p + 3];
              stackIn = stackIn.next;
              r_out_sum += pr = stackOut.r;
              g_out_sum += pg = stackOut.g;
              b_out_sum += pb = stackOut.b;
              a_out_sum += pa = stackOut.a;
              r_in_sum -= pr;
              g_in_sum -= pg;
              b_in_sum -= pb;
              a_in_sum -= pa;
              stackOut = stackOut.next;
              yi += width;
          }
      }
  }
  /**
   * Blur Filter
   * @function
   * @name Blur
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Blur]);
   * node.blurRadius(10);
   */
  const Blur = function Blur(imageData) {
      const radius = Math.round(this.blurRadius());
      if (radius > 0) {
          filterGaussBlurRGBA(imageData, radius);
      }
  };
  Factory.addGetterSetter(Node, 'blurRadius', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set blur radius. Use with {@link Konva.Filters.Blur} filter
   * @name Konva.Node#blurRadius
   * @method
   * @param {Integer} radius
   * @returns {Integer}
   */

  /**
   * Brighten Filter.
   * @function
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Brighten]);
   * node.brightness(0.8);
   */
  const Brighten = function (imageData) {
      const brightness = this.brightness() * 255, data = imageData.data, len = data.length;
      for (let i = 0; i < len; i += 4) {
          // red
          data[i] += brightness;
          // green
          data[i + 1] += brightness;
          // blue
          data[i + 2] += brightness;
      }
  };
  Factory.addGetterSetter(Node, 'brightness', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set filter brightness.  The brightness is a number between -1 and 1.&nbsp; Positive values
   *  brighten the pixels and negative values darken them. Use with {@link Konva.Filters.Brighten} filter.
   * @name Konva.Node#brightness
   * @method

   * @param {Number} brightness value between -1 and 1
   * @returns {Number}
   */

  /**
   * Contrast Filter.
   * @function
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Contrast]);
   * node.contrast(10);
   */
  const Contrast = function (imageData) {
      const adjust = Math.pow((this.contrast() + 100) / 100, 2);
      const data = imageData.data, nPixels = data.length;
      let red = 150, green = 150, blue = 150;
      for (let i = 0; i < nPixels; i += 4) {
          red = data[i];
          green = data[i + 1];
          blue = data[i + 2];
          //Red channel
          red /= 255;
          red -= 0.5;
          red *= adjust;
          red += 0.5;
          red *= 255;
          //Green channel
          green /= 255;
          green -= 0.5;
          green *= adjust;
          green += 0.5;
          green *= 255;
          //Blue channel
          blue /= 255;
          blue -= 0.5;
          blue *= adjust;
          blue += 0.5;
          blue *= 255;
          red = red < 0 ? 0 : red > 255 ? 255 : red;
          green = green < 0 ? 0 : green > 255 ? 255 : green;
          blue = blue < 0 ? 0 : blue > 255 ? 255 : blue;
          data[i] = red;
          data[i + 1] = green;
          data[i + 2] = blue;
      }
  };
  /**
   * get/set filter contrast.  The contrast is a number between -100 and 100.
   * Use with {@link Konva.Filters.Contrast} filter.
   * @name Konva.Node#contrast
   * @method
   * @param {Number} contrast value between -100 and 100
   * @returns {Number}
   */
  Factory.addGetterSetter(Node, 'contrast', 0, getNumberValidator(), Factory.afterSetFilter);

  /**
   * Emboss Filter.
   * Pixastic Lib - Emboss filter - v0.1.0
   * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
   * License: [http://www.pixastic.com/lib/license.txt]
   * @function
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Emboss]);
   * node.embossStrength(0.8);
   * node.embossWhiteLevel(0.3);
   * node.embossDirection('right');
   * node.embossBlend(true);
   */
  const Emboss = function (imageData) {
      // pixastic strength is between 0 and 10.  I want it between 0 and 1
      // pixastic greyLevel is between 0 and 255.  I want it between 0 and 1.  Also,
      // a max value of greyLevel yields a white emboss, and the min value yields a black
      // emboss.  Therefore, I changed greyLevel to whiteLevel
      const strength = this.embossStrength() * 10, greyLevel = this.embossWhiteLevel() * 255, direction = this.embossDirection(), blend = this.embossBlend(), data = imageData.data, w = imageData.width, h = imageData.height, w4 = w * 4;
      let dirY = 0, dirX = 0, y = h;
      switch (direction) {
          case 'top-left':
              dirY = -1;
              dirX = -1;
              break;
          case 'top':
              dirY = -1;
              dirX = 0;
              break;
          case 'top-right':
              dirY = -1;
              dirX = 1;
              break;
          case 'right':
              dirY = 0;
              dirX = 1;
              break;
          case 'bottom-right':
              dirY = 1;
              dirX = 1;
              break;
          case 'bottom':
              dirY = 1;
              dirX = 0;
              break;
          case 'bottom-left':
              dirY = 1;
              dirX = -1;
              break;
          case 'left':
              dirY = 0;
              dirX = -1;
              break;
          default:
              Util.error('Unknown emboss direction: ' + direction);
      }
      do {
          const offsetY = (y - 1) * w4;
          let otherY = dirY;
          if (y + otherY < 1) {
              otherY = 0;
          }
          if (y + otherY > h) {
              otherY = 0;
          }
          const offsetYOther = (y - 1 + otherY) * w * 4;
          let x = w;
          do {
              const offset = offsetY + (x - 1) * 4;
              let otherX = dirX;
              if (x + otherX < 1) {
                  otherX = 0;
              }
              if (x + otherX > w) {
                  otherX = 0;
              }
              const offsetOther = offsetYOther + (x - 1 + otherX) * 4;
              const dR = data[offset] - data[offsetOther];
              const dG = data[offset + 1] - data[offsetOther + 1];
              const dB = data[offset + 2] - data[offsetOther + 2];
              let dif = dR;
              const absDif = dif > 0 ? dif : -dif;
              const absG = dG > 0 ? dG : -dG;
              const absB = dB > 0 ? dB : -dB;
              if (absG > absDif) {
                  dif = dG;
              }
              if (absB > absDif) {
                  dif = dB;
              }
              dif *= strength;
              if (blend) {
                  const r = data[offset] + dif;
                  const g = data[offset + 1] + dif;
                  const b = data[offset + 2] + dif;
                  data[offset] = r > 255 ? 255 : r < 0 ? 0 : r;
                  data[offset + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
                  data[offset + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
              }
              else {
                  let grey = greyLevel - dif;
                  if (grey < 0) {
                      grey = 0;
                  }
                  else if (grey > 255) {
                      grey = 255;
                  }
                  data[offset] = data[offset + 1] = data[offset + 2] = grey;
              }
          } while (--x);
      } while (--y);
  };
  Factory.addGetterSetter(Node, 'embossStrength', 0.5, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set emboss strength. Use with {@link Konva.Filters.Emboss} filter.
   * @name Konva.Node#embossStrength
   * @method
   * @param {Number} level between 0 and 1.  Default is 0.5
   * @returns {Number}
   */
  Factory.addGetterSetter(Node, 'embossWhiteLevel', 0.5, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set emboss white level. Use with {@link Konva.Filters.Emboss} filter.
   * @name Konva.Node#embossWhiteLevel
   * @method
   * @param {Number} embossWhiteLevel between 0 and 1.  Default is 0.5
   * @returns {Number}
   */
  Factory.addGetterSetter(Node, 'embossDirection', 'top-left', undefined, Factory.afterSetFilter);
  /**
   * get/set emboss direction. Use with {@link Konva.Filters.Emboss} filter.
   * @name Konva.Node#embossDirection
   * @method
   * @param {String} embossDirection can be top-left, top, top-right, right, bottom-right, bottom, bottom-left or left
   *   The default is top-left
   * @returns {String}
   */
  Factory.addGetterSetter(Node, 'embossBlend', false, undefined, Factory.afterSetFilter);
  /**
   * get/set emboss blend. Use with {@link Konva.Filters.Emboss} filter.
   * @name Konva.Node#embossBlend
   * @method
   * @param {Boolean} embossBlend
   * @returns {Boolean}
   */

  function remap(fromValue, fromMin, fromMax, toMin, toMax) {
      // Compute the range of the data
      const fromRange = fromMax - fromMin, toRange = toMax - toMin;
      // If either range is 0, then the value can only be mapped to 1 value
      if (fromRange === 0) {
          return toMin + toRange / 2;
      }
      if (toRange === 0) {
          return toMin;
      }
      // (1) untranslate, (2) unscale, (3) rescale, (4) retranslate
      let toValue = (fromValue - fromMin) / fromRange;
      toValue = toRange * toValue + toMin;
      return toValue;
  }
  /**
   * Enhance Filter. Adjusts the colors so that they span the widest
   *  possible range (ie 0-255). Performs w*h pixel reads and w*h pixel
   *  writes.
   * @function
   * @name Enhance
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author ippo615
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Enhance]);
   * node.enhance(0.4);
   */
  const Enhance = function (imageData) {
      const data = imageData.data, nSubPixels = data.length;
      let rMin = data[0], rMax = rMin, r, gMin = data[1], gMax = gMin, g, bMin = data[2], bMax = bMin, b;
      // If we are not enhancing anything - don't do any computation
      const enhanceAmount = this.enhance();
      if (enhanceAmount === 0) {
          return;
      }
      // 1st Pass - find the min and max for each channel:
      for (let i = 0; i < nSubPixels; i += 4) {
          r = data[i + 0];
          if (r < rMin) {
              rMin = r;
          }
          else if (r > rMax) {
              rMax = r;
          }
          g = data[i + 1];
          if (g < gMin) {
              gMin = g;
          }
          else if (g > gMax) {
              gMax = g;
          }
          b = data[i + 2];
          if (b < bMin) {
              bMin = b;
          }
          else if (b > bMax) {
              bMax = b;
          }
          //a = data[i + 3];
          //if (a < aMin) { aMin = a; } else
          //if (a > aMax) { aMax = a; }
      }
      // If there is only 1 level - don't remap
      if (rMax === rMin) {
          rMax = 255;
          rMin = 0;
      }
      if (gMax === gMin) {
          gMax = 255;
          gMin = 0;
      }
      if (bMax === bMin) {
          bMax = 255;
          bMin = 0;
      }
      let rGoalMax, rGoalMin, gGoalMax, gGoalMin, bGoalMax, bGoalMin;
      // If the enhancement is positive - stretch the histogram
      if (enhanceAmount > 0) {
          rGoalMax = rMax + enhanceAmount * (255 - rMax);
          rGoalMin = rMin - enhanceAmount * (rMin - 0);
          gGoalMax = gMax + enhanceAmount * (255 - gMax);
          gGoalMin = gMin - enhanceAmount * (gMin - 0);
          bGoalMax = bMax + enhanceAmount * (255 - bMax);
          bGoalMin = bMin - enhanceAmount * (bMin - 0);
          // If the enhancement is negative -   compress the histogram
      }
      else {
          const rMid = (rMax + rMin) * 0.5;
          rGoalMax = rMax + enhanceAmount * (rMax - rMid);
          rGoalMin = rMin + enhanceAmount * (rMin - rMid);
          const gMid = (gMax + gMin) * 0.5;
          gGoalMax = gMax + enhanceAmount * (gMax - gMid);
          gGoalMin = gMin + enhanceAmount * (gMin - gMid);
          const bMid = (bMax + bMin) * 0.5;
          bGoalMax = bMax + enhanceAmount * (bMax - bMid);
          bGoalMin = bMin + enhanceAmount * (bMin - bMid);
      }
      // Pass 2 - remap everything, except the alpha
      for (let i = 0; i < nSubPixels; i += 4) {
          data[i + 0] = remap(data[i + 0], rMin, rMax, rGoalMin, rGoalMax);
          data[i + 1] = remap(data[i + 1], gMin, gMax, gGoalMin, gGoalMax);
          data[i + 2] = remap(data[i + 2], bMin, bMax, bGoalMin, bGoalMax);
          //data[i + 3] = remap(data[i + 3], aMin, aMax, aGoalMin, aGoalMax);
      }
  };
  /**
   * get/set enhance. Use with {@link Konva.Filters.Enhance} filter. -1 to 1 values
   * @name Konva.Node#enhance
   * @method
   * @param {Float} amount
   * @returns {Float}
   */
  Factory.addGetterSetter(Node, 'enhance', 0, getNumberValidator(), Factory.afterSetFilter);

  /**
   * Grayscale Filter
   * @function
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Grayscale]);
   */
  const Grayscale = function (imageData) {
      const data = imageData.data, len = data.length;
      for (let i = 0; i < len; i += 4) {
          const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
          // red
          data[i] = brightness;
          // green
          data[i + 1] = brightness;
          // blue
          data[i + 2] = brightness;
      }
  };

  Factory.addGetterSetter(Node, 'hue', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set hsv hue in degrees. Use with {@link Konva.Filters.HSV} or {@link Konva.Filters.HSL} filter.
   * @name Konva.Node#hue
   * @method
   * @param {Number} hue value between 0 and 359
   * @returns {Number}
   */
  Factory.addGetterSetter(Node, 'saturation', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set hsv saturation. Use with {@link Konva.Filters.HSV} or {@link Konva.Filters.HSL} filter.
   * @name Konva.Node#saturation
   * @method
   * @param {Number} saturation 0 is no change, -1.0 halves the saturation, 1.0 doubles, etc..
   * @returns {Number}
   */
  Factory.addGetterSetter(Node, 'luminance', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set hsl luminance. Use with {@link Konva.Filters.HSL} filter.
   * @name Konva.Node#luminance
   * @method
   * @param {Number} value from -1 to 1
   * @returns {Number}
   */
  /**
   * HSL Filter. Adjusts the hue, saturation and luminance (or lightness)
   * @function
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author ippo615
   * @example
   * image.filters([Konva.Filters.HSL]);
   * image.luminance(0.2);
   */
  const HSL = function (imageData) {
      const data = imageData.data, nPixels = data.length, v = 1, s = Math.pow(2, this.saturation()), h = Math.abs(this.hue() + 360) % 360, l = this.luminance() * 127;
      // Basis for the technique used:
      // http://beesbuzz.biz/code/hsv_color_transforms.php
      // V is the value multiplier (1 for none, 2 for double, 0.5 for half)
      // S is the saturation multiplier (1 for none, 2 for double, 0.5 for half)
      // H is the hue shift in degrees (0 to 360)
      // vsu = V*S*cos(H*PI/180);
      // vsw = V*S*sin(H*PI/180);
      //[ .299V+.701vsu+.168vsw    .587V-.587vsu+.330vsw    .114V-.114vsu-.497vsw ] [R]
      //[ .299V-.299vsu-.328vsw    .587V+.413vsu+.035vsw    .114V-.114vsu+.292vsw ]*[G]
      //[ .299V-.300vsu+1.25vsw    .587V-.588vsu-1.05vsw    .114V+.886vsu-.203vsw ] [B]
      // Precompute the values in the matrix:
      const vsu = v * s * Math.cos((h * Math.PI) / 180), vsw = v * s * Math.sin((h * Math.PI) / 180);
      // (result spot)(source spot)
      const rr = 0.299 * v + 0.701 * vsu + 0.167 * vsw, rg = 0.587 * v - 0.587 * vsu + 0.33 * vsw, rb = 0.114 * v - 0.114 * vsu - 0.497 * vsw;
      const gr = 0.299 * v - 0.299 * vsu - 0.328 * vsw, gg = 0.587 * v + 0.413 * vsu + 0.035 * vsw, gb = 0.114 * v - 0.114 * vsu + 0.293 * vsw;
      const br = 0.299 * v - 0.3 * vsu + 1.25 * vsw, bg = 0.587 * v - 0.586 * vsu - 1.05 * vsw, bb = 0.114 * v + 0.886 * vsu - 0.2 * vsw;
      let r, g, b, a;
      for (let i = 0; i < nPixels; i += 4) {
          r = data[i + 0];
          g = data[i + 1];
          b = data[i + 2];
          a = data[i + 3];
          data[i + 0] = rr * r + rg * g + rb * b + l;
          data[i + 1] = gr * r + gg * g + gb * b + l;
          data[i + 2] = br * r + bg * g + bb * b + l;
          data[i + 3] = a; // alpha
      }
  };

  /**
   * HSV Filter. Adjusts the hue, saturation and value
   * @function
   * @name HSV
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author ippo615
   * @example
   * image.filters([Konva.Filters.HSV]);
   * image.value(200);
   */
  const HSV = function (imageData) {
      const data = imageData.data, nPixels = data.length, v = Math.pow(2, this.value()), s = Math.pow(2, this.saturation()), h = Math.abs(this.hue() + 360) % 360;
      // Basis for the technique used:
      // http://beesbuzz.biz/code/hsv_color_transforms.php
      // V is the value multiplier (1 for none, 2 for double, 0.5 for half)
      // S is the saturation multiplier (1 for none, 2 for double, 0.5 for half)
      // H is the hue shift in degrees (0 to 360)
      // vsu = V*S*cos(H*PI/180);
      // vsw = V*S*sin(H*PI/180);
      //[ .299V+.701vsu+.168vsw    .587V-.587vsu+.330vsw    .114V-.114vsu-.497vsw ] [R]
      //[ .299V-.299vsu-.328vsw    .587V+.413vsu+.035vsw    .114V-.114vsu+.292vsw ]*[G]
      //[ .299V-.300vsu+1.25vsw    .587V-.588vsu-1.05vsw    .114V+.886vsu-.203vsw ] [B]
      // Precompute the values in the matrix:
      const vsu = v * s * Math.cos((h * Math.PI) / 180), vsw = v * s * Math.sin((h * Math.PI) / 180);
      // (result spot)(source spot)
      const rr = 0.299 * v + 0.701 * vsu + 0.167 * vsw, rg = 0.587 * v - 0.587 * vsu + 0.33 * vsw, rb = 0.114 * v - 0.114 * vsu - 0.497 * vsw;
      const gr = 0.299 * v - 0.299 * vsu - 0.328 * vsw, gg = 0.587 * v + 0.413 * vsu + 0.035 * vsw, gb = 0.114 * v - 0.114 * vsu + 0.293 * vsw;
      const br = 0.299 * v - 0.3 * vsu + 1.25 * vsw, bg = 0.587 * v - 0.586 * vsu - 1.05 * vsw, bb = 0.114 * v + 0.886 * vsu - 0.2 * vsw;
      for (let i = 0; i < nPixels; i += 4) {
          const r = data[i + 0];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          data[i + 0] = rr * r + rg * g + rb * b;
          data[i + 1] = gr * r + gg * g + gb * b;
          data[i + 2] = br * r + bg * g + bb * b;
          data[i + 3] = a; // alpha
      }
  };
  Factory.addGetterSetter(Node, 'hue', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set hsv hue in degrees. Use with {@link Konva.Filters.HSV} or {@link Konva.Filters.HSL} filter.
   * @name Konva.Node#hue
   * @method
   * @param {Number} hue value between 0 and 359
   * @returns {Number}
   */
  Factory.addGetterSetter(Node, 'saturation', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set hsv saturation. Use with {@link Konva.Filters.HSV} or {@link Konva.Filters.HSL} filter.
   * @name Konva.Node#saturation
   * @method
   * @param {Number} saturation 0 is no change, -1.0 halves the saturation, 1.0 doubles, etc..
   * @returns {Number}
   */
  Factory.addGetterSetter(Node, 'value', 0, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set hsv value. Use with {@link Konva.Filters.HSV} filter.
   * @name Konva.Node#value
   * @method
   * @param {Number} value 0 is no change, -1.0 halves the value, 1.0 doubles, etc..
   * @returns {Number}
   */

  /**
   * Invert Filter
   * @function
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Invert]);
   */
  const Invert = function (imageData) {
      const data = imageData.data, len = data.length;
      for (let i = 0; i < len; i += 4) {
          // red
          data[i] = 255 - data[i];
          // green
          data[i + 1] = 255 - data[i + 1];
          // blue
          data[i + 2] = 255 - data[i + 2];
      }
  };

  /*
   * ToPolar Filter. Converts image data to polar coordinates. Performs
   *  w*h*4 pixel reads and w*h pixel writes. The r axis is placed along
   *  what would be the y axis and the theta axis along the x axis.
   * @function
   * @author ippo615
   * @memberof Konva.Filters
   * @param {ImageData} src, the source image data (what will be transformed)
   * @param {ImageData} dst, the destination image data (where it will be saved)
   * @param {Object} opt
   * @param {Number} [opt.polarCenterX] horizontal location for the center of the circle,
   *  default is in the middle
   * @param {Number} [opt.polarCenterY] vertical location for the center of the circle,
   *  default is in the middle
   */
  const ToPolar = function (src, dst, opt) {
      const srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2;
      // Find the largest radius
      let rMax = Math.sqrt(xMid * xMid + yMid * yMid);
      let x = xSize - xMid;
      let y = ySize - yMid;
      const rad = Math.sqrt(x * x + y * y);
      rMax = rad > rMax ? rad : rMax;
      // We'll be uisng y as the radius, and x as the angle (theta=t)
      const rSize = ySize, tSize = xSize;
      // We want to cover all angles (0-360) and we need to convert to
      // radians (*PI/180)
      const conversion = ((360 / tSize) * Math.PI) / 180;
      // var x1, x2, x1i, x2i, y1, y2, y1i, y2i, scale;
      for (let theta = 0; theta < tSize; theta += 1) {
          const sin = Math.sin(theta * conversion);
          const cos = Math.cos(theta * conversion);
          for (let radius = 0; radius < rSize; radius += 1) {
              x = Math.floor(xMid + ((rMax * radius) / rSize) * cos);
              y = Math.floor(yMid + ((rMax * radius) / rSize) * sin);
              let i = (y * xSize + x) * 4;
              const r = srcPixels[i + 0];
              const g = srcPixels[i + 1];
              const b = srcPixels[i + 2];
              const a = srcPixels[i + 3];
              // Store it
              //i = (theta * xSize  +  radius) * 4;
              i = (theta + radius * xSize) * 4;
              dstPixels[i + 0] = r;
              dstPixels[i + 1] = g;
              dstPixels[i + 2] = b;
              dstPixels[i + 3] = a;
          }
      }
  };
  /*
   * FromPolar Filter. Converts image data from polar coordinates back to rectangular.
   *  Performs w*h*4 pixel reads and w*h pixel writes.
   * @function
   * @author ippo615
   * @memberof Konva.Filters
   * @param {ImageData} src, the source image data (what will be transformed)
   * @param {ImageData} dst, the destination image data (where it will be saved)
   * @param {Object} opt
   * @param {Number} [opt.polarCenterX] horizontal location for the center of the circle,
   *  default is in the middle
   * @param {Number} [opt.polarCenterY] vertical location for the center of the circle,
   *  default is in the middle
   * @param {Number} [opt.polarRotation] amount to rotate the image counterclockwis,
   *  0 is no rotation, 360 degrees is a full rotation
   */
  const FromPolar = function (src, dst, opt) {
      const srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2;
      // Find the largest radius
      let rMax = Math.sqrt(xMid * xMid + yMid * yMid);
      let x = xSize - xMid;
      let y = ySize - yMid;
      const rad = Math.sqrt(x * x + y * y);
      rMax = rad > rMax ? rad : rMax;
      // We'll be uisng x as the radius, and y as the angle (theta=t)
      const rSize = ySize, tSize = xSize, phaseShift = 0;
      // We need to convert to degrees and we need to make sure
      // it's between (0-360)
      // var conversion = tSize/360*180/Math.PI;
      //var conversion = tSize/360*180/Math.PI;
      let x1, y1;
      for (x = 0; x < xSize; x += 1) {
          for (y = 0; y < ySize; y += 1) {
              const dx = x - xMid;
              const dy = y - yMid;
              const radius = (Math.sqrt(dx * dx + dy * dy) * rSize) / rMax;
              let theta = ((Math.atan2(dy, dx) * 180) / Math.PI + 360 + phaseShift) % 360;
              theta = (theta * tSize) / 360;
              x1 = Math.floor(theta);
              y1 = Math.floor(radius);
              let i = (y1 * xSize + x1) * 4;
              const r = srcPixels[i + 0];
              const g = srcPixels[i + 1];
              const b = srcPixels[i + 2];
              const a = srcPixels[i + 3];
              // Store it
              i = (y * xSize + x) * 4;
              dstPixels[i + 0] = r;
              dstPixels[i + 1] = g;
              dstPixels[i + 2] = b;
              dstPixels[i + 3] = a;
          }
      }
  };
  //Konva.Filters.ToPolar = Util._FilterWrapDoubleBuffer(ToPolar);
  //Konva.Filters.FromPolar = Util._FilterWrapDoubleBuffer(FromPolar);
  // create a temporary canvas for working - shared between multiple calls
  /*
   * Kaleidoscope Filter.
   * @function
   * @name Kaleidoscope
   * @author ippo615
   * @memberof Konva.Filters
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Kaleidoscope]);
   * node.kaleidoscopePower(3);
   * node.kaleidoscopeAngle(45);
   */
  const Kaleidoscope = function (imageData) {
      const xSize = imageData.width, ySize = imageData.height;
      let x, y, xoff, i, r, g, b, a, srcPos, dstPos;
      let power = Math.round(this.kaleidoscopePower());
      const angle = Math.round(this.kaleidoscopeAngle());
      const offset = Math.floor((xSize * (angle % 360)) / 360);
      if (power < 1) {
          return;
      }
      // Work with our shared buffer canvas
      const tempCanvas = Util.createCanvasElement();
      tempCanvas.width = xSize;
      tempCanvas.height = ySize;
      const scratchData = tempCanvas
          .getContext('2d')
          .getImageData(0, 0, xSize, ySize);
      Util.releaseCanvas(tempCanvas);
      // Convert thhe original to polar coordinates
      ToPolar(imageData, scratchData, {
          polarCenterX: xSize / 2,
          polarCenterY: ySize / 2,
      });
      // Determine how big each section will be, if it's too small
      // make it bigger
      let minSectionSize = xSize / Math.pow(2, power);
      while (minSectionSize <= 8) {
          minSectionSize = minSectionSize * 2;
          power -= 1;
      }
      minSectionSize = Math.ceil(minSectionSize);
      let sectionSize = minSectionSize;
      // Copy the offset region to 0
      // Depending on the size of filter and location of the offset we may need
      // to copy the section backwards to prevent it from rewriting itself
      let xStart = 0, xEnd = sectionSize, xDelta = 1;
      if (offset + minSectionSize > xSize) {
          xStart = sectionSize;
          xEnd = 0;
          xDelta = -1;
      }
      for (y = 0; y < ySize; y += 1) {
          for (x = xStart; x !== xEnd; x += xDelta) {
              xoff = Math.round(x + offset) % xSize;
              srcPos = (xSize * y + xoff) * 4;
              r = scratchData.data[srcPos + 0];
              g = scratchData.data[srcPos + 1];
              b = scratchData.data[srcPos + 2];
              a = scratchData.data[srcPos + 3];
              dstPos = (xSize * y + x) * 4;
              scratchData.data[dstPos + 0] = r;
              scratchData.data[dstPos + 1] = g;
              scratchData.data[dstPos + 2] = b;
              scratchData.data[dstPos + 3] = a;
          }
      }
      // Perform the actual effect
      for (y = 0; y < ySize; y += 1) {
          sectionSize = Math.floor(minSectionSize);
          for (i = 0; i < power; i += 1) {
              for (x = 0; x < sectionSize + 1; x += 1) {
                  srcPos = (xSize * y + x) * 4;
                  r = scratchData.data[srcPos + 0];
                  g = scratchData.data[srcPos + 1];
                  b = scratchData.data[srcPos + 2];
                  a = scratchData.data[srcPos + 3];
                  dstPos = (xSize * y + sectionSize * 2 - x - 1) * 4;
                  scratchData.data[dstPos + 0] = r;
                  scratchData.data[dstPos + 1] = g;
                  scratchData.data[dstPos + 2] = b;
                  scratchData.data[dstPos + 3] = a;
              }
              sectionSize *= 2;
          }
      }
      // Convert back from polar coordinates
      FromPolar(scratchData, imageData, { });
  };
  /**
   * get/set kaleidoscope power. Use with {@link Konva.Filters.Kaleidoscope} filter.
   * @name Konva.Node#kaleidoscopePower
   * @method
   * @param {Integer} power of kaleidoscope
   * @returns {Integer}
   */
  Factory.addGetterSetter(Node, 'kaleidoscopePower', 2, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set kaleidoscope angle. Use with {@link Konva.Filters.Kaleidoscope} filter.
   * @name Konva.Node#kaleidoscopeAngle
   * @method
   * @param {Integer} degrees
   * @returns {Integer}
   */
  Factory.addGetterSetter(Node, 'kaleidoscopeAngle', 0, getNumberValidator(), Factory.afterSetFilter);

  function pixelAt(idata, x, y) {
      let idx = (y * idata.width + x) * 4;
      const d = [];
      d.push(idata.data[idx++], idata.data[idx++], idata.data[idx++], idata.data[idx++]);
      return d;
  }
  function rgbDistance(p1, p2) {
      return Math.sqrt(Math.pow(p1[0] - p2[0], 2) +
          Math.pow(p1[1] - p2[1], 2) +
          Math.pow(p1[2] - p2[2], 2));
  }
  function rgbMean(pTab) {
      const m = [0, 0, 0];
      for (let i = 0; i < pTab.length; i++) {
          m[0] += pTab[i][0];
          m[1] += pTab[i][1];
          m[2] += pTab[i][2];
      }
      m[0] /= pTab.length;
      m[1] /= pTab.length;
      m[2] /= pTab.length;
      return m;
  }
  function backgroundMask(idata, threshold) {
      const rgbv_no = pixelAt(idata, 0, 0);
      const rgbv_ne = pixelAt(idata, idata.width - 1, 0);
      const rgbv_so = pixelAt(idata, 0, idata.height - 1);
      const rgbv_se = pixelAt(idata, idata.width - 1, idata.height - 1);
      const thres = threshold || 10;
      if (rgbDistance(rgbv_no, rgbv_ne) < thres &&
          rgbDistance(rgbv_ne, rgbv_se) < thres &&
          rgbDistance(rgbv_se, rgbv_so) < thres &&
          rgbDistance(rgbv_so, rgbv_no) < thres) {
          // Mean color
          const mean = rgbMean([rgbv_ne, rgbv_no, rgbv_se, rgbv_so]);
          // Mask based on color distance
          const mask = [];
          for (let i = 0; i < idata.width * idata.height; i++) {
              const d = rgbDistance(mean, [
                  idata.data[i * 4],
                  idata.data[i * 4 + 1],
                  idata.data[i * 4 + 2],
              ]);
              mask[i] = d < thres ? 0 : 255;
          }
          return mask;
      }
  }
  function applyMask(idata, mask) {
      for (let i = 0; i < idata.width * idata.height; i++) {
          idata.data[4 * i + 3] = mask[i];
      }
  }
  function erodeMask(mask, sw, sh) {
      const weights = [1, 1, 1, 1, 0, 1, 1, 1, 1];
      const side = Math.round(Math.sqrt(weights.length));
      const halfSide = Math.floor(side / 2);
      const maskResult = [];
      for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
              const so = y * sw + x;
              let a = 0;
              for (let cy = 0; cy < side; cy++) {
                  for (let cx = 0; cx < side; cx++) {
                      const scy = y + cy - halfSide;
                      const scx = x + cx - halfSide;
                      if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                          const srcOff = scy * sw + scx;
                          const wt = weights[cy * side + cx];
                          a += mask[srcOff] * wt;
                      }
                  }
              }
              maskResult[so] = a === 255 * 8 ? 255 : 0;
          }
      }
      return maskResult;
  }
  function dilateMask(mask, sw, sh) {
      const weights = [1, 1, 1, 1, 1, 1, 1, 1, 1];
      const side = Math.round(Math.sqrt(weights.length));
      const halfSide = Math.floor(side / 2);
      const maskResult = [];
      for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
              const so = y * sw + x;
              let a = 0;
              for (let cy = 0; cy < side; cy++) {
                  for (let cx = 0; cx < side; cx++) {
                      const scy = y + cy - halfSide;
                      const scx = x + cx - halfSide;
                      if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                          const srcOff = scy * sw + scx;
                          const wt = weights[cy * side + cx];
                          a += mask[srcOff] * wt;
                      }
                  }
              }
              maskResult[so] = a >= 255 * 4 ? 255 : 0;
          }
      }
      return maskResult;
  }
  function smoothEdgeMask(mask, sw, sh) {
      const weights = [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9];
      const side = Math.round(Math.sqrt(weights.length));
      const halfSide = Math.floor(side / 2);
      const maskResult = [];
      for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
              const so = y * sw + x;
              let a = 0;
              for (let cy = 0; cy < side; cy++) {
                  for (let cx = 0; cx < side; cx++) {
                      const scy = y + cy - halfSide;
                      const scx = x + cx - halfSide;
                      if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                          const srcOff = scy * sw + scx;
                          const wt = weights[cy * side + cx];
                          a += mask[srcOff] * wt;
                      }
                  }
              }
              maskResult[so] = a;
          }
      }
      return maskResult;
  }
  /**
   * Mask Filter
   * @function
   * @name Mask
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Mask]);
   * node.threshold(200);
   */
  const Mask = function (imageData) {
      // Detect pixels close to the background color
      const threshold = this.threshold();
      let mask = backgroundMask(imageData, threshold);
      if (mask) {
          // Erode
          mask = erodeMask(mask, imageData.width, imageData.height);
          // Dilate
          mask = dilateMask(mask, imageData.width, imageData.height);
          // Gradient
          mask = smoothEdgeMask(mask, imageData.width, imageData.height);
          // Apply mask
          applyMask(imageData, mask);
      }
      return imageData;
  };
  Factory.addGetterSetter(Node, 'threshold', 0, getNumberValidator(), Factory.afterSetFilter);

  /**
   * Noise Filter. Randomly adds or substracts to the color channels
   * @function
   * @name Noise
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author ippo615
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Noise]);
   * node.noise(0.8);
   */
  const Noise = function (imageData) {
      const amount = this.noise() * 255, data = imageData.data, nPixels = data.length, half = amount / 2;
      for (let i = 0; i < nPixels; i += 4) {
          data[i + 0] += half - 2 * half * Math.random();
          data[i + 1] += half - 2 * half * Math.random();
          data[i + 2] += half - 2 * half * Math.random();
      }
  };
  Factory.addGetterSetter(Node, 'noise', 0.2, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set noise amount.  Must be a value between 0 and 1. Use with {@link Konva.Filters.Noise} filter.
   * @name Konva.Node#noise
   * @method
   * @param {Number} noise
   * @returns {Number}
   */

  /**
   * Pixelate Filter. Averages groups of pixels and redraws
   *  them as larger pixels
   * @function
   * @name Pixelate
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author ippo615
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Pixelate]);
   * node.pixelSize(10);
   */
  const Pixelate = function (imageData) {
      let pixelSize = Math.ceil(this.pixelSize()), width = imageData.width, height = imageData.height, 
      //pixelsPerBin = pixelSize * pixelSize,
      nBinsX = Math.ceil(width / pixelSize), nBinsY = Math.ceil(height / pixelSize), data = imageData.data;
      if (pixelSize <= 0) {
          Util.error('pixelSize value can not be <= 0');
          return;
      }
      for (let xBin = 0; xBin < nBinsX; xBin += 1) {
          for (let yBin = 0; yBin < nBinsY; yBin += 1) {
              // Initialize the color accumlators to 0
              let red = 0;
              let green = 0;
              let blue = 0;
              let alpha = 0;
              // Determine which pixels are included in this bin
              const xBinStart = xBin * pixelSize;
              const xBinEnd = xBinStart + pixelSize;
              const yBinStart = yBin * pixelSize;
              const yBinEnd = yBinStart + pixelSize;
              // Add all of the pixels to this bin!
              let pixelsInBin = 0;
              for (let x = xBinStart; x < xBinEnd; x += 1) {
                  if (x >= width) {
                      continue;
                  }
                  for (let y = yBinStart; y < yBinEnd; y += 1) {
                      if (y >= height) {
                          continue;
                      }
                      const i = (width * y + x) * 4;
                      red += data[i + 0];
                      green += data[i + 1];
                      blue += data[i + 2];
                      alpha += data[i + 3];
                      pixelsInBin += 1;
                  }
              }
              // Make sure the channels are between 0-255
              red = red / pixelsInBin;
              green = green / pixelsInBin;
              blue = blue / pixelsInBin;
              alpha = alpha / pixelsInBin;
              // Draw this bin
              for (let x = xBinStart; x < xBinEnd; x += 1) {
                  if (x >= width) {
                      continue;
                  }
                  for (let y = yBinStart; y < yBinEnd; y += 1) {
                      if (y >= height) {
                          continue;
                      }
                      const i = (width * y + x) * 4;
                      data[i + 0] = red;
                      data[i + 1] = green;
                      data[i + 2] = blue;
                      data[i + 3] = alpha;
                  }
              }
          }
      }
  };
  Factory.addGetterSetter(Node, 'pixelSize', 8, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set pixel size. Use with {@link Konva.Filters.Pixelate} filter.
   * @name Konva.Node#pixelSize
   * @method
   * @param {Integer} pixelSize
   * @returns {Integer}
   */

  /**
   * Posterize Filter. Adjusts the channels so that there are no more
   *  than n different values for that channel. This is also applied
   *  to the alpha channel.
   * @function
   * @name Posterize
   * @author ippo615
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Posterize]);
   * node.levels(0.8); // between 0 and 1
   */
  const Posterize = function (imageData) {
      // level must be between 1 and 255
      const levels = Math.round(this.levels() * 254) + 1, data = imageData.data, len = data.length, scale = 255 / levels;
      for (let i = 0; i < len; i += 1) {
          data[i] = Math.floor(data[i] / scale) * scale;
      }
  };
  Factory.addGetterSetter(Node, 'levels', 0.5, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set levels.  Must be a number between 0 and 1.  Use with {@link Konva.Filters.Posterize} filter.
   * @name Konva.Node#levels
   * @method
   * @param {Number} level between 0 and 1
   * @returns {Number}
   */

  /**
   * RGB Filter
   * @function
   * @name RGB
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author ippo615
   * @example
   * node.cache();
   * node.filters([Konva.Filters.RGB]);
   * node.blue(120);
   * node.green(200);
   */
  const RGB = function (imageData) {
      const data = imageData.data, nPixels = data.length, red = this.red(), green = this.green(), blue = this.blue();
      for (let i = 0; i < nPixels; i += 4) {
          const brightness = (0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2]) / 255;
          data[i] = brightness * red; // r
          data[i + 1] = brightness * green; // g
          data[i + 2] = brightness * blue; // b
          data[i + 3] = data[i + 3]; // alpha
      }
  };
  Factory.addGetterSetter(Node, 'red', 0, function (val) {
      this._filterUpToDate = false;
      if (val > 255) {
          return 255;
      }
      else if (val < 0) {
          return 0;
      }
      else {
          return Math.round(val);
      }
  });
  /**
   * get/set filter red value. Use with {@link Konva.Filters.RGB} filter.
   * @name red
   * @method
   * @memberof Konva.Node.prototype
   * @param {Integer} red value between 0 and 255
   * @returns {Integer}
   */
  Factory.addGetterSetter(Node, 'green', 0, function (val) {
      this._filterUpToDate = false;
      if (val > 255) {
          return 255;
      }
      else if (val < 0) {
          return 0;
      }
      else {
          return Math.round(val);
      }
  });
  /**
   * get/set filter green value. Use with {@link Konva.Filters.RGB} filter.
   * @name green
   * @method
   * @memberof Konva.Node.prototype
   * @param {Integer} green value between 0 and 255
   * @returns {Integer}
   */
  Factory.addGetterSetter(Node, 'blue', 0, RGBComponent, Factory.afterSetFilter);
  /**
   * get/set filter blue value. Use with {@link Konva.Filters.RGB} filter.
   * @name blue
   * @method
   * @memberof Konva.Node.prototype
   * @param {Integer} blue value between 0 and 255
   * @returns {Integer}
   */

  /**
   * RGBA Filter
   * @function
   * @name RGBA
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author codefo
   * @example
   * node.cache();
   * node.filters([Konva.Filters.RGBA]);
   * node.blue(120);
   * node.green(200);
   * node.alpha(0.3);
   */
  const RGBA = function (imageData) {
      const data = imageData.data, nPixels = data.length, red = this.red(), green = this.green(), blue = this.blue(), alpha = this.alpha();
      for (let i = 0; i < nPixels; i += 4) {
          const ia = 1 - alpha;
          data[i] = red * alpha + data[i] * ia; // r
          data[i + 1] = green * alpha + data[i + 1] * ia; // g
          data[i + 2] = blue * alpha + data[i + 2] * ia; // b
      }
  };
  Factory.addGetterSetter(Node, 'red', 0, function (val) {
      this._filterUpToDate = false;
      if (val > 255) {
          return 255;
      }
      else if (val < 0) {
          return 0;
      }
      else {
          return Math.round(val);
      }
  });
  /**
   * get/set filter red value. Use with {@link Konva.Filters.RGBA} filter.
   * @name red
   * @method
   * @memberof Konva.Node.prototype
   * @param {Integer} red value between 0 and 255
   * @returns {Integer}
   */
  Factory.addGetterSetter(Node, 'green', 0, function (val) {
      this._filterUpToDate = false;
      if (val > 255) {
          return 255;
      }
      else if (val < 0) {
          return 0;
      }
      else {
          return Math.round(val);
      }
  });
  /**
   * get/set filter green value. Use with {@link Konva.Filters.RGBA} filter.
   * @name green
   * @method
   * @memberof Konva.Node.prototype
   * @param {Integer} green value between 0 and 255
   * @returns {Integer}
   */
  Factory.addGetterSetter(Node, 'blue', 0, RGBComponent, Factory.afterSetFilter);
  /**
   * get/set filter blue value. Use with {@link Konva.Filters.RGBA} filter.
   * @name blue
   * @method
   * @memberof Konva.Node.prototype
   * @param {Integer} blue value between 0 and 255
   * @returns {Integer}
   */
  Factory.addGetterSetter(Node, 'alpha', 1, function (val) {
      this._filterUpToDate = false;
      if (val > 1) {
          return 1;
      }
      else if (val < 0) {
          return 0;
      }
      else {
          return val;
      }
  });
  /**
   * get/set filter alpha value. Use with {@link Konva.Filters.RGBA} filter.
   * @name alpha
   * @method
   * @memberof Konva.Node.prototype
   * @param {Float} alpha value between 0 and 1
   * @returns {Float}
   */

  // based on https://stackoverflow.com/questions/1061093/how-is-a-sepia-tone-created
  /**
   * @function
   * @name Sepia
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Sepia]);
   */
  const Sepia = function (imageData) {
      const data = imageData.data, nPixels = data.length;
      for (let i = 0; i < nPixels; i += 4) {
          const r = data[i + 0];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i + 0] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
  };

  /**
   * Solarize Filter
   * Pixastic Lib - Solarize filter - v0.1.0
   * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
   * License: [http://www.pixastic.com/lib/license.txt]
   * @function
   * @name Solarize
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Solarize]);
   */
  const Solarize = function (imageData) {
      const data = imageData.data, w = imageData.width, h = imageData.height, w4 = w * 4;
      let y = h;
      do {
          const offsetY = (y - 1) * w4;
          let x = w;
          do {
              const offset = offsetY + (x - 1) * 4;
              let r = data[offset];
              let g = data[offset + 1];
              let b = data[offset + 2];
              if (r > 127) {
                  r = 255 - r;
              }
              if (g > 127) {
                  g = 255 - g;
              }
              if (b > 127) {
                  b = 255 - b;
              }
              data[offset] = r;
              data[offset + 1] = g;
              data[offset + 2] = b;
          } while (--x);
      } while (--y);
  };

  /**
   * Threshold Filter. Pushes any value above the mid point to
   *  the max and any value below the mid point to the min.
   *  This affects the alpha channel.
   * @function
   * @name Threshold
   * @memberof Konva.Filters
   * @param {Object} imageData
   * @author ippo615
   * @example
   * node.cache();
   * node.filters([Konva.Filters.Threshold]);
   * node.threshold(0.1);
   */
  const Threshold = function (imageData) {
      const level = this.threshold() * 255, data = imageData.data, len = data.length;
      for (let i = 0; i < len; i += 1) {
          data[i] = data[i] < level ? 0 : 255;
      }
  };
  Factory.addGetterSetter(Node, 'threshold', 0.5, getNumberValidator(), Factory.afterSetFilter);
  /**
   * get/set threshold.  Must be a value between 0 and 1. Use with {@link Konva.Filters.Threshold} or {@link Konva.Filters.Mask} filter.
   * @name threshold
   * @method
   * @memberof Konva.Node.prototype
   * @param {Number} threshold
   * @returns {Number}
   */

  // we need to import core of the Konva and then extend it with all additional objects
  const Konva = Konva$1.Util._assign(Konva$1, {
      Arc,
      Arrow,
      Circle,
      Ellipse,
      Image,
      Label,
      Tag,
      Line,
      Path,
      Rect,
      RegularPolygon,
      Ring,
      Sprite,
      Star,
      Text,
      TextPath,
      Transformer,
      Wedge,
      /**
       * @namespace Filters
       * @memberof Konva
       */
      Filters: {
          Blur,
          Brighten,
          Contrast,
          Emboss,
          Enhance,
          Grayscale,
          HSL,
          HSV,
          Invert,
          Kaleidoscope,
          Mask,
          Noise,
          Pixelate,
          Posterize,
          RGB,
          RGBA,
          Sepia,
          Solarize,
          Threshold,
      },
  });

  return Konva;

}));
