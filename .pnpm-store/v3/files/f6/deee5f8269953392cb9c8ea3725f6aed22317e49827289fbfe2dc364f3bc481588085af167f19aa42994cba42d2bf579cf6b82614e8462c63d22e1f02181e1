"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadHtmlTags = loadHtmlTags;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const html_tags_1 = tslib_1.__importDefault(require("html-tags"));
const void_1 = tslib_1.__importDefault(require("html-tags/void"));
const escape_html_1 = tslib_1.__importDefault(require("escape-html"));
function assertIsHtmlTagObject(val) {
    if (typeof val !== 'object' || !val) {
        throw new Error(`"${val}" is not a valid HTML tag object.`);
    }
    if (typeof val.tagName !== 'string') {
        throw new Error(`${JSON.stringify(val)} is not a valid HTML tag object. "tagName" must be defined as a string.`);
    }
    if (!html_tags_1.default.includes(val.tagName)) {
        throw new Error(`Error loading ${JSON.stringify(val)}, "${val.tagName}" is not a valid HTML tag.`);
    }
}
function hashRouterAbsoluteToRelativeTagAttribute(name, value) {
    if ((name === 'src' || name === 'href') && value.startsWith('/')) {
        return `.${value}`;
    }
    return value;
}
function htmlTagObjectToString({ tag, router, }) {
    assertIsHtmlTagObject(tag);
    const isVoidTag = void_1.default.includes(tag.tagName);
    const tagAttributes = tag.attributes ?? {};
    const attributes = Object.keys(tagAttributes)
        .map((attr) => {
        let value = tagAttributes[attr];
        if (typeof value === 'boolean') {
            return value ? attr : undefined;
        }
        if (router === 'hash') {
            value = hashRouterAbsoluteToRelativeTagAttribute(attr, value);
        }
        return `${attr}="${(0, escape_html_1.default)(value)}"`;
    })
        .filter((str) => Boolean(str));
    const openingTag = `<${[tag.tagName].concat(attributes).join(' ')}>`;
    const innerHTML = (!isVoidTag && tag.innerHTML) || '';
    const closingTag = isVoidTag ? '' : `</${tag.tagName}>`;
    return openingTag + innerHTML + closingTag;
}
function createHtmlTagsString({ tags, router, }) {
    return (Array.isArray(tags) ? tags : [tags])
        .filter(Boolean)
        .map((val) => typeof val === 'string' ? val : htmlTagObjectToString({ tag: val, router }))
        .join('\n');
}
/**
 * Runs the `injectHtmlTags` lifecycle, and aggregates all plugins' tags into
 * directly render-able HTML markup.
 */
function loadHtmlTags({ plugins, router, }) {
    const pluginHtmlTags = plugins.map((plugin) => plugin.injectHtmlTags?.({ content: plugin.content }) ?? {});
    const tagTypes = ['headTags', 'preBodyTags', 'postBodyTags'];
    return Object.fromEntries(lodash_1.default.zip(tagTypes, tagTypes.map((type) => pluginHtmlTags
        .map((tags) => createHtmlTagsString({ tags: tags[type], router }))
        .join('\n')
        .trim())));
}
