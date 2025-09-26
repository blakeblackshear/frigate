[![npm stat](https://img.shields.io/npm/dm/compute-scroll-into-view.svg?style=flat-square)](https://npm-stat.com/charts.html?package=compute-scroll-into-view)
[![npm version](https://img.shields.io/npm/v/compute-scroll-into-view.svg?style=flat-square)](https://www.npmjs.com/package/compute-scroll-into-view)
[![gzip size][gzip-badge]][unpkg-dist]
[![size][size-badge]][unpkg-dist]
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

![compute-scroll-into-view](https://user-images.githubusercontent.com/81981/43024153-a2cc212c-8c6d-11e8-913b-b4d62efcf105.png)

Lower level API that is used by the [ponyfill](https://ponyfill.com) [scroll-into-view-if-needed](https://github.com/scroll-into-view/scroll-into-view-if-needed) to compute where (if needed) elements should scroll based on [options defined in the spec](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) and the [`scrollMode: "if-needed"` draft spec proposal](https://github.com/w3c/csswg-drafts/pull/1805).
Use this if you want the smallest possible bundlesize and is ok with implementing the actual scrolling yourself.

Scrolling SVG elements are supported, as well as Shadow DOM elements. The [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) API is also supported, ensuring scrolling works properly on modern devices. Quirksmode is also supported as long as you polyfill [`document.scrollingElement`](https://developer.mozilla.org/en-US/docs/Web/API/document/scrollingElement).

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [compute(target, options)](#computetarget-options)
  - [options](#options)
    - [block](#block)
    - [inline](#inline)
    - [scrollMode](#scrollmode)
    - [boundary](#boundary)
    - [skipOverflowHiddenElements](#skipoverflowhiddenelements)

# Install

```bash
npm i compute-scroll-into-view
```

You can also use it from a CDN:

```js
const { compute } = await import('https://esm.sh/compute-scroll-into-view')
```

# Usage

```js
import { compute } from 'compute-scroll-into-view'

const node = document.getElementById('hero')

// same behavior as Element.scrollIntoView({block: "nearest", inline: "nearest"})
// see: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
const actions = compute(node, {
  scrollMode: 'if-needed',
  block: 'nearest',
  inline: 'nearest',
})

// same behavior as Element.scrollIntoViewIfNeeded(true)
// see: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoViewIfNeeded
const actions = compute(node, {
  scrollMode: 'if-needed',
  block: 'center',
  inline: 'center',
})

// Then perform the scrolling, use scroll-into-view-if-needed if you don't want to implement this part
actions.forEach(({ el, top, left }) => {
  el.scrollTop = top
  el.scrollLeft = left
})
```

# API

## compute(target, options)

## options

Type: `Object`

### [block](https://scroll-into-view.dev/#scroll-alignment)

Type: `'start' | 'center' | 'end' | 'nearest'`<br> Default: `'center'`

Control the logical scroll position on the y-axis. The spec states that the `block` direction is related to the [writing-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode), but this is not implemented yet in this library.
This means that `block: 'start'` aligns to the top edge and `block: 'end'` to the bottom.

### [inline](https://scroll-into-view.dev/#scroll-alignment)

Type: `'start' | 'center' | 'end' | 'nearest'`<br> Default: `'nearest'`

Like `block` this is affected by the [writing-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode). In left-to-right pages `inline: 'start'` will align to the left edge. In right-to-left it should be flipped. This will be supported in a future release.

### [scrollMode](https://scroll-into-view.dev/#scrolling-if-needed)

Type: `'always' | 'if-needed'`<br> Default: `'always'`

This is a proposed addition to the spec that you can track here: https://github.com/w3c/csswg-drafts/pull/5677

This library will be updated to reflect any changes to the spec and will provide a migration path.
To be backwards compatible with `Element.scrollIntoViewIfNeeded` if something is not 100% visible it will count as "needs scrolling". If you need a different visibility ratio your best option would be to implement an [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).

### [boundary](https://scroll-into-view.dev/#limit-propagation)

Type: `Element | Function`

By default there is no boundary. All the parent elements of your target is checked until it reaches the viewport ([`document.scrollingElement`](https://developer.mozilla.org/en-US/docs/Web/API/document/scrollingElement)) when calculating layout and what to scroll.
By passing a boundary you can short-circuit this loop depending on your needs:

- Prevent the browser window from scrolling.
- Scroll elements into view in a list, without scrolling container elements.

You can also pass a function to do more dynamic checks to override the scroll scoping:

```js
const actions = compute(target, {
  boundary: (parent) => {
    // By default `overflow: hidden` elements are allowed, only `overflow: visible | clip` is skipped as
    // this is required by the CSSOM spec
    if (getComputedStyle(parent)['overflow'] === 'hidden') {
      return false
    }

    return true
  },
})
```

### skipOverflowHiddenElements

Type: `Boolean`<br> Default: `false`

By default the [spec](https://drafts.csswg.org/cssom-view/#scrolling-box) states that `overflow: hidden` elements should be scrollable because it has [been used to allow programatic scrolling](https://drafts.csswg.org/css-overflow-3/#valdef-overflow-hidden). This behavior can sometimes lead to [scrolling issues](https://github.com/scroll-into-view/scroll-into-view-if-needed/pull/225#issue-186419520) when you have a node that is a child of an `overflow: hidden` node.

This package follows the convention [adopted by Firefox](https://hg.mozilla.org/integration/fx-team/rev/c48c3ec05012#l7.18) of setting a boolean option to _not_ scroll all nodes with `overflow: hidden` set.

[gzip-badge]: https://img.shields.io/bundlephobia/minzip/compute-scroll-into-view?label=gzip%20size&style=flat-square
[size-badge]: https://img.shields.io/bundlephobia/min/compute-scroll-into-view?label=size&style=flat-square
[unpkg-dist]: https://unpkg.com/compute-scroll-into-view/dist/
