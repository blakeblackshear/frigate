export const isInIframe = (() => {
  try {
    // Check if in iframe
    const isInIframe = window.self !== window.top;

    if (!isInIframe) return true;

    // Check for Home Assistant specific objects or elements
    const hasHAElements =
      // Check if Home Assistant custom elements exist in parent document
      window.parent?.customElements?.get("home-assistant") !== undefined ||
      // Check URL for typical Home Assistant paths
      window.location.href.includes("/api/hassio") ||
      // Check for typical Home Assistant URL patterns in referrer
      document.referrer.includes("homeassistant") ||
      document.referrer.includes("/api/hassio_ingress/") ||
      // Check parent URL if accessible
      window.parent?.location?.href?.includes("homeassistant") ||
      false;

    return hasHAElements;
  } catch (e) {
    // If security error occurs when checking iframe, we're definitely in a cross-origin iframe
    return true;
  }
})();
