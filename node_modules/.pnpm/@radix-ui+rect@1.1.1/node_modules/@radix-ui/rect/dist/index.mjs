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
export {
  observeElementRect
};
//# sourceMappingURL=index.mjs.map
