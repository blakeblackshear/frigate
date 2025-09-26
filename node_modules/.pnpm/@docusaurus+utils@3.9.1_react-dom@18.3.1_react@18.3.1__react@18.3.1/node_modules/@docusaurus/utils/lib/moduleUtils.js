"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFreshModule = loadFreshModule;
const tslib_1 = require("tslib");
const jiti_1 = tslib_1.__importDefault(require("jiti"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
/*
jiti is able to load ESM, CJS, JSON, TS modules
 */
async function loadFreshModule(modulePath) {
    try {
        if (typeof modulePath !== 'string') {
            throw new Error(logger_1.default.interpolate `Invalid module path of type name=${modulePath}`);
        }
        const load = (0, jiti_1.default)(__filename, {
            // Transpilation cache, can be safely enabled
            cache: true,
            // Bypass Node.js runtime require cache
            // Same as "import-fresh" package we used previously
            requireCache: false,
            // Only take into consideration the default export
            // For now we don't need named exports
            // This also helps normalize return value for both CJS/ESM/TS modules
            interopDefault: true,
            // debug: true,
        });
        return load(modulePath);
    }
    catch (error) {
        throw new Error(logger_1.default.interpolate `Docusaurus could not load module at path path=${modulePath}\nCause: ${error.message}`, { cause: error });
    }
}
//# sourceMappingURL=moduleUtils.js.map