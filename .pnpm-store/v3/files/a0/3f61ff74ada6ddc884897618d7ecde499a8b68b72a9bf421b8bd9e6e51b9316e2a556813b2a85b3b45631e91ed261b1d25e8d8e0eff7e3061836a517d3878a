"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const webpack_1 = tslib_1.__importDefault(require("webpack"));
// Adds a custom Docusaurus Webpack runtime function `__webpack_require__.gca`
// gca = Get Chunk Asset, it converts a chunkName to a JS asset URL
// It is called in Core client/docusaurus.ts for chunk preloading/prefetching
// Example: gca("814f3328") = "/baseUrl/assets/js/814f3328.03fcc178.js"
// See also: https://github.com/facebook/docusaurus/pull/10485
// The name of the custom Docusaurus Webpack runtime function
const DocusaurusGetChunkAssetFn = '__webpack_require__.gca';
const PluginName = 'Docusaurus-ChunkAssetPlugin';
function generateGetChunkAssetRuntimeCode(chunk) {
    const chunkIdToName = chunk.getChunkMaps(false).name;
    const chunkNameToId = Object.fromEntries(Object.entries(chunkIdToName).map(([chunkId, chunkName]) => [
        chunkName,
        chunkId,
    ]));
    const { 
    // publicPath = __webpack_require__.p
    // Example: "/" or "/baseUrl/"
    // https://github.com/webpack/webpack/blob/v5.94.0/lib/runtime/PublicPathRuntimeModule.js
    publicPath, 
    // getChunkScriptFilename = __webpack_require__.u
    // Example: getChunkScriptFilename("814f3328") = "814f3328.03fcc178.js"
    // https://github.com/webpack/webpack/blob/v5.94.0/lib/runtime/GetChunkFilenameRuntimeModule.js
    getChunkScriptFilename, } = webpack_1.default.RuntimeGlobals;
    const code = `// Docusaurus function to get chunk asset
${DocusaurusGetChunkAssetFn} = function(chunkId) { chunkId = ${JSON.stringify(chunkNameToId)}[chunkId]||chunkId; return ${publicPath} + ${getChunkScriptFilename}(chunkId); };`;
    return webpack_1.default.Template.asString(code);
}
/*
 Note: we previously used `MainTemplate.hooks.requireExtensions.tap()`
 But it will be removed in Webpack 6 and is not supported by Rspack
 So instead we use equivalent code inspired by:
 - https://github.com/webpack/webpack/blob/v5.94.0/lib/RuntimePlugin.js#L462
 - https://github.com/webpack/webpack/blob/v5.94.0/lib/runtime/CompatRuntimeModule.js
 */
class ChunkAssetPlugin {
    apply(compiler) {
        compiler.hooks.thisCompilation.tap(PluginName, (compilation) => {
            compilation.hooks.additionalTreeRuntimeRequirements.tap(PluginName, (chunk) => {
                compilation.addRuntimeModule(chunk, new ChunkAssetRuntimeModule());
            });
        });
    }
}
exports.default = ChunkAssetPlugin;
// Inspired by https://github.com/webpack/webpack/blob/v5.94.0/lib/runtime/CompatRuntimeModule.js
// See also https://rspack.dev/api/javascript-api/compilation#addruntimemodule
// See also https://rspack.dev/api/plugin-api/compilation-hooks#additionaltreeruntimerequirements
class ChunkAssetRuntimeModule extends webpack_1.default.RuntimeModule {
    constructor() {
        super('ChunkAssetRuntimeModule', webpack_1.default.RuntimeModule.STAGE_ATTACH);
        this.fullHash = true;
    }
    generate() {
        return generateGetChunkAssetRuntimeCode(this.chunk);
    }
}
