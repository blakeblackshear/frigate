"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = generate;
exports.readOutputHTMLFile = readOutputHTMLFile;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const crypto_1 = require("crypto");
const jsUtils_1 = require("./jsUtils");
const fileHash = new Map();
const hashContent = (content) => {
    return (0, crypto_1.createHash)('md5').update(content).digest('hex');
};
/**
 * Outputs a file to the generated files directory. Only writes files if content
 * differs from cache (for hot reload performance).
 *
 * @param generatedFilesDir Absolute path.
 * @param file Path relative to `generatedFilesDir`. File will always be
 * outputted; no need to ensure directory exists.
 * @param content String content to write.
 * @param skipCache If `true` (defaults as `true` for production), file is
 * force-rewritten, skipping cache.
 */
async function generate(generatedFilesDir, file, content, skipCache = process.env.NODE_ENV === 'production') {
    const filepath = path_1.default.resolve(generatedFilesDir, file);
    if (skipCache) {
        await fs_extra_1.default.outputFile(filepath, content);
        // Cache still needs to be reset, otherwise, writing "A", "B", and "A" where
        // "B" skips cache will cause the last "A" not be able to overwrite as the
        // first "A" remains in cache. But if the file never existed in cache, no
        // need to register it.
        if (fileHash.get(filepath)) {
            fileHash.set(filepath, hashContent(content));
        }
        return;
    }
    let lastHash = fileHash.get(filepath);
    // If file already exists but it's not in runtime cache yet, we try to
    // calculate the content hash and then compare. This is to avoid unnecessary
    // overwriting and we can reuse old file.
    if (!lastHash && (await fs_extra_1.default.pathExists(filepath))) {
        const lastContent = await fs_extra_1.default.readFile(filepath, 'utf8');
        lastHash = hashContent(lastContent);
        fileHash.set(filepath, lastHash);
    }
    const currentHash = hashContent(content);
    if (lastHash !== currentHash) {
        await fs_extra_1.default.outputFile(filepath, content);
        fileHash.set(filepath, currentHash);
    }
}
/**
 * @param permalink The URL that the HTML file corresponds to, without base URL
 * @param outDir Full path to the output directory
 * @param trailingSlash The site config option. If provided, only one path will
 * be read.
 * @returns This returns a buffer, which you have to decode string yourself if
 * needed. (Not always necessary since the output isn't for human consumption
 * anyways, and most HTML manipulation libs accept buffers)
 * @throws Throws when the HTML file is not found at any of the potential paths.
 * This should never happen as it would lead to a 404.
 */
async function readOutputHTMLFile(permalink, outDir, trailingSlash) {
    const withTrailingSlashPath = path_1.default.join(outDir, permalink, 'index.html');
    const withoutTrailingSlashPath = (() => {
        const basePath = path_1.default.join(outDir, permalink.replace(/\/$/, ''));
        const htmlSuffix = /\.html?$/i.test(basePath) ? '' : '.html';
        return `${basePath}${htmlSuffix}`;
    })();
    const possibleHtmlPaths = [
        trailingSlash !== false && withTrailingSlashPath,
        trailingSlash !== true && withoutTrailingSlashPath,
    ].filter((p) => Boolean(p));
    const HTMLPath = await (0, jsUtils_1.findAsyncSequential)(possibleHtmlPaths, fs_extra_1.default.pathExists);
    if (!HTMLPath) {
        throw new Error(`Expected output HTML file to be found at ${withTrailingSlashPath} for permalink ${permalink}.`);
    }
    return fs_extra_1.default.readFile(HTMLPath);
}
//# sourceMappingURL=emitUtils.js.map