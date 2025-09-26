"use strict";

/* global document */
/*
  eslint-disable
  no-console,
  func-names
*/

var normalizeUrl = require("./normalize-url");
var srcByModuleId = Object.create(null);
var noDocument = typeof document === "undefined";
var forEach = Array.prototype.forEach;

// eslint-disable-next-line jsdoc/no-restricted-syntax
/**
 * @param {Function} fn any function
 * @param {number} time time
 * @returns {() => void} wrapped function
 */
function debounce(fn, time) {
  var timeout = 0;
  return function () {
    // @ts-expect-error
    var self = this;
    // eslint-disable-next-line prefer-rest-params
    var args = arguments;
    // eslint-disable-next-line func-style
    var functionCall = function functionCall() {
      return fn.apply(self, args);
    };
    clearTimeout(timeout);

    // @ts-expect-error
    timeout = setTimeout(functionCall, time);
  };
}

/**
 * @returns {void}
 */
function noop() {}

/** @typedef {(filename?: string) => string[]} GetScriptSrc */

/**
 * @param {string | number} moduleId a module id
 * @returns {GetScriptSrc} current script url
 */
function getCurrentScriptUrl(moduleId) {
  var src = srcByModuleId[moduleId];
  if (!src) {
    if (document.currentScript) {
      src = (/** @type {HTMLScriptElement} */document.currentScript).src;
    } else {
      var scripts = document.getElementsByTagName("script");
      var lastScriptTag = scripts[scripts.length - 1];
      if (lastScriptTag) {
        src = lastScriptTag.src;
      }
    }
    srcByModuleId[moduleId] = src;
  }

  /** @type {GetScriptSrc} */
  return function (fileMap) {
    if (!src) {
      return [];
    }
    var splitResult = src.split(/([^\\/]+)\.js$/);
    var filename = splitResult && splitResult[1];
    if (!filename) {
      return [src.replace(".js", ".css")];
    }
    if (!fileMap) {
      return [src.replace(".js", ".css")];
    }
    return fileMap.split(",").map(function (mapRule) {
      var reg = new RegExp("".concat(filename, "\\.js$"), "g");
      return normalizeUrl(src.replace(reg, "".concat(mapRule.replace(/{fileName}/g, filename), ".css")));
    });
  };
}

/**
 * @param {string} url URL
 * @returns {boolean} true when URL can be request, otherwise false
 */
function isUrlRequest(url) {
  // An URL is not an request if

  // It is not http or https
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    return false;
  }
  return true;
}

/** @typedef {HTMLLinkElement & { isLoaded: boolean, visited: boolean }} HotHTMLLinkElement */

/**
 * @param {HotHTMLLinkElement} el html link element
 * @param {string=} url a URL
 */
function updateCss(el, url) {
  if (!url) {
    if (!el.href) {
      return;
    }

    // eslint-disable-next-line
    url = el.href.split("?")[0];
  }
  if (!isUrlRequest(/** @type {string} */url)) {
    return;
  }
  if (el.isLoaded === false) {
    // We seem to be about to replace a css link that hasn't loaded yet.
    // We're probably changing the same file more than once.
    return;
  }

  // eslint-disable-next-line unicorn/prefer-includes
  if (!url || !(url.indexOf(".css") > -1)) {
    return;
  }
  el.visited = true;
  var newEl = /** @type {HotHTMLLinkElement} */
  el.cloneNode();
  newEl.isLoaded = false;
  newEl.addEventListener("load", function () {
    if (newEl.isLoaded) {
      return;
    }
    newEl.isLoaded = true;
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  newEl.addEventListener("error", function () {
    if (newEl.isLoaded) {
      return;
    }
    newEl.isLoaded = true;
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  newEl.href = "".concat(url, "?").concat(Date.now());
  if (el.parentNode) {
    if (el.nextSibling) {
      el.parentNode.insertBefore(newEl, el.nextSibling);
    } else {
      el.parentNode.appendChild(newEl);
    }
  }
}

/**
 * @param {string} href href
 * @param {string[]} src src
 * @returns {undefined | string} a reload url
 */
function getReloadUrl(href, src) {
  var ret;
  href = normalizeUrl(href);
  src.some(
  /**
   * @param {string} url url
   */
  // eslint-disable-next-line array-callback-return
  function (url) {
    // @ts-expect-error fix me in the next major release
    // eslint-disable-next-line unicorn/prefer-includes
    if (href.indexOf(src) > -1) {
      ret = url;
    }
  });
  return ret;
}

/**
 * @param {string[]} src source
 * @returns {boolean} true when loaded, otherwise false
 */
function reloadStyle(src) {
  var elements = document.querySelectorAll("link");
  var loaded = false;
  forEach.call(elements, function (el) {
    if (!el.href) {
      return;
    }
    var url = getReloadUrl(el.href, src);
    if (url && !isUrlRequest(url)) {
      return;
    }
    if (el.visited === true) {
      return;
    }
    if (url) {
      updateCss(el, url);
      loaded = true;
    }
  });
  return loaded;
}

/**
 * @returns {void}
 */
function reloadAll() {
  var elements = document.querySelectorAll("link");
  forEach.call(elements, function (el) {
    if (el.visited === true) {
      return;
    }
    updateCss(el);
  });
}

/**
 * @param {number | string} moduleId a module id
 * @param {{ filename?: string, locals?: boolean }} options options
 * @returns {() => void} wrapper function
 */
module.exports = function (moduleId, options) {
  if (noDocument) {
    console.log("no window.document found, will not HMR CSS");
    return noop;
  }
  var getScriptSrc = getCurrentScriptUrl(moduleId);

  /**
   * @returns {void}
   */
  function update() {
    var src = getScriptSrc(options.filename);
    var reloaded = reloadStyle(src);
    if (options.locals) {
      console.log("[HMR] Detected local css modules. Reload all css");
      reloadAll();
      return;
    }
    if (reloaded) {
      console.log("[HMR] css reload %s", src.join(" "));
    } else {
      console.log("[HMR] Reload all css");
      reloadAll();
    }
  }
  return debounce(update, 50);
};