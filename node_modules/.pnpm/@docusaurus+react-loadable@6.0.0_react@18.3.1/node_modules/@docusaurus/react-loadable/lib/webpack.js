'use strict';

var url = require('url');

function buildManifest(compiler, compilation) {
  var context = compiler.options.context;
  var manifest = {};
  compilation.chunks.forEach(function (chunk) {
    chunk.files.forEach(function (file) {
      chunk.forEachModule(function (module) {
        var id = module.id;
        var name = typeof module.libIdent === 'function' ? module.libIdent({
          context: context
        }) : null;
        var publicPath = url.resolve(compilation.outputOptions.publicPath || '', file);
        var currentModule = module;

        if (module.constructor.name === 'ConcatenatedModule') {
          currentModule = module.rootModule;
        }

        if (!manifest[currentModule.rawRequest]) {
          manifest[currentModule.rawRequest] = [];
        }

        manifest[currentModule.rawRequest].push({
          id: id,
          name: name,
          file: file,
          publicPath: publicPath
        });
      });
    });
  });
  return manifest;
}

var ReactLoadablePlugin =
/*#__PURE__*/
function () {
  function ReactLoadablePlugin(opts) {
    if (opts === void 0) {
      opts = {};
    }

    this.filename = opts.filename;
  }

  var _proto = ReactLoadablePlugin.prototype;

  _proto.apply = function apply(compiler) {
    var _this = this;

    compiler.plugin('emit', function (compilation, callback) {
      var manifest = buildManifest(compiler, compilation);
      var json = JSON.stringify(manifest, null, 2);
      compilation.assets[_this.filename] = {
        source: function source() {
          return json;
        },
        size: function size() {
          return json.length;
        }
      };
      callback();
    });
  };

  return ReactLoadablePlugin;
}();

function getBundles(manifest, moduleIds) {
  return moduleIds.reduce(function (bundles, moduleId) {
    return bundles.concat(manifest[moduleId]);
  }, []);
}

exports.ReactLoadablePlugin = ReactLoadablePlugin;
exports.getBundles = getBundles;