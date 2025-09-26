# d3-fetch

This module provides convenient parsing on top of [Fetch](https://fetch.spec.whatwg.org/). For example, to load a text file:

```js
const text = await d3.text("/path/to/file.txt");
console.log(text); // Hello, world!
```

To load and parse a CSV file:

```js
const data = await d3.csv("/path/to/file.csv");
console.log(data); // [{"Hello": "world"}, …]
```

This module has built-in support for parsing [JSON](#json), [CSV](#csv), and [TSV](#tsv). You can parse additional formats by using [text](#text) directly. (This module replaced [d3-request](https://github.com/d3/d3-request).)

## Installing

If you use npm, `npm install d3-fetch`. You can also download the [latest release on GitHub](https://github.com/d3/d3-fetch/releases/latest). For vanilla HTML in modern browsers, import d3-fetch from Skypack:

```html
<script type="module">

import {csv} from "https://cdn.skypack.dev/d3-fetch@3";

csv("/path/to/file.csv").then((data) => {
  console.log(data); // [{"Hello": "world"}, …]
});

</script>
```

For legacy environments, you can load d3-fetch’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-fetch@3"></script>
<script>

d3.csv("/path/to/file.csv").then((data) => {
  console.log(data); // [{"Hello": "world"}, …]
});

</script>
```

## API Reference

<a name="blob" href="#blob">#</a> d3.<b>blob</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/blob.js "Source")

Fetches the binary file at the specified *input* URL as a Blob. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields.

<a name="buffer" href="#buffer">#</a> d3.<b>buffer</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/buffer.js "Source")

Fetches the binary file at the specified *input* URL as an ArrayBuffer. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields.

<a name="csv" href="#csv">#</a> d3.<b>csv</b>(<i>input</i>[, <i>init</i>][, <i>row</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/dsv.js "Source")

Equivalent to [d3.dsv](#dsv) with the comma character as the delimiter.

<a name="dsv" href="#dsv">#</a> d3.<b>dsv</b>(<i>delimiter</i>, <i>input</i>[, <i>init</i>][, <i>row</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/dsv.js "Source")

Fetches the [DSV](https://github.com/d3/d3-dsv) file at the specified *input* URL. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields. An optional *row* conversion function may be specified to map and filter row objects to a more-specific representation; see [*dsv*.parse](https://github.com/d3/d3-dsv#dsv_parse) for details. For example:

```js
const data = await d3.dsv(",", "test.csv", (d) => {
  return {
    year: new Date(+d.Year, 0, 1), // convert "Year" column to Date
    make: d.Make,
    model: d.Model,
    length: +d.Length // convert "Length" column to number
  };
});
```

If only one of *init* and *row* is specified, it is interpreted as the *row* conversion function if it is a function, and otherwise an *init* object.

See also [d3.csv](#csv) and [d3.tsv](#tsv).

<a name="html" href="#html">#</a> d3.<b>html</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/xml.js "Source")

Fetches the file at the specified *input* URL as [text](#text) and then [parses it](https://developer.mozilla.org/docs/Web/API/DOMParser) as HTML. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields.

<a name="image" href="#image">#</a> d3.<b>image</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/image.js "Source")

Fetches the image at the specified *input* URL. If *init* is specified, sets any additional properties on the image before loading. For example, to enable an anonymous [cross-origin request](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image):

```js
const img = await d3.image("https://example.com/test.png", {crossOrigin: "anonymous"});
```

<a name="json" href="#json">#</a> d3.<b>json</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/json.js "Source")

Fetches the [JSON](http://json.org) file at the specified *input* URL. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields. If the server returns a status code of [204 No Content](https://developer.mozilla.org/docs/Web/HTTP/Status/204) or [205 Reset Content](https://developer.mozilla.org/docs/Web/HTTP/Status/205), the promise resolves to `undefined`.

<a name="svg" href="#svg">#</a> d3.<b>svg</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/xml.js "Source")

Fetches the file at the specified *input* URL as [text](#text) and then [parses it](https://developer.mozilla.org/docs/Web/API/DOMParser) as SVG. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields.

<a name="text" href="#text">#</a> d3.<b>text</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/text.js "Source")

Fetches the text file at the specified *input* URL. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields.

<a name="tsv" href="#tsv">#</a> d3.<b>tsv</b>(<i>input</i>[, <i>init</i>][, <i>row</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/dsv.js "Source")

Equivalent to [d3.dsv](#dsv) with the tab character as the delimiter.

<a name="xml" href="#xml">#</a> d3.<b>xml</b>(<i>input</i>[, <i>init</i>]) · [Source](https://github.com/d3/d3-fetch/blob/master/src/xml.js "Source")

Fetches the file at the specified *input* URL as [text](#text) and then [parses it](https://developer.mozilla.org/docs/Web/API/DOMParser) as XML. If *init* is specified, it is passed along to the underlying call to [fetch](https://fetch.spec.whatwg.org/#fetch-method); see [RequestInit](https://fetch.spec.whatwg.org/#requestinit) for allowed fields.
