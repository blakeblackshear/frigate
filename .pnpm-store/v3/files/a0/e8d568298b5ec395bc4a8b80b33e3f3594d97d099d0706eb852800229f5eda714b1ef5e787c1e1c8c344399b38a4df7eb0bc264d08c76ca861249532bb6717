"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHashRouterEntrypoint = generateHashRouterEntrypoint;
exports.writeStaticFile = writeStaticFile;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
function pathnameToFilename({ pathname, trailingSlash, }) {
    const outputFileName = pathname.replace(/^[/\\]/, ''); // Remove leading slashes for webpack-dev-server
    // Paths ending with .html are left untouched
    if (/\.html?$/i.test(outputFileName)) {
        return outputFileName;
    }
    // Legacy retro-compatible behavior
    if (typeof trailingSlash === 'undefined') {
        return path_1.default.join(outputFileName, 'index.html');
    }
    // New behavior: we can say if we prefer file/folder output
    // Useful resource: https://github.com/slorber/trailing-slash-guide
    if (pathname === '' || pathname.endsWith('/') || trailingSlash) {
        return path_1.default.join(outputFileName, 'index.html');
    }
    return `${outputFileName}.html`;
}
async function generateHashRouterEntrypoint({ content, params, }) {
    await writeStaticFile({
        pathname: '/',
        content,
        params,
    });
}
async function writeStaticFile({ content, pathname, params, }) {
    function removeBaseUrl(p, baseUrl) {
        return baseUrl === '/' ? p : p.replace(new RegExp(`^${baseUrl}`), '/');
    }
    const filename = pathnameToFilename({
        pathname: removeBaseUrl(pathname, params.baseUrl),
        trailingSlash: params.trailingSlash,
    });
    const filePath = path_1.default.join(params.outDir, filename);
    await fs_extra_1.default.ensureDir(path_1.default.dirname(filePath));
    await fs_extra_1.default.writeFile(filePath, content);
}
