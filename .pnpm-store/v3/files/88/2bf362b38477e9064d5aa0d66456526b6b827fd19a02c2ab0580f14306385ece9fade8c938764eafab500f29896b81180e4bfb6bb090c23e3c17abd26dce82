"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = void 0;
exports.default = pluginSVGR;
const svgrLoader_1 = require("./svgrLoader");
function pluginSVGR(_context, options) {
    return {
        name: 'docusaurus-plugin-svgr',
        configureWebpack: (config, isServer) => {
            (0, svgrLoader_1.enhanceConfig)(config, { isServer, svgrConfig: options.svgrConfig });
        },
    };
}
var options_1 = require("./options");
Object.defineProperty(exports, "validateOptions", { enumerable: true, get: function () { return options_1.validateOptions; } });
