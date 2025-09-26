charset
=======

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/charset.svg?style=flat-square
[npm-url]: https://npmjs.org/package/charset
[travis-image]: https://img.shields.io/travis/node-modules/charset.svg?style=flat-square
[travis-url]: https://travis-ci.org/node-modules/charset
[codecov-image]: https://codecov.io/gh/node-modules/charset/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/node-modules/charset
[david-image]: https://img.shields.io/david/node-modules/charset.svg?style=flat-square
[david-url]: https://david-dm.org/node-modules/charset
[download-image]: https://img.shields.io/npm/dm/charset.svg?style=flat-square
[download-url]: https://npmjs.org/package/charset

![logo](https://raw.github.com/node-modules/charset/master/logo.png)

Get the content charset from header and html content-type.

## Install

```bash
$ npm install charset --save
```

## Usage

### Detect charset from http client response and content

```js
var charset = require('charset');
var http = require('http');

http.get('http://nodejs.org', function (res) {
  res.on('data', function (chunk) {
    console.log(charset(res.headers, chunk));
    // or `console.log(charset(res, chunk));`
    res.destroy();
  });
});
```

Stdout will should log: `utf8` .

### Detect from String

```js
charset(res.headers['content-type']);
```

### Detect combine with [jschardet]

As you know, `charset` only detect from http response headers and html content-type meta tag.
You can combine with [jschardet] to help you detect the finally charset.

This example codes come from [stackoverflow#12326688](http://stackoverflow.com/a/18712021/2496088):

```js
var request = require('request');
var charset = require('charset');
var jschardet = require('jschardet');

request({
  url: 'http://www.example.com',
  encoding: null
}, function (err, res, body) {
  if (err) {
    throw err;
  }
  enc = charset(res.headers, body);
  enc = enc || jschardet.detect(body).encoding.toLowerCase();
  console.log(enc);
});
```

## License

[MIT](LICENSE.txt)

[jschardet]: https://github.com/aadsm/jschardet
