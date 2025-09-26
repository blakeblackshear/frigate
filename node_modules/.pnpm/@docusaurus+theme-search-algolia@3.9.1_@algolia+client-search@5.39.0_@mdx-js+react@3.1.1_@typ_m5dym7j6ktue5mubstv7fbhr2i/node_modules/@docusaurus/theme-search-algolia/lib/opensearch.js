"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldCreateOpenSearchFile = shouldCreateOpenSearchFile;
exports.createOpenSearchFile = createOpenSearchFile;
exports.createOpenSearchHeadTags = createOpenSearchHeadTags;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const eta_1 = require("eta");
const utils_1 = require("@docusaurus/utils");
const opensearch_1 = tslib_1.__importDefault(require("./templates/opensearch"));
const getCompiledOpenSearchTemplate = lodash_1.default.memoize(() => (0, eta_1.compile)(opensearch_1.default.trim()));
function renderOpenSearchTemplate(data) {
    const compiled = getCompiledOpenSearchTemplate();
    return compiled(data, eta_1.defaultConfig);
}
const OPEN_SEARCH_FILENAME = 'opensearch.xml';
function shouldCreateOpenSearchFile({ context, }) {
    const { siteConfig: { themeConfig, future: { experimental_router: router }, }, } = context;
    const { algolia: { searchPagePath }, } = themeConfig;
    return !!searchPagePath && router !== 'hash';
}
function createOpenSearchFileContent({ context, searchPagePath, }) {
    const { baseUrl, siteConfig: { title, url, favicon }, } = context;
    const siteUrl = (0, utils_1.normalizeUrl)([url, baseUrl]);
    return renderOpenSearchTemplate({
        title,
        siteUrl,
        searchUrl: (0, utils_1.normalizeUrl)([siteUrl, searchPagePath]),
        faviconUrl: favicon ? (0, utils_1.normalizeUrl)([siteUrl, favicon]) : null,
    });
}
async function createOpenSearchFile({ context, }) {
    const { outDir, siteConfig: { themeConfig }, } = context;
    const { algolia: { searchPagePath }, } = themeConfig;
    if (!searchPagePath) {
        throw new Error('no searchPagePath provided in themeConfig.algolia');
    }
    const fileContent = createOpenSearchFileContent({ context, searchPagePath });
    try {
        await fs_extra_1.default.writeFile(path_1.default.join(outDir, OPEN_SEARCH_FILENAME), fileContent);
    }
    catch (err) {
        throw new Error('Generating OpenSearch file failed.', { cause: err });
    }
}
function createOpenSearchHeadTags({ context, }) {
    const { baseUrl, siteConfig: { title }, } = context;
    return {
        tagName: 'link',
        attributes: {
            rel: 'search',
            type: 'application/opensearchdescription+xml',
            title,
            href: (0, utils_1.normalizeUrl)([baseUrl, OPEN_SEARCH_FILENAME]),
        },
    };
}
