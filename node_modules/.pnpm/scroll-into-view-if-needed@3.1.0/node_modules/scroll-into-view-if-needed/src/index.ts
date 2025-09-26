import { compute } from 'compute-scroll-into-view'
import type {
  Options as BaseOptions,
  ScrollAction,
} from 'compute-scroll-into-view'

/** @public */
export type Options<T = unknown> =
  | StandardBehaviorOptions
  | CustomBehaviorOptions<T>

/**
 * Only scrolls if the `node` is partially out of view:
 * ```ts
 * scrollIntoView(node, { scrollMode: 'if-needed' })
 * ```
 * Skips scrolling `overflow: hidden` elements:
 * ```ts
 * scrollIntoView(node, { skipOverflowHiddenElements: true })
 * ```
 * When scrolling is needed do the least and smoothest scrolling possible:
 * ```ts
 * scrollIntoView(node, {
 *   behavior: 'smooth',
 *   scrollMode: 'if-needed',
 *   block: 'nearest',
 *   inline: 'nearest',
 * })
 * ```
 * @public
 */
export interface StandardBehaviorOptions extends BaseOptions {
  /**
   * @defaultValue 'auto
   */
  behavior?: ScrollBehavior
}

/** @public */
export interface CustomBehaviorOptions<T = unknown> extends BaseOptions {
  behavior: CustomScrollBehaviorCallback<T>
}

/** @public */
export type CustomScrollBehaviorCallback<T = unknown> = (
  actions: ScrollAction[]
) => T

const isStandardScrollBehavior = (
  options: any
): options is StandardBehaviorOptions =>
  options === Object(options) && Object.keys(options).length !== 0

const isCustomScrollBehavior = <T = unknown>(
  options: any
): options is CustomBehaviorOptions<T> =>
  typeof options === 'object' ? typeof options.behavior === 'function' : false

const getOptions = (options: any): StandardBehaviorOptions => {
  // Handle alignToTop for legacy reasons, to be compatible with the spec
  if (options === false) {
    return { block: 'end', inline: 'nearest' }
  }

  if (isStandardScrollBehavior(options)) {
    // compute.ts ensures the defaults are block: 'center' and inline: 'nearest', to conform to the spec
    return options
  }

  // if options = {}, options = true or options = null, based on w3c web platform test
  return { block: 'start', inline: 'nearest' }
}

const getScrollMargins = (target: Element) => {
  const computedStyle = window.getComputedStyle(target)
  return {
    top: parseFloat(computedStyle.scrollMarginTop) || 0,
    right: parseFloat(computedStyle.scrollMarginRight) || 0,
    bottom: parseFloat(computedStyle.scrollMarginBottom) || 0,
    left: parseFloat(computedStyle.scrollMarginLeft) || 0,
  }
}

// Determine if the element is part of the document (including shadow dom)
// Derived from code of Andy Desmarais
// https://terodox.tech/how-to-tell-if-an-element-is-in-the-dom-including-the-shadow-dom/
const isInDocument = (element: Node) => {
  let currentElement = element
  while (currentElement && currentElement.parentNode) {
    if (currentElement.parentNode === document) {
      return true
    } else if (currentElement.parentNode instanceof ShadowRoot) {
      currentElement = (currentElement.parentNode as ShadowRoot).host
    } else {
      currentElement = currentElement.parentNode
    }
  }
  return false
}

/**
 * Scrolls the given element into view, with options for when, and how.
 * Supports the same `options` as [`Element.prototype.scrollIntoView`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) with additions such as `scrollMode`, `behavior: Function` and `skipOverflowHiddenElements`.
 * @public
 */
function scrollIntoView(
  target: Element,
  options?: StandardBehaviorOptions | boolean
): void
/**
 * Scrolls the given element into view, with options for when, and how.
 * Supports the same `options` as [`Element.prototype.scrollIntoView`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) with additions such as `scrollMode`, `behavior: Function` and `skipOverflowHiddenElements`.
 *
 * You can set the expected return type for `behavior: Function`:
 * ```ts
 * await scrollIntoView<Promise<boolean[]>>(node, {
 *   behavior: async actions => {
 *     return Promise.all(actions.map(
 *       // animate() resolves to `true` if anything was animated, `false` if the element already were in the end state
 *       ({ el, left, top }) => animate(el, {scroll: {left, top}})
 *     ))
 *   }
 * })
 * ```
 * @public
 */
function scrollIntoView<T>(
  target: Element,
  options: CustomBehaviorOptions<T>
): T
function scrollIntoView<T = unknown>(
  target: Element,
  options?: StandardBehaviorOptions | CustomBehaviorOptions<T> | boolean
): T | void {
  // Browsers treats targets that aren't in the dom as a no-op and so should we
  if (!target.isConnected || !isInDocument(target)) {
    return
  }

  const margins = getScrollMargins(target)

  if (isCustomScrollBehavior<T>(options)) {
    return options.behavior(compute(target, options))
  }

  const behavior = typeof options === 'boolean' ? undefined : options?.behavior

  for (const { el, top, left } of compute(target, getOptions(options))) {
    const adjustedTop = top - margins.top + margins.bottom
    const adjustedLeft = left - margins.left + margins.right
    el.scroll({ top: adjustedTop, left: adjustedLeft, behavior })
  }
}

export default scrollIntoView
