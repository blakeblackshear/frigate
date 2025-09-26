'use strict';

function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}
function _inheritsLoose(t, o) {
  t.prototype = Object.create(o.prototype), t.prototype.constructor = t, _setPrototypeOf(t, o);
}
function _setPrototypeOf(t, e) {
  return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) {
    return t.__proto__ = e, t;
  }, _setPrototypeOf(t, e);
}

/**
 * determine a string type
 * @param str
 * @returns {boolean}
 */
var isString = str => typeof str === 'string' && str.constructor === String;

/**
 * determine a promise type
 * @param promise
 * @returns {boolean}
 */
var isPromise = promise => Object.prototype.toString.call(promise).slice(8, -1) === 'Promise';

/**
 * function to promise
 * @param normalFunction
 * @param timeout
 * @returns {Promise<any>}
 */
var functionToPromise = (function (normalFunction) {
  var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  if (isPromise(normalFunction)) {
    return normalFunction;
  }

  // eslint-disable-next-line no-undef
  return new Promise(resolve => {
    normalFunction();
    setTimeout(resolve, timeout);
  });
});

function styleInject(css, ref) {
  if (ref === void 0) ref = {};
  var insertAt = ref.insertAt;
  if (typeof document === 'undefined') {
    return;
  }
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = ".WJ3NAvwFY9,.ZgIIHVSSYI,.kAA8SjbHe2,.tR2-0dd-e1{height:100%;left:0;position:absolute;top:0;width:100%;z-index:1}.ZgIIHVSSYI{-ms-flex-pack:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-justify-content:center;justify-content:center}.WJ3NAvwFY9,.tR2-0dd-e1{display:block}.tR2-0dd-e1.OueN4AU4CJ{display:none}.ZgIIHVSSYI,.kAA8SjbHe2{-webkit-tap-highlight-color:rgba(255,0,0,0);cursor:pointer;opacity:.7}.OueN4AU4CJ.ZgIIHVSSYI,.OueN4AU4CJ.kAA8SjbHe2{display:none}.ZgIIHVSSYI{z-index:10}.ZgIIHVSSYI>svg{fill:#fff;height:12vw;max-height:60px;max-width:60px;width:12vw}.kAA8SjbHe2{-ms-flex-pack:end;-ms-flex-align:end;-webkit-align-items:flex-end;align-items:flex-end;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-justify-content:flex-end;justify-content:flex-end;z-index:10}.kAA8SjbHe2>svg{fill:#fff;height:9vw;margin:0 15px 15px 0;max-height:40px;max-width:40px;width:9vw}";
var _style = {"canvas":"WJ3NAvwFY9","poster":"tR2-0dd-e1","playButton":"ZgIIHVSSYI","unmuteButton":"kAA8SjbHe2","hidden":"OueN4AU4CJ"};
styleInject(css_248z);

/**
 * PLAY_BUTTON HTML
 * @type {string}
 */
var PLAY_BUTTON = "\n<svg viewBox=\"0 0 64 64\">\n  <path d=\"M26,45.5L44,32L26,18.6v27V45.5L26,45.5z M32,2C15.4,2,2,15.5,2,32c0,16.6,13.4,30,30,30c16.6,0,30-13.4,30-30 C62,15.4,48.5,2,32,2L32,2z M32,56c-9.7,0-18.5-5.9-22.2-14.8C6.1,32.2,8.1,21.9,15,15c6.9-6.9,17.2-8.9,26.2-5.2 C50.1,13.5,56,22.3,56,32C56,45.3,45.2,56,32,56L32,56z\"/>\n</svg>\n";

/**
 * UNMUTE_BUTTON HTML
 * @type {string}
 */
var UNMUTE_BUTTON = "\n<svg viewBox=\"0 0 64 64\">\n  <path d=\"M58.3,45.5l-4.8-4.3c1.4-2.9,2.2-6.2,2.2-9.6c0-11.1-8.2-20.3-18.9-21.9V3.3C50.9,4.9,62,16.9,62,31.6 C62,36.6,60.6,41.4,58.3,45.5L58.3,45.5z M30.4,5.6v15.2l-8.3-7.3L30.4,5.6L30.4,5.6z M36.7,19.9c4.6,1.9,7.9,6.4,7.9,11.7 c0,0.6-0.1,1.1-0.1,1.7l-7.8-6.9V19.9L36.7,19.9z M57.5,60.7l-7.1-6.3c-3.9,2.9-8.6,4.8-13.7,5.4v-6.4c3.2-0.5,6.2-1.7,8.8-3.4 l-8.1-7.2c-0.2,0.1-0.5,0.3-0.7,0.4v-1l-6.3-5.6v20.2L15.4,42.6H2V20.5h10.2l-9.7-8.6l4.2-4.7L61.7,56L57.5,60.7L57.5,60.7z\"/>\n</svg>\n";

var VideoElement = /*#__PURE__*/function () {
  function VideoElement(wrapper, videoUrl, _temp, overlayOptions) {
    var _ref = _temp === void 0 ? {} : _temp,
      _ref$canvas = _ref.canvas,
      canvas = _ref$canvas === void 0 ? '' : _ref$canvas,
      _ref$poster = _ref.poster,
      poster = _ref$poster === void 0 ? '' : _ref$poster,
      _ref$autoplay = _ref.autoplay,
      autoplay = _ref$autoplay === void 0 ? false : _ref$autoplay,
      _ref$autoSetWrapperSi = _ref.autoSetWrapperSize,
      autoSetWrapperSize = _ref$autoSetWrapperSi === void 0 ? false : _ref$autoSetWrapperSi,
      _ref$loop = _ref.loop,
      loop = _ref$loop === void 0 ? false : _ref$loop,
      _ref$control = _ref.control,
      control = _ref$control === void 0 ? true : _ref$control,
      _ref$decodeFirstFrame = _ref.decodeFirstFrame,
      decodeFirstFrame = _ref$decodeFirstFrame === void 0 ? true : _ref$decodeFirstFrame,
      _ref$picMode = _ref.picMode,
      picMode = _ref$picMode === void 0 ? false : _ref$picMode,
      _ref$progressive = _ref.progressive,
      progressive = _ref$progressive === void 0 ? true : _ref$progressive,
      _ref$chunkSize = _ref.chunkSize,
      chunkSize = _ref$chunkSize === void 0 ? 1024 * 1024 : _ref$chunkSize,
      _ref$hooks = _ref.hooks,
      hooks = _ref$hooks === void 0 ? {} : _ref$hooks;
    if (overlayOptions === void 0) {
      overlayOptions = {};
    }
    this.options = _extends({
      videoUrl: videoUrl,
      canvas: canvas,
      poster: poster,
      picMode: picMode,
      autoplay: autoplay,
      autoSetWrapperSize: autoSetWrapperSize,
      loop: loop,
      control: control,
      decodeFirstFrame: decodeFirstFrame,
      progressive: progressive,
      chunkSize: chunkSize,
      hooks: _extends({
        play: function play() {},
        pause: function pause() {},
        stop: function stop() {},
        load: function load() {}
      }, hooks)
    }, overlayOptions);
    this.options.needPlayButton = this.options.control && !this.options.picMode;
    this.player = null;

    // Setup canvas and play button
    this.els = {
      wrapper: isString(wrapper) ? document.querySelector(wrapper) : wrapper,
      canvas: null,
      playButton: document.createElement('div'),
      unmuteButton: null,
      poster: null
    };
    if (window.getComputedStyle(this.els.wrapper).getPropertyValue('position') === 'static') {
      this.els.wrapper.style.position = 'relative';
    }
    this.els.wrapper.clientRect = this.els.wrapper.getBoundingClientRect();
    this.initCanvas();
    this.initPlayButton();
    this.initPlayer();
  }
  var _proto = VideoElement.prototype;
  _proto.initCanvas = function initCanvas() {
    if (this.options.canvas) {
      this.els.canvas = isString(this.options.canvas) ? document.querySelector(this.options.canvas) : this.options.canvas;
    } else {
      this.els.canvas = document.createElement('canvas');
      this.els.canvas.classList.add(_style.canvas);
      this.els.wrapper.appendChild(this.els.canvas);
    }
  };
  _proto.initPlayer = function initPlayer() {
    var _this = this;
    // Parse the data-options - we try to decode the values as json. This way
    // we can get proper boolean and number values. If JSON.parse() fails,
    // treat it as a string.
    this.options = _extends(this.options, {
      canvas: this.els.canvas
    });

    // eslint-disable-next-line no-underscore-dangle
    var _options = _extends({}, this.options, {
      autoplay: false
    });

    // Create the player instance
    this.player = new Player(this.options.videoUrl, _options, {
      play: function play() {
        if (_this.options.needPlayButton) {
          _this.els.playButton.classList.add(_style.hidden);
        }
        if (_this.els.poster) {
          _this.els.poster.classList.add(_style.hidden);
        }
        _this.options.hooks.play();
      },
      pause: function pause() {
        if (_this.options.needPlayButton) {
          _this.els.playButton.classList.remove(_style.hidden);
        }
        _this.options.hooks.pause();
      },
      stop: function stop() {
        if (_this.els.poster) {
          _this.els.poster.classList.remove(_style.hidden);
        }
        _this.options.hooks.stop();
      },
      load: function load() {
        if (_this.options.autoplay) {
          _this.play();
        }
        _this._autoSetWrapperSize();
        _this.options.hooks.load();
      }
    });
    this._copyPlayerFuncs();
    this.els.wrapper.playerInstance = this.player;

    // Setup the poster element, if any
    if (this.options.poster && !this.options.autoplay && !this.player.options.streaming) {
      this.options.decodeFirstFrame = false;
      this.els.poster = new Image();
      this.els.poster.src = this.options.poster;
      this.els.poster.classList.add(_style.poster);
      this.els.wrapper.appendChild(this.els.poster);
    }

    // Add the click handler if this video is pausable
    if (!this.player.options.streaming) {
      this.els.wrapper.addEventListener('click', this.onClick.bind(this));
    }

    // Hide the play button if this video immediately begins playing
    if (this.options.autoplay || this.player.options.streaming) {
      this.els.playButton.classList.add(_style.hidden);
    }

    // Set up the unlock audio button for iOS devices. iOS only allows us to
    // play audio after a user action has initiated playing. For autoplay or
    // streaming players we set up a muted speaker icon as the button. For all
    // others, we can simply use the play button.
    if (this.player.audioOut && !this.player.audioOut.unlocked) {
      var unlockAudioElement = this.els.wrapper;
      if (this.options.autoplay || this.player.options.streaming) {
        this.els.unmuteButton = document.createElement('div');
        this.els.unmuteButton.innerHTML = UNMUTE_BUTTON;
        this.els.unmuteButton.classList.add(_style.unmuteButton);
        this.els.wrapper.appendChild(this.els.unmuteButton);
        unlockAudioElement = this.els.unmuteButton;
      }
      this.unlockAudioBound = this.onUnlockAudio.bind(this, unlockAudioElement);
      unlockAudioElement.addEventListener('touchstart', this.unlockAudioBound, false);
      unlockAudioElement.addEventListener('click', this.unlockAudioBound, true);
    }
  };
  _proto.initPlayButton = function initPlayButton() {
    if (!this.options.needPlayButton) {
      return;
    }
    this.els.playButton.classList.add(_style.playButton);
    this.els.playButton.innerHTML = PLAY_BUTTON;
    this.els.wrapper.appendChild(this.els.playButton);
  };
  _proto._autoSetWrapperSize = function _autoSetWrapperSize() {
    var _this2 = this;
    if (!this.options.autoSetWrapperSize) {
      return Promise.resolve();
    }
    var destination = this.player.video.destination;
    if (!destination) {
      return Promise.resolve();
    }
    return Promise.resolve().then(function () {
      return functionToPromise(function () {
        _this2.els.wrapper.style.width = destination.width + "px";
        _this2.els.wrapper.style.height = destination.height + "px";
      });
    });
  };
  _proto.onUnlockAudio = function onUnlockAudio(element, ev) {
    var _this3 = this;
    if (this.els.unmuteButton) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    this.player.audioOut.unlock(function () {
      if (_this3.els.unmuteButton) {
        _this3.els.unmuteButton.classList.add(_style.hidden);
      }
      element.removeEventListener('touchstart', _this3.unlockAudioBound);
      element.removeEventListener('click', _this3.unlockAudioBound);
    });
  };
  _proto.onClick = function onClick() {
    if (!this.options.control) {
      return;
    }
    if (this.player.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * copy player functions
   * @private
   */;
  _proto._copyPlayerFuncs = function _copyPlayerFuncs() {
    var _this4 = this;
    this.play = function () {
      return _this4.player.play();
    };
    this.pause = function () {
      return _this4.player.pause();
    };
    this.stop = function () {
      return _this4.player.stop();
    };
    this.destroy = function () {
      _this4.player.destroy();
      _this4.els.wrapper.innerHTML = '';
      _this4.els.wrapper.playerInstance = null;
    };
  };
  return VideoElement;
}();

var Now = function Now() {
  return window.performance ? window.performance.now() / 1000 : Date.now() / 1000;
};
var CreateVideoElements = function CreateVideoElements() {
  var elements = document.querySelectorAll('.jsmpeg');
  for (var i = 0; i < elements.length; i++) {
    // eslint-disable-next-line no-new
    new VideoElement(elements[i]);
  }
};
var Fill = function Fill(array, value) {
  if (array.fill) {
    array.fill(value);
  } else {
    for (var i = 0; i < array.length; i++) {
      array[i] = value;
    }
  }
};
var Base64ToArrayBuffer = function Base64ToArrayBuffer(base64) {
  var binary = window.atob(base64);
  var length = binary.length;
  var bytes = new Uint8Array(length);
  for (var i = 0; i < length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/* eslint class-methods-use-this: ["error", { "exceptMethods": ["resume"] }] */
var AjaxSource = /*#__PURE__*/function () {
  function AjaxSource(url, options) {
    this.url = url;
    this.destination = null;
    this.request = null;
    this.streaming = false;
    this.completed = false;
    this.established = false;
    this.progress = 0;
    this.onEstablishedCallback = options.onSourceEstablished;
    this.onCompletedCallback = options.onSourceCompleted;
    if (options.hookOnEstablished) {
      this.hookOnEstablished = options.hookOnEstablished;
    }
  }
  var _proto = AjaxSource.prototype;
  _proto.connect = function connect(destination) {
    this.destination = destination;
  };
  _proto.start = function start() {
    this.request = new XMLHttpRequest();

    // eslint-disable-next-line func-names
    this.request.onreadystatechange = function () {
      if (this.request.readyState === this.request.DONE && this.request.status === 200) {
        this.onLoad(this.request.response);
      }
    }.bind(this);
    this.request.onprogress = this.onProgress.bind(this);
    this.request.open('GET', this.url);
    this.request.responseType = 'arraybuffer';
    this.request.send();
  };
  _proto.resume = function resume() {
    // Nothing to do here
  };
  _proto.destroy = function destroy() {
    this.request.abort();
  };
  _proto.onProgress = function onProgress(ev) {
    this.progress = ev.loaded / ev.total;
  };
  _proto.onLoad = function onLoad(data) {
    this.established = true;
    this.completed = true;
    this.progress = 1;
    if (this.hookOnEstablished) {
      this.hookOnEstablished();
    }
    if (this.onEstablishedCallback) {
      this.onEstablishedCallback(this);
    }
    if (this.onCompletedCallback) {
      this.onCompletedCallback(this);
    }
    if (this.destination) {
      this.destination.write(data);
    }
  };
  return AjaxSource;
}();

var AjaxProgressiveSource = /*#__PURE__*/function () {
  function AjaxProgressiveSource(url, options) {
    this.url = url;
    this.destination = null;
    this.request = null;
    this.streaming = false;
    this.completed = false;
    this.established = false;
    this.progress = 0;
    this.fileSize = 0;
    this.loadedSize = 0;
    this.chunkSize = options.chunkSize || 1024 * 1024;
    this.isLoading = false;
    this.loadStartTime = 0;
    this.throttled = options.throttled !== false;
    this.aborted = false;
    this.onEstablishedCallback = options.onSourceEstablished;
    this.onCompletedCallback = options.onSourceCompleted;
    if (options.hookOnEstablished) {
      this.hookOnEstablished = options.hookOnEstablished;
    }
  }
  var _proto = AjaxProgressiveSource.prototype;
  _proto.connect = function connect(destination) {
    this.destination = destination;
  };
  _proto.start = function start() {
    var _this = this;
    this.request = new XMLHttpRequest();
    this.request.onreadystatechange = function () {
      if (_this.request.readyState === _this.request.DONE) {
        _this.fileSize = parseInt(_this.request.getResponseHeader('Content-Length'), 10);
        _this.loadNextChunk();
      }
    };
    this.request.onprogress = this.onProgress.bind(this);
    this.request.open('HEAD', this.url);
    this.request.send();
  };
  _proto.resume = function resume(secondsHeadroom) {
    if (this.isLoading || !this.throttled) {
      return;
    }

    // Guess the worst case loading time with lots of safety margin. This is
    // somewhat arbitrary...
    var worstCaseLoadingTime = this.loadTime * 8 + 2;
    if (worstCaseLoadingTime > secondsHeadroom) {
      this.loadNextChunk();
    }
  };
  _proto.destroy = function destroy() {
    this.request.abort();
    this.aborted = true;
  };
  _proto.loadNextChunk = function loadNextChunk() {
    var _this2 = this;
    var start = this.loadedSize;
    var end = Math.min(this.loadedSize + this.chunkSize - 1, this.fileSize - 1);
    if (start >= this.fileSize || this.aborted) {
      this.completed = true;
      if (this.onCompletedCallback) {
        this.onCompletedCallback(this);
      }
      return;
    }
    this.isLoading = true;
    this.loadStartTime = Now();
    this.request = new XMLHttpRequest();
    this.request.onreadystatechange = function () {
      if (_this2.request.readyState === _this2.request.DONE && _this2.request.status >= 200 && _this2.request.status < 300) {
        _this2.onChunkLoad(_this2.request.response);
      } else if (_this2.request.readyState === _this2.request.DONE) {
        // Retry?
        if (_this2.loadFails++ < 3) {
          _this2.loadNextChunk();
        }
      }
    };
    if (start === 0) {
      this.request.onprogress = this.onProgress.bind(this);
    }
    this.request.open('GET', this.url + "?" + start + "-" + end);
    this.request.setRequestHeader('Range', "bytes=" + start + "-" + end);
    this.request.responseType = 'arraybuffer';
    this.request.send();
  };
  _proto.onProgress = function onProgress(ev) {
    this.progress = ev.loaded / ev.total;
  };
  _proto.onChunkLoad = function onChunkLoad(data) {
    var isFirstChunk = !this.established;
    this.established = true;
    this.progress = 1;
    this.loadedSize += data.byteLength;
    this.loadFails = 0;
    this.isLoading = false;
    if (isFirstChunk && this.hookOnEstablished) {
      this.hookOnEstablished();
    }
    if (isFirstChunk && this.onEstablishedCallback) {
      this.onEstablishedCallback(this);
    }
    if (this.destination) {
      this.destination.write(data);
    }
    this.loadTime = Now() - this.loadStartTime;
    if (!this.throttled) {
      this.loadNextChunk();
    }
  };
  return AjaxProgressiveSource;
}();

var WSSource = /*#__PURE__*/function () {
  function WSSource(url, options) {
    this.url = url;
    this.options = options;
    this.socket = null;
    this.streaming = true;
    this.callbacks = {
      connect: [],
      data: []
    };
    this.destination = null;
    this.reconnectInterval = options.reconnectInterval !== undefined ? options.reconnectInterval : 5;
    this.shouldAttemptReconnect = !!this.reconnectInterval;
    this.completed = false;
    this.established = false;
    this.progress = 0;
    this.reconnectTimeoutId = 0;
    this.onEstablishedCallback = options.onSourceEstablished;
    this.onCompletedCallback = options.onSourceCompleted; // Never used

    if (options.hookOnEstablished) {
      this.hookOnEstablished = options.hookOnEstablished;
    }
  }
  var _proto = WSSource.prototype;
  _proto.connect = function connect(destination) {
    this.destination = destination;
  };
  _proto.destroy = function destroy() {
    clearTimeout(this.reconnectTimeoutId);
    this.shouldAttemptReconnect = false;
    this.socket.close();
  };
  _proto.start = function start() {
    this.shouldAttemptReconnect = !!this.reconnectInterval;
    this.progress = 0;
    this.established = false;
    if (this.options.protocols) {
      this.socket = new WebSocket(this.url, this.options.protocols);
    } else {
      this.socket = new WebSocket(this.url);
    }
    this.socket.binaryType = 'arraybuffer';
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onerror = this.onClose.bind(this);
    this.socket.onclose = this.onClose.bind(this);
  }

  // eslint-disable-next-line class-methods-use-this
  ;
  _proto.resume = function resume() {
    // Nothing to do here
  };
  _proto.onOpen = function onOpen() {
    this.progress = 1;
  };
  _proto.onClose = function onClose() {
    var _this = this;
    if (this.shouldAttemptReconnect) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = setTimeout(function () {
        _this.start();
      }, this.reconnectInterval * 1000);
    }
  };
  _proto.onMessage = function onMessage(ev) {
    var isFirstChunk = !this.established;
    this.established = true;
    if (isFirstChunk && this.hookOnEstablished) {
      this.hookOnEstablished();
    }
    if (isFirstChunk && this.onEstablishedCallback) {
      this.onEstablishedCallback(this);
    }
    if (this.destination) {
      this.destination.write(ev.data);
    }
  };
  return WSSource;
}();

var BitBuffer = /*#__PURE__*/function () {
  function BitBuffer(bufferOrLength, mode) {
    if (typeof bufferOrLength === 'object') {
      this.bytes = bufferOrLength instanceof Uint8Array ? bufferOrLength : new Uint8Array(bufferOrLength);
      this.byteLength = this.bytes.length;
    } else {
      this.bytes = new Uint8Array(bufferOrLength || 1024 * 1024);
      this.byteLength = 0;
    }
    this.mode = mode || BitBuffer.MODE.EXPAND;
    this.index = 0;
  }
  var _proto = BitBuffer.prototype;
  _proto.resize = function resize(size) {
    var newBytes = new Uint8Array(size);
    if (this.byteLength !== 0) {
      this.byteLength = Math.min(this.byteLength, size);
      newBytes.set(this.bytes, 0, this.byteLength);
    }
    this.bytes = newBytes;
    this.index = Math.min(this.index, this.byteLength << 3);
  };
  _proto.evict = function evict(sizeNeeded) {
    var bytePos = this.index >> 3;
    var available = this.bytes.length - this.byteLength;

    // If the current index is the write position, we can simply reset both
    // to 0. Also reset (and throw away yet unread data) if we won't be able
    // to fit the new data in even after a normal eviction.
    if (this.index === this.byteLength << 3 || sizeNeeded > available + bytePos // emergency evac
    ) {
      this.byteLength = 0;
      this.index = 0;
      return;
    }
    if (bytePos === 0) {
      // Nothing read yet - we can't evict anything
      return;
    }

    // Some browsers don't support copyWithin() yet - we may have to do
    // it manually using set and a subarray
    if (this.bytes.copyWithin) {
      this.bytes.copyWithin(0, bytePos, this.byteLength);
    } else {
      this.bytes.set(this.bytes.subarray(bytePos, this.byteLength));
    }
    this.byteLength -= bytePos;
    this.index -= bytePos << 3;
  };
  _proto.write = function write(buffers) {
    var isArrayOfBuffers = typeof buffers[0] === 'object';
    var totalLength = 0;
    var available = this.bytes.length - this.byteLength;
    // Calculate total byte length
    if (isArrayOfBuffers) {
      totalLength = 0;
      for (var i = 0; i < buffers.length; i++) {
        totalLength += buffers[i].byteLength;
      }
    } else {
      totalLength = buffers.byteLength;
    }

    // Do we need to resize or evict?
    if (totalLength > available) {
      if (this.mode === BitBuffer.MODE.EXPAND) {
        var newSize = Math.max(this.bytes.length * 2, totalLength - available);
        this.resize(newSize);
      } else {
        this.evict(totalLength);
      }
    }
    if (isArrayOfBuffers) {
      for (var _i = 0; _i < buffers.length; _i++) {
        this.appendSingleBuffer(buffers[_i]);
      }
    } else {
      this.appendSingleBuffer(buffers);
    }
    return totalLength;
  };
  _proto.appendSingleBuffer = function appendSingleBuffer(buffer) {
    buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.bytes.set(buffer, this.byteLength);
    this.byteLength += buffer.length;
  };
  _proto.findNextStartCode = function findNextStartCode() {
    for (var i = this.index + 7 >> 3; i < this.byteLength; i++) {
      if (this.bytes[i] === 0x00 && this.bytes[i + 1] === 0x00 && this.bytes[i + 2] === 0x01) {
        this.index = i + 4 << 3;
        return this.bytes[i + 3];
      }
    }
    this.index = this.byteLength << 3;
    return -1;
  };
  _proto.findStartCode = function findStartCode(code) {
    var current = this.findNextStartCode();
    if (current === code || current === -1) {
      return current;
    }
    return -1;
  };
  _proto.nextBytesAreStartCode = function nextBytesAreStartCode() {
    var i = this.index + 7 >> 3;
    return i >= this.byteLength || this.bytes[i] === 0x00 && this.bytes[i + 1] === 0x00 && this.bytes[i + 2] === 0x01;
  };
  _proto.peek = function peek(count) {
    var offset = this.index;
    var value = 0;
    while (count) {
      var currentByte = this.bytes[offset >> 3];
      var remaining = 8 - (offset & 7); // remaining bits in byte
      var read = remaining < count ? remaining : count; // bits in this run
      var shift = remaining - read;
      var mask = 0xff >> 8 - read;
      value = value << read | (currentByte & mask << shift) >> shift;
      offset += read;
      count -= read;
    }
    return value;
  };
  _proto.read = function read(count) {
    var value = this.peek(count);
    this.index += count;
    return value;
  };
  _proto.skip = function skip(count) {
    // eslint-disable-next-line no-return-assign
    return this.index += count;
  };
  _proto.rewind = function rewind(count) {
    this.index = Math.max(this.index - count, 0);
  };
  _proto.has = function has(count) {
    return (this.byteLength << 3) - this.index >= count;
  };
  return BitBuffer;
}();
BitBuffer.MODE = {
  EVICT: 1,
  EXPAND: 2
};

var TS = /*#__PURE__*/function () {
  function TS() {
    this.bits = null;
    this.leftoverBytes = null;
    this.guessVideoFrameEnd = true;
    this.pidsToStreamIds = {};
    this.pesPacketInfo = {};
    this.startTime = 0;
    this.currentTime = 0;
  }
  var _proto = TS.prototype;
  _proto.connect = function connect(streamId, destination) {
    this.pesPacketInfo[streamId] = {
      destination: destination,
      currentLength: 0,
      totalLength: 0,
      pts: 0,
      buffers: []
    };
  };
  _proto.write = function write(buffer) {
    if (this.leftoverBytes) {
      var totalLength = buffer.byteLength + this.leftoverBytes.byteLength;
      this.bits = new BitBuffer(totalLength);
      this.bits.write([this.leftoverBytes, buffer]);
    } else {
      this.bits = new BitBuffer(buffer);
    }

    // eslint-disable-next-line no-empty
    while (this.bits.has(188 << 3) && this.parsePacket()) {}
    var leftoverCount = this.bits.byteLength - (this.bits.index >> 3);
    this.leftoverBytes = leftoverCount > 0 ? this.bits.bytes.subarray(this.bits.index >> 3) : null;
  };
  _proto.parsePacket = function parsePacket() {
    // Check if we're in sync with packet boundaries; attempt to resync if not.
    if (this.bits.read(8) !== 0x47) {
      if (!this.resync()) {
        // Couldn't resync; maybe next time...
        return false;
      }
    }
    var end = (this.bits.index >> 3) + 187;
    // eslint-disable-next-line no-unused-vars
    this.bits.read(1);
    var payloadStart = this.bits.read(1);
    // eslint-disable-next-line no-unused-vars
    this.bits.read(1);
    var pid = this.bits.read(13);
    // eslint-disable-next-line no-unused-vars
    this.bits.read(2);
    var adaptationField = this.bits.read(2);
    // eslint-disable-next-line no-unused-vars
    this.bits.read(4);

    // If this is the start of a new payload; signal the end of the previous
    // frame, if we didn't do so already.
    var streamId = this.pidsToStreamIds[pid];
    if (payloadStart && streamId) {
      var pi = this.pesPacketInfo[streamId];
      if (pi && pi.currentLength) {
        this.packetComplete(pi);
      }
    }

    // Extract current payload
    if (adaptationField & 0x1) {
      if (adaptationField & 0x2) {
        var adaptationFieldLength = this.bits.read(8);
        this.bits.skip(adaptationFieldLength << 3);
      }
      if (payloadStart && this.bits.nextBytesAreStartCode()) {
        this.bits.skip(24);
        streamId = this.bits.read(8);
        this.pidsToStreamIds[pid] = streamId;
        var packetLength = this.bits.read(16);
        this.bits.skip(8);
        var ptsDtsFlag = this.bits.read(2);
        this.bits.skip(6);
        var headerLength = this.bits.read(8);
        var payloadBeginIndex = this.bits.index + (headerLength << 3);
        var _pi = this.pesPacketInfo[streamId];
        if (_pi) {
          var pts = 0;
          if (ptsDtsFlag & 0x2) {
            // The Presentation Timestamp is encoded as 33(!) bit
            // integer, but has a "marker bit" inserted at weird places
            // in between, making the whole thing 5 bytes in size.
            // You can't make this shit up...
            this.bits.skip(4);
            var p32_30 = this.bits.read(3);
            this.bits.skip(1);
            var p29_15 = this.bits.read(15);
            this.bits.skip(1);
            var p14_0 = this.bits.read(15);
            this.bits.skip(1);

            // Can't use bit shifts here; we need 33 bits of precision,
            // so we're using JavaScript's double number type. Also
            // divide by the 90khz clock to get the pts in seconds.
            pts = (p32_30 * 1073741824 + p29_15 * 32768 + p14_0) / 90000;
            this.currentTime = pts;
            if (this.startTime === -1) {
              this.startTime = pts;
            }
          }
          var payloadLength = packetLength ? packetLength - headerLength - 3 : 0;
          this.packetStart(_pi, pts, payloadLength);
        }

        // Skip the rest of the header without parsing it
        this.bits.index = payloadBeginIndex;
      }
      if (streamId) {
        // Attempt to detect if the PES packet is complete. For Audio (and
        // other) packets, we received a total packet length with the PES
        // header, so we can check the current length.

        // For Video packets, we have to guess the end by detecting if this
        // TS packet was padded - there's no good reason to pad a TS packet
        // in between, but it might just fit exactly. If this fails, we can
        // only wait for the next PES header for that stream.

        var _pi2 = this.pesPacketInfo[streamId];
        if (_pi2) {
          var start = this.bits.index >> 3;
          var complete = this.packetAddData(_pi2, start, end);
          var hasPadding = !payloadStart && adaptationField & 0x2;
          if (complete || this.guessVideoFrameEnd && hasPadding) {
            this.packetComplete(_pi2);
          }
        }
      }
    }
    this.bits.index = end << 3;
    return true;
  };
  _proto.resync = function resync() {
    // Check if we have enough data to attempt a resync. We need 5 full packets.
    if (!this.bits.has(188 * 6 << 3)) {
      return false;
    }
    var byteIndex = this.bits.index >> 3;

    // Look for the first sync token in the first 187 bytes
    for (var i = 0; i < 187; i++) {
      if (this.bits.bytes[byteIndex + i] === 0x47) {
        // Look for 4 more sync tokens, each 188 bytes appart
        var foundSync = true;
        for (var j = 1; j < 5; j++) {
          if (this.bits.bytes[byteIndex + i + 188 * j] !== 0x47) {
            foundSync = false;
            break;
          }
        }
        if (foundSync) {
          this.bits.index = byteIndex + i + 1 << 3;
          return true;
        }
      }
    }

    // In theory, we shouldn't arrive here. If we do, we had enough data but
    // still didn't find sync - this can only happen if we were fed garbage
    // data. Check your source!
    console.warn('JSMpeg: Possible garbage data. Skipping.');
    this.bits.skip(187 << 3);
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  ;
  _proto.packetStart = function packetStart(pi, pts, payloadLength) {
    pi.totalLength = payloadLength;
    pi.currentLength = 0;
    pi.pts = pts;
  };
  _proto.packetAddData = function packetAddData(pi, start, end) {
    pi.buffers.push(this.bits.bytes.subarray(start, end));
    pi.currentLength += end - start;
    return pi.totalLength !== 0 && pi.currentLength >= pi.totalLength;
  }

  // eslint-disable-next-line class-methods-use-this
  ;
  _proto.packetComplete = function packetComplete(pi) {
    pi.destination.write(pi.pts, pi.buffers);
    pi.totalLength = 0;
    pi.currentLength = 0;
    pi.buffers = [];
  };
  return TS;
}();
TS.STREAM = {
  PACK_HEADER: 0xba,
  SYSTEM_HEADER: 0xbb,
  PROGRAM_MAP: 0xbc,
  PRIVATE_1: 0xbd,
  PADDING: 0xbe,
  PRIVATE_2: 0xbf,
  AUDIO_1: 0xc0,
  VIDEO_1: 0xe0,
  DIRECTORY: 0xff
};

/* eslint class-methods-use-this: ["error", { "exceptMethods": ["destroy"] }] */
var BaseDecoder = /*#__PURE__*/function () {
  function BaseDecoder(options) {
    this.destination = null;
    this.canPlay = false;
    this.collectTimestamps = !options.streaming;
    this.bytesWritten = 0;
    this.timestamps = [];
    this.timestampIndex = 0;
    this.startTime = 0;
    this.decodedTime = 0;
    Object.defineProperty(this, 'currentTime', {
      get: this.getCurrentTime
    });
  }
  var _proto = BaseDecoder.prototype;
  _proto.destroy = function destroy() {};
  _proto.connect = function connect(destination) {
    this.destination = destination;
  };
  _proto.bufferGetIndex = function bufferGetIndex() {
    return this.bits.index;
  };
  _proto.bufferSetIndex = function bufferSetIndex(index) {
    this.bits.index = index;
  };
  _proto.bufferWrite = function bufferWrite(buffers) {
    return this.bits.write(buffers);
  };
  _proto.write = function write(pts, buffers) {
    if (this.collectTimestamps) {
      if (this.timestamps.length === 0) {
        this.startTime = pts;
        this.decodedTime = pts;
      }
      this.timestamps.push({
        index: this.bytesWritten << 3,
        time: pts
      });
    }
    this.bytesWritten += this.bufferWrite(buffers);
    this.canPlay = true;
  };
  _proto.seek = function seek(time) {
    if (!this.collectTimestamps) {
      return;
    }
    this.timestampIndex = 0;
    for (var i = 0; i < this.timestamps.length; i++) {
      if (this.timestamps[i].time > time) {
        break;
      }
      this.timestampIndex = i;
    }
    var ts = this.timestamps[this.timestampIndex];
    if (ts) {
      this.bufferSetIndex(ts.index);
      this.decodedTime = ts.time;
    } else {
      this.bufferSetIndex(0);
      this.decodedTime = this.startTime;
    }
  };
  _proto.decode = function decode() {
    this.advanceDecodedTime(0);
  };
  _proto.advanceDecodedTime = function advanceDecodedTime(seconds) {
    if (this.collectTimestamps) {
      var newTimestampIndex = -1;
      var currentIndex = this.bufferGetIndex();
      for (var i = this.timestampIndex; i < this.timestamps.length; i++) {
        if (this.timestamps[i].index > currentIndex) {
          break;
        }
        newTimestampIndex = i;
      }

      // Did we find a new PTS, different from the last? If so, we don't have
      // to advance the decoded time manually and can instead sync it exactly
      // to the PTS.
      if (newTimestampIndex !== -1 && newTimestampIndex !== this.timestampIndex) {
        this.timestampIndex = newTimestampIndex;
        this.decodedTime = this.timestamps[this.timestampIndex].time;
        return;
      }
    }
    this.decodedTime += seconds;
  };
  _proto.getCurrentTime = function getCurrentTime() {
    return this.decodedTime;
  };
  return BaseDecoder;
}();

var MPEG1 = /*#__PURE__*/function (_BaseDecoder) {
  function MPEG1(options) {
    var _this;
    _this = _BaseDecoder.call(this, options) || this;
    _this.onDecodeCallback = options.onVideoDecode;
    var bufferSize = options.videoBufferSize || 512 * 1024;
    var bufferMode = options.streaming ? BitBuffer.MODE.EVICT : BitBuffer.MODE.EXPAND;
    _this.bits = new BitBuffer(bufferSize, bufferMode);
    _this.customIntraQuantMatrix = new Uint8Array(64);
    _this.customNonIntraQuantMatrix = new Uint8Array(64);
    _this.blockData = new Int32Array(64);
    _this.currentFrame = 0;
    _this.decodeFirstFrame = options.decodeFirstFrame !== false;
    return _this;
  }

  // eslint-disable-next-line consistent-return
  _inheritsLoose(MPEG1, _BaseDecoder);
  var _proto = MPEG1.prototype;
  _proto.write = function write(pts, buffers) {
    BaseDecoder.prototype.write.call(this, pts, buffers);
    if (!this.hasSequenceHeader) {
      if (this.bits.findStartCode(MPEG1.START.SEQUENCE) === -1) {
        return false;
      }
      this.decodeSequenceHeader();
      if (this.decodeFirstFrame) {
        this.decode();
      }
    }
  };
  _proto.decode = function decode() {
    var startTime = Now();
    if (!this.hasSequenceHeader) {
      return false;
    }
    if (this.bits.findStartCode(MPEG1.START.PICTURE) === -1) {
      return false;
    }
    this.decodePicture();
    this.advanceDecodedTime(1 / this.frameRate);
    var elapsedTime = Now() - startTime;
    if (this.onDecodeCallback) {
      this.onDecodeCallback(this, elapsedTime);
    }
    return true;
  };
  _proto.readHuffman = function readHuffman(codeTable) {
    var state = 0;
    do {
      state = codeTable[state + this.bits.read(1)];
    } while (state >= 0 && codeTable[state] !== 0);
    return codeTable[state + 2];
  };
  _proto.decodeSequenceHeader = function decodeSequenceHeader() {
    var newWidth = this.bits.read(12);
    var newHeight = this.bits.read(12);

    // skip pixel aspect ratio
    this.bits.skip(4);
    this.frameRate = MPEG1.PICTURE_RATE[this.bits.read(4)];

    // skip bitRate, marker, bufferSize and constrained bit
    this.bits.skip(18 + 1 + 10 + 1);
    if (newWidth !== this.width || newHeight !== this.height) {
      this.width = newWidth;
      this.height = newHeight;
      this.initBuffers();
      if (this.destination) {
        this.destination.resize(newWidth, newHeight);
      }
    }
    if (this.bits.read(1)) {
      // load custom intra quant matrix?
      for (var i = 0; i < 64; i++) {
        this.customIntraQuantMatrix[MPEG1.ZIG_ZAG[i]] = this.bits.read(8);
      }
      this.intraQuantMatrix = this.customIntraQuantMatrix;
    }
    if (this.bits.read(1)) {
      // load custom non intra quant matrix?
      for (var _i = 0; _i < 64; _i++) {
        var idx = MPEG1.ZIG_ZAG[_i];
        this.customNonIntraQuantMatrix[idx] = this.bits.read(8);
      }
      this.nonIntraQuantMatrix = this.customNonIntraQuantMatrix;
    }
    this.hasSequenceHeader = true;
  };
  _proto.initBuffers = function initBuffers() {
    this.intraQuantMatrix = MPEG1.DEFAULT_INTRA_QUANT_MATRIX;
    this.nonIntraQuantMatrix = MPEG1.DEFAULT_NON_INTRA_QUANT_MATRIX;
    this.mbWidth = this.width + 15 >> 4;
    this.mbHeight = this.height + 15 >> 4;
    this.mbSize = this.mbWidth * this.mbHeight;
    this.codedWidth = this.mbWidth << 4;
    this.codedHeight = this.mbHeight << 4;
    this.codedSize = this.codedWidth * this.codedHeight;
    this.halfWidth = this.mbWidth << 3;
    this.halfHeight = this.mbHeight << 3;

    // Allocated buffers and resize the canvas
    this.currentY = new Uint8ClampedArray(this.codedSize);
    this.currentY32 = new Uint32Array(this.currentY.buffer);
    this.currentCr = new Uint8ClampedArray(this.codedSize >> 2);
    this.currentCr32 = new Uint32Array(this.currentCr.buffer);
    this.currentCb = new Uint8ClampedArray(this.codedSize >> 2);
    this.currentCb32 = new Uint32Array(this.currentCb.buffer);
    this.forwardY = new Uint8ClampedArray(this.codedSize);
    this.forwardY32 = new Uint32Array(this.forwardY.buffer);
    this.forwardCr = new Uint8ClampedArray(this.codedSize >> 2);
    this.forwardCr32 = new Uint32Array(this.forwardCr.buffer);
    this.forwardCb = new Uint8ClampedArray(this.codedSize >> 2);
    this.forwardCb32 = new Uint32Array(this.forwardCb.buffer);
  };
  _proto.decodePicture = function decodePicture() {
    this.currentFrame++;
    this.bits.skip(10); // skip temporalReference
    this.pictureType = this.bits.read(3);
    this.bits.skip(16); // skip vbv_delay

    // Skip B and D frames or unknown coding type
    if (this.pictureType <= 0 || this.pictureType >= MPEG1.PICTURE_TYPE.B) {
      return;
    }

    // full_pel_forward, forward_f_code
    if (this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE) {
      this.fullPelForward = this.bits.read(1);
      this.forwardFCode = this.bits.read(3);
      if (this.forwardFCode === 0) {
        // Ignore picture with zero forward_f_code
        return;
      }
      this.forwardRSize = this.forwardFCode - 1;
      this.forwardF = 1 << this.forwardRSize;
    }
    var code = 0;
    do {
      code = this.bits.findNextStartCode();
    } while (code === MPEG1.START.EXTENSION || code === MPEG1.START.USER_DATA);
    while (code >= MPEG1.START.SLICE_FIRST && code <= MPEG1.START.SLICE_LAST) {
      this.decodeSlice(code & 0x000000ff);
      code = this.bits.findNextStartCode();
    }
    if (code !== -1) {
      // We found the next start code; rewind 32bits and let the main loop
      // handle it.
      this.bits.rewind(32);
    }

    // Invoke decode callbacks
    if (this.destination) {
      this.destination.render(this.currentY, this.currentCr, this.currentCb, true);
    }

    // If this is a reference picutre then rotate the prediction pointers
    if (this.pictureType === MPEG1.PICTURE_TYPE.INTRA || this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE) {
      var tmpY = this.forwardY;
      var tmpY32 = this.forwardY32;
      var tmpCr = this.forwardCr;
      var tmpCr32 = this.forwardCr32;
      var tmpCb = this.forwardCb;
      var tmpCb32 = this.forwardCb32;
      this.forwardY = this.currentY;
      this.forwardY32 = this.currentY32;
      this.forwardCr = this.currentCr;
      this.forwardCr32 = this.currentCr32;
      this.forwardCb = this.currentCb;
      this.forwardCb32 = this.currentCb32;
      this.currentY = tmpY;
      this.currentY32 = tmpY32;
      this.currentCr = tmpCr;
      this.currentCr32 = tmpCr32;
      this.currentCb = tmpCb;
      this.currentCb32 = tmpCb32;
    }
  };
  _proto.decodeSlice = function decodeSlice(slice) {
    this.sliceBegin = true;
    this.macroblockAddress = (slice - 1) * this.mbWidth - 1;

    // Reset motion vectors and DC predictors
    this.motionFwH = this.motionFwHPrev = 0;
    this.motionFwV = this.motionFwVPrev = 0;
    this.dcPredictorY = 128;
    this.dcPredictorCr = 128;
    this.dcPredictorCb = 128;
    this.quantizerScale = this.bits.read(5);

    // skip extra bits
    while (this.bits.read(1)) {
      this.bits.skip(8);
    }
    do {
      this.decodeMacroblock();
    } while (!this.bits.nextBytesAreStartCode());
  };
  _proto.decodeMacroblock = function decodeMacroblock() {
    // Decode macroblock_address_increment
    var increment = 0;
    var t = this.readHuffman(MPEG1.MACROBLOCK_ADDRESS_INCREMENT);
    while (t === 34) {
      // macroblock_stuffing
      t = this.readHuffman(MPEG1.MACROBLOCK_ADDRESS_INCREMENT);
    }
    while (t === 35) {
      // macroblock_escape
      increment += 33;
      t = this.readHuffman(MPEG1.MACROBLOCK_ADDRESS_INCREMENT);
    }
    increment += t;

    // Process any skipped macroblocks
    if (this.sliceBegin) {
      // The first macroblock_address_increment of each slice is relative
      // to beginning of the preverious row, not the preverious macroblock
      this.sliceBegin = false;
      this.macroblockAddress += increment;
    } else {
      if (this.macroblockAddress + increment >= this.mbSize) {
        // Illegal (too large) macroblock_address_increment
        return;
      }
      if (increment > 1) {
        // Skipped macroblocks reset DC predictors
        this.dcPredictorY = 128;
        this.dcPredictorCr = 128;
        this.dcPredictorCb = 128;

        // Skipped macroblocks in P-pictures reset motion vectors
        if (this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE) {
          this.motionFwH = this.motionFwHPrev = 0;
          this.motionFwV = this.motionFwVPrev = 0;
        }
      }

      // Predict skipped macroblocks
      while (increment > 1) {
        this.macroblockAddress++;
        this.mbRow = this.macroblockAddress / this.mbWidth | 0;
        this.mbCol = this.macroblockAddress % this.mbWidth;
        this.copyMacroblock(this.motionFwH, this.motionFwV, this.forwardY, this.forwardCr, this.forwardCb);
        increment--;
      }
      this.macroblockAddress++;
    }
    this.mbRow = this.macroblockAddress / this.mbWidth | 0;
    this.mbCol = this.macroblockAddress % this.mbWidth;

    // Process the current macroblock
    var mbTable = MPEG1.MACROBLOCK_TYPE[this.pictureType];
    this.macroblockType = this.readHuffman(mbTable);
    this.macroblockIntra = this.macroblockType & 0x01;
    this.macroblockMotFw = this.macroblockType & 0x08;

    // Quantizer scale
    if ((this.macroblockType & 0x10) !== 0) {
      this.quantizerScale = this.bits.read(5);
    }
    if (this.macroblockIntra) {
      // Intra-coded macroblocks reset motion vectors
      this.motionFwH = this.motionFwHPrev = 0;
      this.motionFwV = this.motionFwVPrev = 0;
    } else {
      // Non-intra macroblocks reset DC predictors
      this.dcPredictorY = 128;
      this.dcPredictorCr = 128;
      this.dcPredictorCb = 128;
      this.decodeMotionVectors();
      this.copyMacroblock(this.motionFwH, this.motionFwV, this.forwardY, this.forwardCr, this.forwardCb);
    }

    // Decode blocks
    // eslint-disable-next-line no-nested-ternary
    var cbp = (this.macroblockType & 0x02) !== 0 ? this.readHuffman(MPEG1.CODE_BLOCK_PATTERN) : this.macroblockIntra ? 0x3f : 0;
    for (var block = 0, mask = 0x20; block < 6; block++) {
      if ((cbp & mask) !== 0) {
        this.decodeBlock(block);
      }
      mask >>= 1;
    }
  };
  _proto.decodeMotionVectors = function decodeMotionVectors() {
    var code;
    var d;
    var r = 0;

    // Forward
    if (this.macroblockMotFw) {
      // Horizontal forward
      code = this.readHuffman(MPEG1.MOTION);
      if (code !== 0 && this.forwardF !== 1) {
        r = this.bits.read(this.forwardRSize);
        d = (Math.abs(code) - 1 << this.forwardRSize) + r + 1;
        if (code < 0) {
          d = -d;
        }
      } else {
        d = code;
      }
      this.motionFwHPrev += d;
      if (this.motionFwHPrev > (this.forwardF << 4) - 1) {
        this.motionFwHPrev -= this.forwardF << 5;
      } else if (this.motionFwHPrev < -this.forwardF << 4) {
        this.motionFwHPrev += this.forwardF << 5;
      }
      this.motionFwH = this.motionFwHPrev;
      if (this.fullPelForward) {
        this.motionFwH <<= 1;
      }

      // Vertical forward
      code = this.readHuffman(MPEG1.MOTION);
      if (code !== 0 && this.forwardF !== 1) {
        r = this.bits.read(this.forwardRSize);
        d = (Math.abs(code) - 1 << this.forwardRSize) + r + 1;
        if (code < 0) {
          d = -d;
        }
      } else {
        d = code;
      }
      this.motionFwVPrev += d;
      if (this.motionFwVPrev > (this.forwardF << 4) - 1) {
        this.motionFwVPrev -= this.forwardF << 5;
      } else if (this.motionFwVPrev < -this.forwardF << 4) {
        this.motionFwVPrev += this.forwardF << 5;
      }
      this.motionFwV = this.motionFwVPrev;
      if (this.fullPelForward) {
        this.motionFwV <<= 1;
      }
    } else if (this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE) {
      // No motion information in P-picture, reset vectors
      this.motionFwH = this.motionFwHPrev = 0;
      this.motionFwV = this.motionFwVPrev = 0;
    }
  };
  _proto.copyMacroblock = function copyMacroblock(motionH, motionV, sY, sCr, sCb) {
    var width;
    var scan;
    var H;
    var V;
    var oddH;
    var oddV;
    var src;
    var dest;
    var last;

    // We use 32bit writes here
    var dY = this.currentY32;
    var dCb = this.currentCb32;
    var dCr = this.currentCr32;

    // Luminance
    width = this.codedWidth;
    scan = width - 16;
    H = motionH >> 1;
    V = motionV >> 1;
    oddH = (motionH & 1) === 1;
    oddV = (motionV & 1) === 1;
    src = ((this.mbRow << 4) + V) * width + (this.mbCol << 4) + H;
    dest = this.mbRow * width + this.mbCol << 2;
    last = dest + (width << 2);
    var x;
    var y1;
    var y2;
    var y;
    if (oddH) {
      if (oddV) {
        while (dest < last) {
          y1 = sY[src] + sY[src + width];
          src++;
          for (x = 0; x < 4; x++) {
            y2 = sY[src] + sY[src + width];
            src++;
            y = y1 + y2 + 2 >> 2 & 0xff;
            y1 = sY[src] + sY[src + width];
            src++;
            y |= y1 + y2 + 2 << 6 & 0xff00;
            y2 = sY[src] + sY[src + width];
            src++;
            y |= y1 + y2 + 2 << 14 & 0xff0000;
            y1 = sY[src] + sY[src + width];
            src++;
            y |= y1 + y2 + 2 << 22 & 0xff000000;
            dY[dest++] = y;
          }
          dest += scan >> 2;
          src += scan - 1;
        }
      } else {
        while (dest < last) {
          y1 = sY[src++];
          for (x = 0; x < 4; x++) {
            y2 = sY[src++];
            y = y1 + y2 + 1 >> 1 & 0xff;
            y1 = sY[src++];
            y |= y1 + y2 + 1 << 7 & 0xff00;
            y2 = sY[src++];
            y |= y1 + y2 + 1 << 15 & 0xff0000;
            y1 = sY[src++];
            y |= y1 + y2 + 1 << 23 & 0xff000000;
            dY[dest++] = y;
          }
          dest += scan >> 2;
          src += scan - 1;
        }
      }
    } else if (oddV) {
      while (dest < last) {
        for (x = 0; x < 4; x++) {
          y = sY[src] + sY[src + width] + 1 >> 1 & 0xff;
          src++;
          y |= sY[src] + sY[src + width] + 1 << 7 & 0xff00;
          src++;
          y |= sY[src] + sY[src + width] + 1 << 15 & 0xff0000;
          src++;
          y |= sY[src] + sY[src + width] + 1 << 23 & 0xff000000;
          src++;
          dY[dest++] = y;
        }
        dest += scan >> 2;
        src += scan;
      }
    } else {
      while (dest < last) {
        for (x = 0; x < 4; x++) {
          y = sY[src];
          src++;
          y |= sY[src] << 8;
          src++;
          y |= sY[src] << 16;
          src++;
          y |= sY[src] << 24;
          src++;
          dY[dest++] = y;
        }
        dest += scan >> 2;
        src += scan;
      }
    }

    // Chrominance

    width = this.halfWidth;
    scan = width - 8;
    H = motionH / 2 >> 1;
    V = motionV / 2 >> 1;
    oddH = (motionH / 2 & 1) === 1;
    oddV = (motionV / 2 & 1) === 1;
    src = ((this.mbRow << 3) + V) * width + (this.mbCol << 3) + H;
    dest = this.mbRow * width + this.mbCol << 1;
    last = dest + (width << 1);
    var cr1;
    var cr2;
    var cr;
    var cb1;
    var cb2;
    var cb;
    if (oddH) {
      if (oddV) {
        while (dest < last) {
          cr1 = sCr[src] + sCr[src + width];
          cb1 = sCb[src] + sCb[src + width];
          src++;
          for (x = 0; x < 2; x++) {
            cr2 = sCr[src] + sCr[src + width];
            cb2 = sCb[src] + sCb[src + width];
            src++;
            cr = cr1 + cr2 + 2 >> 2 & 0xff;
            cb = cb1 + cb2 + 2 >> 2 & 0xff;
            cr1 = sCr[src] + sCr[src + width];
            cb1 = sCb[src] + sCb[src + width];
            src++;
            cr |= cr1 + cr2 + 2 << 6 & 0xff00;
            cb |= cb1 + cb2 + 2 << 6 & 0xff00;
            cr2 = sCr[src] + sCr[src + width];
            cb2 = sCb[src] + sCb[src + width];
            src++;
            cr |= cr1 + cr2 + 2 << 14 & 0xff0000;
            cb |= cb1 + cb2 + 2 << 14 & 0xff0000;
            cr1 = sCr[src] + sCr[src + width];
            cb1 = sCb[src] + sCb[src + width];
            src++;
            cr |= cr1 + cr2 + 2 << 22 & 0xff000000;
            cb |= cb1 + cb2 + 2 << 22 & 0xff000000;
            dCr[dest] = cr;
            dCb[dest] = cb;
            dest++;
          }
          dest += scan >> 2;
          src += scan - 1;
        }
      } else {
        while (dest < last) {
          cr1 = sCr[src];
          cb1 = sCb[src];
          src++;
          for (x = 0; x < 2; x++) {
            cr2 = sCr[src];
            cb2 = sCb[src++];
            cr = cr1 + cr2 + 1 >> 1 & 0xff;
            cb = cb1 + cb2 + 1 >> 1 & 0xff;
            cr1 = sCr[src];
            cb1 = sCb[src++];
            cr |= cr1 + cr2 + 1 << 7 & 0xff00;
            cb |= cb1 + cb2 + 1 << 7 & 0xff00;
            cr2 = sCr[src];
            cb2 = sCb[src++];
            cr |= cr1 + cr2 + 1 << 15 & 0xff0000;
            cb |= cb1 + cb2 + 1 << 15 & 0xff0000;
            cr1 = sCr[src];
            cb1 = sCb[src++];
            cr |= cr1 + cr2 + 1 << 23 & 0xff000000;
            cb |= cb1 + cb2 + 1 << 23 & 0xff000000;
            dCr[dest] = cr;
            dCb[dest] = cb;
            dest++;
          }
          dest += scan >> 2;
          src += scan - 1;
        }
      }
    } else if (oddV) {
      while (dest < last) {
        for (x = 0; x < 2; x++) {
          cr = sCr[src] + sCr[src + width] + 1 >> 1 & 0xff;
          cb = sCb[src] + sCb[src + width] + 1 >> 1 & 0xff;
          src++;
          cr |= sCr[src] + sCr[src + width] + 1 << 7 & 0xff00;
          cb |= sCb[src] + sCb[src + width] + 1 << 7 & 0xff00;
          src++;
          cr |= sCr[src] + sCr[src + width] + 1 << 15 & 0xff0000;
          cb |= sCb[src] + sCb[src + width] + 1 << 15 & 0xff0000;
          src++;
          cr |= sCr[src] + sCr[src + width] + 1 << 23 & 0xff000000;
          cb |= sCb[src] + sCb[src + width] + 1 << 23 & 0xff000000;
          src++;
          dCr[dest] = cr;
          dCb[dest] = cb;
          dest++;
        }
        dest += scan >> 2;
        src += scan;
      }
    } else {
      while (dest < last) {
        for (x = 0; x < 2; x++) {
          cr = sCr[src];
          cb = sCb[src];
          src++;
          cr |= sCr[src] << 8;
          cb |= sCb[src] << 8;
          src++;
          cr |= sCr[src] << 16;
          cb |= sCb[src] << 16;
          src++;
          cr |= sCr[src] << 24;
          cb |= sCb[src] << 24;
          src++;
          dCr[dest] = cr;
          dCb[dest] = cb;
          dest++;
        }
        dest += scan >> 2;
        src += scan;
      }
    }
  };
  _proto.decodeBlock = function decodeBlock(block) {
    var n = 0;
    var quantMatrix;

    // Decode DC coefficient of intra-coded blocks
    if (this.macroblockIntra) {
      var predictor;
      var dctSize;

      // DC prediction

      if (block < 4) {
        predictor = this.dcPredictorY;
        dctSize = this.readHuffman(MPEG1.DCT_DC_SIZE_LUMINANCE);
      } else {
        predictor = block === 4 ? this.dcPredictorCr : this.dcPredictorCb;
        dctSize = this.readHuffman(MPEG1.DCT_DC_SIZE_CHROMINANCE);
      }

      // Read DC coeff
      if (dctSize > 0) {
        var differential = this.bits.read(dctSize);
        if ((differential & 1 << dctSize - 1) !== 0) {
          this.blockData[0] = predictor + differential;
        } else {
          this.blockData[0] = predictor + (-1 << dctSize | differential + 1);
        }
      } else {
        this.blockData[0] = predictor;
      }

      // Save predictor value
      if (block < 4) {
        // eslint-disable-next-line prefer-destructuring
        this.dcPredictorY = this.blockData[0];
      } else if (block === 4) {
        // eslint-disable-next-line prefer-destructuring
        this.dcPredictorCr = this.blockData[0];
      } else {
        // eslint-disable-next-line prefer-destructuring
        this.dcPredictorCb = this.blockData[0];
      }

      // Dequantize + premultiply
      this.blockData[0] <<= 3 + 5;
      quantMatrix = this.intraQuantMatrix;
      n = 1;
    } else {
      quantMatrix = this.nonIntraQuantMatrix;
    }

    // Decode AC coefficients (+DC for non-intra)
    var level = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      var run = 0;
      var coeff = this.readHuffman(MPEG1.DCT_COEFF);
      if (coeff === 0x0001 && n > 0 && this.bits.read(1) === 0) {
        // end_of_block
        break;
      }
      if (coeff === 0xffff) {
        // escape
        run = this.bits.read(6);
        level = this.bits.read(8);
        if (level === 0) {
          level = this.bits.read(8);
        } else if (level === 128) {
          level = this.bits.read(8) - 256;
        } else if (level > 128) {
          level -= 256;
        }
      } else {
        run = coeff >> 8;
        level = coeff & 0xff;
        if (this.bits.read(1)) {
          level = -level;
        }
      }
      n += run;
      var dezigZagged = MPEG1.ZIG_ZAG[n];
      n++;

      // Dequantize, oddify, clip
      level <<= 1;
      if (!this.macroblockIntra) {
        level += level < 0 ? -1 : 1;
      }
      level = level * this.quantizerScale * quantMatrix[dezigZagged] >> 4;
      if ((level & 1) === 0) {
        level -= level > 0 ? 1 : -1;
      }
      if (level > 2047) {
        level = 2047;
      } else if (level < -2048) {
        level = -2048;
      }

      // Save premultiplied coefficient
      this.blockData[dezigZagged] = level * MPEG1.PREMULTIPLIER_MATRIX[dezigZagged];
    }

    // Move block to its place
    var destArray;
    var destIndex;
    var scan;
    if (block < 4) {
      destArray = this.currentY;
      scan = this.codedWidth - 8;
      destIndex = this.mbRow * this.codedWidth + this.mbCol << 4;
      if ((block & 1) !== 0) {
        destIndex += 8;
      }
      if ((block & 2) !== 0) {
        destIndex += this.codedWidth << 3;
      }
    } else {
      destArray = block === 4 ? this.currentCb : this.currentCr;
      scan = (this.codedWidth >> 1) - 8;
      destIndex = (this.mbRow * this.codedWidth << 2) + (this.mbCol << 3);
    }
    if (this.macroblockIntra) {
      // Overwrite (no prediction)
      if (n === 1) {
        MPEG1.CopyValueToDestination(this.blockData[0] + 128 >> 8, destArray, destIndex, scan);
        this.blockData[0] = 0;
      } else {
        MPEG1.IDCT(this.blockData);
        MPEG1.CopyBlockToDestination(this.blockData, destArray, destIndex, scan);
        Fill(this.blockData, 0);
      }
    } else {
      // Add data to the predicted macroblock
      // eslint-disable-next-line no-lonely-if
      if (n === 1) {
        MPEG1.AddValueToDestination(this.blockData[0] + 128 >> 8, destArray, destIndex, scan);
        this.blockData[0] = 0;
      } else {
        MPEG1.IDCT(this.blockData);
        MPEG1.AddBlockToDestination(this.blockData, destArray, destIndex, scan);
        Fill(this.blockData, 0);
      }
    }
    n = 0;
  };
  MPEG1.CopyBlockToDestination = function CopyBlockToDestination(block, dest, index, scan) {
    for (var n = 0; n < 64; n += 8, index += scan + 8) {
      dest[index + 0] = block[n + 0];
      dest[index + 1] = block[n + 1];
      dest[index + 2] = block[n + 2];
      dest[index + 3] = block[n + 3];
      dest[index + 4] = block[n + 4];
      dest[index + 5] = block[n + 5];
      dest[index + 6] = block[n + 6];
      dest[index + 7] = block[n + 7];
    }
  };
  MPEG1.AddBlockToDestination = function AddBlockToDestination(block, dest, index, scan) {
    for (var n = 0; n < 64; n += 8, index += scan + 8) {
      dest[index + 0] += block[n + 0];
      dest[index + 1] += block[n + 1];
      dest[index + 2] += block[n + 2];
      dest[index + 3] += block[n + 3];
      dest[index + 4] += block[n + 4];
      dest[index + 5] += block[n + 5];
      dest[index + 6] += block[n + 6];
      dest[index + 7] += block[n + 7];
    }
  };
  MPEG1.CopyValueToDestination = function CopyValueToDestination(value, dest, index, scan) {
    for (var n = 0; n < 64; n += 8, index += scan + 8) {
      dest[index + 0] = value;
      dest[index + 1] = value;
      dest[index + 2] = value;
      dest[index + 3] = value;
      dest[index + 4] = value;
      dest[index + 5] = value;
      dest[index + 6] = value;
      dest[index + 7] = value;
    }
  };
  MPEG1.AddValueToDestination = function AddValueToDestination(value, dest, index, scan) {
    for (var n = 0; n < 64; n += 8, index += scan + 8) {
      dest[index + 0] += value;
      dest[index + 1] += value;
      dest[index + 2] += value;
      dest[index + 3] += value;
      dest[index + 4] += value;
      dest[index + 5] += value;
      dest[index + 6] += value;
      dest[index + 7] += value;
    }
  };
  MPEG1.IDCT = function IDCT(block) {
    // See http://vsr.informatik.tu-chemnitz.de/~jan/MPEG/HTML/IDCT.html
    // for more info.

    var b1;
    var b3;
    var b4;
    var b6;
    var b7;
    var tmp1;
    var tmp2;
    var m0;
    var x0;
    var x1;
    var x2;
    var x3;
    var x4;
    var y3;
    var y4;
    var y5;
    var y6;
    var y7;

    // Transform columns
    for (var i = 0; i < 8; ++i) {
      b1 = block[4 * 8 + i];
      b3 = block[2 * 8 + i] + block[6 * 8 + i];
      b4 = block[5 * 8 + i] - block[3 * 8 + i];
      tmp1 = block[1 * 8 + i] + block[7 * 8 + i];
      tmp2 = block[3 * 8 + i] + block[5 * 8 + i];
      b6 = block[1 * 8 + i] - block[7 * 8 + i];
      b7 = tmp1 + tmp2;
      m0 = block[0 * 8 + i];
      x4 = (b6 * 473 - b4 * 196 + 128 >> 8) - b7;
      x0 = x4 - ((tmp1 - tmp2) * 362 + 128 >> 8);
      x1 = m0 - b1;
      x2 = ((block[2 * 8 + i] - block[6 * 8 + i]) * 362 + 128 >> 8) - b3;
      x3 = m0 + b1;
      y3 = x1 + x2;
      y4 = x3 + b3;
      y5 = x1 - x2;
      y6 = x3 - b3;
      y7 = -x0 - (b4 * 473 + b6 * 196 + 128 >> 8);
      block[0 * 8 + i] = b7 + y4;
      block[1 * 8 + i] = x4 + y3;
      block[2 * 8 + i] = y5 - x0;
      block[3 * 8 + i] = y6 - y7;
      block[4 * 8 + i] = y6 + y7;
      block[5 * 8 + i] = x0 + y5;
      block[6 * 8 + i] = y3 - x4;
      block[7 * 8 + i] = y4 - b7;
    }

    // Transform rows
    for (var _i2 = 0; _i2 < 64; _i2 += 8) {
      b1 = block[4 + _i2];
      b3 = block[2 + _i2] + block[6 + _i2];
      b4 = block[5 + _i2] - block[3 + _i2];
      tmp1 = block[1 + _i2] + block[7 + _i2];
      tmp2 = block[3 + _i2] + block[5 + _i2];
      b6 = block[1 + _i2] - block[7 + _i2];
      b7 = tmp1 + tmp2;
      m0 = block[0 + _i2];
      x4 = (b6 * 473 - b4 * 196 + 128 >> 8) - b7;
      x0 = x4 - ((tmp1 - tmp2) * 362 + 128 >> 8);
      x1 = m0 - b1;
      x2 = ((block[2 + _i2] - block[6 + _i2]) * 362 + 128 >> 8) - b3;
      x3 = m0 + b1;
      y3 = x1 + x2;
      y4 = x3 + b3;
      y5 = x1 - x2;
      y6 = x3 - b3;
      y7 = -x0 - (b4 * 473 + b6 * 196 + 128 >> 8);
      block[0 + _i2] = b7 + y4 + 128 >> 8;
      block[1 + _i2] = x4 + y3 + 128 >> 8;
      block[2 + _i2] = y5 - x0 + 128 >> 8;
      block[3 + _i2] = y6 - y7 + 128 >> 8;
      block[4 + _i2] = y6 + y7 + 128 >> 8;
      block[5 + _i2] = x0 + y5 + 128 >> 8;
      block[6 + _i2] = y3 - x4 + 128 >> 8;
      block[7 + _i2] = y4 - b7 + 128 >> 8;
    }
  };
  return MPEG1;
}(BaseDecoder); // Sequence Layer
MPEG1.prototype.frameRate = 30;

// Picture Layer
MPEG1.prototype.currentY = null;
MPEG1.prototype.currentCr = null;
MPEG1.prototype.currentCb = null;
MPEG1.prototype.pictureType = 0;

// Buffers for motion compensation
MPEG1.prototype.forwardY = null;
MPEG1.prototype.forwardCr = null;
MPEG1.prototype.forwardCb = null;
MPEG1.prototype.fullPelForward = false;
MPEG1.prototype.forwardFCode = 0;
MPEG1.prototype.forwardRSize = 0;
MPEG1.prototype.forwardF = 0;

// Slice Layer
MPEG1.prototype.quantizerScale = 0;
MPEG1.prototype.sliceBegin = false;

// Macroblock Layer
MPEG1.prototype.macroblockAddress = 0;
MPEG1.prototype.mbRow = 0;
MPEG1.prototype.mbCol = 0;
MPEG1.prototype.macroblockType = 0;
MPEG1.prototype.macroblockIntra = false;
MPEG1.prototype.macroblockMotFw = false;
MPEG1.prototype.motionFwH = 0;
MPEG1.prototype.motionFwV = 0;
MPEG1.prototype.motionFwHPrev = 0;
MPEG1.prototype.motionFwVPrev = 0;

// Block layer
MPEG1.prototype.dcPredictorY = 0;
MPEG1.prototype.dcPredictorCr = 0;
MPEG1.prototype.dcPredictorCb = 0;
MPEG1.prototype.blockData = null;

// VLC Tables and Constants
MPEG1.PICTURE_RATE = [0.0, 23.976, 24.0, 25.0, 29.97, 30.0, 50.0, 59.94, 60.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
MPEG1.ZIG_ZAG = new Uint8Array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63]);
MPEG1.DEFAULT_INTRA_QUANT_MATRIX = new Uint8Array([8, 16, 19, 22, 26, 27, 29, 34, 16, 16, 22, 24, 27, 29, 34, 37, 19, 22, 26, 27, 29, 34, 34, 38, 22, 22, 26, 27, 29, 34, 37, 40, 22, 26, 27, 29, 32, 35, 40, 48, 26, 27, 29, 32, 35, 40, 48, 58, 26, 27, 29, 34, 38, 46, 56, 69, 27, 29, 35, 38, 46, 56, 69, 83]);
MPEG1.DEFAULT_NON_INTRA_QUANT_MATRIX = new Uint8Array([16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16]);
MPEG1.PREMULTIPLIER_MATRIX = new Uint8Array([32, 44, 42, 38, 32, 25, 17, 9, 44, 62, 58, 52, 44, 35, 24, 12, 42, 58, 55, 49, 42, 33, 23, 12, 38, 52, 49, 44, 38, 30, 20, 10, 32, 44, 42, 38, 32, 25, 17, 9, 25, 35, 33, 30, 25, 20, 14, 7, 17, 24, 23, 20, 17, 14, 9, 5, 9, 12, 12, 10, 9, 7, 5, 2]);

// MPEG-1 VLC

//  macroblock_stuffing decodes as 34.
//  macroblock_escape decodes as 35.

MPEG1.MACROBLOCK_ADDRESS_INCREMENT = new Int16Array([1 * 3, 2 * 3, 0,
//   0
3 * 3, 4 * 3, 0,
//   1  0
0, 0, 1,
//   2  1.
5 * 3, 6 * 3, 0,
//   3  00
7 * 3, 8 * 3, 0,
//   4  01
9 * 3, 10 * 3, 0,
//   5  000
11 * 3, 12 * 3, 0,
//   6  001
0, 0, 3,
//   7  010.
0, 0, 2,
//   8  011.
13 * 3, 14 * 3, 0,
//   9  0000
15 * 3, 16 * 3, 0,
//  10  0001
0, 0, 5,
//  11  0010.
0, 0, 4,
//  12  0011.
17 * 3, 18 * 3, 0,
//  13  0000 0
19 * 3, 20 * 3, 0,
//  14  0000 1
0, 0, 7,
//  15  0001 0.
0, 0, 6,
//  16  0001 1.
21 * 3, 22 * 3, 0,
//  17  0000 00
23 * 3, 24 * 3, 0,
//  18  0000 01
25 * 3, 26 * 3, 0,
//  19  0000 10
27 * 3, 28 * 3, 0,
//  20  0000 11
-1, 29 * 3, 0,
//  21  0000 000
-1, 30 * 3, 0,
//  22  0000 001
31 * 3, 32 * 3, 0,
//  23  0000 010
33 * 3, 34 * 3, 0,
//  24  0000 011
35 * 3, 36 * 3, 0,
//  25  0000 100
37 * 3, 38 * 3, 0,
//  26  0000 101
0, 0, 9,
//  27  0000 110.
0, 0, 8,
//  28  0000 111.
39 * 3, 40 * 3, 0,
//  29  0000 0001
41 * 3, 42 * 3, 0,
//  30  0000 0011
43 * 3, 44 * 3, 0,
//  31  0000 0100
45 * 3, 46 * 3, 0,
//  32  0000 0101
0, 0, 15,
//  33  0000 0110.
0, 0, 14,
//  34  0000 0111.
0, 0, 13,
//  35  0000 1000.
0, 0, 12,
//  36  0000 1001.
0, 0, 11,
//  37  0000 1010.
0, 0, 10,
//  38  0000 1011.
47 * 3, -1, 0,
//  39  0000 0001 0
-1, 48 * 3, 0,
//  40  0000 0001 1
49 * 3, 50 * 3, 0,
//  41  0000 0011 0
51 * 3, 52 * 3, 0,
//  42  0000 0011 1
53 * 3, 54 * 3, 0,
//  43  0000 0100 0
55 * 3, 56 * 3, 0,
//  44  0000 0100 1
57 * 3, 58 * 3, 0,
//  45  0000 0101 0
59 * 3, 60 * 3, 0,
//  46  0000 0101 1
61 * 3, -1, 0,
//  47  0000 0001 00
-1, 62 * 3, 0,
//  48  0000 0001 11
63 * 3, 64 * 3, 0,
//  49  0000 0011 00
65 * 3, 66 * 3, 0,
//  50  0000 0011 01
67 * 3, 68 * 3, 0,
//  51  0000 0011 10
69 * 3, 70 * 3, 0,
//  52  0000 0011 11
71 * 3, 72 * 3, 0,
//  53  0000 0100 00
73 * 3, 74 * 3, 0,
//  54  0000 0100 01
0, 0, 21,
//  55  0000 0100 10.
0, 0, 20,
//  56  0000 0100 11.
0, 0, 19,
//  57  0000 0101 00.
0, 0, 18,
//  58  0000 0101 01.
0, 0, 17,
//  59  0000 0101 10.
0, 0, 16,
//  60  0000 0101 11.
0, 0, 35,
//  61  0000 0001 000. -- macroblock_escape
0, 0, 34,
//  62  0000 0001 111. -- macroblock_stuffing
0, 0, 33,
//  63  0000 0011 000.
0, 0, 32,
//  64  0000 0011 001.
0, 0, 31,
//  65  0000 0011 010.
0, 0, 30,
//  66  0000 0011 011.
0, 0, 29,
//  67  0000 0011 100.
0, 0, 28,
//  68  0000 0011 101.
0, 0, 27,
//  69  0000 0011 110.
0, 0, 26,
//  70  0000 0011 111.
0, 0, 25,
//  71  0000 0100 000.
0, 0, 24,
//  72  0000 0100 001.
0, 0, 23,
//  73  0000 0100 010.
0, 0, 22 //  74  0000 0100 011.
]);

//  macroblock_type bitmap:
//    0x10  macroblock_quant
//    0x08  macroblock_motion_forward
//    0x04  macroblock_motion_backward
//    0x02  macrobkock_pattern
//    0x01  macroblock_intra
//

MPEG1.MACROBLOCK_TYPE_INTRA = new Int8Array([1 * 3, 2 * 3, 0,
//   0
-1, 3 * 3, 0,
//   1  0
0, 0, 0x01,
//   2  1.
0, 0, 0x11 //   3  01.
]);
MPEG1.MACROBLOCK_TYPE_PREDICTIVE = new Int8Array([1 * 3, 2 * 3, 0,
//  0
3 * 3, 4 * 3, 0,
//  1  0
0, 0, 0x0a,
//  2  1.
5 * 3, 6 * 3, 0,
//  3  00
0, 0, 0x02,
//  4  01.
7 * 3, 8 * 3, 0,
//  5  000
0, 0, 0x08,
//  6  001.
9 * 3, 10 * 3, 0,
//  7  0000
11 * 3, 12 * 3, 0,
//  8  0001
-1, 13 * 3, 0,
//  9  00000
0, 0, 0x12,
// 10  00001.
0, 0, 0x1a,
// 11  00010.
0, 0, 0x01,
// 12  00011.
0, 0, 0x11 // 13  000001.
]);
MPEG1.MACROBLOCK_TYPE_B = new Int8Array([1 * 3, 2 * 3, 0,
//  0
3 * 3, 5 * 3, 0,
//  1  0
4 * 3, 6 * 3, 0,
//  2  1
8 * 3, 7 * 3, 0,
//  3  00
0, 0, 0x0c,
//  4  10.
9 * 3, 10 * 3, 0,
//  5  01
0, 0, 0x0e,
//  6  11.
13 * 3, 14 * 3, 0,
//  7  001
12 * 3, 11 * 3, 0,
//  8  000
0, 0, 0x04,
//  9  010.
0, 0, 0x06,
// 10  011.
18 * 3, 16 * 3, 0,
// 11  0001
15 * 3, 17 * 3, 0,
// 12  0000
0, 0, 0x08,
// 13  0010.
0, 0, 0x0a,
// 14  0011.
-1, 19 * 3, 0,
// 15  00000
0, 0, 0x01,
// 16  00011.
20 * 3, 21 * 3, 0,
// 17  00001
0, 0, 0x1e,
// 18  00010.
0, 0, 0x11,
// 19  000001.
0, 0, 0x16,
// 20  000010.
0, 0, 0x1a // 21  000011.
]);
MPEG1.MACROBLOCK_TYPE = [null, MPEG1.MACROBLOCK_TYPE_INTRA, MPEG1.MACROBLOCK_TYPE_PREDICTIVE, MPEG1.MACROBLOCK_TYPE_B];
MPEG1.CODE_BLOCK_PATTERN = new Int16Array([2 * 3, 1 * 3, 0,
//   0
3 * 3, 6 * 3, 0,
//   1  1
4 * 3, 5 * 3, 0,
//   2  0
8 * 3, 11 * 3, 0,
//   3  10
12 * 3, 13 * 3, 0,
//   4  00
9 * 3, 7 * 3, 0,
//   5  01
10 * 3, 14 * 3, 0,
//   6  11
20 * 3, 19 * 3, 0,
//   7  011
18 * 3, 16 * 3, 0,
//   8  100
23 * 3, 17 * 3, 0,
//   9  010
27 * 3, 25 * 3, 0,
//  10  110
21 * 3, 28 * 3, 0,
//  11  101
15 * 3, 22 * 3, 0,
//  12  000
24 * 3, 26 * 3, 0,
//  13  001
0, 0, 60,
//  14  111.
35 * 3, 40 * 3, 0,
//  15  0000
44 * 3, 48 * 3, 0,
//  16  1001
38 * 3, 36 * 3, 0,
//  17  0101
42 * 3, 47 * 3, 0,
//  18  1000
29 * 3, 31 * 3, 0,
//  19  0111
39 * 3, 32 * 3, 0,
//  20  0110
0, 0, 32,
//  21  1010.
45 * 3, 46 * 3, 0,
//  22  0001
33 * 3, 41 * 3, 0,
//  23  0100
43 * 3, 34 * 3, 0,
//  24  0010
0, 0, 4,
//  25  1101.
30 * 3, 37 * 3, 0,
//  26  0011
0, 0, 8,
//  27  1100.
0, 0, 16,
//  28  1011.
0, 0, 44,
//  29  0111 0.
50 * 3, 56 * 3, 0,
//  30  0011 0
0, 0, 28,
//  31  0111 1.
0, 0, 52,
//  32  0110 1.
0, 0, 62,
//  33  0100 0.
61 * 3, 59 * 3, 0,
//  34  0010 1
52 * 3, 60 * 3, 0,
//  35  0000 0
0, 0, 1,
//  36  0101 1.
55 * 3, 54 * 3, 0,
//  37  0011 1
0, 0, 61,
//  38  0101 0.
0, 0, 56,
//  39  0110 0.
57 * 3, 58 * 3, 0,
//  40  0000 1
0, 0, 2,
//  41  0100 1.
0, 0, 40,
//  42  1000 0.
51 * 3, 62 * 3, 0,
//  43  0010 0
0, 0, 48,
//  44  1001 0.
64 * 3, 63 * 3, 0,
//  45  0001 0
49 * 3, 53 * 3, 0,
//  46  0001 1
0, 0, 20,
//  47  1000 1.
0, 0, 12,
//  48  1001 1.
80 * 3, 83 * 3, 0,
//  49  0001 10
0, 0, 63,
//  50  0011 00.
77 * 3, 75 * 3, 0,
//  51  0010 00
65 * 3, 73 * 3, 0,
//  52  0000 00
84 * 3, 66 * 3, 0,
//  53  0001 11
0, 0, 24,
//  54  0011 11.
0, 0, 36,
//  55  0011 10.
0, 0, 3,
//  56  0011 01.
69 * 3, 87 * 3, 0,
//  57  0000 10
81 * 3, 79 * 3, 0,
//  58  0000 11
68 * 3, 71 * 3, 0,
//  59  0010 11
70 * 3, 78 * 3, 0,
//  60  0000 01
67 * 3, 76 * 3, 0,
//  61  0010 10
72 * 3, 74 * 3, 0,
//  62  0010 01
86 * 3, 85 * 3, 0,
//  63  0001 01
88 * 3, 82 * 3, 0,
//  64  0001 00
-1, 94 * 3, 0,
//  65  0000 000
95 * 3, 97 * 3, 0,
//  66  0001 111
0, 0, 33,
//  67  0010 100.
0, 0, 9,
//  68  0010 110.
106 * 3, 110 * 3, 0,
//  69  0000 100
102 * 3, 116 * 3, 0,
//  70  0000 010
0, 0, 5,
//  71  0010 111.
0, 0, 10,
//  72  0010 010.
93 * 3, 89 * 3, 0,
//  73  0000 001
0, 0, 6,
//  74  0010 011.
0, 0, 18,
//  75  0010 001.
0, 0, 17,
//  76  0010 101.
0, 0, 34,
//  77  0010 000.
113 * 3, 119 * 3, 0,
//  78  0000 011
103 * 3, 104 * 3, 0,
//  79  0000 111
90 * 3, 92 * 3, 0,
//  80  0001 100
109 * 3, 107 * 3, 0,
//  81  0000 110
117 * 3, 118 * 3, 0,
//  82  0001 001
101 * 3, 99 * 3, 0,
//  83  0001 101
98 * 3, 96 * 3, 0,
//  84  0001 110
100 * 3, 91 * 3, 0,
//  85  0001 011
114 * 3, 115 * 3, 0,
//  86  0001 010
105 * 3, 108 * 3, 0,
//  87  0000 101
112 * 3, 111 * 3, 0,
//  88  0001 000
121 * 3, 125 * 3, 0,
//  89  0000 0011
0, 0, 41,
//  90  0001 1000.
0, 0, 14,
//  91  0001 0111.
0, 0, 21,
//  92  0001 1001.
124 * 3, 122 * 3, 0,
//  93  0000 0010
120 * 3, 123 * 3, 0,
//  94  0000 0001
0, 0, 11,
//  95  0001 1110.
0, 0, 19,
//  96  0001 1101.
0, 0, 7,
//  97  0001 1111.
0, 0, 35,
//  98  0001 1100.
0, 0, 13,
//  99  0001 1011.
0, 0, 50,
// 100  0001 0110.
0, 0, 49,
// 101  0001 1010.
0, 0, 58,
// 102  0000 0100.
0, 0, 37,
// 103  0000 1110.
0, 0, 25,
// 104  0000 1111.
0, 0, 45,
// 105  0000 1010.
0, 0, 57,
// 106  0000 1000.
0, 0, 26,
// 107  0000 1101.
0, 0, 29,
// 108  0000 1011.
0, 0, 38,
// 109  0000 1100.
0, 0, 53,
// 110  0000 1001.
0, 0, 23,
// 111  0001 0001.
0, 0, 43,
// 112  0001 0000.
0, 0, 46,
// 113  0000 0110.
0, 0, 42,
// 114  0001 0100.
0, 0, 22,
// 115  0001 0101.
0, 0, 54,
// 116  0000 0101.
0, 0, 51,
// 117  0001 0010.
0, 0, 15,
// 118  0001 0011.
0, 0, 30,
// 119  0000 0111.
0, 0, 39,
// 120  0000 0001 0.
0, 0, 47,
// 121  0000 0011 0.
0, 0, 55,
// 122  0000 0010 1.
0, 0, 27,
// 123  0000 0001 1.
0, 0, 59,
// 124  0000 0010 0.
0, 0, 31 // 125  0000 0011 1.
]);
MPEG1.MOTION = new Int16Array([1 * 3, 2 * 3, 0,
//   0
4 * 3, 3 * 3, 0,
//   1  0
0, 0, 0,
//   2  1.
6 * 3, 5 * 3, 0,
//   3  01
8 * 3, 7 * 3, 0,
//   4  00
0, 0, -1,
//   5  011.
0, 0, 1,
//   6  010.
9 * 3, 10 * 3, 0,
//   7  001
12 * 3, 11 * 3, 0,
//   8  000
0, 0, 2,
//   9  0010.
0, 0, -2,
//  10  0011.
14 * 3, 15 * 3, 0,
//  11  0001
16 * 3, 13 * 3, 0,
//  12  0000
20 * 3, 18 * 3, 0,
//  13  0000 1
0, 0, 3,
//  14  0001 0.
0, 0, -3,
//  15  0001 1.
17 * 3, 19 * 3, 0,
//  16  0000 0
-1, 23 * 3, 0,
//  17  0000 00
27 * 3, 25 * 3, 0,
//  18  0000 11
26 * 3, 21 * 3, 0,
//  19  0000 01
24 * 3, 22 * 3, 0,
//  20  0000 10
32 * 3, 28 * 3, 0,
//  21  0000 011
29 * 3, 31 * 3, 0,
//  22  0000 101
-1, 33 * 3, 0,
//  23  0000 001
36 * 3, 35 * 3, 0,
//  24  0000 100
0, 0, -4,
//  25  0000 111.
30 * 3, 34 * 3, 0,
//  26  0000 010
0, 0, 4,
//  27  0000 110.
0, 0, -7,
//  28  0000 0111.
0, 0, 5,
//  29  0000 1010.
37 * 3, 41 * 3, 0,
//  30  0000 0100
0, 0, -5,
//  31  0000 1011.
0, 0, 7,
//  32  0000 0110.
38 * 3, 40 * 3, 0,
//  33  0000 0011
42 * 3, 39 * 3, 0,
//  34  0000 0101
0, 0, -6,
//  35  0000 1001.
0, 0, 6,
//  36  0000 1000.
51 * 3, 54 * 3, 0,
//  37  0000 0100 0
50 * 3, 49 * 3, 0,
//  38  0000 0011 0
45 * 3, 46 * 3, 0,
//  39  0000 0101 1
52 * 3, 47 * 3, 0,
//  40  0000 0011 1
43 * 3, 53 * 3, 0,
//  41  0000 0100 1
44 * 3, 48 * 3, 0,
//  42  0000 0101 0
0, 0, 10,
//  43  0000 0100 10.
0, 0, 9,
//  44  0000 0101 00.
0, 0, 8,
//  45  0000 0101 10.
0, 0, -8,
//  46  0000 0101 11.
57 * 3, 66 * 3, 0,
//  47  0000 0011 11
0, 0, -9,
//  48  0000 0101 01.
60 * 3, 64 * 3, 0,
//  49  0000 0011 01
56 * 3, 61 * 3, 0,
//  50  0000 0011 00
55 * 3, 62 * 3, 0,
//  51  0000 0100 00
58 * 3, 63 * 3, 0,
//  52  0000 0011 10
0, 0, -10,
//  53  0000 0100 11.
59 * 3, 65 * 3, 0,
//  54  0000 0100 01
0, 0, 12,
//  55  0000 0100 000.
0, 0, 16,
//  56  0000 0011 000.
0, 0, 13,
//  57  0000 0011 110.
0, 0, 14,
//  58  0000 0011 100.
0, 0, 11,
//  59  0000 0100 010.
0, 0, 15,
//  60  0000 0011 010.
0, 0, -16,
//  61  0000 0011 001.
0, 0, -12,
//  62  0000 0100 001.
0, 0, -14,
//  63  0000 0011 101.
0, 0, -15,
//  64  0000 0011 011.
0, 0, -11,
//  65  0000 0100 011.
0, 0, -13 //  66  0000 0011 111.
]);
MPEG1.DCT_DC_SIZE_LUMINANCE = new Int8Array([2 * 3, 1 * 3, 0,
//   0
6 * 3, 5 * 3, 0,
//   1  1
3 * 3, 4 * 3, 0,
//   2  0
0, 0, 1,
//   3  00.
0, 0, 2,
//   4  01.
9 * 3, 8 * 3, 0,
//   5  11
7 * 3, 10 * 3, 0,
//   6  10
0, 0, 0,
//   7  100.
12 * 3, 11 * 3, 0,
//   8  111
0, 0, 4,
//   9  110.
0, 0, 3,
//  10  101.
13 * 3, 14 * 3, 0,
//  11  1111
0, 0, 5,
//  12  1110.
0, 0, 6,
//  13  1111 0.
16 * 3, 15 * 3, 0,
//  14  1111 1
17 * 3, -1, 0,
//  15  1111 11
0, 0, 7,
//  16  1111 10.
0, 0, 8 //  17  1111 110.
]);
MPEG1.DCT_DC_SIZE_CHROMINANCE = new Int8Array([2 * 3, 1 * 3, 0,
//   0
4 * 3, 3 * 3, 0,
//   1  1
6 * 3, 5 * 3, 0,
//   2  0
8 * 3, 7 * 3, 0,
//   3  11
0, 0, 2,
//   4  10.
0, 0, 1,
//   5  01.
0, 0, 0,
//   6  00.
10 * 3, 9 * 3, 0,
//   7  111
0, 0, 3,
//   8  110.
12 * 3, 11 * 3, 0,
//   9  1111
0, 0, 4,
//  10  1110.
14 * 3, 13 * 3, 0,
//  11  1111 1
0, 0, 5,
//  12  1111 0.
16 * 3, 15 * 3, 0,
//  13  1111 11
0, 0, 6,
//  14  1111 10.
17 * 3, -1, 0,
//  15  1111 111
0, 0, 7,
//  16  1111 110.
0, 0, 8 //  17  1111 1110.
]);

//  dct_coeff bitmap:
//    0xff00  run
//    0x00ff  level

//  Decoded values are unsigned. Sign bit follows in the stream.

//  Interpretation of the value 0x0001
//    for dc_coeff_first:  run=0, level=1
//    for dc_coeff_next:   If the next bit is 1: run=0, level=1
//                         If the next bit is 0: end_of_block

//  escape decodes as 0xffff.

MPEG1.DCT_COEFF = new Int32Array([1 * 3, 2 * 3, 0,
//   0
4 * 3, 3 * 3, 0,
//   1  0
0, 0, 0x0001,
//   2  1.
7 * 3, 8 * 3, 0,
//   3  01
6 * 3, 5 * 3, 0,
//   4  00
13 * 3, 9 * 3, 0,
//   5  001
11 * 3, 10 * 3, 0,
//   6  000
14 * 3, 12 * 3, 0,
//   7  010
0, 0, 0x0101,
//   8  011.
20 * 3, 22 * 3, 0,
//   9  0011
18 * 3, 21 * 3, 0,
//  10  0001
16 * 3, 19 * 3, 0,
//  11  0000
0, 0, 0x0201,
//  12  0101.
17 * 3, 15 * 3, 0,
//  13  0010
0, 0, 0x0002,
//  14  0100.
0, 0, 0x0003,
//  15  0010 1.
27 * 3, 25 * 3, 0,
//  16  0000 0
29 * 3, 31 * 3, 0,
//  17  0010 0
24 * 3, 26 * 3, 0,
//  18  0001 0
32 * 3, 30 * 3, 0,
//  19  0000 1
0, 0, 0x0401,
//  20  0011 0.
23 * 3, 28 * 3, 0,
//  21  0001 1
0, 0, 0x0301,
//  22  0011 1.
0, 0, 0x0102,
//  23  0001 10.
0, 0, 0x0701,
//  24  0001 00.
0, 0, 0xffff,
//  25  0000 01. -- escape
0, 0, 0x0601,
//  26  0001 01.
37 * 3, 36 * 3, 0,
//  27  0000 00
0, 0, 0x0501,
//  28  0001 11.
35 * 3, 34 * 3, 0,
//  29  0010 00
39 * 3, 38 * 3, 0,
//  30  0000 11
33 * 3, 42 * 3, 0,
//  31  0010 01
40 * 3, 41 * 3, 0,
//  32  0000 10
52 * 3, 50 * 3, 0,
//  33  0010 010
54 * 3, 53 * 3, 0,
//  34  0010 001
48 * 3, 49 * 3, 0,
//  35  0010 000
43 * 3, 45 * 3, 0,
//  36  0000 001
46 * 3, 44 * 3, 0,
//  37  0000 000
0, 0, 0x0801,
//  38  0000 111.
0, 0, 0x0004,
//  39  0000 110.
0, 0, 0x0202,
//  40  0000 100.
0, 0, 0x0901,
//  41  0000 101.
51 * 3, 47 * 3, 0,
//  42  0010 011
55 * 3, 57 * 3, 0,
//  43  0000 0010
60 * 3, 56 * 3, 0,
//  44  0000 0001
59 * 3, 58 * 3, 0,
//  45  0000 0011
61 * 3, 62 * 3, 0,
//  46  0000 0000
0, 0, 0x0a01,
//  47  0010 0111.
0, 0, 0x0d01,
//  48  0010 0000.
0, 0, 0x0006,
//  49  0010 0001.
0, 0, 0x0103,
//  50  0010 0101.
0, 0, 0x0005,
//  51  0010 0110.
0, 0, 0x0302,
//  52  0010 0100.
0, 0, 0x0b01,
//  53  0010 0011.
0, 0, 0x0c01,
//  54  0010 0010.
76 * 3, 75 * 3, 0,
//  55  0000 0010 0
67 * 3, 70 * 3, 0,
//  56  0000 0001 1
73 * 3, 71 * 3, 0,
//  57  0000 0010 1
78 * 3, 74 * 3, 0,
//  58  0000 0011 1
72 * 3, 77 * 3, 0,
//  59  0000 0011 0
69 * 3, 64 * 3, 0,
//  60  0000 0001 0
68 * 3, 63 * 3, 0,
//  61  0000 0000 0
66 * 3, 65 * 3, 0,
//  62  0000 0000 1
81 * 3, 87 * 3, 0,
//  63  0000 0000 01
91 * 3, 80 * 3, 0,
//  64  0000 0001 01
82 * 3, 79 * 3, 0,
//  65  0000 0000 11
83 * 3, 86 * 3, 0,
//  66  0000 0000 10
93 * 3, 92 * 3, 0,
//  67  0000 0001 10
84 * 3, 85 * 3, 0,
//  68  0000 0000 00
90 * 3, 94 * 3, 0,
//  69  0000 0001 00
88 * 3, 89 * 3, 0,
//  70  0000 0001 11
0, 0, 0x0203,
//  71  0000 0010 11.
0, 0, 0x0104,
//  72  0000 0011 00.
0, 0, 0x0007,
//  73  0000 0010 10.
0, 0, 0x0402,
//  74  0000 0011 11.
0, 0, 0x0502,
//  75  0000 0010 01.
0, 0, 0x1001,
//  76  0000 0010 00.
0, 0, 0x0f01,
//  77  0000 0011 01.
0, 0, 0x0e01,
//  78  0000 0011 10.
105 * 3, 107 * 3, 0,
//  79  0000 0000 111
111 * 3, 114 * 3, 0,
//  80  0000 0001 011
104 * 3, 97 * 3, 0,
//  81  0000 0000 010
125 * 3, 119 * 3, 0,
//  82  0000 0000 110
96 * 3, 98 * 3, 0,
//  83  0000 0000 100
-1, 123 * 3, 0,
//  84  0000 0000 000
95 * 3, 101 * 3, 0,
//  85  0000 0000 001
106 * 3, 121 * 3, 0,
//  86  0000 0000 101
99 * 3, 102 * 3, 0,
//  87  0000 0000 011
113 * 3, 103 * 3, 0,
//  88  0000 0001 110
112 * 3, 116 * 3, 0,
//  89  0000 0001 111
110 * 3, 100 * 3, 0,
//  90  0000 0001 000
124 * 3, 115 * 3, 0,
//  91  0000 0001 010
117 * 3, 122 * 3, 0,
//  92  0000 0001 101
109 * 3, 118 * 3, 0,
//  93  0000 0001 100
120 * 3, 108 * 3, 0,
//  94  0000 0001 001
127 * 3, 136 * 3, 0,
//  95  0000 0000 0010
139 * 3, 140 * 3, 0,
//  96  0000 0000 1000
130 * 3, 126 * 3, 0,
//  97  0000 0000 0101
145 * 3, 146 * 3, 0,
//  98  0000 0000 1001
128 * 3, 129 * 3, 0,
//  99  0000 0000 0110
0, 0, 0x0802,
// 100  0000 0001 0001.
132 * 3, 134 * 3, 0,
// 101  0000 0000 0011
155 * 3, 154 * 3, 0,
// 102  0000 0000 0111
0, 0, 0x0008,
// 103  0000 0001 1101.
137 * 3, 133 * 3, 0,
// 104  0000 0000 0100
143 * 3, 144 * 3, 0,
// 105  0000 0000 1110
151 * 3, 138 * 3, 0,
// 106  0000 0000 1010
142 * 3, 141 * 3, 0,
// 107  0000 0000 1111
0, 0, 0x000a,
// 108  0000 0001 0011.
0, 0, 0x0009,
// 109  0000 0001 1000.
0, 0, 0x000b,
// 110  0000 0001 0000.
0, 0, 0x1501,
// 111  0000 0001 0110.
0, 0, 0x0602,
// 112  0000 0001 1110.
0, 0, 0x0303,
// 113  0000 0001 1100.
0, 0, 0x1401,
// 114  0000 0001 0111.
0, 0, 0x0702,
// 115  0000 0001 0101.
0, 0, 0x1101,
// 116  0000 0001 1111.
0, 0, 0x1201,
// 117  0000 0001 1010.
0, 0, 0x1301,
// 118  0000 0001 1001.
148 * 3, 152 * 3, 0,
// 119  0000 0000 1101
0, 0, 0x0403,
// 120  0000 0001 0010.
153 * 3, 150 * 3, 0,
// 121  0000 0000 1011
0, 0, 0x0105,
// 122  0000 0001 1011.
131 * 3, 135 * 3, 0,
// 123  0000 0000 0001
0, 0, 0x0204,
// 124  0000 0001 0100.
149 * 3, 147 * 3, 0,
// 125  0000 0000 1100
172 * 3, 173 * 3, 0,
// 126  0000 0000 0101 1
162 * 3, 158 * 3, 0,
// 127  0000 0000 0010 0
170 * 3, 161 * 3, 0,
// 128  0000 0000 0110 0
168 * 3, 166 * 3, 0,
// 129  0000 0000 0110 1
157 * 3, 179 * 3, 0,
// 130  0000 0000 0101 0
169 * 3, 167 * 3, 0,
// 131  0000 0000 0001 0
174 * 3, 171 * 3, 0,
// 132  0000 0000 0011 0
178 * 3, 177 * 3, 0,
// 133  0000 0000 0100 1
156 * 3, 159 * 3, 0,
// 134  0000 0000 0011 1
164 * 3, 165 * 3, 0,
// 135  0000 0000 0001 1
183 * 3, 182 * 3, 0,
// 136  0000 0000 0010 1
175 * 3, 176 * 3, 0,
// 137  0000 0000 0100 0
0, 0, 0x0107,
// 138  0000 0000 1010 1.
0, 0, 0x0a02,
// 139  0000 0000 1000 0.
0, 0, 0x0902,
// 140  0000 0000 1000 1.
0, 0, 0x1601,
// 141  0000 0000 1111 1.
0, 0, 0x1701,
// 142  0000 0000 1111 0.
0, 0, 0x1901,
// 143  0000 0000 1110 0.
0, 0, 0x1801,
// 144  0000 0000 1110 1.
0, 0, 0x0503,
// 145  0000 0000 1001 0.
0, 0, 0x0304,
// 146  0000 0000 1001 1.
0, 0, 0x000d,
// 147  0000 0000 1100 1.
0, 0, 0x000c,
// 148  0000 0000 1101 0.
0, 0, 0x000e,
// 149  0000 0000 1100 0.
0, 0, 0x000f,
// 150  0000 0000 1011 1.
0, 0, 0x0205,
// 151  0000 0000 1010 0.
0, 0, 0x1a01,
// 152  0000 0000 1101 1.
0, 0, 0x0106,
// 153  0000 0000 1011 0.
180 * 3, 181 * 3, 0,
// 154  0000 0000 0111 1
160 * 3, 163 * 3, 0,
// 155  0000 0000 0111 0
196 * 3, 199 * 3, 0,
// 156  0000 0000 0011 10
0, 0, 0x001b,
// 157  0000 0000 0101 00.
203 * 3, 185 * 3, 0,
// 158  0000 0000 0010 01
202 * 3, 201 * 3, 0,
// 159  0000 0000 0011 11
0, 0, 0x0013,
// 160  0000 0000 0111 00.
0, 0, 0x0016,
// 161  0000 0000 0110 01.
197 * 3, 207 * 3, 0,
// 162  0000 0000 0010 00
0, 0, 0x0012,
// 163  0000 0000 0111 01.
191 * 3, 192 * 3, 0,
// 164  0000 0000 0001 10
188 * 3, 190 * 3, 0,
// 165  0000 0000 0001 11
0, 0, 0x0014,
// 166  0000 0000 0110 11.
184 * 3, 194 * 3, 0,
// 167  0000 0000 0001 01
0, 0, 0x0015,
// 168  0000 0000 0110 10.
186 * 3, 193 * 3, 0,
// 169  0000 0000 0001 00
0, 0, 0x0017,
// 170  0000 0000 0110 00.
204 * 3, 198 * 3, 0,
// 171  0000 0000 0011 01
0, 0, 0x0019,
// 172  0000 0000 0101 10.
0, 0, 0x0018,
// 173  0000 0000 0101 11.
200 * 3, 205 * 3, 0,
// 174  0000 0000 0011 00
0, 0, 0x001f,
// 175  0000 0000 0100 00.
0, 0, 0x001e,
// 176  0000 0000 0100 01.
0, 0, 0x001c,
// 177  0000 0000 0100 11.
0, 0, 0x001d,
// 178  0000 0000 0100 10.
0, 0, 0x001a,
// 179  0000 0000 0101 01.
0, 0, 0x0011,
// 180  0000 0000 0111 10.
0, 0, 0x0010,
// 181  0000 0000 0111 11.
189 * 3, 206 * 3, 0,
// 182  0000 0000 0010 11
187 * 3, 195 * 3, 0,
// 183  0000 0000 0010 10
218 * 3, 211 * 3, 0,
// 184  0000 0000 0001 010
0, 0, 0x0025,
// 185  0000 0000 0010 011.
215 * 3, 216 * 3, 0,
// 186  0000 0000 0001 000
0, 0, 0x0024,
// 187  0000 0000 0010 100.
210 * 3, 212 * 3, 0,
// 188  0000 0000 0001 110
0, 0, 0x0022,
// 189  0000 0000 0010 110.
213 * 3, 209 * 3, 0,
// 190  0000 0000 0001 111
221 * 3, 222 * 3, 0,
// 191  0000 0000 0001 100
219 * 3, 208 * 3, 0,
// 192  0000 0000 0001 101
217 * 3, 214 * 3, 0,
// 193  0000 0000 0001 001
223 * 3, 220 * 3, 0,
// 194  0000 0000 0001 011
0, 0, 0x0023,
// 195  0000 0000 0010 101.
0, 0, 0x010b,
// 196  0000 0000 0011 100.
0, 0, 0x0028,
// 197  0000 0000 0010 000.
0, 0, 0x010c,
// 198  0000 0000 0011 011.
0, 0, 0x010a,
// 199  0000 0000 0011 101.
0, 0, 0x0020,
// 200  0000 0000 0011 000.
0, 0, 0x0108,
// 201  0000 0000 0011 111.
0, 0, 0x0109,
// 202  0000 0000 0011 110.
0, 0, 0x0026,
// 203  0000 0000 0010 010.
0, 0, 0x010d,
// 204  0000 0000 0011 010.
0, 0, 0x010e,
// 205  0000 0000 0011 001.
0, 0, 0x0021,
// 206  0000 0000 0010 111.
0, 0, 0x0027,
// 207  0000 0000 0010 001.
0, 0, 0x1f01,
// 208  0000 0000 0001 1011.
0, 0, 0x1b01,
// 209  0000 0000 0001 1111.
0, 0, 0x1e01,
// 210  0000 0000 0001 1100.
0, 0, 0x1002,
// 211  0000 0000 0001 0101.
0, 0, 0x1d01,
// 212  0000 0000 0001 1101.
0, 0, 0x1c01,
// 213  0000 0000 0001 1110.
0, 0, 0x010f,
// 214  0000 0000 0001 0011.
0, 0, 0x0112,
// 215  0000 0000 0001 0000.
0, 0, 0x0111,
// 216  0000 0000 0001 0001.
0, 0, 0x0110,
// 217  0000 0000 0001 0010.
0, 0, 0x0603,
// 218  0000 0000 0001 0100.
0, 0, 0x0b02,
// 219  0000 0000 0001 1010.
0, 0, 0x0e02,
// 220  0000 0000 0001 0111.
0, 0, 0x0d02,
// 221  0000 0000 0001 1000.
0, 0, 0x0c02,
// 222  0000 0000 0001 1001.
0, 0, 0x0f02 // 223  0000 0000 0001 0110.
]);
MPEG1.PICTURE_TYPE = {
  INTRA: 1,
  PREDICTIVE: 2,
  B: 3
};
MPEG1.START = {
  SEQUENCE: 0xb3,
  SLICE_FIRST: 0x01,
  SLICE_LAST: 0xaf,
  PICTURE: 0x00,
  EXTENSION: 0xb5,
  USER_DATA: 0xb2
};

var MPEG1WASM = /*#__PURE__*/function (_BaseDecoder) {
  function MPEG1WASM(options) {
    var _this;
    _this = _BaseDecoder.call(this, options) || this;
    _this.onDecodeCallback = options.onVideoDecode;
    _this.module = options.wasmModule;
    _this.bufferSize = options.videoBufferSize || 512 * 1024;
    _this.bufferMode = options.streaming ? BitBuffer.MODE.EVICT : BitBuffer.MODE.EXPAND;
    _this.decodeFirstFrame = options.decodeFirstFrame !== false;
    _this.hasSequenceHeader = false;
    return _this;
  }
  _inheritsLoose(MPEG1WASM, _BaseDecoder);
  var _proto = MPEG1WASM.prototype;
  _proto.initializeWasmDecoder = function initializeWasmDecoder() {
    if (!this.module.instance) {
      console.warn('JSMpeg: WASM module not compiled yet');
      return;
    }
    this.instance = this.module.instance;
    this.functions = this.module.instance.exports;
    this.decoder = this.functions._mpeg1_decoder_create(this.bufferSize, this.bufferMode);
  };
  _proto.destroy = function destroy() {
    if (!this.decoder) {
      return;
    }
    this.functions._mpeg1_decoder_destroy(this.decoder);
  };
  _proto.bufferGetIndex = function bufferGetIndex() {
    if (!this.decoder) {
      return;
    }
    // eslint-disable-next-line consistent-return
    return this.functions._mpeg1_decoder_get_index(this.decoder);
  };
  _proto.bufferSetIndex = function bufferSetIndex(index) {
    if (!this.decoder) {
      return;
    }
    this.functions._mpeg1_decoder_set_index(this.decoder, index);
  };
  _proto.bufferWrite = function bufferWrite(buffers) {
    if (!this.decoder) {
      this.initializeWasmDecoder();
    }
    var totalLength = 0;
    for (var i = 0; i < buffers.length; i++) {
      totalLength += buffers[i].length;
    }
    var ptr = this.functions._mpeg1_decoder_get_write_ptr(this.decoder, totalLength);
    for (var _i = 0; _i < buffers.length; _i++) {
      this.instance.heapU8.set(buffers[_i], ptr);
      ptr += buffers[_i].length;
    }
    this.functions._mpeg1_decoder_did_write(this.decoder, totalLength);
    return totalLength;
  };
  _proto.write = function write(pts, buffers) {
    BaseDecoder.prototype.write.call(this, pts, buffers);
    if (!this.hasSequenceHeader && this.functions._mpeg1_decoder_has_sequence_header(this.decoder)) {
      this.loadSequenceHeader();
    }
  };
  _proto.loadSequenceHeader = function loadSequenceHeader() {
    this.hasSequenceHeader = true;
    this.frameRate = this.functions._mpeg1_decoder_get_frame_rate(this.decoder);
    this.codedSize = this.functions._mpeg1_decoder_get_coded_size(this.decoder);
    if (this.destination) {
      var w = this.functions._mpeg1_decoder_get_width(this.decoder);
      var h = this.functions._mpeg1_decoder_get_height(this.decoder);
      this.destination.resize(w, h);
    }
    if (this.decodeFirstFrame) {
      this.decode();
    }
  };
  _proto.decode = function decode() {
    var startTime = Now();
    if (!this.decoder) {
      return false;
    }
    var didDecode = this.functions._mpeg1_decoder_decode(this.decoder);
    if (!didDecode) {
      return false;
    }

    // Invoke decode callbacks
    if (this.destination) {
      var ptrY = this.functions._mpeg1_decoder_get_y_ptr(this.decoder);
      var ptrCr = this.functions._mpeg1_decoder_get_cr_ptr(this.decoder);
      var ptrCb = this.functions._mpeg1_decoder_get_cb_ptr(this.decoder);
      var dy = this.instance.heapU8.subarray(ptrY, ptrY + this.codedSize);
      var dcr = this.instance.heapU8.subarray(ptrCr, ptrCr + (this.codedSize >> 2));
      var dcb = this.instance.heapU8.subarray(ptrCb, ptrCb + (this.codedSize >> 2));
      this.destination.render(dy, dcr, dcb, false);
    }
    this.advanceDecodedTime(1 / this.frameRate);
    var elapsedTime = Now() - startTime;
    if (this.onDecodeCallback) {
      this.onDecodeCallback(this, elapsedTime);
    }
    return true;
  };
  return MPEG1WASM;
}(BaseDecoder);

var MP2 = /*#__PURE__*/function (_BaseDecoder) {
  function MP2(options) {
    var _this;
    _this = _BaseDecoder.call(this, options) || this;
    _this.onDecodeCallback = options.onAudioDecode;
    var bufferSize = options.audioBufferSize || 128 * 1024;
    var bufferMode = options.streaming ? BitBuffer.MODE.EVICT : BitBuffer.MODE.EXPAND;
    _this.bits = new BitBuffer(bufferSize, bufferMode);
    _this.left = new Float32Array(1152);
    _this.right = new Float32Array(1152);
    _this.sampleRate = 44100;
    _this.D = new Float32Array(1024);
    _this.D.set(MP2.SYNTHESIS_WINDOW, 0);
    _this.D.set(MP2.SYNTHESIS_WINDOW, 512);
    _this.V = [new Float32Array(1024), new Float32Array(1024)];
    _this.U = new Int32Array(32);
    _this.VPos = 0;
    _this.allocation = [new Array(32), new Array(32)];
    _this.scaleFactorInfo = [new Uint8Array(32), new Uint8Array(32)];
    _this.scaleFactor = [new Array(32), new Array(32)];
    _this.sample = [new Array(32), new Array(32)];
    for (var j = 0; j < 2; j++) {
      for (var i = 0; i < 32; i++) {
        _this.scaleFactor[j][i] = [0, 0, 0];
        _this.sample[j][i] = [0, 0, 0];
      }
    }
    return _this;
  }
  _inheritsLoose(MP2, _BaseDecoder);
  var _proto = MP2.prototype;
  _proto.decode = function decode() {
    var startTime = Now();
    var pos = this.bits.index >> 3;
    if (pos >= this.bits.byteLength) {
      return false;
    }
    var decoded = this.decodeFrame(this.left, this.right);
    this.bits.index = pos + decoded << 3;
    if (!decoded) {
      return false;
    }
    if (this.destination) {
      this.destination.play(this.sampleRate, this.left, this.right);
    }
    this.advanceDecodedTime(this.left.length / this.sampleRate);
    var elapsedTime = Now() - startTime;
    if (this.onDecodeCallback) {
      this.onDecodeCallback(this, elapsedTime);
    }
    return true;
  };
  _proto.getCurrentTime = function getCurrentTime() {
    var enqueuedTime = this.destination ? this.destination.enqueuedTime : 0;
    return this.decodedTime - enqueuedTime;
  };
  _proto.decodeFrame = function decodeFrame(left, right) {
    // Check for valid header: syncword OK, MPEG-Audio Layer 2
    var sync = this.bits.read(11);
    var version = this.bits.read(2);
    var layer = this.bits.read(2);
    var hasCRC = !this.bits.read(1);
    if (sync !== MP2.FRAME_SYNC || version !== MP2.VERSION.MPEG_1 || layer !== MP2.LAYER.II) {
      // Invalid header or unsupported version
      return 0;
    }
    var bitrateIndex = this.bits.read(4) - 1;
    if (bitrateIndex > 13) {
      // Invalid bit rate or 'free format'
      return 0;
    }
    var sampleRateIndex = this.bits.read(2);
    var sampleRate = MP2.SAMPLE_RATE[sampleRateIndex];
    if (sampleRateIndex === 3) {
      // Invalid sample rate
      return 0;
    }
    if (version === MP2.VERSION.MPEG_2) {
      sampleRateIndex += 4;
      bitrateIndex += 14;
    }
    var padding = this.bits.read(1);
    // eslint-disable-next-line no-unused-vars
    this.bits.read(1);
    var mode = this.bits.read(2);

    // Parse the mode_extension, set up the stereo bound
    var bound = 0;
    if (mode === MP2.MODE.JOINT_STEREO) {
      bound = this.bits.read(2) + 1 << 2;
    } else {
      this.bits.skip(2);
      bound = mode === MP2.MODE.MONO ? 0 : 32;
    }

    // Discard the last 4 bits of the header and the CRC value, if present
    this.bits.skip(4);
    if (hasCRC) {
      this.bits.skip(16);
    }

    // Compute the frame size
    var bitrate = MP2.BIT_RATE[bitrateIndex];
    sampleRate = MP2.SAMPLE_RATE[sampleRateIndex];
    var frameSize = 144000 * bitrate / sampleRate + padding | 0;

    // Prepare the quantizer table lookups
    var tab3 = 0;
    var sblimit = 0;
    if (version === MP2.VERSION.MPEG_2) {
      // MPEG-2 (LSR)
      tab3 = 2;
      sblimit = 30;
    } else {
      // MPEG-1
      var tab1 = mode === MP2.MODE.MONO ? 0 : 1;
      var tab2 = MP2.QUANT_LUT_STEP_1[tab1][bitrateIndex];
      tab3 = MP2.QUANT_LUT_STEP_2[tab2][sampleRateIndex];
      sblimit = tab3 & 63;
      tab3 >>= 6;
    }
    if (bound > sblimit) {
      bound = sblimit;
    }

    // Read the allocation information
    for (var sb = 0; sb < bound; sb++) {
      this.allocation[0][sb] = this.readAllocation(sb, tab3);
      this.allocation[1][sb] = this.readAllocation(sb, tab3);
    }
    for (var _sb = bound; _sb < sblimit; _sb++) {
      this.allocation[0][_sb] = this.allocation[1][_sb] = this.readAllocation(_sb, tab3);
    }

    // Read scale factor selector information
    var channels = mode === MP2.MODE.MONO ? 1 : 2;
    for (var _sb2 = 0; _sb2 < sblimit; _sb2++) {
      for (var ch = 0; ch < channels; ch++) {
        if (this.allocation[ch][_sb2]) {
          this.scaleFactorInfo[ch][_sb2] = this.bits.read(2);
        }
      }
      if (mode === MP2.MODE.MONO) {
        this.scaleFactorInfo[1][_sb2] = this.scaleFactorInfo[0][_sb2];
      }
    }

    // Read scale factors
    for (var _sb3 = 0; _sb3 < sblimit; _sb3++) {
      for (var _ch = 0; _ch < channels; _ch++) {
        if (this.allocation[_ch][_sb3]) {
          var sf = this.scaleFactor[_ch][_sb3];
          switch (this.scaleFactorInfo[_ch][_sb3]) {
            case 0:
              sf[0] = this.bits.read(6);
              sf[1] = this.bits.read(6);
              sf[2] = this.bits.read(6);
              break;
            case 1:
              sf[0] = sf[1] = this.bits.read(6);
              sf[2] = this.bits.read(6);
              break;
            case 2:
              sf[0] = sf[1] = sf[2] = this.bits.read(6);
              break;
            case 3:
              sf[0] = this.bits.read(6);
              sf[1] = sf[2] = this.bits.read(6);
              break;
          }
        }
      }
      if (mode === MP2.MODE.MONO) {
        // eslint-disable-next-line prefer-destructuring
        this.scaleFactor[1][_sb3][0] = this.scaleFactor[0][_sb3][0];
        // eslint-disable-next-line prefer-destructuring
        this.scaleFactor[1][_sb3][1] = this.scaleFactor[0][_sb3][1];
        // eslint-disable-next-line prefer-destructuring
        this.scaleFactor[1][_sb3][2] = this.scaleFactor[0][_sb3][2];
      }
    }

    // Coefficient input and reconstruction
    var outPos = 0;
    for (var part = 0; part < 3; part++) {
      for (var granule = 0; granule < 4; granule++) {
        // Read the samples
        for (var _sb4 = 0; _sb4 < bound; _sb4++) {
          this.readSamples(0, _sb4, part);
          this.readSamples(1, _sb4, part);
        }
        for (var _sb5 = bound; _sb5 < sblimit; _sb5++) {
          this.readSamples(0, _sb5, part);
          // eslint-disable-next-line prefer-destructuring
          this.sample[1][_sb5][0] = this.sample[0][_sb5][0];
          // eslint-disable-next-line prefer-destructuring
          this.sample[1][_sb5][1] = this.sample[0][_sb5][1];
          // eslint-disable-next-line prefer-destructuring
          this.sample[1][_sb5][2] = this.sample[0][_sb5][2];
        }
        for (var _sb6 = sblimit; _sb6 < 32; _sb6++) {
          this.sample[0][_sb6][0] = 0;
          this.sample[0][_sb6][1] = 0;
          this.sample[0][_sb6][2] = 0;
          this.sample[1][_sb6][0] = 0;
          this.sample[1][_sb6][1] = 0;
          this.sample[1][_sb6][2] = 0;
        }

        // Synthesis loop
        for (var p = 0; p < 3; p++) {
          // Shifting step
          this.VPos = this.VPos - 64 & 1023;
          for (var _ch2 = 0; _ch2 < 2; _ch2++) {
            MP2.MatrixTransform(this.sample[_ch2], p, this.V[_ch2], this.VPos);

            // Build U, windowing, calculate output
            Fill(this.U, 0);
            var dIndex = 512 - (this.VPos >> 1);
            var vIndex = this.VPos % 128 >> 1;
            while (vIndex < 1024) {
              for (var i = 0; i < 32; ++i) {
                this.U[i] += this.D[dIndex++] * this.V[_ch2][vIndex++];
              }
              vIndex += 128 - 32;
              dIndex += 64 - 32;
            }
            vIndex = 128 - 32 + 1024 - vIndex;
            dIndex -= 512 - 32;
            while (vIndex < 1024) {
              for (var _i = 0; _i < 32; ++_i) {
                this.U[_i] += this.D[dIndex++] * this.V[_ch2][vIndex++];
              }
              vIndex += 128 - 32;
              dIndex += 64 - 32;
            }

            // Output samples
            var outChannel = _ch2 === 0 ? left : right;
            for (var j = 0; j < 32; j++) {
              outChannel[outPos + j] = this.U[j] / 2147418112;
            }
          } // End of synthesis channel loop
          outPos += 32;
        } // End of synthesis sub-block loop
      } // Decoding of the granule finished
    }
    this.sampleRate = sampleRate;
    return frameSize;
  };
  _proto.readAllocation = function readAllocation(sb, tab3) {
    var tab4 = MP2.QUANT_LUT_STEP_3[tab3][sb];
    var qtab = MP2.QUANT_LUT_STEP4[tab4 & 15][this.bits.read(tab4 >> 4)];
    return qtab ? MP2.QUANT_TAB[qtab - 1] : 0;
  };
  _proto.readSamples = function readSamples(ch, sb, part) {
    var q = this.allocation[ch][sb];
    var sf = this.scaleFactor[ch][sb][part];
    var sample = this.sample[ch][sb];
    var val = 0;
    if (!q) {
      // No bits allocated for this subband
      sample[0] = sample[1] = sample[2] = 0;
      return;
    }

    // Resolve scalefactor
    if (sf === 63) {
      sf = 0;
    } else {
      var shift = sf / 3 | 0;
      sf = MP2.SCALEFACTOR_BASE[sf % 3] + (1 << shift >> 1) >> shift;
    }

    // Decode samples
    var adj = q.levels;
    if (q.group) {
      // Decode grouped samples
      val = this.bits.read(q.bits);
      sample[0] = val % adj;
      val = val / adj | 0;
      sample[1] = val % adj;
      sample[2] = val / adj | 0;
    } else {
      // Decode direct samples
      sample[0] = this.bits.read(q.bits);
      sample[1] = this.bits.read(q.bits);
      sample[2] = this.bits.read(q.bits);
    }

    // Postmultiply samples
    var scale = 65536 / (adj + 1) | 0;
    adj = (adj + 1 >> 1) - 1;
    val = (adj - sample[0]) * scale;
    sample[0] = val * (sf >> 12) + (val * (sf & 4095) + 2048 >> 12) >> 12;
    val = (adj - sample[1]) * scale;
    sample[1] = val * (sf >> 12) + (val * (sf & 4095) + 2048 >> 12) >> 12;
    val = (adj - sample[2]) * scale;
    sample[2] = val * (sf >> 12) + (val * (sf & 4095) + 2048 >> 12) >> 12;
  };
  MP2.MatrixTransform = function MatrixTransform(s, ss, d, dp) {
    var t01;
    var t02;
    var t03;
    var t04;
    var t05;
    var t06;
    var t07;
    var t08;
    var t09;
    var t10;
    var t11;
    var t12;
    var t13;
    var t14;
    var t15;
    var t16;
    var t17;
    var t18;
    var t19;
    var t20;
    var t21;
    var t22;
    var t23;
    var t24;
    var t25;
    var t26;
    var t27;
    var t28;
    var t29;
    var t30;
    var t31;
    var t32;
    var t33;
    t01 = s[0][ss] + s[31][ss];
    t02 = (s[0][ss] - s[31][ss]) * 0.500602998235;
    t03 = s[1][ss] + s[30][ss];
    t04 = (s[1][ss] - s[30][ss]) * 0.505470959898;
    t05 = s[2][ss] + s[29][ss];
    t06 = (s[2][ss] - s[29][ss]) * 0.515447309923;
    t07 = s[3][ss] + s[28][ss];
    t08 = (s[3][ss] - s[28][ss]) * 0.53104259109;
    t09 = s[4][ss] + s[27][ss];
    t10 = (s[4][ss] - s[27][ss]) * 0.553103896034;
    t11 = s[5][ss] + s[26][ss];
    t12 = (s[5][ss] - s[26][ss]) * 0.582934968206;
    t13 = s[6][ss] + s[25][ss];
    t14 = (s[6][ss] - s[25][ss]) * 0.622504123036;
    t15 = s[7][ss] + s[24][ss];
    t16 = (s[7][ss] - s[24][ss]) * 0.674808341455;
    t17 = s[8][ss] + s[23][ss];
    t18 = (s[8][ss] - s[23][ss]) * 0.744536271002;
    t19 = s[9][ss] + s[22][ss];
    t20 = (s[9][ss] - s[22][ss]) * 0.839349645416;
    t21 = s[10][ss] + s[21][ss];
    t22 = (s[10][ss] - s[21][ss]) * 0.972568237862;
    t23 = s[11][ss] + s[20][ss];
    t24 = (s[11][ss] - s[20][ss]) * 1.16943993343;
    t25 = s[12][ss] + s[19][ss];
    t26 = (s[12][ss] - s[19][ss]) * 1.48416461631;
    t27 = s[13][ss] + s[18][ss];
    t28 = (s[13][ss] - s[18][ss]) * 2.05778100995;
    t29 = s[14][ss] + s[17][ss];
    t30 = (s[14][ss] - s[17][ss]) * 3.40760841847;
    t31 = s[15][ss] + s[16][ss];
    t32 = (s[15][ss] - s[16][ss]) * 10.1900081235;
    t33 = t01 + t31;
    t31 = (t01 - t31) * 0.502419286188;
    t01 = t03 + t29;
    t29 = (t03 - t29) * 0.52249861494;
    t03 = t05 + t27;
    t27 = (t05 - t27) * 0.566944034816;
    t05 = t07 + t25;
    t25 = (t07 - t25) * 0.64682178336;
    t07 = t09 + t23;
    t23 = (t09 - t23) * 0.788154623451;
    t09 = t11 + t21;
    t21 = (t11 - t21) * 1.06067768599;
    t11 = t13 + t19;
    t19 = (t13 - t19) * 1.72244709824;
    t13 = t15 + t17;
    t17 = (t15 - t17) * 5.10114861869;
    t15 = t33 + t13;
    t13 = (t33 - t13) * 0.509795579104;
    t33 = t01 + t11;
    t01 = (t01 - t11) * 0.601344886935;
    t11 = t03 + t09;
    t09 = (t03 - t09) * 0.899976223136;
    t03 = t05 + t07;
    t07 = (t05 - t07) * 2.56291544774;
    t05 = t15 + t03;
    t15 = (t15 - t03) * 0.541196100146;
    t03 = t33 + t11;
    t11 = (t33 - t11) * 1.30656296488;
    t33 = t05 + t03;
    t05 = (t05 - t03) * 0.707106781187;
    t03 = t15 + t11;
    t15 = (t15 - t11) * 0.707106781187;
    t03 += t15;
    t11 = t13 + t07;
    t13 = (t13 - t07) * 0.541196100146;
    t07 = t01 + t09;
    t09 = (t01 - t09) * 1.30656296488;
    t01 = t11 + t07;
    t07 = (t11 - t07) * 0.707106781187;
    t11 = t13 + t09;
    t13 = (t13 - t09) * 0.707106781187;
    t11 += t13;
    t01 += t11;
    t11 += t07;
    t07 += t13;
    t09 = t31 + t17;
    t31 = (t31 - t17) * 0.509795579104;
    t17 = t29 + t19;
    t29 = (t29 - t19) * 0.601344886935;
    t19 = t27 + t21;
    t21 = (t27 - t21) * 0.899976223136;
    t27 = t25 + t23;
    t23 = (t25 - t23) * 2.56291544774;
    t25 = t09 + t27;
    t09 = (t09 - t27) * 0.541196100146;
    t27 = t17 + t19;
    t19 = (t17 - t19) * 1.30656296488;
    t17 = t25 + t27;
    t27 = (t25 - t27) * 0.707106781187;
    t25 = t09 + t19;
    t19 = (t09 - t19) * 0.707106781187;
    t25 += t19;
    t09 = t31 + t23;
    t31 = (t31 - t23) * 0.541196100146;
    t23 = t29 + t21;
    t21 = (t29 - t21) * 1.30656296488;
    t29 = t09 + t23;
    t23 = (t09 - t23) * 0.707106781187;
    t09 = t31 + t21;
    t31 = (t31 - t21) * 0.707106781187;
    t09 += t31;
    t29 += t09;
    t09 += t23;
    t23 += t31;
    t17 += t29;
    t29 += t25;
    t25 += t09;
    t09 += t27;
    t27 += t23;
    t23 += t19;
    t19 += t31;
    t21 = t02 + t32;
    t02 = (t02 - t32) * 0.502419286188;
    t32 = t04 + t30;
    t04 = (t04 - t30) * 0.52249861494;
    t30 = t06 + t28;
    t28 = (t06 - t28) * 0.566944034816;
    t06 = t08 + t26;
    t08 = (t08 - t26) * 0.64682178336;
    t26 = t10 + t24;
    t10 = (t10 - t24) * 0.788154623451;
    t24 = t12 + t22;
    t22 = (t12 - t22) * 1.06067768599;
    t12 = t14 + t20;
    t20 = (t14 - t20) * 1.72244709824;
    t14 = t16 + t18;
    t16 = (t16 - t18) * 5.10114861869;
    t18 = t21 + t14;
    t14 = (t21 - t14) * 0.509795579104;
    t21 = t32 + t12;
    t32 = (t32 - t12) * 0.601344886935;
    t12 = t30 + t24;
    t24 = (t30 - t24) * 0.899976223136;
    t30 = t06 + t26;
    t26 = (t06 - t26) * 2.56291544774;
    t06 = t18 + t30;
    t18 = (t18 - t30) * 0.541196100146;
    t30 = t21 + t12;
    t12 = (t21 - t12) * 1.30656296488;
    t21 = t06 + t30;
    t30 = (t06 - t30) * 0.707106781187;
    t06 = t18 + t12;
    t12 = (t18 - t12) * 0.707106781187;
    t06 += t12;
    t18 = t14 + t26;
    t26 = (t14 - t26) * 0.541196100146;
    t14 = t32 + t24;
    t24 = (t32 - t24) * 1.30656296488;
    t32 = t18 + t14;
    t14 = (t18 - t14) * 0.707106781187;
    t18 = t26 + t24;
    t24 = (t26 - t24) * 0.707106781187;
    t18 += t24;
    t32 += t18;
    t18 += t14;
    t26 = t14 + t24;
    t14 = t02 + t16;
    t02 = (t02 - t16) * 0.509795579104;
    t16 = t04 + t20;
    t04 = (t04 - t20) * 0.601344886935;
    t20 = t28 + t22;
    t22 = (t28 - t22) * 0.899976223136;
    t28 = t08 + t10;
    t10 = (t08 - t10) * 2.56291544774;
    t08 = t14 + t28;
    t14 = (t14 - t28) * 0.541196100146;
    t28 = t16 + t20;
    t20 = (t16 - t20) * 1.30656296488;
    t16 = t08 + t28;
    t28 = (t08 - t28) * 0.707106781187;
    t08 = t14 + t20;
    t20 = (t14 - t20) * 0.707106781187;
    t08 += t20;
    t14 = t02 + t10;
    t02 = (t02 - t10) * 0.541196100146;
    t10 = t04 + t22;
    t22 = (t04 - t22) * 1.30656296488;
    t04 = t14 + t10;
    t10 = (t14 - t10) * 0.707106781187;
    t14 = t02 + t22;
    t02 = (t02 - t22) * 0.707106781187;
    t14 += t02;
    t04 += t14;
    t14 += t10;
    t10 += t02;
    t16 += t04;
    t04 += t08;
    t08 += t14;
    t14 += t28;
    t28 += t10;
    t10 += t20;
    t20 += t02;
    t21 += t16;
    t16 += t32;
    t32 += t04;
    t04 += t06;
    t06 += t08;
    t08 += t18;
    t18 += t14;
    t14 += t30;
    t30 += t28;
    t28 += t26;
    t26 += t10;
    t10 += t12;
    t12 += t20;
    t20 += t24;
    t24 += t02;
    d[dp + 48] = -t33;
    d[dp + 49] = d[dp + 47] = -t21;
    d[dp + 50] = d[dp + 46] = -t17;
    d[dp + 51] = d[dp + 45] = -t16;
    d[dp + 52] = d[dp + 44] = -t01;
    d[dp + 53] = d[dp + 43] = -t32;
    d[dp + 54] = d[dp + 42] = -t29;
    d[dp + 55] = d[dp + 41] = -t04;
    d[dp + 56] = d[dp + 40] = -t03;
    d[dp + 57] = d[dp + 39] = -t06;
    d[dp + 58] = d[dp + 38] = -t25;
    d[dp + 59] = d[dp + 37] = -t08;
    d[dp + 60] = d[dp + 36] = -t11;
    d[dp + 61] = d[dp + 35] = -t18;
    d[dp + 62] = d[dp + 34] = -t09;
    d[dp + 63] = d[dp + 33] = -t14;
    d[dp + 32] = -t05;
    d[dp + 0] = t05;
    d[dp + 31] = -t30;
    d[dp + 1] = t30;
    d[dp + 30] = -t27;
    d[dp + 2] = t27;
    d[dp + 29] = -t28;
    d[dp + 3] = t28;
    d[dp + 28] = -t07;
    d[dp + 4] = t07;
    d[dp + 27] = -t26;
    d[dp + 5] = t26;
    d[dp + 26] = -t23;
    d[dp + 6] = t23;
    d[dp + 25] = -t10;
    d[dp + 7] = t10;
    d[dp + 24] = -t15;
    d[dp + 8] = t15;
    d[dp + 23] = -t12;
    d[dp + 9] = t12;
    d[dp + 22] = -t19;
    d[dp + 10] = t19;
    d[dp + 21] = -t20;
    d[dp + 11] = t20;
    d[dp + 20] = -t13;
    d[dp + 12] = t13;
    d[dp + 19] = -t24;
    d[dp + 13] = t24;
    d[dp + 18] = -t31;
    d[dp + 14] = t31;
    d[dp + 17] = -t02;
    d[dp + 15] = t02;
    d[dp + 16] = 0.0;
  };
  return MP2;
}(BaseDecoder);
MP2.FRAME_SYNC = 0x7ff;
MP2.VERSION = {
  MPEG_2_5: 0x0,
  MPEG_2: 0x2,
  MPEG_1: 0x3
};
MP2.LAYER = {
  III: 0x1,
  II: 0x2,
  I: 0x3
};
MP2.MODE = {
  STEREO: 0x0,
  JOINT_STEREO: 0x1,
  DUAL_CHANNEL: 0x2,
  MONO: 0x3
};
MP2.SAMPLE_RATE = new Uint16Array([44100, 48000, 32000, 0,
// MPEG-1
22050, 24000, 16000, 0 // MPEG-2
]);
MP2.BIT_RATE = new Uint16Array([32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384,
// MPEG-1
8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160 // MPEG-2
]);
MP2.SCALEFACTOR_BASE = new Uint32Array([0x02000000, 0x01965fea, 0x01428a30]);
MP2.SYNTHESIS_WINDOW = new Float32Array([0.0, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -1.0, -1.0, -1.0, -1.0, -1.5, -1.5, -2.0, -2.0, -2.5, -2.5, -3.0, -3.5, -3.5, -4.0, -4.5, -5.0, -5.5, -6.5, -7.0, -8.0, -8.5, -9.5, -10.5, -12.0, -13.0, -14.5, -15.5, -17.5, -19.0, -20.5, -22.5, -24.5, -26.5, -29.0, -31.5, -34.0, -36.5, -39.5, -42.5, -45.5, -48.5, -52.0, -55.5, -58.5, -62.5, -66.0, -69.5, -73.5, -77.0, -80.5, -84.5, -88.0, -91.5, -95.0, -98.0, -101.0, -104.0, 106.5, 109.0, 111.0, 112.5, 113.5, 114.0, 114.0, 113.5, 112.0, 110.5, 107.5, 104.0, 100.0, 94.5, 88.5, 81.5, 73.0, 63.5, 53.0, 41.5, 28.5, 14.5, -1.0, -18.0, -36.0, -55.5, -76.5, -98.5, -122.0, -147.0, -173.5, -200.5, -229.5, -259.5, -290.5, -322.5, -355.5, -389.5, -424.0, -459.5, -495.5, -532.0, -568.5, -605.0, -641.5, -678.0, -714.0, -749.0, -783.5, -817.0, -849.0, -879.5, -908.5, -935.0, -959.5, -981.0, -1000.5, -1016.0, -1028.5, -1037.5, -1042.5, -1043.5, -1040.0, -1031.5, 1018.5, 1000.0, 976.0, 946.5, 911.0, 869.5, 822.0, 767.5, 707.0, 640.0, 565.5, 485.0, 397.0, 302.5, 201.0, 92.5, -22.5, -144.0, -272.5, -407.0, -547.5, -694.0, -846.0, -1003.0, -1165.0, -1331.5, -1502.0, -1675.5, -1852.5, -2031.5, -2212.5, -2394.0, -2576.5, -2758.5, -2939.5, -3118.5, -3294.5, -3467.5, -3635.5, -3798.5, -3955.0, -4104.5, -4245.5, -4377.5, -4499.0, -4609.5, -4708.0, -4792.5, -4863.5, -4919.0, -4958.0, -4979.5, -4983.0, -4967.5, -4931.5, -4875.0, -4796.0, -4694.5, -4569.5, -4420.0, -4246.0, -4046.0, -3820.0, -3567.0, 3287.0, 2979.5, 2644.0, 2280.5, 1888.0, 1467.5, 1018.5, 541.0, 35.0, -499.0, -1061.0, -1650.0, -2266.5, -2909.0, -3577.0, -4270.0, -4987.5, -5727.5, -6490.0, -7274.0, -8077.5, -8899.5, -9739.0, -10594.5, -11464.5, -12347.0, -13241.0, -14144.5, -15056.0, -15973.5, -16895.5, -17820.0, -18744.5, -19668.0, -20588.0, -21503.0, -22410.5, -23308.5, -24195.0, -25068.5, -25926.5, -26767.0, -27589.0, -28389.0, -29166.5, -29919.0, -30644.5, -31342.0, -32009.5, -32645.0, -33247.0, -33814.5, -34346.0, -34839.5, -35295.0, -35710.0, -36084.5, -36417.5, -36707.5, -36954.0, -37156.5, -37315.0, -37428.0, -37496.0, 37519.0, 37496.0, 37428.0, 37315.0, 37156.5, 36954.0, 36707.5, 36417.5, 36084.5, 35710.0, 35295.0, 34839.5, 34346.0, 33814.5, 33247.0, 32645.0, 32009.5, 31342.0, 30644.5, 29919.0, 29166.5, 28389.0, 27589.0, 26767.0, 25926.5, 25068.5, 24195.0, 23308.5, 22410.5, 21503.0, 20588.0, 19668.0, 18744.5, 17820.0, 16895.5, 15973.5, 15056.0, 14144.5, 13241.0, 12347.0, 11464.5, 10594.5, 9739.0, 8899.5, 8077.5, 7274.0, 6490.0, 5727.5, 4987.5, 4270.0, 3577.0, 2909.0, 2266.5, 1650.0, 1061.0, 499.0, -35.0, -541.0, -1018.5, -1467.5, -1888.0, -2280.5, -2644.0, -2979.5, 3287.0, 3567.0, 3820.0, 4046.0, 4246.0, 4420.0, 4569.5, 4694.5, 4796.0, 4875.0, 4931.5, 4967.5, 4983.0, 4979.5, 4958.0, 4919.0, 4863.5, 4792.5, 4708.0, 4609.5, 4499.0, 4377.5, 4245.5, 4104.5, 3955.0, 3798.5, 3635.5, 3467.5, 3294.5, 3118.5, 2939.5, 2758.5, 2576.5, 2394.0, 2212.5, 2031.5, 1852.5, 1675.5, 1502.0, 1331.5, 1165.0, 1003.0, 846.0, 694.0, 547.5, 407.0, 272.5, 144.0, 22.5, -92.5, -201.0, -302.5, -397.0, -485.0, -565.5, -640.0, -707.0, -767.5, -822.0, -869.5, -911.0, -946.5, -976.0, -1000.0, 1018.5, 1031.5, 1040.0, 1043.5, 1042.5, 1037.5, 1028.5, 1016.0, 1000.5, 981.0, 959.5, 935.0, 908.5, 879.5, 849.0, 817.0, 783.5, 749.0, 714.0, 678.0, 641.5, 605.0, 568.5, 532.0, 495.5, 459.5, 424.0, 389.5, 355.5, 322.5, 290.5, 259.5, 229.5, 200.5, 173.5, 147.0, 122.0, 98.5, 76.5, 55.5, 36.0, 18.0, 1.0, -14.5, -28.5, -41.5, -53.0, -63.5, -73.0, -81.5, -88.5, -94.5, -100.0, -104.0, -107.5, -110.5, -112.0, -113.5, -114.0, -114.0, -113.5, -112.5, -111.0, -109.0, 106.5, 104.0, 101.0, 98.0, 95.0, 91.5, 88.0, 84.5, 80.5, 77.0, 73.5, 69.5, 66.0, 62.5, 58.5, 55.5, 52.0, 48.5, 45.5, 42.5, 39.5, 36.5, 34.0, 31.5, 29.0, 26.5, 24.5, 22.5, 20.5, 19.0, 17.5, 15.5, 14.5, 13.0, 12.0, 10.5, 9.5, 8.5, 8.0, 7.0, 6.5, 5.5, 5.0, 4.5, 4.0, 3.5, 3.5, 3.0, 2.5, 2.5, 2.0, 2.0, 1.5, 1.5, 1.0, 1.0, 1.0, 1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);

// Quantizer lookup, step 1: bitrate classes
MP2.QUANT_LUT_STEP_1 = [
// 32, 48, 56, 64, 80, 96,112,128,160,192,224,256,320,384 <- bitrate
[0, 0, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
// mono
// 16, 24, 28, 32, 40, 48, 56, 64, 80, 96,112,128,160,192 <- bitrate / chan
[0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2] // stereo
];

// Quantizer lookup, step 2: bitrate class, sample rate -> B2 table idx, sblimit
MP2.QUANT_TAB = {
  A: 27 | 64,
  // Table 3-B.2a: high-rate, sblimit = 27
  B: 30 | 64,
  // Table 3-B.2b: high-rate, sblimit = 30
  C: 8,
  // Table 3-B.2c:  low-rate, sblimit =  8
  D: 12 // Table 3-B.2d:  low-rate, sblimit = 12
};
MP2.QUANT_LUT_STEP_2 = [
//   44.1 kHz,        48 kHz,          32 kHz
[MP2.QUANT_TAB.C, MP2.QUANT_TAB.C, MP2.QUANT_TAB.D],
// 32 - 48 kbit/sec/ch
[MP2.QUANT_TAB.A, MP2.QUANT_TAB.A, MP2.QUANT_TAB.A],
// 56 - 80 kbit/sec/ch
[MP2.QUANT_TAB.B, MP2.QUANT_TAB.A, MP2.QUANT_TAB.B] // 96+  kbit/sec/ch
];

// Quantizer lookup, step 3: B2 table, subband -> nbal, row index
// (upper 4 bits: nbal, lower 4 bits: row index)
MP2.QUANT_LUT_STEP_3 = [
// Low-rate table (3-B.2c and 3-B.2d)
[0x44, 0x44, 0x34, 0x34, 0x34, 0x34, 0x34, 0x34, 0x34, 0x34, 0x34, 0x34],
// High-rate table (3-B.2a and 3-B.2b)
[0x43, 0x43, 0x43, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20],
// MPEG-2 LSR table (B.2 in ISO 13818-3)
[0x45, 0x45, 0x45, 0x45, 0x34, 0x34, 0x34, 0x34, 0x34, 0x34, 0x34, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24]];

// Quantizer lookup, step 4: table row, allocation[] value -> quant table index
MP2.QUANT_LUT_STEP4 = [[0, 1, 2, 17], [0, 1, 2, 3, 4, 5, 6, 17], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17], [0, 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]];
MP2.QUANT_TAB = [{
  levels: 3,
  group: 1,
  bits: 5
},
//  1
{
  levels: 5,
  group: 1,
  bits: 7
},
//  2
{
  levels: 7,
  group: 0,
  bits: 3
},
//  3
{
  levels: 9,
  group: 1,
  bits: 10
},
//  4
{
  levels: 15,
  group: 0,
  bits: 4
},
//  5
{
  levels: 31,
  group: 0,
  bits: 5
},
//  6
{
  levels: 63,
  group: 0,
  bits: 6
},
//  7
{
  levels: 127,
  group: 0,
  bits: 7
},
//  8
{
  levels: 255,
  group: 0,
  bits: 8
},
//  9
{
  levels: 511,
  group: 0,
  bits: 9
},
// 10
{
  levels: 1023,
  group: 0,
  bits: 10
},
// 11
{
  levels: 2047,
  group: 0,
  bits: 11
},
// 12
{
  levels: 4095,
  group: 0,
  bits: 12
},
// 13
{
  levels: 8191,
  group: 0,
  bits: 13
},
// 14
{
  levels: 16383,
  group: 0,
  bits: 14
},
// 15
{
  levels: 32767,
  group: 0,
  bits: 15
},
// 16
{
  levels: 65535,
  group: 0,
  bits: 16
} // 17
];

var MP2WASM = /*#__PURE__*/function (_BaseDecoder) {
  function MP2WASM(options) {
    var _this;
    _this = _BaseDecoder.call(this, options) || this;
    _this.onDecodeCallback = options.onAudioDecode;
    _this.module = options.wasmModule;
    _this.bufferSize = options.audioBufferSize || 128 * 1024;
    _this.bufferMode = options.streaming ? BitBuffer.MODE.EVICT : BitBuffer.MODE.EXPAND;
    _this.sampleRate = 0;
    return _this;
  }
  _inheritsLoose(MP2WASM, _BaseDecoder);
  var _proto = MP2WASM.prototype;
  _proto.initializeWasmDecoder = function initializeWasmDecoder() {
    if (!this.module.instance) {
      console.warn('JSMpeg: WASM module not compiled yet');
      return;
    }
    this.instance = this.module.instance;
    this.functions = this.module.instance.exports;
    this.decoder = this.functions._mp2_decoder_create(this.bufferSize, this.bufferMode);
  };
  _proto.destroy = function destroy() {
    if (!this.decoder) {
      return;
    }
    this.functions._mp2_decoder_destroy(this.decoder);
  };
  _proto.bufferGetIndex = function bufferGetIndex() {
    if (!this.decoder) {
      return;
    }
    // eslint-disable-next-line consistent-return
    return this.functions._mp2_decoder_get_index(this.decoder);
  };
  _proto.bufferSetIndex = function bufferSetIndex(index) {
    if (!this.decoder) {
      return;
    }
    this.functions._mp2_decoder_set_index(this.decoder, index);
  };
  _proto.bufferWrite = function bufferWrite(buffers) {
    if (!this.decoder) {
      this.initializeWasmDecoder();
    }
    var totalLength = 0;
    for (var i = 0; i < buffers.length; i++) {
      totalLength += buffers[i].length;
    }
    var ptr = this.functions._mp2_decoder_get_write_ptr(this.decoder, totalLength);
    for (var _i = 0; _i < buffers.length; _i++) {
      this.instance.heapU8.set(buffers[_i], ptr);
      ptr += buffers[_i].length;
    }
    this.functions._mp2_decoder_did_write(this.decoder, totalLength);
    return totalLength;
  };
  _proto.decode = function decode() {
    var startTime = Now();
    if (!this.decoder) {
      return false;
    }
    var decodedBytes = this.functions._mp2_decoder_decode(this.decoder);
    if (decodedBytes === 0) {
      return false;
    }
    if (!this.sampleRate) {
      this.sampleRate = this.functions._mp2_decoder_get_sample_rate(this.decoder);
    }
    if (this.destination) {
      // Create a Float32 View into the modules output channel data
      var leftPtr = this.functions._mp2_decoder_get_left_channel_ptr(this.decoder);
      var rightPtr = this.functions._mp2_decoder_get_right_channel_ptr(this.decoder);
      var leftOffset = leftPtr / Float32Array.BYTES_PER_ELEMENT;
      var rightOffset = rightPtr / Float32Array.BYTES_PER_ELEMENT;
      var left = this.instance.heapF32.subarray(leftOffset, leftOffset + MP2WASM.SAMPLES_PER_FRAME);
      var right = this.instance.heapF32.subarray(rightOffset, rightOffset + MP2WASM.SAMPLES_PER_FRAME);
      this.destination.play(this.sampleRate, left, right);
    }
    this.advanceDecodedTime(MP2WASM.SAMPLES_PER_FRAME / this.sampleRate);
    var elapsedTime = Now() - startTime;
    if (this.onDecodeCallback) {
      this.onDecodeCallback(this, elapsedTime);
    }
    return true;
  };
  _proto.getCurrentTime = function getCurrentTime() {
    var enqueuedTime = this.destination ? this.destination.enqueuedTime : 0;
    return this.decodedTime - enqueuedTime;
  };
  return MP2WASM;
}(BaseDecoder);
MP2WASM.SAMPLES_PER_FRAME = 1152;

var WebGLRenderer = /*#__PURE__*/function () {
  function WebGLRenderer(options) {
    if (options.canvas) {
      this.canvas = options.canvas;
      this.ownsCanvasElement = false;
    } else {
      this.canvas = document.createElement('canvas');
      this.ownsCanvasElement = true;
    }
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.enabled = true;
    this.hasTextureData = {};
    var contextCreateOptions = {
      preserveDrawingBuffer: !!options.preserveDrawingBuffer,
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false
    };
    this.gl = this.canvas.getContext('webgl', contextCreateOptions) || this.canvas.getContext('experimental-webgl', contextCreateOptions);
    if (!this.gl) {
      throw new Error('Failed to get WebGL Context');
    }
    this.handleContextLostBound = this.handleContextLost.bind(this);
    this.handleContextRestoredBound = this.handleContextRestored.bind(this);
    this.canvas.addEventListener('webglcontextlost', this.handleContextLostBound, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestoredBound, false);
    this.initGL();
  }
  var _proto = WebGLRenderer.prototype;
  _proto.initGL = function initGL() {
    this.hasTextureData = {};
    var gl = this.gl;
    var vertexAttr = null;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    // Init buffers
    this.vertexBuffer = gl.createBuffer();
    var vertexCoords = new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexCoords, gl.STATIC_DRAW);

    // Setup the main YCrCbToRGBA shader
    this.program = this.createProgram(WebGLRenderer.SHADER.VERTEX_IDENTITY, WebGLRenderer.SHADER.FRAGMENT_YCRCB_TO_RGBA);
    vertexAttr = gl.getAttribLocation(this.program, 'vertex');
    gl.enableVertexAttribArray(vertexAttr);
    gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);
    this.textureY = this.createTexture(0, 'textureY');
    this.textureCb = this.createTexture(1, 'textureCb');
    this.textureCr = this.createTexture(2, 'textureCr');

    // Setup the loading animation shader
    this.loadingProgram = this.createProgram(WebGLRenderer.SHADER.VERTEX_IDENTITY, WebGLRenderer.SHADER.FRAGMENT_LOADING);
    vertexAttr = gl.getAttribLocation(this.loadingProgram, 'vertex');
    gl.enableVertexAttribArray(vertexAttr);
    gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);
    this.shouldCreateUnclampedViews = !this.allowsClampedTextureData();
  };
  _proto.handleContextLost = function handleContextLost(ev) {
    ev.preventDefault();
    this.contextLost = true;
  };
  _proto.handleContextRestored = function handleContextRestored() {
    this.initGL();
  };
  _proto.destroy = function destroy() {
    var gl = this.gl;
    this.deleteTexture(gl.TEXTURE0, this.textureY);
    this.deleteTexture(gl.TEXTURE1, this.textureCb);
    this.deleteTexture(gl.TEXTURE2, this.textureCr);
    gl.useProgram(null);
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.loadingProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(this.vertexBuffer);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLostBound, false);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestoredBound, false);
    if (this.ownsCanvasElement) {
      this.canvas.remove();
    }
  };
  _proto.resize = function resize(width, height) {
    this.width = width | 0;
    this.height = height | 0;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.gl.useProgram(this.program);
    var codedWidth = this.width + 15 >> 4 << 4;
    this.gl.viewport(0, 0, codedWidth, this.height);
  };
  _proto.createTexture = function createTexture(index, name) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(this.program, name), index);
    return texture;
  };
  _proto.createProgram = function createProgram(vsh, fsh) {
    var gl = this.gl;
    var program = gl.createProgram();
    gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, vsh));
    gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, fsh));
    gl.linkProgram(program);
    gl.useProgram(program);
    return program;
  };
  _proto.compileShader = function compileShader(type, source) {
    var gl = this.gl;
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };
  _proto.allowsClampedTextureData = function allowsClampedTextureData() {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8ClampedArray([0]));
    return gl.getError() === 0;
  };
  _proto.renderProgress = function renderProgress(progress) {
    var gl = this.gl;
    gl.useProgram(this.loadingProgram);
    var loc = gl.getUniformLocation(this.loadingProgram, 'progress');
    gl.uniform1f(loc, progress);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  _proto.render = function render(y, cb, cr, isClampedArray) {
    if (!this.enabled) {
      return;
    }
    var gl = this.gl;
    var w = this.width + 15 >> 4 << 4;
    var h = this.height;
    var w2 = w >> 1;
    var h2 = h >> 1;

    // In some browsers WebGL doesn't like Uint8ClampedArrays (this is a bug
    // and should be fixed soon-ish), so we have to create a Uint8Array view
    // for each plane.
    if (isClampedArray && this.shouldCreateUnclampedViews) {
      y = new Uint8Array(y.buffer);
      cb = new Uint8Array(cb.buffer);
      cr = new Uint8Array(cr.buffer);
    }
    gl.useProgram(this.program);
    this.updateTexture(gl.TEXTURE0, this.textureY, w, h, y);
    this.updateTexture(gl.TEXTURE1, this.textureCb, w2, h2, cb);
    this.updateTexture(gl.TEXTURE2, this.textureCr, w2, h2, cr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  _proto.updateTexture = function updateTexture(unit, texture, w, h, data) {
    var gl = this.gl;
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (this.hasTextureData[unit]) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
    } else {
      this.hasTextureData[unit] = true;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
    }
  };
  _proto.deleteTexture = function deleteTexture(unit, texture) {
    var gl = this.gl;
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(texture);
  };
  WebGLRenderer.IsSupported = function IsSupported() {
    try {
      if (!window.WebGLRenderingContext) {
        return false;
      }
      var canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (err) {
      return false;
    }
  };
  return WebGLRenderer;
}();
WebGLRenderer.SHADER = {
  FRAGMENT_YCRCB_TO_RGBA: ['precision mediump float;', 'uniform sampler2D textureY;', 'uniform sampler2D textureCb;', 'uniform sampler2D textureCr;', 'varying vec2 texCoord;', 'mat4 rec601 = mat4(', '1.16438,  0.00000,  1.59603, -0.87079,', '1.16438, -0.39176, -0.81297,  0.52959,', '1.16438,  2.01723,  0.00000, -1.08139,', '0, 0, 0, 1', ');', 'void main() {', 'float y = texture2D(textureY, texCoord).r;', 'float cb = texture2D(textureCb, texCoord).r;', 'float cr = texture2D(textureCr, texCoord).r;', 'gl_FragColor = vec4(y, cr, cb, 1.0) * rec601;', '}'].join('\n'),
  FRAGMENT_LOADING: ['precision mediump float;', 'uniform float progress;', 'varying vec2 texCoord;', 'void main() {', 'float c = ceil(progress-(1.0-texCoord.y));', 'gl_FragColor = vec4(c,c,c,1);', '}'].join('\n'),
  VERTEX_IDENTITY: ['attribute vec2 vertex;', 'varying vec2 texCoord;', 'void main() {', 'texCoord = vertex;', 'gl_Position = vec4((vertex * 2.0 - 1.0) * vec2(1, -1), 0.0, 1.0);', '}'].join('\n')
};

/* eslint class-methods-use-this: ["error", { "exceptMethods": ["destroy"] }] */
var CanvasRenderer = /*#__PURE__*/function () {
  function CanvasRenderer(options) {
    if (options.canvas) {
      this.canvas = options.canvas;
      this.ownsCanvasElement = false;
    } else {
      this.canvas = document.createElement('canvas');
      this.ownsCanvasElement = true;
    }
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.enabled = true;
    this.context = this.canvas.getContext('2d');
  }
  var _proto = CanvasRenderer.prototype;
  _proto.destroy = function destroy() {
    if (this.ownsCanvasElement) {
      this.canvas.remove();
    }
  };
  _proto.resize = function resize(width, height) {
    this.width = width | 0;
    this.height = height | 0;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.imageData = this.context.getImageData(0, 0, this.width, this.height);
    Fill(this.imageData.data, 255);
  };
  _proto.renderProgress = function renderProgress(progress) {
    var w = this.canvas.width;
    var h = this.canvas.height;
    var ctx = this.context;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, h - h * progress, w, h * progress);
  };
  _proto.render = function render(y, cb, cr) {
    this.YCbCrToRGBA(y, cb, cr, this.imageData.data);
    this.context.putImageData(this.imageData, 0, 0);
  };
  _proto.YCbCrToRGBA = function YCbCrToRGBA(y, cb, cr, rgba) {
    if (!this.enabled) {
      return;
    }

    // Chroma values are the same for each block of 4 pixels, so we proccess
    // 2 lines at a time, 2 neighboring pixels each.
    // I wish we could use 32bit writes to the RGBA buffer instead of writing
    // each byte separately, but we need the automatic clamping of the RGBA
    // buffer.

    var w = this.width + 15 >> 4 << 4;
    var w2 = w >> 1;
    var yIndex1 = 0;
    var yIndex2 = w;
    var yNext2Lines = w + (w - this.width);
    var cIndex = 0;
    var cNextLine = w2 - (this.width >> 1);
    var rgbaIndex1 = 0;
    var rgbaIndex2 = this.width * 4;
    var rgbaNext2Lines = this.width * 4;
    var cols = this.width >> 1;
    var rows = this.height >> 1;
    var ccb;
    var ccr;
    var r;
    var g;
    var b;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        ccb = cb[cIndex];
        ccr = cr[cIndex];
        cIndex++;
        r = ccb + (ccb * 103 >> 8) - 179;
        g = (ccr * 88 >> 8) - 44 + (ccb * 183 >> 8) - 91;
        b = ccr + (ccr * 198 >> 8) - 227;

        // Line 1
        var y1 = y[yIndex1++];
        var y2 = y[yIndex1++];
        rgba[rgbaIndex1] = y1 + r;
        rgba[rgbaIndex1 + 1] = y1 - g;
        rgba[rgbaIndex1 + 2] = y1 + b;
        rgba[rgbaIndex1 + 4] = y2 + r;
        rgba[rgbaIndex1 + 5] = y2 - g;
        rgba[rgbaIndex1 + 6] = y2 + b;
        rgbaIndex1 += 8;

        // Line 2
        var y3 = y[yIndex2++];
        var y4 = y[yIndex2++];
        rgba[rgbaIndex2] = y3 + r;
        rgba[rgbaIndex2 + 1] = y3 - g;
        rgba[rgbaIndex2 + 2] = y3 + b;
        rgba[rgbaIndex2 + 4] = y4 + r;
        rgba[rgbaIndex2 + 5] = y4 - g;
        rgba[rgbaIndex2 + 6] = y4 + b;
        rgbaIndex2 += 8;
      }
      yIndex1 += yNext2Lines;
      yIndex2 += yNext2Lines;
      rgbaIndex1 += rgbaNext2Lines;
      rgbaIndex2 += rgbaNext2Lines;
      cIndex += cNextLine;
    }
  };
  return CanvasRenderer;
}();

var WebAudioOut = /*#__PURE__*/function () {
  function WebAudioOut() {
    this.context = WebAudioOut.CachedContext = WebAudioOut.CachedContext || new (window.AudioContext || window.webkitAudioContext)();
    this.gain = this.context.createGain();
    this.destination = this.gain;

    // Keep track of the number of connections to this AudioContext, so we
    // can safely close() it when we're the only one connected to it.
    this.gain.connect(this.context.destination);
    this.context._connections = (this.context._connections || 0) + 1;
    this.startTime = 0;
    this.buffer = null;
    this.wallclockStartTime = 0;
    this.volume = 1;
    this.enabled = true;
    this.unlocked = !WebAudioOut.NeedsUnlocking();
    Object.defineProperty(this, 'enqueuedTime', {
      get: this.getEnqueuedTime
    });
  }
  var _proto = WebAudioOut.prototype;
  _proto.destroy = function destroy() {
    this.gain.disconnect();
    this.context._connections--;
    if (this.context._connections === 0) {
      this.context.close();
      WebAudioOut.CachedContext = null;
    }
  };
  _proto.play = function play(sampleRate, left, right) {
    if (!this.enabled) {
      return;
    }

    // If the context is not unlocked yet, we simply advance the start time
    // to "fake" actually playing audio. This will keep the video in sync.
    if (!this.unlocked) {
      var ts = Now();
      if (this.wallclockStartTime < ts) {
        this.wallclockStartTime = ts;
      }
      this.wallclockStartTime += left.length / sampleRate;
      return;
    }
    this.gain.gain.value = this.volume;
    var buffer = this.context.createBuffer(2, left.length, sampleRate);
    buffer.getChannelData(0).set(left);
    buffer.getChannelData(1).set(right);
    var source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.destination);
    var now = this.context.currentTime;
    var duration = buffer.duration;
    if (this.startTime < now) {
      this.startTime = now;
      this.wallclockStartTime = Now();
    }
    source.start(this.startTime);
    this.startTime += duration;
    this.wallclockStartTime += duration;
  };
  _proto.stop = function stop() {
    // Meh; there seems to be no simple way to get a list of currently
    // active source nodes from the Audio Context, and maintaining this
    // list ourselfs would be a pain, so we just set the gain to 0
    // to cut off all enqueued audio instantly.
    this.gain.gain.value = 0;
  };
  _proto.getEnqueuedTime = function getEnqueuedTime() {
    // The AudioContext.currentTime is only updated every so often, so if we
    // want to get exact timing, we need to rely on the system time.
    return Math.max(this.wallclockStartTime - Now(), 0);
  };
  _proto.resetEnqueuedTime = function resetEnqueuedTime() {
    this.startTime = this.context.currentTime;
    this.wallclockStartTime = Now();
  };
  _proto.unlock = function unlock(callback) {
    if (this.unlocked) {
      if (callback) {
        callback();
      }
      return;
    }
    this.unlockCallback = callback;

    // Create empty buffer and play it
    var buffer = this.context.createBuffer(1, 1, 22050);
    var source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.destination);

    // polyfill source.start(0);
    if (source.start) {
      source.start(0);
    } else {
      source.noteOn(0);
    }
    setTimeout(this.checkIfUnlocked.bind(this, source, 0), 0);
  };
  _proto.checkIfUnlocked = function checkIfUnlocked(source, attempt) {
    if (source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE) {
      this.unlocked = true;
      if (this.unlockCallback) {
        this.unlockCallback();
        this.unlockCallback = null;
      }
    } else if (attempt < 10) {
      // Jeez, what a shit show. Thanks iOS!
      setTimeout(this.checkIfUnlocked.bind(this, source, attempt + 1), 100);
    }
  };
  WebAudioOut.NeedsUnlocking = function NeedsUnlocking() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  };
  WebAudioOut.IsSupported = function IsSupported() {
    return window.AudioContext || window.webkitAudioContext;
  };
  return WebAudioOut;
}();
WebAudioOut.CachedContext = null;

var WASM = /*#__PURE__*/function () {
  function WASM() {
    this.stackSize = 5 * 1024 * 1024; // emscripten default
    this.pageSize = 64 * 1024; // wasm page size
    this.onInitCallbacks = [];
    this.ready = false;
    this.loadingFromFileStarted = false;
    this.loadingFromBufferStarted = false;
  }
  var _proto = WASM.prototype;
  _proto.write = function write(buffer) {
    this.loadFromBuffer(buffer);
  };
  _proto.loadFromFile = function loadFromFile(url, callback) {
    if (callback) {
      this.onInitCallbacks.push(callback);
    }

    // Make sure this WASM Module is only instantiated once. If loadFromFile()
    // was already called, bail out here. On instantiation all pending
    // onInitCallbacks will be called.
    if (this.loadingFromFileStarted) {
      return;
    }
    this.loadingFromFileStarted = true;
    this.onInitCallback = callback;
    var ajax = new AjaxSource(url, {});
    ajax.connect(this);
    ajax.start();
  };
  _proto.loadFromBuffer = function loadFromBuffer(buffer, callback) {
    var _this = this;
    if (callback) {
      this.onInitCallbacks.push(callback);
    }

    // Make sure this WASM Module is only instantiated once. If loadFromBuffer()
    // was already called, bail out here. On instantiation all pending
    // onInitCallbacks will be called.
    if (this.loadingFromBufferStarted) {
      return;
    }
    this.loadingFromBufferStarted = true;
    this.moduleInfo = this.readDylinkSection(buffer);
    if (!this.moduleInfo) {
      for (var i = 0; i < this.onInitCallbacks.length; i++) {
        this.onInitCallbacks[i](null);
      }
      return;
    }
    this.memory = new WebAssembly.Memory({
      initial: 256
    });
    var env = {
      memory: this.memory,
      memoryBase: 0,
      __memory_base: 0,
      table: new WebAssembly.Table({
        initial: this.moduleInfo.tableSize,
        element: 'anyfunc'
      }),
      tableBase: 0,
      __table_base: 0,
      abort: this.c_abort.bind(this),
      ___assert_fail: this.c_assertFail.bind(this),
      _sbrk: this.c_sbrk.bind(this)
    };
    this.brk = this.align(this.moduleInfo.memorySize + this.stackSize);
    WebAssembly.instantiate(buffer, {
      env: env
    }).then(function (results) {
      _this.instance = results.instance;
      if (_this.instance.exports.__post_instantiate) {
        _this.instance.exports.__post_instantiate();
      }
      _this.createHeapViews();
      _this.ready = true;
      for (var _i = 0; _i < _this.onInitCallbacks.length; _i++) {
        _this.onInitCallbacks[_i](_this);
      }
    });
  };
  _proto.createHeapViews = function createHeapViews() {
    this.instance.heapU8 = new Uint8Array(this.memory.buffer);
    this.instance.heapU32 = new Uint32Array(this.memory.buffer);
    this.instance.heapF32 = new Float32Array(this.memory.buffer);
  };
  _proto.align = function align(addr) {
    // eslint-disable-next-line no-restricted-properties
    var a = Math.pow(2, this.moduleInfo.memoryAlignment);
    return Math.ceil(addr / a) * a;
  };
  _proto.c_sbrk = function c_sbrk(size) {
    var previousBrk = this.brk;
    this.brk += size;
    if (this.brk > this.memory.buffer.byteLength) {
      var bytesNeeded = this.brk - this.memory.buffer.byteLength;
      var pagesNeeded = Math.ceil(bytesNeeded / this.pageSize);
      this.memory.grow(pagesNeeded);
      this.createHeapViews();
    }
    return previousBrk;
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  ;
  _proto.c_abort = function c_abort(size) {
    // eslint-disable-next-line prefer-rest-params
    console.warn('JSMPeg: WASM abort', arguments);
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  ;
  _proto.c_assertFail = function c_assertFail(size) {
    // eslint-disable-next-line prefer-rest-params
    console.warn('JSMPeg: WASM ___assert_fail', arguments);
  }

  // eslint-disable-next-line class-methods-use-this
  ;
  _proto.readDylinkSection = function readDylinkSection(buffer) {
    // Read the WASM header and dylink section of the .wasm binary data
    // to get the needed table size and static data size.

    // https://github.com/WebAssembly/tool-conventions/blob/master/DynamicLinking.md
    // https://github.com/kripken/emscripten/blob/20602efb955a7c6c20865a495932427e205651d2/src/support.js

    var bytes = new Uint8Array(buffer);
    var next = 0;
    var readVarUint = function readVarUint() {
      var ret = 0;
      var mul = 1;
      // eslint-disable-next-line no-constant-condition
      while (1) {
        var byte = bytes[next++];
        ret += (byte & 0x7f) * mul;
        mul *= 0x80;
        if (!(byte & 0x80)) {
          return ret;
        }
      }
    };
    var matchNextBytes = function matchNextBytes(expected) {
      for (var i = 0; i < expected.length; i++) {
        var b = typeof expected[i] === 'string' ? expected[i].charCodeAt(0) : expected[i];
        if (bytes[next++] !== b) {
          return false;
        }
      }
      return true;
    };

    // Make sure we have a wasm header
    if (!matchNextBytes([0, 'a', 's', 'm'])) {
      console.warn('JSMpeg: WASM header not found');
      return null;
    }

    // Make sure we have a dylink section
    next = 9;
    // eslint-disable-next-line no-unused-vars
    readVarUint();
    if (!matchNextBytes([6, 'd', 'y', 'l', 'i', 'n', 'k'])) {
      console.warn('JSMpeg: No dylink section found in WASM');
      return null;
    }
    return {
      memorySize: readVarUint(),
      memoryAlignment: readVarUint(),
      tableSize: readVarUint(),
      tableAlignment: readVarUint()
    };
  };
  WASM.IsSupported = function IsSupported() {
    return !!window.WebAssembly;
  };
  WASM.GetModule = function GetModule() {
    WASM.CACHED_MODULE = WASM.CACHED_MODULE || new WASM();
    return WASM.CACHED_MODULE;
  };
  return WASM;
}();

// get from jsmpeg
var WASM_BINARY = 'AGFzbQEAAAAADwZkeWxpbmuA0MACBAAAAAE0CWAEf39/fwBgAX8Bf2ACf38Bf2ABfwBgAn9/AGABfwF9YAZ/f39/f38AYAN/f38Bf2AAAAJGBANlbnYOX19fYXNzZXJ0X2ZhaWwAAANlbnYFX3NicmsAAQNlbnYNX19tZW1vcnlfYmFzZQN/AANlbnYGbWVtb3J5AgCAAgM9PAIDAgEEBAMBBQEBAQEBAQEDBAMGAwQAAwAAAAIDAgEEBAEBAQEBAAACAwIBAgECAQEBAQMEAwMCBwcHCAYLAn8BQQALfwFBAAsHggYfEl9fcG9zdF9pbnN0YW50aWF0ZQA9BV9mcmVlADgHX21hbGxvYwAxB19tZW1jcHkAOghfbWVtbW92ZQA7B19tZW1zZXQAPBNfbXAyX2RlY29kZXJfY3JlYXRlAB0TX21wMl9kZWNvZGVyX2RlY29kZQAmFF9tcDJfZGVjb2Rlcl9kZXN0cm95AB4WX21wMl9kZWNvZGVyX2RpZF93cml0ZQAiFl9tcDJfZGVjb2Rlcl9nZXRfaW5kZXgAICFfbXAyX2RlY29kZXJfZ2V0X2xlZnRfY2hhbm5lbF9wdHIAJCJfbXAyX2RlY29kZXJfZ2V0X3JpZ2h0X2NoYW5uZWxfcHRyACUcX21wMl9kZWNvZGVyX2dldF9zYW1wbGVfcmF0ZQAjGl9tcDJfZGVjb2Rlcl9nZXRfd3JpdGVfcHRyAB8WX21wMl9kZWNvZGVyX3NldF9pbmRleAAhFV9tcGVnMV9kZWNvZGVyX2NyZWF0ZQACFV9tcGVnMV9kZWNvZGVyX2RlY29kZQARFl9tcGVnMV9kZWNvZGVyX2Rlc3Ryb3kAAxhfbXBlZzFfZGVjb2Rlcl9kaWRfd3JpdGUABxlfbXBlZzFfZGVjb2Rlcl9nZXRfY2JfcHRyABAdX21wZWcxX2RlY29kZXJfZ2V0X2NvZGVkX3NpemUACxlfbXBlZzFfZGVjb2Rlcl9nZXRfY3JfcHRyAA8dX21wZWcxX2RlY29kZXJfZ2V0X2ZyYW1lX3JhdGUAChlfbXBlZzFfZGVjb2Rlcl9nZXRfaGVpZ2h0AA0YX21wZWcxX2RlY29kZXJfZ2V0X2luZGV4AAUYX21wZWcxX2RlY29kZXJfZ2V0X3dpZHRoAAwcX21wZWcxX2RlY29kZXJfZ2V0X3dy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BQJ/IANBzQBHDQIgACgCgAFBBhAwIQMCQAJAIAAoAoABQQgQMCIEIgYEQCAGQYABRgRADAIFDAMLAAsgACgCgAFBCBAwDAILIAAoAoABQQgQMEGAfmoMAQsgBEGAfmogBCAEQYABShsLCyEEDAELIAZB/wFxIgNBACADayAAKAKAAUEBEDBFGyEEIAZBCHUhAwsgAiADaiIGIwBBQGtqLQAAIgMgBWotAAAgACgCREEAIARBAXQiAkEfdUEBciAAKAJcGyACamxsIgJBBHVBAEEBQX8gAkEPShsgAkEQcRtrIgJBgHAgAkGAcEobIQIgAEGcAWogA0ECdGogAyMAQZA1amotAAAgAkH/DyACQf8PSBtsNgIAIAZBAWohAgwBCwsgAUEESARAIABBhAFqIQUgAUEDdEEIcSAAKAJUIAAoAhgiAyAAKAJQbGpBBHRyIANBA3RBACABQQJxG2ohBAUgAEGMAWogAEGIAWogAUEERhshBSAAKAJQIAAoAhgiAUECdGwgACgCVEEDdGohBCABQQF1IQMLIANBeGohAyAFKAIAIQUgAkEBRiECIABBnAFqIQEgACgCXARAIAIEQCABKAIAQYABakEIdSAFIAQgAxAYIAFBADYCAAUgARAZIAEgBSAEIAMQGiABQQBBgAIQPBoLBSACBEAgASgCAEGAAWpBCHUgBSAEIAMQGyABQQA2AgAFIAEQGSABIAUgBCADEBwgAUEAQYACEDwaCwsL7AYAIAEgAmogAEEAIABBAEobIgBB/wEgAEH/AUgbQf8BcSIAOgAAIAEgAkEBamogADoAACABIAJBAmpqIAA6AAAgASACQQNqaiAAOgAAIAEgAkEEamogADoAACABIAJBBWpqIAA6AAAgASACQQZqaiAAOgAAIAEgAkEHamogADoAACABIAIgA0EIaiIDaiICaiAAOgAAIAEgAkEBamogADoAACABIAJBAmpqIAA6AAAgASACQQNqaiAAOgAAIAEgAkEEamogADoAACABIAJBBWpqIAA6AAAgASACQQZqaiAAOgAAIAEgAkEHamogADoAACABIAIgA2oiAmogADoAACABIAJBAWpqIAA6AAAgASACQQJqaiAAOgAAIAEgAkEDamogADoAACABIAJBBGpqIAA6AAAgASACQQVqaiAAOgAAIAEgAkEGamogADoAACABIAJBB2pqIAA6AAAgASACIANqIgJqIAA6AAAgASACQQFqaiAAOgAAIAEgAkECamogADoAACABIAJBA2pqIAA6AAAgASACQQRqaiAAOgAAIAEgAkEFamogADoAACABIAJBBmpqIAA6AAAgASACQQdqaiAAOgAAIAEgAiADaiICaiAAOgAAIAEgAkEBamogADoAACABIAJBAmpqIAA6AAAgASACQQNqaiAAOgAAIAEgAkEEamogADoAACABIAJBBWpqIAA6AAAgASACQQZqaiAAOgAAIAEgAkEHamogADoAACABIAIgA2oiAmogADoAACABIAJBAWpqIAA6AAAgASACQQJqaiAAOgAAIAEgAkEDamogADoAACABIAJBBGpqIAA6AAAgASACQQVqaiAAOgAAIAEgAkEGamogADoAACABIAJBB2pqIAA6AAAgASACIANqIgJqIAA6AAAgASACQQFqaiAAOgAAIAEgAkECamogADoAACABIAJBA2pqIAA6AAAgASACQQRqaiAAOgAAIAEgAkEFamogADoAACABIAJBBmpqIAA6AAAgASACQQdqaiAAOgAAIAEgAiADaiICaiAAOgAAIAEgAkEBamogADoAACABIAJBAmpqIAA6AAAgASACQQNqaiAAOgAAIAEgAkEEamogADoAACABIAJBBWpqIAA6AAAgASACQQZqaiAAOgAAIAEgAkEHamogADoAAAubBgEUfwNAIAFBEGpBAnQgAGoiBygCACIGIAFBMGpBAnQgAGoiDSgCACIJaiEFIAFBCGpBAnQgAGoiDigCACICIAFBOGpBAnQgAGoiDygCACIDaiEEIAIgA2siEEHZA2wgAUEoakECdCAAaiIKKAIAIgIgAUEYakECdCAAaiIRKAIAIgNrIgtBvH5sQYABampBCHUgBCACIANqIghqIgJrIgMgBCAIa0HqAmxBgAFqQQh1ayEEIAFBAnQgAGoiCCgCACIMIAFBIGpBAnQgAGoiEigCACITayIUIAYgCWtB6gJsQYABakEIdSAFayIJaiEGIAggAiAMIBNqIgggBWoiDGo2AgAgDiADIAZqNgIAIAcgFCAJayIHIARrNgIAIBEgC0HZA2xBgAFqIBBBxAFsakEIdSAEaiIJIAggBWsiBWo2AgAgEiAFIAlrNgIAIAogBCAHajYCACANIAYgA2s2AgAgDyAMIAJr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aiABQQxsaiAAKAIIQQYQMCICNgLUAiAAIANBgANsaiABQQxsaiACNgLQAiAFIAI2AgAMAgsgBSAAKAIIQQYQMDYCACAAIANBgANsaiABQQxsaiAAKAIIQQYQMCICNgLUAiAAIANBgANsaiABQQxsaiACNgLQAgsLCyADQQFqIgMgCEkNAAsgAUEBaiIBIAtHDQALCwsLaiALQSBJIRsgAEHMtgFqIQQgAEHMCGohHCAAQcz2AGohHSAAQcwLaiEeIABBzJYBaiEfA0BBACEWIBQhAwNAIBgEQEEAIQEDQCAAQQAgASAOECggAEEBIAEgDhAoIAFBAWoiASANSA0ACwsgGQRAIA0hAQNAIABBACABIA4QKCAAQcwLaiABQQxsaiAAQcwIaiABQQxsaigCADYCACAAIAFBDGxqQdALaiAAIAFBDGxqQdAIaigCADYCACAAIAFBDGxqQdQLaiAAIAFBDGxqQdQIaigCADYCACABQQFqIgEgC0gNAAsLIBsEQCALIQEDQCAAQcwIaiABQQxsakEANgIAIAAgAUEMbGpB0AhqQQA2AgAgACABQQxsakHUCGpBADYCACAAQcwLaiABQQxsakEANgIAIAAgAUEMbGpB0AtqQQA2AgAgACABQQxsakHUC2pBADYCACABQQFqIgFBIEcNAAsLIAAoAgQhASADIRFBACESA0AgACABQcAHakH/B3EiATYCBCAcIBIgHSABECkgBEIANwIAIARCADcCCCAEQgA3AhAgBEIANwIYIARCADcCICAEQgA3AiggBEIANwIwIARCADcCOCAEQUBrQgA3AgAgBEIANwJIIARCADcCUCAEQgA3AlggBEIANwJgIARCADcCaCAEQgA3AnAgBEIANwJ4IAAoAgQiD0EBdSETQf8HIA9BgAFvQQF1IgxrIgFBgH9xIRUgAUEHdkEGdEHABGohEEGABCATayEGIAwhAQNAIAYhB0EAIQkgASECA0AgB0EBaiEIIAJBAWohBSAAQcy2AWogCUECdGoiCiAAQczWAGogB0ECdGoqAgAgAEHM9gBqIAJBAnRqKgIAlCAKKAIAspKoNgIAIAlBAWoiCUEgRwRAIAghByAFIQIMAQsLIAFBgAFqIQIgBkFAayEGIAFBgAdIBEAgAiEBDAELC0HgByAMIBVqayIBQYAISARAIBAgE2tBoHxqIQYD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IkogWCBLk7tEujBFka7n9D+itiJLk7tEuEt/Zp6g5j+itiI6kiEqIANBMGpBAnQgAmogTSA8kow4AgAgA0EvakECdCACaiApICiSIEwgSZIgJJIiKJKMIik4AgAgA0ExakECdCACaiApOAIAIANBLmpBAnQgAmogRiBFkiAjkowiKTgCACADQTJqQQJ0IAJqICk4AgAgA0EtakECdCACaiAwIC2SIEAgPpIgJpIiKZIiPCAokowiKDgCACADQTNqQQJ0IAJqICg4AgAgA0EsakECdCACaiA2IE+SIFEgUJIgNZIiKJKMIjY4AgAgA0E0akECdCACaiA2OAIAIANBK2pBAnQgAmogPCA/IDiSIDOSIjwgJJIiJJKMIjY4AgAgA0E1akECdCACaiA2OAIAIANBKmpBAnQgAmogPSBSkiA7kiI9ICOSjCIjOAIAIANBNmpBAnQgAmogIzgCACADQSlqQQJ0IAJqIEsgSpIgOpIiIyAkkowiJDgCACADQTdqQQJ0IAJqICQ4AgAgA0EoakECdCACaiBIIE6SIDGSjCIkOAIAIANBOGpBAnQgAmogJDgCACADQSdqQQJ0IAJqICMgPCArkiIjkowiJDgCACADQTlqQQJ0IAJqICQ4AgAgA0EmakECdCACaiA9ICeSjCIkOAIAIANBOmpBAnQgAmogJDgCACADQSVqQQJ0IAJqICkgLSAwk7tEuEt/Zp6g5j+itiIpkiItICOSjCIjOAIAIANBO2pBAnQgAmogIzgCACADQSRqQQJ0IAJqICggR5KMIiM4AgAgA0E8akECdCACaiAjOAIAIANBI2pBAnQgAmogLSArIDKSIiOSjCIoOAIAIANBPWpBAnQgAmogKDgCACADQSJqQQJ0IAJqICcgU5KMIic4AgAgA0E+akECdCACaiAnOAIAIANBIWpBAnQgAmogIyBCkowiIzgCACADQT9qQQJ0IAJqICM4AgAgA0EgakECdCACaiA0jDgCACADQQJ0IAJqIDQ4AgAgA0EfakECdCACaiAsjDgCACADQQFqQQJ0IAJqICw4AgAgA0EeakECdCACaiA5jDgCACADQQJqQQJ0IAJqIDk4AgAgA0EdakECdCACaiApICaSIjQgQZIiI4w4AgAgA0EDakECdCACaiAjOAIAIANBHGpBAnQgAmogL4w4AgAgA0EEakECdCACaiAvOAIAIANBG2pBAnQgAmogNCA3IDOSIjSSIi+MOAIAIANBBWpBAnQgAmogLzgCACADQRpqQQJ0IAJqIEQgO5IiL4w4AgAgA0EGakECdCACaiAvOAIAIANBGWpBAnQgAmogNCA6kiI0jDgCACADQQdqQQJ0IAJqIDQ4AgAgA0EYakECdCACaiAxjDgCACADQQhqQQJ0IAJqIDE4AgAgA0EXakECdCACaiAqjDgCACADQQlqQQJ0IAJqICo4AgAgA0EWakECdCACaiA7IC6SIjGMOAIAIANBCmpBAnQgAmogMTgCACADQRVqQQJ0IAJqIEMgJpIiMYw4AgAgA0ELakECdCACaiAxOAIAIANBFGpBAnQgAmogNYw4AgAgA0EMakECdCACaiA1OAIAIANBE2pBAnQgAmogJiAlkiImjDgCACADQQ1qQQJ0IAJqICY4AgAgA0ESakECdCACaiAujDgCACADQQ5qQQJ0IAJqIC44AgAgA0ERakECdCACaiAljDgCACADQQ9qQQJ0IAJqICU4AgAgA0EQakECdCACakMAAAAAOAIACy8BAX9BFBAxIgIgATYCECACIAAQMTYCACACIAA2AgggAkEANgIMIAJBADYCBCACCw0AIAAoAgAQOCAAEDgL6QEBBH8gACgCCCIDIAAoAgwiAmsiBCABSQRAAkAgACgCEEECRgRAIAAgACgCACABIARrIANBAXQiAiACIARqIAFJGyIBEDk2AgAgACABNgIIIAAoAgQgACgCDCIBQQN0IgJNDQEgACACNgIEDAELIAIgACgCBCIFQQN2IgNGIAMgBGogAUlyBEAgAEEANgIMIABBADYCBEEAIQEMAQsgAwRAIAAoAgAiASABIANqIAIgA2sQOxogACAAKAIMIANrIgE2AgwgACAAKAIEIAVBeHFrNgIEBSACIQELCwUgAiEBCyAAKAIAIAFqC40BAQR/IAAoAgRBB2pBA3YiASAAKAIMIgRJBEACQCAAKAIAIQIDQAJAIAFBAWohAyABIAJqLAAARQRAIAIgA2osAABFBEAgAiABQQJqaiwAAEEBRg0CCwsgAyAETw0CIAMhAQwBCwsgACABQQN0QSBqNgIEIAIgAUEDamotAAAPCwsgACAEQQN0NgIEQX8LqQEBBH8gACgCBEEHakEDdiICIAAoAgwiBUkEQAJAIAAoAgAh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aiIGQRBLDQALIAMgCWohAyAIayECIQEMAgsgAyABKAIAIgU6AAAgAyABLAABOgABIAJBbGpBcHEiCEESaiIJIAFqIAJBbmogA0ECaiEEIAJBfmohBiABQQJqIQIgBSEBA0AgBCACKAICIgVBEHQgAUEQdnI2AgAgBCACKAIGIgFBEHQgBUEQdnI2AgQgBCACKAIKIgVBEHQgAUEQdnI2AgggBCACKAIOIgFBEHQgBUEQdnI2AgwgAkEQaiECIARBEGohBCAGQXBqIgZBEUsNAAsgAyAJaiEDIAhrIQIhAQwBCyADIAEoAgAiBToAACACQWxqQXBxIghBEWoiCSABaiACQW9qIANBAWohBCACQX9qIQYgAUEBaiECIAUhAQNAIAQgAigCAyIFQRh0IAFBCHZyNgIAIAQgAigCByIBQRh0IAVBCHZyNgIEIAQgAigCCyIFQRh0IAFBCHZyNgIIIAQgAigCDyIBQRh0IAVBCHZyNgIMIAJBEGohAiAEQRBqIQQgBkFwaiIGQRJLDQALIAMgCWohAyAIayECIQELCyACQRBxBEAgAyABLAAAOgAAIAMgASwAAToAASADIAEsAAI6AAIgAyABLAADOgADIAMgASwABDoABCADIAEsAAU6AAUgAyABLAAGOgAGIAMgASwABzoAByADIAEsAAg6AAggAyABLAAJOgAJIAMgASwACjoACiADIAEsAAs6AAsgAyABLAAMOgAMIAMgASwADToADSADIAEsAA46AA4gAyABLAAPOgAPIANBEGohAyABQRBqIQELIAJBCHEEQCADIAEsAAA6AAAgAyABLAABOgABIAMgASwAAjoAAiADIAEsAAM6AAMgAyABLAAEOgAEIAMgASwABToABSADIAEsAAY6AAYgAyABLAAHOgAHIANBCGohAyABQQhqIQELIAJBBHEEQCADIAEsAAA6AAAgAyABLAABOgABIAMgASwAAjoAAiADIAEsAAM6AAMgA0EEaiEDIAFBBGohAQsgAkECcQRAIAMgASwAADoAACADIAEsAAE6AAEgA0ECaiEDIAFBAmohAQsgAkEBcUUEQCAADwsgAyABLAAAOgAAIAALwAMBBn8gACABRgRAIAAPCyABIAJqIABLIAAgAmoiBSABS3FFBEAgACABIAIQOhogAA8LIAEgACIDc0EDcUUhBCADIAFJBH8g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JCQkJCQkJCQkJCQkJCQkJCQAAAABAhEAAAAAAAAAAAAAAAAAAQIDBAUGEQAAAAAAAAAAAAECAwQFBgcICQoLDA0OEQABAwUGBwgJCgsMDQ4PEBEAAQIEBQYHCAkKCwwNDg8RAAECAwQFBgcICQoLDA0ODwMAAQUFAAEHBwAAAwkAAQoPAAAEHwAABT8AAAZ/AAAH/wAACP8BAAn/AwAK/wcAC/8PAAz/HwAN/z8ADv9/AA///wAQAAAAAAAAAAAAAAAAAAAAAupflgEwikIBCAgMW1tbXltec2l6ZSA+IDAAL2hvbWUvZG9taW5pYy9wcm9qZWN0cy9lbXNkay9mYXN0Y29tcC9lbXNjcmlwdGVuL3N5c3RlbS9saWIvZW1tYWxsb2MuY3BwAGdldEZyZWVMaXN0SW5kZXgATUlOX0ZSRUVMSVNUX0lOREVYIDw9IGluZGV4ICYmIGluZGV4IDwgTUFYX0ZSRUVMSVNUX0lOREVYAGdldEFmdGVyKHJlZ2lvbikgPD0gc2JyaygwKQBlbW1hbGxvY19tYWxsb2MAcmVnaW9uLT5nZXRVc2VkKCkAZ2V0UGF5bG9hZAAoY2hhciopZXh0cmFQdHIgPT0gKGNoYXIqKXB0ciArIHNicmtTaXplAGFsbG9jYXRlUmVnaW9uACFsYXN0UmVnaW9uACFmaXJzdFJlZ2lvbgBmaXJzdFJlZ2lvbgBwdHIgPT0gZ2V0QWZ0ZXIobGFzdFJlZ2lvbikAZXh0ZW5kTGFzdFJlZ2lvbgBhZGRUb0ZyZWVMaXN0AGdldEJpZ0Vub3VnaEZyZWVMaXN0SW5kZXgAcGF5bG9hZFNpemUgPj0gc2l6ZQBwb3NzaWJseVNwbGl0UmVtYWluZGVyAGV4dHJhID49IE1JTl9SRUdJT05fU0laRQB0b3RhbFNwbGl0U2l6ZSA+PSBNSU5fUkVHSU9OX1NJWkUAbWVyZ2VJbnRvRXhpc3RpbmdGcmVlUmVnaW9uAHJlZ2lvbiA9PSBsYXN0UmVnaW9uAGVtbWFsbG9jX3JlYWxsb2M=';

var Player = /*#__PURE__*/function () {
  /**
   * @param url
   * @param options
   * @param hooks (play: function, pause: function, stop: function) 插入UI回调
   * @constructor
   */
  function Player(url, options, hooks) {
    var _this = this;
    if (options === void 0) {
      options = {};
    }
    if (hooks === void 0) {
      hooks = {};
    }
    this.options = options;
    this.hooks = hooks;
    this.options.hookOnEstablished = function () {
      if (_this.hooks.load) {
        _this.hooks.load();
      }
    };
    if (options.source) {
      // eslint-disable-next-line new-cap
      this.source = new options.source(url, this.options);
      options.streaming = !!this.source.streaming;
    } else if (url.match(/^wss?:\/\//)) {
      this.source = new WSSource(url, this.options);
      options.streaming = true;
    } else if (options.progressive) {
      this.source = new AjaxProgressiveSource(url, this.options);
      options.streaming = false;
    } else {
      this.source = new AjaxSource(url, this.options);
      options.streaming = false;
    }
    this.maxAudioLag = options.maxAudioLag || 0.25;
    this.loop = options.loop !== false;
    this.autoplay = !!options.autoplay || options.streaming;
    this.demuxer = new TS(options);
    this.source.connect(this.demuxer);
    if (!options.disableWebAssembly && WASM.IsSupported()) {
      this.wasmModule = WASM.GetModule();
      options.wasmModule = this.wasmModule;
    }
    if (options.video !== false) {
      this.video = options.wasmModule ? new MPEG1WASM(options) : new MPEG1(options);
      this.renderer = !options.disableGl && WebGLRenderer.IsSupported() ? new WebGLRenderer(options) : new CanvasRenderer(options);
      this.demuxer.connect(TS.STREAM.VIDEO_1, this.video);
      this.video.connect(this.renderer);
    }
    if (options.audio !== false && WebAudioOut.IsSupported()) {
      this.audio = options.wasmModule ? new MP2WASM(options) : new MP2(options);
      this.audioOut = new WebAudioOut(options);
      this.demuxer.connect(TS.STREAM.AUDIO_1, this.audio);
      this.audio.connect(this.audioOut);
    }
    Object.defineProperty(this, 'currentTime', {
      get: this.getCurrentTime,
      set: this.setCurrentTime
    });
    Object.defineProperty(this, 'volume', {
      get: this.getVolume,
      set: this.setVolume
    });
    this.paused = true;
    this.unpauseOnShow = false;
    if (options.pauseWhenHidden !== false) {
      document.addEventListener('visibilitychange', this.showHide.bind(this));
    }

    // If we have WebAssembly support, wait until the module is compiled before
    // loading the source. Otherwise the decoders won't know what to do with
    // the source data.
    if (this.wasmModule) {
      if (this.wasmModule.ready) {
        this.startLoading();
      } else {
        var wasm = Base64ToArrayBuffer(WASM_BINARY);
        this.wasmModule.loadFromBuffer(wasm, this.startLoading.bind(this));
      }
    } else {
      this.startLoading();
    }
  }
  var _proto = Player.prototype;
  _proto.startLoading = function startLoading() {
    this.source.start();
    if (this.autoplay) {
      this.play();
    }
  };
  _proto.showHide = function showHide() {
    if (document.visibilityState === 'hidden') {
      this.unpauseOnShow = this.wantsToPlay;
      this.pause();
    } else if (this.unpauseOnShow) {
      this.play();
    }
  };
  _proto.play = function play() {
    if (this.animationId) {
      return;
    }
    this.animationId = requestAnimationFrame(this.update.bind(this));
    this.wantsToPlay = true;
    this.paused = false;
  };
  _proto.pause = function pause() {
    if (this.paused) {
      return;
    }
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
    this.wantsToPlay = false;
    this.isPlaying = false;
    this.paused = true;
    if (this.audio && this.audio.canPlay) {
      // Seek to the currentTime again - audio may already be enqueued a bit
      // further, so we have to rewind it.
      this.audioOut.stop();
      this.seek(this.currentTime);
    }
    if (this.hooks.pause) {
      this.hooks.pause();
    }
    if (this.options.onPause) {
      this.options.onPause(this);
    }
  };
  _proto.getVolume = function getVolume() {
    return this.audioOut ? this.audioOut.volume : 0;
  };
  _proto.setVolume = function setVolume(volume) {
    if (this.audioOut) {
      this.audioOut.volume = volume;
    }
  };
  _proto.stop = function stop() {
    this.pause();
    this.seek(0);
    if (this.video && this.options.decodeFirstFrame !== false) {
      this.video.decode();
    }
    if (this.hooks.stop) {
      this.hooks.stop();
    }
  };
  _proto.destroy = function destroy() {
    this.pause();
    this.source.destroy();
    this.video && this.video.destroy();
    this.renderer && this.renderer.destroy();
    this.audio && this.audio.destroy();
    this.audioOut && this.audioOut.destroy();
  };
  _proto.seek = function seek(time) {
    var startOffset = this.audio && this.audio.canPlay ? this.audio.startTime : this.video.startTime;
    if (this.video) {
      this.video.seek(time + startOffset);
    }
    if (this.audio) {
      this.audio.seek(time + startOffset);
    }
    this.startTime = Now() - time;
  };
  _proto.getCurrentTime = function getCurrentTime() {
    return this.audio && this.audio.canPlay ? this.audio.currentTime - this.audio.startTime : this.video.currentTime - this.video.startTime;
  };
  _proto.setCurrentTime = function setCurrentTime(time) {
    this.seek(time);
  };
  _proto.update = function update() {
    this.animationId = requestAnimationFrame(this.update.bind(this));
    if (!this.source.established) {
      if (this.renderer) {
        this.renderer.renderProgress(this.source.progress);
      }
      return;
    }
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.startTime = Now() - this.currentTime;
      if (this.hooks.play) {
        this.hooks.play();
      }
      if (this.options.onPlay) {
        this.options.onPlay(this);
      }
    }
    if (this.options.streaming) {
      this.updateForStreaming();
    } else {
      this.updateForStaticFile();
    }
  };
  _proto.nextFrame = function nextFrame() {
    if (this.source.established && this.video) {
      return this.video.decode();
    }
    return false;
  };
  _proto.updateForStreaming = function updateForStreaming() {
    // When streaming, immediately decode everything we have buffered up until
    // now to minimize playback latency.

    if (this.video) {
      this.video.decode();
    }
    if (this.audio) {
      var decoded = false;
      do {
        // If there's a lot of audio enqueued already, disable output and
        // catch up with the encoding.
        if (this.audioOut.enqueuedTime > this.maxAudioLag) {
          this.audioOut.resetEnqueuedTime();
          this.audioOut.enabled = false;
        }
        decoded = this.audio.decode();
      } while (decoded);
      this.audioOut.enabled = true;
    }
  };
  _proto.updateForStaticFile = function updateForStaticFile() {
    var notEnoughData = false;
    var headroom = 0;

    // If we have an audio track, we always try to sync the video to the audio.
    // Gaps and discontinuities are far more percetable in audio than in video.

    if (this.audio && this.audio.canPlay) {
      // Do we have to decode and enqueue some more audio data?
      while (!notEnoughData && this.audio.decodedTime - this.audio.currentTime < 0.25) {
        notEnoughData = !this.audio.decode();
      }

      // Sync video to audio
      if (this.video && this.video.currentTime < this.audio.currentTime) {
        notEnoughData = !this.video.decode();
      }
      headroom = this.demuxer.currentTime - this.audio.currentTime;
    } else if (this.video) {
      // Video only - sync it to player's wallclock
      var targetTime = Now() - this.startTime + this.video.startTime;
      var lateTime = targetTime - this.video.currentTime;
      var frameTime = 1 / this.video.frameRate;
      if (this.video && lateTime > 0) {
        // If the video is too far behind (>2 frames), simply reset the
        // target time to the next frame instead of trying to catch up.
        if (lateTime > frameTime * 2) {
          this.startTime += lateTime;
        }
        notEnoughData = !this.video.decode();
      }
      headroom = this.demuxer.currentTime - targetTime;
    }

    // Notify the source of the playhead headroom, so it can decide whether to
    // continue loading further data.
    this.source.resume(headroom);

    // If we failed to decode and the source is complete, it means we reached
    // the end of our data. We may want to loop.
    if (notEnoughData && this.source.completed) {
      if (this.loop) {
        this.seek(0);
      } else {
        // this.pause();
        this.stop();
        if (this.options.onEnded) {
          this.options.onEnded(this);
        }
      }
    } else if (notEnoughData && this.options.onStalled) {
      // If there's not enough data and the source is not completed, we have
      // just stalled.
      this.options.onStalled(this);
    }
  };
  return Player;
}();

/* eslint class-methods-use-this: ["error", { "exceptMethods": ["resume"] }] */
var FetchSource = /*#__PURE__*/function () {
  function FetchSource(url, options) {
    this.url = url;
    this.destination = null;
    this.request = null;
    this.streaming = true;
    this.completed = false;
    this.established = false;
    this.progress = 0;
    this.aborted = false;
    this.onEstablishedCallback = options.onSourceEstablished;
    this.onCompletedCallback = options.onSourceCompleted;
    if (options.hookOnEstablished) {
      this.hookOnEstablished = options.hookOnEstablished;
    }
  }
  var _proto = FetchSource.prototype;
  _proto.connect = function connect(destination) {
    this.destination = destination;
  };
  _proto.start = function start() {
    var _this = this;
    var params = {
      method: 'GET',
      headers: new Headers(),
      cache: 'default'
    };

    // eslint-disable-next-line no-restricted-globals
    self.fetch(this.url, params)
    // eslint-disable-next-line consistent-return
    .then(function (res) {
      if (res.ok && res.status >= 200 && res.status <= 299) {
        _this.progress = 1;
        _this.established = true;
        return _this.pump(res.body.getReader());
      }
      // error
    }).catch(function (err) {
      throw err;
    });
  };
  _proto.pump = function pump(reader) {
    var _this2 = this;
    return reader.read()
    // eslint-disable-next-line consistent-return
    .then(function (result) {
      if (result.done) {
        _this2.completed = true;
      } else {
        if (_this2.aborted) {
          return reader.cancel();
        }
        if (_this2.destination) {
          _this2.destination.write(result.value.buffer);
        }
        return _this2.pump(reader);
      }
    }).catch(function (err) {
      throw err;
    });
  };
  _proto.resume = function resume() {
    // Nothing to do here
  };
  _proto.abort = function abort() {
    this.aborted = true;
  };
  return FetchSource;
}();

/**
 * According to jsmpeg project(https://github.com/phoboslab/jsmpeg)
 */


// This sets up the JSMpeg "Namespace". The object is empty apart from the Now()
// utility function and the automatic CreateVideoElements() after DOMReady.
var JSMpeg = {
  // The Player sets up the connections between source, demuxer, decoders,
  // renderer and audio output. It ties everything together, is responsible
  // of scheduling decoding and provides some convenience methods for
  // external users.
  Player: Player,
  // A Video Element wraps the Player, shows HTML controls to start/pause
  // the video and handles Audio unlocking on iOS. VideoElements can be
  // created directly in HTML using the <div class="jsmpeg"/> tag.
  VideoElement: VideoElement,
  // The BitBuffer wraps a Uint8Array and allows reading an arbitrary number
  // of bits at a time. On writing, the BitBuffer either expands its
  // internal buffer (for static files) or deletes old data (for streaming).
  BitBuffer: BitBuffer,
  // A Source provides raw data from HTTP, a WebSocket connection or any
  // other mean. Sources must support the following API:
  //   .connect(destinationNode)
  //   .write(buffer)
  //   .start() - start reading
  //   .resume(headroom) - continue reading; headroom to play pos in seconds
  //   .established - boolean, true after connection is established
  //   .completed - boolean, true if the source is completely loaded
  //   .progress - float 0-1
  Source: {
    Ajax: AjaxSource,
    AjaxProgressive: AjaxProgressiveSource,
    WebSocket: WSSource,
    Fetch: FetchSource
  },
  // A Demuxer may sit between a Source and a Decoder. It separates the
  // incoming raw data into Video, Audio and other Streams. API:
  //   .connect(streamId, destinationNode)
  //   .write(buffer)
  //   .currentTime – float, in seconds
  //   .startTime - float, in seconds
  Demuxer: {
    TS: TS
  },
  // A Decoder accepts an incoming Stream of raw Audio or Video data, buffers
  // it and upon `.decode()` decodes a single frame of data. Video decoders
  // call `destinationNode.render(Y, Cr, CB)` with the decoded pixel data;
  // Audio decoders call `destinationNode.play(left, right)` with the decoded
  // PCM data. API:
  //   .connect(destinationNode)
  //   .write(pts, buffer)
  //   .decode()
  //   .seek(time)
  //   .currentTime - float, in seconds
  //   .startTime - float, in seconds
  Decoder: {
    Base: BaseDecoder,
    MPEG1Video: MPEG1,
    MPEG1VideoWASM: MPEG1WASM,
    MP2Audio: MP2,
    MP2AudioWASM: MP2WASM
  },
  // A Renderer accepts raw YCrCb data in 3 separate buffers via the render()
  // method. Renderers typically convert the data into the RGBA color space
  // and draw it on a Canvas, but other output - such as writing PNGs - would
  // be conceivable. API:
  //   .render(y, cr, cb) - pixel data as Uint8Arrays
  //   .enabled - wether the renderer does anything upon receiving data
  Renderer: {
    WebGL: WebGLRenderer,
    Canvas2D: CanvasRenderer
  },
  // Audio Outputs accept raw Stero PCM data in 2 separate buffers via the
  // play() method. Outputs typically play the audio on the user's device.
  // API:
  //   .play(sampleRate, left, right) - rate in herz; PCM data as Uint8Arrays
  //   .stop()
  //   .enqueuedTime - float, in seconds
  //   .enabled - wether the output does anything upon receiving data
  AudioOutput: {
    WebAudio: WebAudioOut
  },
  WASMModule: WASM,
  // functions
  Now: Now,
  CreateVideoElements: CreateVideoElements,
  Fill: Fill,
  Base64ToArrayBuffer: Base64ToArrayBuffer,
  // The build process may append `JSMpeg.WASM_BINARY_INLINED = base64data;`
  // to the minified source.
  // If this property is present, jsmpeg will use the inlined binary data
  // instead of trying to load a jsmpeg.wasm file via Ajax.
  WASM_BINARY_INLINED: WASM_BINARY
};

module.exports = JSMpeg;
