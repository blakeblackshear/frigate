# CHANGELOG

## 7.1.1

- DevDependency Changes

  - happy-dom to 15.11.6

- Update (sub-)dependencies
  - cross-spawn to 7.0.6
  - micromatch to 4.0.8
  - vite to 4.5.5

## 7.1.0

- Updated to handle back-slashes

## 7.0.4

- Updates get-func-name to 2.0.2

## 7.0.3

- Dependencies
  - Update braces to 3.0.3

## 7.0.2

- Improve sanitization of whitespace escapes

## 7.0.1

- Improve sanitization of HTML entities

## 7.0.0

- Move constant declarations from index file to `constants.ts` file
- Update to node v18

- Dev Dependency Updates
  - Update to TypeScript 5
  - Other minor dependency updates

## 6.0.4

- Add additional null byte sanitization prior to html decoding (#48)

## 6.0.3

- Add null check to beginning of `sanitizeUrl` function ([#54](https://github.com/braintree/sanitize-url/issues/54))

## 6.0.2

- Fix issue where urls in the form `https://example.com&NewLine;&NewLine;/something` were not properly sanitized

## 6.0.1

- Fix issue where urls in the form `javascript&colon;alert('xss');` were not properly sanitized
- Fix issue where urls in the form `javasc&Tab;ript:alert('XSS');` were not properly sanitized

## 6.0.0

**Breaking Changes**

- Decode HTML characters automatically that would result in an XSS vulnerability when rendering links via a server rendered HTML file

```js
// decodes to javacript:alert('XSS')
const vulnerableUrl =
  "&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041";

sanitizeUrl(vulnerableUrl); // 'about:blank'

const okUrl = "https://example.com/" + vulnerableUrl;

// since the javascript bit is in the path instead of the protocol
// this is successfully sanitized
sanitizeUrl(okUrl); // 'https://example.com/javascript:alert('XSS');
```

## 5.0.2

- Fix issue where certain invisible white space characters were not being sanitized (#35)

## 5.0.1

- Fix issue where certain safe characters were being filtered out (#31 thanks @akirchmyer)

## 5.0.0

_Breaking Changes_

- Sanitize vbscript urls (thanks @vicnicius)

## 4.1.1

- Fixup path to type declaration (closes #25)

## 4.1.0

- Add typescript types

## 4.0.1

- Fix issue where urls with accented characters were incorrectly sanitized

## 4.0.0

_Breaking Changes_

- Protocol-less urls (ie: www.example.com) will be sanitised and passed on instead of sending out `about:blank` (Thanks @chawes13 #18)

## 3.1.0

- Trim whitespace from urls

## 3.0.0

_breaking changes_

- Replace blank strings with about:blank
- Replace null values with about:blank

## 2.1.0

- Allow relative urls to be sanitized

## 2.0.2

- Sanitize malicious URLs that begin with `\s`

## 2.0.1

- Sanitize malicious URLs that begin with %20

## 2.0.0

- sanitize data: urls

## 1.0.0

- sanitize javascript: urls
