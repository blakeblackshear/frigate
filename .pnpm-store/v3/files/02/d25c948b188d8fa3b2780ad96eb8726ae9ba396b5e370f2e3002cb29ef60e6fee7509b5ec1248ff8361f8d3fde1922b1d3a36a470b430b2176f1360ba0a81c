# Postman URL Encoder [![Build Status](https://travis-ci.com/postmanlabs/postman-url-encoder.svg?branch=develop)](https://travis-ci.com/postmanlabs/postman-url-encoder) [![codecov](https://codecov.io/gh/postmanlabs/postman-url-encoder/branch/develop/graph/badge.svg)](https://codecov.io/gh/postmanlabs/postman-url-encoder)

Postman URL Encoder is a NodeJS module that provides various URL encoding related APIs. This module is created to
implement the [WHATWG URL specification](https://url.spec.whatwg.org/) to remove dependency on Node's URL APIs across
Postman systems. These APIs are useful to encode different parts (like hostname, path, query) of URL and convert
[PostmanUrl](http://www.postmanlabs.com/postman-collection/Url.html) object into
[Node's Url](https://nodejs.org/dist/latest-v10.x/docs/api/url.html#url_legacy_urlobject) like object.

## Installing the Postman URL Encoder

Postman URL Encoder can be installed using NPM or directly from the git repository within your NodeJS projects. If
installing from NPM, the following command installs the module and saves in your `package.json`

```terminal
> npm install postman-url-encoder --save
```

## Getting Started

Following example snippet shows how to convert [PostmanUrl](http://www.postmanlabs.com/postman-collection/Url.html)
object into [Node's Url](https://nodejs.org/dist/latest-v10.x/docs/api/url.html#url_legacy_urlobject) like object.

```javascript
var PostmanUrl = require('postman-collection').Url,
    pmEncoder = require('postman-url-encoder'),
    myUrl;

// Create PostmanUrl object
myUrl = new PostmanUrl('http://example.com/p/a/t/h?q1=v1');

// convert PostmanUrl object to Node's Url like object
myUrl = pmEncoder.toNodeUrl(myUrl));
// {
//   protocol: 'http:',
//   slashes: true,
//   auth: null,
//   host: 'example.com',
//   port: null,
//   hostname: 'example.com',
//   hash: null,
//   search: '?q1=v1',
//   query: 'q1=v1',
//   pathname: '/p/a/t/h',
//   path: '/p/a/t/h?q1=v1',
//   href: 'http://example.com/p/a/t/h?q1=v1'
// }
```

To know more about provided APIs, head over to [Postman URL Encoder Docs](http://www.postmanlabs.com/postman-url-encoder).
