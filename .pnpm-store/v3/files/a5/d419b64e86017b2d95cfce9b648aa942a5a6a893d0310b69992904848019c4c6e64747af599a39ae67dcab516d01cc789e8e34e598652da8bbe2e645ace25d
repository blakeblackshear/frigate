"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSSGParams = createSSGParams;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const utils_1 = require("@docusaurus/utils");
const logger_1 = require("@docusaurus/logger");
const ssgTemplate_html_1 = tslib_1.__importDefault(require("./ssgTemplate.html"));
async function createSSGParams({ props, serverBundlePath, clientManifestPath, }) {
    const manifest = await logger_1.PerfLogger.async('Read client manifest', () => fs_extra_1.default.readJSON(clientManifestPath, 'utf-8'));
    const params = {
        trailingSlash: props.siteConfig.trailingSlash,
        outDir: props.outDir,
        baseUrl: props.baseUrl,
        manifest,
        headTags: props.headTags,
        preBodyTags: props.preBodyTags,
        postBodyTags: props.postBodyTags,
        ssgTemplateContent: props.siteConfig.ssrTemplate ?? ssgTemplate_html_1.default,
        noIndex: props.siteConfig.noIndex,
        DOCUSAURUS_VERSION: utils_1.DOCUSAURUS_VERSION,
        serverBundlePath,
        htmlMinifierType: props.siteConfig.future.experimental_faster
            .swcHtmlMinimizer
            ? 'swc'
            : 'terser',
        v4RemoveLegacyPostBuildHeadAttribute: props.siteConfig.future.v4.removeLegacyPostBuildHeadAttribute,
    };
    // Useless but ensures that SSG params remain serializable
    return structuredClone(params);
}
