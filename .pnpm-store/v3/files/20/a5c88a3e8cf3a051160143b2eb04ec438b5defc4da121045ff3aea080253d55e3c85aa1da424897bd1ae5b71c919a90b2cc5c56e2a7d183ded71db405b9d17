var vm = require('vm')
var isBuffer = Buffer.isBuffer

var requireLike = require('require-like')

function merge (a, b) {
  if (!a || !b) return a
  var keys = Object.keys(b)
  for (var k, i = 0, n = keys.length; i < n; i++) {
    k = keys[i]
    a[k] = b[k]
  }
  return a
}

var vmGlobals = new vm.Script('Object.getOwnPropertyNames(globalThis)')
  .runInNewContext()

// Return the exports/module.exports variable set in the content
// content (String|VmScript): required
module.exports = function (content, filename, scope, includeGlobals) {

  if (typeof filename !== 'string') {
    if (typeof filename === 'object') {
      includeGlobals = scope
      scope = filename
      filename = ''
    } else if (typeof filename === 'boolean') {
      includeGlobals = filename
      scope = {}
      filename = ''
    }
  }

  // Expose standard Node globals
  var sandbox = {}
  var exports = {}
  var _filename = filename || module.parent.filename;

  if (includeGlobals) {
    // Merge enumerable variables on `global`
    merge(sandbox, global)
    // Merge all non-enumerable variables on `global`, including console (v10+),
    // process (v12+), URL, etc. We first filter out anything that's already in
    // the VM scope (i.e. those in the ES standard) so we don't have two copies
    Object.getOwnPropertyNames(global).forEach((name) => {
      if (!vmGlobals.includes(name)) {
        sandbox[name] = global[name]
      }
    })
    // `console` exists in VM scope, but we want to pipe the output to the
    // process'
    sandbox.console = console
    sandbox.require = requireLike(_filename)
  }

  if (typeof scope === 'object') {
    merge(sandbox, scope)
  }

  sandbox.exports = exports
  sandbox.module = {
    exports: exports,
    filename: _filename,
    id: _filename,
    parent: module.parent,
    require: sandbox.require || requireLike(_filename)
  }
  sandbox.global = sandbox

  var options = {
    filename: filename,
    displayErrors: false
  }

  if (isBuffer(content)) {
    content = content.toString()
  }

  // Evalutate the content with the given scope
  if (typeof content === 'string') {
    var stringScript = content.replace(/^\#\!.*/, '')
    var script = new vm.Script(stringScript, options)
    script.runInNewContext(sandbox, options)
  } else {
    content.runInNewContext(sandbox, options)
  }

  return sandbox.module.exports
}
