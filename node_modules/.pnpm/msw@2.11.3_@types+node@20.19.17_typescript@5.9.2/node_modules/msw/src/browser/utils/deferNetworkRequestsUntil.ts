import { until } from 'until-async'

/**
 * Intercepts and defers any requests on the page
 * until the Service Worker instance is ready.
 * Must only be used in a browser.
 */
export function deferNetworkRequestsUntil(predicatePromise: Promise<any>) {
  // Defer any `XMLHttpRequest` requests until the Service Worker is ready.
  const originalXhrSend = window.XMLHttpRequest.prototype.send
  window.XMLHttpRequest.prototype.send = function (
    ...args: Parameters<XMLHttpRequest['send']>
  ) {
    // Keep this function synchronous to comply with `XMLHttpRequest.prototype.send`,
    // because that method is always synchronous.
    until(() => predicatePromise).then(() => {
      window.XMLHttpRequest.prototype.send = originalXhrSend
      this.send(...args)
    })
  }

  // Defer any `fetch` requests until the Service Worker is ready.
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    await until(() => predicatePromise)
    window.fetch = originalFetch
    return window.fetch(...args)
  }
}
