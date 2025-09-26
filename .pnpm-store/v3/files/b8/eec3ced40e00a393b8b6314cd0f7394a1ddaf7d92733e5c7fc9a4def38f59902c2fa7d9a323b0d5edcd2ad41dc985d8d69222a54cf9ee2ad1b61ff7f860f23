"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports["default"] = exports.defaultOptions = void 0;

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _url = _interopRequireDefault(require("url"));

var _utils = require("./utils");

var PLUGIN_NAME = 'ReactLoadableSSRAddon';

var WEBPACK_VERSION = require('webpack/package.json').version;

var WEBPACK_5 = WEBPACK_VERSION.startsWith('5.');
var defaultOptions = {
  filename: 'assets-manifest.json',
  integrity: false,
  integrityAlgorithms: ['sha256', 'sha384', 'sha512'],
  integrityPropertyName: 'integrity'
};
exports.defaultOptions = defaultOptions;

var ReactLoadableSSRAddon = function () {
  function ReactLoadableSSRAddon(options) {
    if (options === void 0) {
      options = defaultOptions;
    }

    this.options = (0, _extends2["default"])({}, defaultOptions, options);
    this.compiler = null;
    this.stats = null;
    this.entrypoints = new Set();
    this.assetsByName = new Map();
    this.manifest = {};
  }

  var _proto = ReactLoadableSSRAddon.prototype;

  _proto.getAssets = function getAssets(assetsChunk) {
    for (var i = 0; i < assetsChunk.length; i += 1) {
      var chunk = assetsChunk[i];
      var id = chunk.id,
          files = chunk.files,
          _chunk$siblings = chunk.siblings,
          siblings = _chunk$siblings === void 0 ? [] : _chunk$siblings,
          hash = chunk.hash;
      var keys = this.getChunkOrigin(chunk);

      for (var j = 0; j < keys.length; j += 1) {
        this.assetsByName.set(keys[j], {
          id: id,
          files: files,
          hash: hash,
          siblings: siblings
        });
      }
    }

    return this.assetsByName;
  };

  _proto.getEntrypoints = function getEntrypoints(entrypoints) {
    var entry = Object.keys(entrypoints);

    for (var i = 0; i < entry.length; i += 1) {
      this.entrypoints.add(entry[i]);
    }

    return this.entrypoints;
  };

  _proto.getChunkOrigin = function getChunkOrigin(_ref) {
    var id = _ref.id,
        names = _ref.names,
        modules = _ref.modules;
    var origins = new Set();

    if (!WEBPACK_5) {
      for (var i = 0; i < modules.length; i += 1) {
        var reasons = modules[i].reasons;

        for (var j = 0; j < reasons.length; j += 1) {
          var reason = reasons[j];
          var type = reason.dependency ? reason.dependency.type : null;
          var userRequest = reason.dependency ? reason.dependency.userRequest : null;

          if (type === 'import()') {
            origins.add(userRequest);
          }
        }
      }
    }

    if (origins.size === 0) {
      return [names[0] || id];
    }

    if (this.entrypoints.has(names[0])) {
      origins.add(names[0]);
    }

    return Array.from(origins);
  };

  _proto.apply = function apply(compiler) {
    this.compiler = compiler;
    compiler.hooks.emit.tapAsync(PLUGIN_NAME, this.handleEmit.bind(this));
  };

  _proto.getMinimalStatsChunks = function getMinimalStatsChunks(compilationChunks, chunkGraph) {
    var _this = this;

    var compareId = function compareId(a, b) {
      if (typeof a !== typeof b) {
        return typeof a < typeof b ? -1 : 1;
      }

      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    };

    return this.ensureArray(compilationChunks).reduce(function (chunks, chunk) {
      var siblings = new Set();

      if (chunk.groupsIterable) {
        var chunkGroups = Array.from(chunk.groupsIterable);

        for (var i = 0; i < chunkGroups.length; i += 1) {
          var group = Array.from(chunkGroups[i].chunks);

          for (var j = 0; j < group.length; j += 1) {
            var sibling = group[j];
            if (sibling !== chunk) siblings.add(sibling.id);
          }
        }
      }

      chunk.ids.forEach(function (id) {
        chunks.push({
          id: id,
          names: chunk.name ? [chunk.name] : [],
          files: _this.ensureArray(chunk.files).slice(),
          hash: chunk.renderedHash,
          siblings: Array.from(siblings).sort(compareId),
          modules: WEBPACK_5 ? chunkGraph.getChunkModules(chunk) : chunk.getModules()
        });
      });
      return chunks;
    }, []);
  };

  _proto.handleEmit = function handleEmit(compilation, callback) {
    this.stats = compilation.getStats().toJson({
      all: false,
      entrypoints: true
    }, true);
    this.options.publicPath = (compilation.outputOptions ? compilation.outputOptions.publicPath : compilation.options.output.publicPath) || '';
    this.getEntrypoints(this.stats.entrypoints);
    this.getAssets(this.getMinimalStatsChunks(compilation.chunks, compilation.chunkGraph));
    this.processAssets(compilation.assets);
    this.writeAssetsFile();
    callback();
  };

  _proto.processAssets = function processAssets(originAssets) {
    var _this2 = this;

    var assets = {};
    var origins = {};
    var entrypoints = this.entrypoints;
    this.assetsByName.forEach(function (value, key) {
      var files = value.files,
          id = value.id,
          siblings = value.siblings,
          hash = value.hash;

      if (!origins[key]) {
        origins[key] = [];
      }

      siblings.push(id);

      for (var i = 0; i < siblings.length; i += 1) {
        var sibling = siblings[i];

        if (!origins[key].includes(sibling)) {
          origins[key].push(sibling);
        }
      }

      for (var _i = 0; _i < files.length; _i += 1) {
        var file = files[_i];
        var currentAsset = originAssets[file] || {};
        var ext = (0, _utils.getFileExtension)(file).replace(/^\.+/, '').toLowerCase();

        if (!assets[id]) {
          assets[id] = {};
        }

        if (!assets[id][ext]) {
          assets[id][ext] = [];
        }

        if (!(0, _utils.hasEntry)(assets[id][ext], 'file', file)) {
          var shouldComputeIntegrity = Object.keys(currentAsset) && _this2.options.integrity && !currentAsset[_this2.options.integrityPropertyName];

          if (shouldComputeIntegrity) {
            currentAsset[_this2.options.integrityPropertyName] = (0, _utils.computeIntegrity)(_this2.options.integrityAlgorithms, currentAsset.source());
          }

          assets[id][ext].push({
            file: file,
            hash: hash,
            publicPath: _url["default"].resolve(_this2.options.publicPath || '', file),
            integrity: currentAsset[_this2.options.integrityPropertyName]
          });
        }
      }
    });
    this.manifest = {
      entrypoints: Array.from(entrypoints),
      origins: origins,
      assets: assets
    };
  };

  _proto.writeAssetsFile = function writeAssetsFile() {
    var filePath = this.manifestOutputPath;

    var fileDir = _path["default"].dirname(filePath);

    var json = JSON.stringify(this.manifest, null, 2);

    try {
      if (!_fs["default"].existsSync(fileDir)) {
        _fs["default"].mkdirSync(fileDir);
      }
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    _fs["default"].writeFileSync(filePath, json);
  };

  _proto.ensureArray = function ensureArray(source) {
    if (WEBPACK_5) {
      return Array.from(source);
    }

    return source;
  };

  (0, _createClass2["default"])(ReactLoadableSSRAddon, [{
    key: "isRequestFromDevServer",
    get: function get() {
      if (process.argv.some(function (arg) {
        return arg.includes('webpack-dev-server');
      })) {
        return true;
      }

      var _this$compiler = this.compiler,
          outputFileSystem = _this$compiler.outputFileSystem,
          name = _this$compiler.outputFileSystem.constructor.name;
      return outputFileSystem && name === 'MemoryFileSystem';
    }
  }, {
    key: "manifestOutputPath",
    get: function get() {
      var filename = this.options.filename;

      if (_path["default"].isAbsolute(filename)) {
        return filename;
      }

      var _this$compiler2 = this.compiler,
          outputPath = _this$compiler2.outputPath,
          devServer = _this$compiler2.options.devServer;

      if (this.isRequestFromDevServer && devServer) {
        var devOutputPath = devServer.outputPath || outputPath || '/';

        if (devOutputPath === '/') {
          console.warn('Please use an absolute path in options.output when using webpack-dev-server.');
          devOutputPath = this.compiler.context || process.cwd();
        }

        return _path["default"].resolve(devOutputPath, filename);
      }

      return _path["default"].resolve(outputPath, filename);
    }
  }]);
  return ReactLoadableSSRAddon;
}();

var _default = ReactLoadableSSRAddon;
exports["default"] = _default;