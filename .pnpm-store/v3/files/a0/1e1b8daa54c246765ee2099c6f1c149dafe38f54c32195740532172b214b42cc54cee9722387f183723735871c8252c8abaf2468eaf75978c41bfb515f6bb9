
# xml-formatter

Converts XML into a human readable format (pretty print) while respecting the xml:space attribute.

This module can also be used on the browser using the browserified version with a small footprint (8KB file size).

[![Build Status](https://github.com/chrisbottin/xml-formatter/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisbottin/xml-formatter/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/xml-formatter.svg)](https://npmjs.org/package/xml-formatter)

## Installation

```
$ npm install xml-formatter
```

## Example

 JavaScript:

```js
var format = require('xml-formatter');
var xml = '<root><content><p xml:space="preserve">This is <b>some</b> content.</content></p>';

var formattedXml = format(xml);
console.log(formattedXml);
```

Output:

```xml
<root>
    <content>
        <p xml:space="preserve">This is <b>some</b> content.</p>
    </content>
</root>
```

## Options

 JavaScript:
 
```js
var format = require('xml-formatter');
var xml = '<root><!-- content --><content><p>This is <b>some</b> content.</content></p>';

var formattedXml = format(xml, {
    indentation: '  ', 
    filter: (node) => node.type !== 'Comment', 
    collapseContent: true, 
    lineSeparator: '\n'
});

console.log(formattedXml);
```

Output:

```xml
<root>
  <content>
    <p>This is <b>some</b> content.</p>
  </content>
</root>
```

- `filter` (function(node)) Function to filter out unwanted nodes by returning false.
- `indentation` (String, default=`'    '`) The value used for indentation.
- `collapseContent` (Boolean, default=`false`] True to keep content in the same line as the element. Only works if element contains at least one text node
- `lineSeparator` (String, default=`\r\n`) Specify the line separator to use
- `whiteSpaceAtEndOfSelfclosingTag` (Boolean, default=false) to either end ad self closing tag with `<tag/>` or `<tag />`


## On The Browser

The code is transpiled using [Babel](https://babeljs.io/) with [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env) default values and bundled using [browserify](https://browserify.org/).

### Using `require('xml-formatter')`
 Page:
 
```html
<script type="text/javascript" src="dist/browser/xml-formatter.js"></script>
```

 Usage:
 
```js
var xmlFormatter = require('xml-formatter');
var xml = '<root><content><p xml:space="preserve">This is <b>some</b> content.</content></p>';

var formattedXml = xmlFormatter(xml);
console.log(formattedXml);
```

### Using global function `xmlFormatter`

```html
<script type="text/javascript" src="dist/browser/xml-formatter-singleton.js"></script>
```

Usage:

```js
var xml = '<root><content><p xml:space="preserve">This is <b>some</b> content.</content></p>';

var formattedXml = xmlFormatter(xml);
console.log(formattedXml);
```

### Output

```xml
<root>
    <content>
        <p xml:space="preserve">This is <b>some</b> content.</p>
    </content>
</root>
```

# License

  MIT
