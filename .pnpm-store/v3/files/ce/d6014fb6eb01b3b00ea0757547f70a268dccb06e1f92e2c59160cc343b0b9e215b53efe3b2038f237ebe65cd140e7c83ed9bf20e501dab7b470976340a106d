/** @public */
export declare const compute: (
  target: Element,
  options: Options
) => ScrollAction[]

/** @public */
export declare interface Options {
  /**
   * Control the logical scroll position on the y-axis. The spec states that the `block` direction is related to the [writing-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode), but this is not implemented yet in this library.
   * This means that `block: 'start'` aligns to the top edge and `block: 'end'` to the bottom.
   * @defaultValue 'center'
   */
  block?: ScrollLogicalPosition
  /**
   * Like `block` this is affected by the [writing-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode). In left-to-right pages `inline: 'start'` will align to the left edge. In right-to-left it should be flipped. This will be supported in a future release.
   * @defaultValue 'nearest'
   */
  inline?: ScrollLogicalPosition
  /**
   * This is a proposed addition to the spec that you can track here: https://github.com/w3c/csswg-drafts/pull/5677
   *
   * This library will be updated to reflect any changes to the spec and will provide a migration path.
   * To be backwards compatible with `Element.scrollIntoViewIfNeeded` if something is not 100% visible it will count as "needs scrolling". If you need a different visibility ratio your best option would be to implement an [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
   * @defaultValue 'always'
   */
  scrollMode?: ScrollMode
  /**
     * By default there is no boundary. All the parent elements of your target is checked until it reaches the viewport ([`document.scrollingElement`](https://developer.mozilla.org/en-US/docs/Web/API/document/scrollingElement)) when calculating layout and what to scroll.
     * By passing a boundary you can short-circuit this loop depending on your needs:
     *
     * - Prevent the browser window from scrolling.
     * - Scroll elements into view in a list, without scrolling container elements.
     *
     * You can also pass a function to do more dynamic checks to override the scroll scoping:
     *
     * ```js
     * let actions = compute(target, {
     *   boundary: (parent) => {
     *     // By default `overflow: hidden` elements are allowed, only `overflow: visible | clip` is skipped as
     *     // this is required by the CSSOM spec
     *     if (getComputedStyle(parent)['overflow'] === 'hidden') {
     *       return false
     *     }

     *     return true
     *   },
     * })
     * ```
     * @defaultValue null
     */
  boundary?: Element | ((parent: Element) => boolean) | null
  /**
   * New option that skips auto-scrolling all nodes with overflow: hidden set
   * See FF implementation: https://hg.mozilla.org/integration/fx-team/rev/c48c3ec05012#l7.18
   * @defaultValue false
   * @public
   */
  skipOverflowHiddenElements?: boolean
}

/** @public */
export declare interface ScrollAction {
  el: Element
  top: number
  left: number
}

/**
 * This new option is tracked in this PR, which is the most likely candidate at the time: https://github.com/w3c/csswg-drafts/pull/1805
 * @public
 */
export declare type ScrollMode = 'always' | 'if-needed'

export {}
