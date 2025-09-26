# Eval - require() for module content!

## Overview

This module is a simple way to evaluate a module content in the same way as require() but without loading it from a file. Effectively, it mimicks the javascript evil `eval` function but leverages Node's VM module instead.


## Benefits

Why would you be using the `eval` module over the native`require`? Most of the time `require` is fine but in some situations, I have found myself wishing for the following:

* Ability to supply a context to a module
* Ability to load the module file(s) from non node standard places

Or simply to leverage JavaScript's `eval` but with sandboxing.


## Download

It is published on node package manager (npm). To install, do:

    npm install eval


## Usage

```` javascript
var _eval = require('eval')
var res = _eval(content /*, filename, scope, includeGlobals */)
````

The following options are available:

* `content` (__String__): the content to be evaluated
* `filename` (__String__): optional dummy name to be given (used in stacktraces)
* `scope` (__Object__): scope properties are provided as variables to the content
* `includeGlobals` (__Boolean__): allow/disallow global variables (and require) to be supplied to the content (default=false)


## Examples

```` javascript
var _eval = require('eval')
var res = _eval('var x = 123; exports.x = x')
// => res === { x: 123 }

res = _eval('module.exports = function () { return 123 }')
// => res() === 123

res = _eval('module.exports = require("events")', true)
// => res === require('events')

res = _eval('exports.x = process', true)
// => res.x === process
````


## License

[Here](https://github.com/pierrec/node-eval/tree/master/LICENSE)
