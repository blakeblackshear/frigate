'use strict';
var anObject = require('../internals/an-object');
var call = require('../internals/function-call');
var createIteratorProxy = require('../internals/iterator-create-proxy');
var createIterResultObject = require('../internals/create-iter-result-object');
var getIteratorDirect = require('../internals/get-iterator-direct');
var iteratorClose = require('../internals/iterator-close');
var uncurryThis = require('../internals/function-uncurry-this');

var $RangeError = RangeError;
var push = uncurryThis([].push);
var slice = uncurryThis([].slice);

var IteratorProxy = createIteratorProxy(function () {
  var iterator = this.iterator;
  var next = this.next;
  var buffer = this.buffer;
  var windowSize = this.windowSize;
  var sliding = this.sliding;
  var result, done;
  while (true) {
    result = anObject(call(next, iterator));
    done = this.done = !!result.done;
    if (sliding && done && buffer.length && buffer.length < windowSize) return createIterResultObject(buffer, false);
    if (done) return createIterResultObject(undefined, true);

    if (buffer.length === windowSize) this.buffer = buffer = slice(buffer, 1);
    push(buffer, result.value);
    if (buffer.length === windowSize) return createIterResultObject(buffer, false);
  }
}, false, true);

// `Iterator.prototype.sliding` and `Iterator.prototype.windows` methods
// https://github.com/tc39/proposal-iterator-chunking
module.exports = function (O, windowSize, sliding) {
  anObject(O);
  if (typeof windowSize != 'number' || !windowSize || windowSize >>> 0 !== windowSize) {
    return iteratorClose(O, 'throw', new $RangeError('windowSize must be integer in [1, 2^32-1]'));
  }
  return new IteratorProxy(getIteratorDirect(O), {
    windowSize: windowSize,
    buffer: [],
    sliding: sliding
  });
};
