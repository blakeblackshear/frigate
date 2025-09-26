import type { Options as Options_2 } from 'compute-scroll-into-view'
import type { ScrollAction } from 'compute-scroll-into-view'

/** @public */
export declare interface CustomBehaviorOptions<T = unknown> extends Options_2 {
  behavior: CustomScrollBehaviorCallback<T>
}

/** @public */
export declare type CustomScrollBehaviorCallback<T = unknown> = (
  actions: ScrollAction[]
) => T

/** @public */
export declare type Options<T = unknown> =
  | StandardBehaviorOptions
  | CustomBehaviorOptions<T>

/**
 * Scrolls the given element into view, with options for when, and how.
 * Supports the same `options` as [`Element.prototype.scrollIntoView`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) with additions such as `scrollMode`, `behavior: Function` and `skipOverflowHiddenElements`.
 * @public
 */
declare function scrollIntoView(
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
declare function scrollIntoView<T>(
  target: Element,
  options: CustomBehaviorOptions<T>
): T
export default scrollIntoView

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
export declare interface StandardBehaviorOptions extends Options_2 {
  /**
   * @defaultValue 'auto
   */
  behavior?: ScrollBehavior
}

export {}
