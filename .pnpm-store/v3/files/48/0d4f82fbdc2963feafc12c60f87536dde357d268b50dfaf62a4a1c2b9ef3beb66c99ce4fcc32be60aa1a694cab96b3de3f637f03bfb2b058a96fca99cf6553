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
export {
  resetHandlers,
  restoreHandlers,
  use
};
//# sourceMappingURL=requestHandlerUtils.mjs.map