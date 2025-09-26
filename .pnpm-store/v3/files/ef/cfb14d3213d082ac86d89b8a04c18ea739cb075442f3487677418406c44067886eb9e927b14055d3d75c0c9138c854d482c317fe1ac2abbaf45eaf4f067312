# mime-format

Simple module to lookup the base format of HTTP response bodies from the `content-type` header. This module helps disambiguate the nature of the content, especially between `text/*` and `application/*`. The basic seven content type bases as defined [RFC1341](https://www.w3.org/Protocols/rfc1341/4_Content-Type.html) are:

- text
- multipart
- message
- image
- audio
- video
- application

However, from the content-type base, it is not easy to determine which formats are exactly "textual" in nature. For example, "text/json" as well as "application/json" are textual. This module disambiguates the same by maintaining a database of textual contents served over "application/*" content types.

## Usage

```terminal
npm install mime-format --save-dev;
```

```javascript
var mimeFormat = require('mime-format');
console.log(mimeFormat.lookup('application/xml; charset=gBk'));
// outputs
// {
//   "type": "text",
//   "format": "xml"
//   "charset": "gBk"
// }
```

## How to handle unlisted (not in db) content types?

When the content type is not in internal db, it looks for keywords in content type for best match. Under those
circumstances, you will see a `guessed: true` property returned. In case even guess failed, you get `unknown: true` and
`format: 'raw'` will be sent.

If the contentType argument is not a string, then the detection is attempted by typecasting it to String.

## What is format?

Format is a secondary information for `type: 'text' and 'embed`. For texts, the format highlights what syntax the text
is in. Additionally, it doubles up to let you know text was not detected by returning value `raw`. For most cases this
is redundant.

## List of types:

- text
- image
- audio
- video
- embed
- message
- multipart
- unknown

## List of formats:

- audio
- video
- image
- plain
- jsonp
- json
- xml
- html
- yaml
- vml
- webml
- script
- raw
