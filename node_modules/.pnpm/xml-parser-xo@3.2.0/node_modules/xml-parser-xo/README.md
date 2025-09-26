
# xml-parser-xo

XML parser based on [xml-parser](https://www.npmjs.com/package/xml-parser).

[![Build Status](https://github.com/chrisbottin/xml-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisbottin/xml-parser/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/xml-parser-xo.svg)](https://npmjs.org/package/xml-parser-xo)

## Installation

```
$ npm install xml-parser-xo
```

## Example

JavaScript:

```js
var parse = require('xml-parser-xo');

var xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- Load the stylesheet -->
<?xml-stylesheet href="foo.xsl" type="text/xsl" ?>
<!DOCTYPE foo SYSTEM "foo.dtd">
<foo><![CDATA[some text]]> content</foo>`;

console.log(parse(xml));
```

Output:

```json
{
    "declaration": {
        "type": "ProcessingInstruction",
        "attributes": {"version": "1.0", "encoding": "utf-8"}
    },
    "root": {
        "type": "Element",
        "name": "foo",
        "attributes": {},
        "children": [
            {"type": "CDATA", "content": "<![CDATA[some text]]>"},
            {"type": "Text", "content": " content"}
        ]
    },
    "children": [
        {"type": "Comment", "content": "<!-- Load the stylesheet -->"},
        {"type": "ProcessingInstruction", "attributes": {"href": "foo.xsl", "type": "text/xsl"}},
        {"type": "DocumentType", "content": "<!DOCTYPE foo SYSTEM \"foo.dtd\">"},
        {
            "type": "Element",
            "name": "foo",
            "attributes": {},
            "children": [
                {"type": "CDATA", "content": "<![CDATA[some text]]>"},
                {"type": "Text", "content": " content"}
            ]
        }
    ]
}
```

# License

  MIT
