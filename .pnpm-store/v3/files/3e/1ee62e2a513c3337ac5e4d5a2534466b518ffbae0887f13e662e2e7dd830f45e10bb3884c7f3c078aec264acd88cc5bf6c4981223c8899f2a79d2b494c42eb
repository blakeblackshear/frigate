// Helpers to react to element resizes, regardless of what caused them
// TODO Currently this creates a new ResizeObserver every time we want to observe an element for resizes
// Ideally, we should be able to use a single observer for all elements
let ros = new WeakMap() // Map callbacks to ResizeObserver instances for easy removal

export function addResizeListener(el, fn) {
  let called = false

  if (el.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    const elRect = el.getBoundingClientRect()
    if (el.style.display === 'none' || elRect.width === 0) {
      // if elRect.width=0, the chart is not rendered at all
      // (it has either display none or hidden in a different tab)
      // fixes https://github.com/apexcharts/apexcharts.js/issues/2825
      // fixes https://github.com/apexcharts/apexcharts.js/issues/2991
      // fixes https://github.com/apexcharts/apexcharts.js/issues/2992
      called = true
    }
  }

  let ro = new ResizeObserver((r) => {
    // ROs fire immediately after being created,
    // per spec: https://drafts.csswg.org/resize-observer/#ref-for-element%E2%91%A3
    // we don't want that so we just discard the first run
    if (called) {
      fn.call(el, r)
    }
    called = true
  })

  if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    // Document fragment, observe children instead (needed for Shadow DOM, see #1332)
    Array.from(el.children).forEach((c) => ro.observe(c))
  } else {
    ro.observe(el)
  }

  ros.set(fn, ro)
}

export function removeResizeListener(el, fn) {
  let ro = ros.get(fn)
  if (ro) {
    ro.disconnect()
    ros.delete(fn)
  }
}
