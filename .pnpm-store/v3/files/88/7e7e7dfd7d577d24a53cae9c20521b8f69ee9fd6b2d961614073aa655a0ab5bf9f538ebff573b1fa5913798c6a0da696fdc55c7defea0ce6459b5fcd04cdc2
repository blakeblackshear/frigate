"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileSSGTemplate = compileSSGTemplate;
exports.renderSSGTemplate = renderSSGTemplate;
exports.renderHashRouterTemplate = renderHashRouterTemplate;
const tslib_1 = require("tslib");
const eta = tslib_1.__importStar(require("eta"));
const react_loadable_ssr_addon_v5_slorber_1 = require("react-loadable-ssr-addon-v5-slorber");
const logger_1 = require("@docusaurus/logger");
async function compileSSGTemplate(template) {
    const compiledTemplate = eta.compile(template.trim(), {
        rmWhitespace: true,
    });
    return (data) => compiledTemplate(data, eta.defaultConfig);
}
/**
 * Given a list of modules that were SSR an d
 * @param modules
 * @param manifest
 */
function getScriptsAndStylesheets({ modules, manifest, }) {
    // Get all required assets for this particular page
    // based on client manifest information.
    const modulesToBeLoaded = [...manifest.entrypoints, ...Array.from(modules)];
    const bundles = (0, react_loadable_ssr_addon_v5_slorber_1.getBundles)(manifest, modulesToBeLoaded);
    const stylesheets = (bundles.css ?? []).map((b) => b.file);
    const scripts = (bundles.js ?? []).map((b) => b.file);
    return { scripts, stylesheets };
}
function renderSSGTemplate({ params, result, ssgTemplate, }) {
    const { baseUrl, headTags, preBodyTags, postBodyTags, manifest, noIndex, DOCUSAURUS_VERSION, } = params;
    const { html: appHtml, collectedData: { modules, metadata }, } = result;
    const { scripts, stylesheets } = getScriptsAndStylesheets({ manifest, modules });
    const { htmlAttributes, bodyAttributes } = metadata.internal;
    const metaStrings = [
        metadata.internal.title,
        metadata.internal.meta,
        metadata.internal.link,
        metadata.internal.script,
    ];
    const metaAttributes = metaStrings.filter(Boolean);
    const data = {
        appHtml,
        baseUrl,
        htmlAttributes,
        bodyAttributes,
        headTags,
        preBodyTags,
        postBodyTags,
        metaAttributes,
        scripts,
        stylesheets,
        noIndex,
        version: DOCUSAURUS_VERSION,
    };
    return ssgTemplate(data);
}
async function renderHashRouterTemplate({ params, }) {
    const { 
    // baseUrl,
    headTags, preBodyTags, postBodyTags, manifest, DOCUSAURUS_VERSION, ssgTemplateContent, } = params;
    const ssgTemplate = await logger_1.PerfLogger.async('Compile SSG template', () => compileSSGTemplate(ssgTemplateContent));
    const { scripts, stylesheets } = getScriptsAndStylesheets({
        manifest,
        modules: [],
    });
    const data = {
        appHtml: '',
        baseUrl: './',
        htmlAttributes: '',
        bodyAttributes: '',
        headTags,
        preBodyTags,
        postBodyTags,
        metaAttributes: [],
        scripts,
        stylesheets,
        noIndex: false,
        version: DOCUSAURUS_VERSION,
    };
    return ssgTemplate(data);
}
