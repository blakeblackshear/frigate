"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/core/rect/src/index.ts
var index_exports = {};
__export(index_exports, {
  observeElementRect: () => observeElementRect
});
module.exports = __toCommonJS(index_exports);

// packages/core/rect/src/observe-element-rect.ts
function observeElementRect(elementToObserve, callback) {
  const observedData = observedElements.get(elementToObserve);
  if (observedData === void 0) {
    observedElements.set(elementToObserve, { rect: {}, callbacks: [callback] });
    if (observedElements.size === 1) {
      rafId = requestAnimationFrame(runLoop);
    }
  } else {
    observedData.callbacks.push(callback);
    callback(elementToObserve.getBoundingClientRect());
  }
  return () => {
    const observedData2 = observedElements.get(elementToObserve);
    if (observedData2 === void 0) return;
    const index = observedData2.callbacks.indexOf(callback);
    if (index > -1) {
      observedData2.callbacks.splice(index, 1);
    }
    if (observedData2.callbacks.length === 0) {
      observedElements.delete(elementToObserve);
      if (observedElements.size === 0) {
        cancelAnimationFrame(rafId);
      }
    }
  };
}
var rafId;
var observedElements = /* @__PURE__ */ new Map();
function runLoop() {
  const changedRectsData = [];
  observedElements.forEach((data, element) => {
    const newRect = element.getBoundingClientRect();
    if (!rectEquals(data.rect, newRect)) {
      data.rect = newRect;
      changedRectsData.push(data);
    }
  });
  changedRectsData.forEach((data) => {
    data.callbacks.forEach((callback) => callback(data.rect));
  });
  rafId = requestAnimationFrame(runLoop);
}
function rectEquals(rect1, rect2) {
  return rect1.width === rect2.width && rect1.height === rect2.height && rect1.top === rect2.top && rect1.right === rect2.right && rect1.bottom === rect2.bottom && rect1.left === rect2.left;
}
//# sourceMappingURL=index.js.map
