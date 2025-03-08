export const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If we get a security error, we're definitely in an iframe
    return true;
  }
})();
