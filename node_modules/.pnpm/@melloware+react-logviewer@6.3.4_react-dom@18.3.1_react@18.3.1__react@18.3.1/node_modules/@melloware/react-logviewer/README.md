[![npm](https://img.shields.io/npm/v/%40melloware%2Freact-logviewer?style=for-the-badge&color=green)](https://www.npmjs.com/package/%40melloware/react-logviewer)
[![NPM Downloads](https://img.shields.io/npm/dm/%40melloware%2Freact-logviewer?style=for-the-badge&color=purple)](https://www.npmjs.com/package/%40melloware/react-logviewer)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0)
![React.js](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Typescript](https://img.shields.io/badge/typescript-%23323330.svg?style=for-the-badge&logo=typescript&logoColor=%23F7DF1E) 

# React LogViewer

React component that loads and views remote text in the browser lazily and efficiently. Logs can be loaded from static text, a URL, a WebSocket, or an EventSource and including ANSI highlighting.
Originally forked from [mozilla-frontend-infra/react-lazylog](https://github.com/mozilla-frontend-infra/react-lazylog).

**If you like this project, please consider supporting me ❤️**

[![GitHub Sponsor](https://img.shields.io/badge/GitHub-FFDD00?style=for-the-badge&logo=github&logoColor=black)](https://github.com/sponsors/melloware)
[![PayPal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.me/mellowareinc)

## Features

-   Efficient scrolling performance thanks to [Virtua](https://github.com/inokawa/virtua)
-   Infinite scrolling thanks to [Virtua](https://github.com/inokawa/virtua)
-   Able to load large files upwards of 100MB without crashing the browser
-   Parses, colorizes, and styles ANSI escapes within content
-   Supports remote text files as well as chunked/streamed responses
-   Line highlighting
-   Customizable styling
-   Searching through log
-   Works in latest browser versions, including iOS Safari and Android Chrome
-   TypeScript support
-   EventSource or WebSocket support

## Demo

You can see a running demonstration at https://melloware.github.io/react-logviewer/ which is built from StoryBook.

## Installation

Install the plugin with npm or yarn:

```shell
$ npm i --save @melloware/react-logviewer
```

## Getting started

The core component from react-logviewer is `LazyLog`. There is also a higher-order component (HOC) for
following logs until scroll. This module can be required via ES imports, CommonJS require, or UMD.

```js
import { LazyLog } from "@melloware/react-logviewer";

// using require
const { LazyLog } = require("@melloware/react-logviewer");
```

## `<LazyLog />`

### Usage

After importing a component, it can be rendered with the required `url` prop:

```jsx
import React from "react";
import { render } from "react-dom";
import { LazyLog } from "@melloware/react-logviewer";

render(<LazyLog url="http://example.log" />, document.getElementById("root"));
```

By default the `LazyLog` will expand to fill its container, so ensure this container has valid dimensions and layout.
If you wish to have fixed dimensions, change the `height` and `width` props.

If you are going to be rendering a complete file, or an endpoint which can be downloaded all at once, use the
`<LazyLog />` component as-is for better overall performance at the expense of slightly longer upfront load time.

If you are going to be requesting a streaming or chunked response, use the `<LazyLog stream />` component with the
`stream` prop of `true` for quicker upfront rendering as content can be decoded as it arrives.

## `<ScrollFollow />`

`ScrollFollow` is a higher-order component (HOC) that aims to simplify toggling a `LazyLog`'s
"follow" functionality based on user scrolling.

### Usage

The `ScrollFollow` component accepts a render prop function which should return a component to render based on the
function's arguments.

> [!NOTE]  
> ScrollFollow must be wrapped in an element that contains a fixed height such as a `<div>`

```jsx
import React from "react";
import { render } from "react-dom";
import { LazyLog, ScrollFollow } from "@melloware/react-logviewer";

render(
    <div style={{ height: 500, width: 902 }}>
    <ScrollFollow
        startFollowing={true}
        render={({ follow, onScroll }) => (
            <LazyLog url="http://example.log" stream follow={follow} onScroll={onScroll} />
        )}
    />
    </div>,
    document.getElementById("root"),
);
```

## Styling

All of the components exposed from react-lazylog use CSS modules to contain its styles to each individual component. If
you wish to override these styles, there are a few techniques you can use.

### `style` and `containerStyle`

For the core container of `<LazyLog />`, you can pass a `style` object prop to affect many styles.
For affecting the look or behavior of the scrollable region of these components, use the `containerStyle` prop with a
styling object.

### `defaultProps.style`

For many react-logviewer components, continually passing varied styling objects is tedious. To make this simpler, you can
override the `defaultProps.style` of any desired component to override styles of that component. For example:

```jsx
import Line from "@melloware/react-logviewer/build/Line";

// Use defaultProps.style to set the style for an internal component
Line.defaultProps.style = {
    color: "green",
};
```

**Note: overriding the ANSI colors and styles is currently undocumented, and will probably need some source-diving to
figure out. I would gladly accept a pull request that could improve the styling API.**

### CSS stylesheets

If you are using CSS stylesheets, you can target the main virtual `LazyList` component with the `react-lazylog`
class name. From there you can target the individual `div` lines, `a` line numbers, or `span` line content.

## Sub-components

react-lazylog uses a number of sub-components internally to render individual parts of the log-viewing component:

### `<Line />`

A single row of content, containing both the line number and any text content within the line.

### `<LineNumber />`

The line number of a single line. The anchor contained within is interactive, and will highlight the entire line upon
selection.

### `<LineContent />`

The container of all the individual pieces of content that is on a single line. May contain one or more `LinePart`s
depending on ANSI parsing.

### `<LinePart />`

An individual segment of text within a line. When the text content is ANSI-parsed, each boundary is placed within its
own `LinePart` and styled separately (colors, text formatting, etc.) from the rest of the line's content.

## Technology

-   [Virtua](https://github.com/inokawa/virtua) for efficiently rendering large lines of data
-   `fetch` API for efficiently requesting data with array buffers and binary streams
-   [ansiparse](https://www.npmjs.com/package/ansiparse) for nice log styling, like Travis
-   [mitt](https://www.npmjs.com/package/mitt) for dead-simple events to manage streaming lifecycle
-   [Immutable](https://www.npmjs.com/package/immutable) for efficiently storing and managing very large collections of lines and highlight ranges
-   `Uint8Array` for dealing with text content as binary, allows for conditionally rendering partial data and decoding everything without crashing your browser

## Development and Contributing

-   Fork and clone this repo.
-   Install the dependencies with `npm`.
-   Start the development server with `npm run storybook`. This will launch a StoryBook instance.
    Open a browser to http://localhost:6006 to preview the React components.
-   Use CTRL-C to exit the StoryBook.
-   Use `npm run build` to generate the compiled component for publishing to npm.
  
## Publishing

Adjust the version in the `package.json` if necessary and commit files.
Then simply "Publish a Release" and the workflow will handle publishing to NPM.

## License

Licensed under the [Mozilla Public License 2.0](https://opensource.org/license/mpl-2-0/) license.

`SPDX-License-Identifier: Mozilla Public License 2.0`
