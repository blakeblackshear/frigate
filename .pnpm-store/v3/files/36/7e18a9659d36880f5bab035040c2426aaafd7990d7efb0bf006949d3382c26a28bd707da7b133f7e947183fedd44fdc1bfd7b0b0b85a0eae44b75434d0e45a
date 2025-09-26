# hoek

Utility methods for the hapi ecosystem. This module is not intended to solve every problem for everyone, but rather as a central place to store hapi-specific methods. If you're looking for a general purpose utility module, check out [lodash](https://github.com/lodash/lodash) or [underscore](https://github.com/jashkenas/underscore).

[![Build Status](https://travis-ci.org/hapijs/hoek.svg?branch=v4-commercial)](https://travis-ci.org/hapijs/hoek)

## License

This version of the package requires a commercial license. You may not use, copy, or distribute it without first acquiring a commercial license from Sideway Inc. Using this software without a license is a violation of US and international law. To obtain a license, please contact [sales@sideway.com](mailto:sales@sideway.com). The open source version of this package can be found [here](https://github.com/hapijs/hoek).

## Usage

The *Hoek* library contains some common functions used within the hapi ecosystem. It comes with useful methods for Arrays (clone, merge, applyToDefaults), Objects (removeKeys, copy), Asserting and more.

For example, to use Hoek to set configuration with default options:
```javascript
const Hoek = require('hoek');

const default = {url : "www.github.com", port : "8000", debug : true};

const config = Hoek.applyToDefaults(default, {port : "3000", admin : true});

// In this case, config would be { url: 'www.github.com', port: '3000', debug: true, admin: true }
```

## Documentation

[**API Reference**](API.md)
