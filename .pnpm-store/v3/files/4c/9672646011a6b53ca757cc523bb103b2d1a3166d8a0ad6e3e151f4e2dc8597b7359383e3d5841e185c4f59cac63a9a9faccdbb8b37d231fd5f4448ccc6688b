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
var requestHandlerUtils_exports = {};
__export(requestHandlerUtils_exports, {
  resetHandlers: () => resetHandlers,
  restoreHandlers: () => restoreHandlers,
  use: () => use
});
module.exports = __toCommonJS(requestHandlerUtils_exports);
function use(currentHandlers, ...handlers) {
  currentHandlers.unshift(...handlers);
}
function restoreHandlers(handlers) {
  handlers.forEach((handler) => {
    handler.isUsed = false;
  });
}
function resetHandlers(initialHandlers, ...nextHandlers) {
  return nextHandlers.length > 0 ? [...nextHandlers] : [...initialHandlers];
}
//# sourceMappingURL=requestHandlerUtils.js.map