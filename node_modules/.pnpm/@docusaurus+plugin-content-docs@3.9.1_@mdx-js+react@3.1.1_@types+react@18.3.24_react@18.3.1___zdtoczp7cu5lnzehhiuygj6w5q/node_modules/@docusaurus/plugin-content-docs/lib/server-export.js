"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.readVersionNames = exports.getVersionBanner = exports.getVersionBadge = exports.getDefaultVersionBanner = exports.filterVersions = exports.VERSIONS_JSON_FILE = exports.VERSIONED_SIDEBARS_DIR = exports.VERSIONED_DOCS_DIR = exports.CURRENT_VERSION_NAME = void 0;
// APIs available to Node.js
// Those are undocumented but used by some third-party plugins
// For this reason it's preferable to avoid doing breaking changes
// See also https://github.com/facebook/docusaurus/pull/6477
var constants_1 = require("./constants");
Object.defineProperty(exports, "CURRENT_VERSION_NAME", { enumerable: true, get: function () { return constants_1.CURRENT_VERSION_NAME; } });
Object.defineProperty(exports, "VERSIONED_DOCS_DIR", { enumerable: true, get: function () { return constants_1.VERSIONED_DOCS_DIR; } });
Object.defineProperty(exports, "VERSIONED_SIDEBARS_DIR", { enumerable: true, get: function () { return constants_1.VERSIONED_SIDEBARS_DIR; } });
Object.defineProperty(exports, "VERSIONS_JSON_FILE", { enumerable: true, get: function () { return constants_1.VERSIONS_JSON_FILE; } });
var version_1 = require("./versions/version");
Object.defineProperty(exports, "filterVersions", { enumerable: true, get: function () { return version_1.filterVersions; } });
Object.defineProperty(exports, "getDefaultVersionBanner", { enumerable: true, get: function () { return version_1.getDefaultVersionBanner; } });
Object.defineProperty(exports, "getVersionBadge", { enumerable: true, get: function () { return version_1.getVersionBadge; } });
Object.defineProperty(exports, "getVersionBanner", { enumerable: true, get: function () { return version_1.getVersionBanner; } });
var files_1 = require("./versions/files");
Object.defineProperty(exports, "readVersionNames", { enumerable: true, get: function () { return files_1.readVersionNames; } });
