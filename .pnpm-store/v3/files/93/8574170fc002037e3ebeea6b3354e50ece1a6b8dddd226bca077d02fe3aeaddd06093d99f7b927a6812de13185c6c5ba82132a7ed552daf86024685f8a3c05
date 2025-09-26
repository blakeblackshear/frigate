# attr-accept
> JavaScript implementation of the "accept" attribute for HTML5 `<input type="file">`

[![npm](https://img.shields.io/npm/v/attr-accept.svg?style=flat-square)](https://www.npmjs.com/package/attr-accept)
![Tests](https://img.shields.io/github/actions/workflow/status/react-dropzone/attr-accept/test.yml?branch=master&style=flat-square&label=tests)

See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#attr-accept for more information.

## Installation
```sh
npm install --save attr-accept
```

## Usage
```javascript
var accept = require('attr-accept');
accept({
    name: 'my file.png',
    type: 'image/png'
}, 'image/*') // => true

accept({
    name: 'my file.json',
    type: 'application/json'
}, 'image/*') // => false

accept({
    name: 'my file.srt',
    type: ''
}, '.srt') // => true
```

You can also pass multiple mime types as a comma delimited string or array.
```javascript
accept({
    name: 'my file.json',
    type: 'application/json'
}, 'application/json,video/*') // => true

accept({
    name: 'my file.json',
    type: 'application/json'
}, ['application/json', 'video/*']) // => true
```

## Contributing

Checkout the organization [CONTRIBUTING.md](https://github.com/react-dropzone/.github/blob/main/CONTRIBUTING.md).
