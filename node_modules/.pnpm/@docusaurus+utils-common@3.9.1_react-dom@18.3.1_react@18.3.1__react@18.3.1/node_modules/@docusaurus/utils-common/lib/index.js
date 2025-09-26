"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorCausalChain = exports.removePrefix = exports.addSuffix = exports.removeSuffix = exports.addPrefix = exports.removeTrailingSlash = exports.addLeadingSlash = exports.addTrailingSlash = exports.applyTrailingSlash = exports.blogPostContainerID = void 0;
const tslib_1 = require("tslib");
// __ prefix allows search crawlers (Algolia/DocSearch) to ignore anchors
// https://github.com/facebook/docusaurus/issues/8883#issuecomment-1516328368
exports.blogPostContainerID = '__blog-post-container';
var applyTrailingSlash_1 = require("./applyTrailingSlash");
Object.defineProperty(exports, "applyTrailingSlash", { enumerable: true, get: function () { return tslib_1.__importDefault(applyTrailingSlash_1).default; } });
Object.defineProperty(exports, "addTrailingSlash", { enumerable: true, get: function () { return applyTrailingSlash_1.addTrailingSlash; } });
Object.defineProperty(exports, "addLeadingSlash", { enumerable: true, get: function () { return applyTrailingSlash_1.addLeadingSlash; } });
Object.defineProperty(exports, "removeTrailingSlash", { enumerable: true, get: function () { return applyTrailingSlash_1.removeTrailingSlash; } });
var stringUtils_1 = require("./stringUtils");
Object.defineProperty(exports, "addPrefix", { enumerable: true, get: function () { return stringUtils_1.addPrefix; } });
Object.defineProperty(exports, "removeSuffix", { enumerable: true, get: function () { return stringUtils_1.removeSuffix; } });
Object.defineProperty(exports, "addSuffix", { enumerable: true, get: function () { return stringUtils_1.addSuffix; } });
Object.defineProperty(exports, "removePrefix", { enumerable: true, get: function () { return stringUtils_1.removePrefix; } });
var errorUtils_1 = require("./errorUtils");
Object.defineProperty(exports, "getErrorCausalChain", { enumerable: true, get: function () { return errorUtils_1.getErrorCausalChain; } });
//# sourceMappingURL=index.js.map