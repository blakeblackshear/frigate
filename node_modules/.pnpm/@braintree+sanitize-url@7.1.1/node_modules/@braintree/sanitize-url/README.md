# sanitize-url

## Installation

```sh
npm install -S @braintree/sanitize-url
```

## Usage

```js
var sanitizeUrl = require("@braintree/sanitize-url").sanitizeUrl;

sanitizeUrl("https://example.com"); // 'https://example.com'
sanitizeUrl("http://example.com"); // 'http://example.com'
sanitizeUrl("www.example.com"); // 'www.example.com'
sanitizeUrl("mailto:hello@example.com"); // 'mailto:hello@example.com'
sanitizeUrl(
  "&#104;&#116;&#116;&#112;&#115;&#0000058//&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#46;&#99;&#111;&#109;"
); // https://example.com

sanitizeUrl("javascript:alert(document.domain)"); // 'about:blank'
sanitizeUrl("jAvasCrIPT:alert(document.domain)"); // 'about:blank'
sanitizeUrl(decodeURIComponent("JaVaScRiP%0at:alert(document.domain)")); // 'about:blank'
// HTML encoded javascript:alert('XSS')
sanitizeUrl(
  "&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041"
); // 'about:blank'
```

## Testing

This library uses [Vitest](https://vitest.dev/). All testing dependencies
will be installed upon `npm install` and the test suite can be executed with
`npm test`. Running the test suite will also run lint checks upon exiting.

    npm test

To generate a coverage report, use `npm run coverage`.
