var assert = require('assert')

var _eval = require('./eval')
var res

res = _eval('var x = 123; exports.x = x')
assert.deepEqual( res, { x: 123 } )

res = _eval('module.exports = function () { return 123 }')
assert.deepEqual( res(), 123 )

res = _eval('module.exports = require("events")', true)
assert.deepEqual( res, require('events') )

res = _eval('exports.x = process', true)
assert.deepEqual( res.x, process )

// Lock down scope by default
global.add = function (a, b) { return a + b }
res = _eval('exports.add = function (x, y) { return add(x, y) }')
assert.throws(function () {
    res.add(5, 6)
})

// Do not expose require by default
assert.throws(function () {
    _eval('require("fs")')
})

// Verify that the console is available when globals are passed
res = _eval('exports.x = console', true)
assert.deepEqual(res.x, console)

console.log('All tests passed')
