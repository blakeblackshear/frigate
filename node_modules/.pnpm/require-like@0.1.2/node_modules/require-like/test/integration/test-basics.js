var common = require('../common');
var assert = common.assert;
var requireLike = require(common.dir.lib + '/require-like');


(function testWithCache() {
  var foo = require(common.dir.fixture + '/foo.js');
  var myRequire = requireLike(common.dir.fixture + '/bar.js');
  var myFoo = myRequire('./foo');

  assert.strictEqual(myFoo, foo);
})();

(function testWithoutCache() {
  var foo = require(common.dir.fixture + '/foo.js');
  var myRequire = requireLike(common.dir.fixture + '/bar.js', true);
  var myFoo = myRequire('./foo');

  assert.notStrictEqual(myFoo, foo);
  assert.deepEqual(myFoo, foo);
})();

(function testResolve() {
  var myRequire = requireLike(common.dir.fixture + '/bar.js');
  var fooPath = myRequire.resolve('./foo');

  assert.strictEqual(fooPath, common.dir.fixture + '/foo.js');
})();

if (process.version <= 'v0.5') {
  (function testPaths() {
    var myRequire = requireLike(common.dir.fixture + '/bar.js');
    assert.strictEqual(myRequire.paths, require.paths);
  })();
}

(function testMain() {
  var myRequire = requireLike(common.dir.fixture + '/bar.js');
  assert.strictEqual(myRequire.main, process.mainModule);
})();

(function testExtensions() {
  var myRequire = requireLike(common.dir.fixture + '/bar.js');
  assert.strictEqual(myRequire.extensions, require.extensions);
})();

(function testCache() {
  var myRequire = requireLike(common.dir.fixture + '/bar.js');
  assert.strictEqual(myRequire.cache, require.cache);
})();

(function testLoadNodeModule() {
  var myRequire = requireLike(common.dir.lib + '/foo.js', true);
  myRequire('hashish');
})();
