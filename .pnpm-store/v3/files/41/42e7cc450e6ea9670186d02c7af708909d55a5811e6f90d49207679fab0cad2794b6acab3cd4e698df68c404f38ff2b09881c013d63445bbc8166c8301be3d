"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeItem = normalizeItem;
exports.normalizeSidebars = normalizeSidebars;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("./utils");
function normalizeCategoriesShorthand(sidebar) {
    return Object.entries(sidebar).map(([label, items]) => ({
        type: 'category',
        label,
        items,
    }));
}
/**
 * Normalizes recursively item and all its children. Ensures that at the end
 * each item will be an object with the corresponding type.
 */
function normalizeItem(item) {
    if (typeof item === 'string') {
        return [{ type: 'doc', id: item }];
    }
    if ((0, utils_1.isCategoriesShorthand)(item)) {
        // This will never throw anyways
        return normalizeSidebar(item, 'sidebar items slice');
    }
    if ((item.type === 'doc' || item.type === 'ref') &&
        typeof item.label === 'string') {
        return [{ ...item, translatable: true }];
    }
    if (item.type === 'category') {
        const normalizedCategory = {
            ...item,
            items: normalizeSidebar(item.items, logger_1.default.interpolate `code=${'items'} of the category name=${item.label}`),
        };
        return [normalizedCategory];
    }
    return [item];
}
function normalizeSidebar(sidebar, place) {
    if (!Array.isArray(sidebar) && !(0, utils_1.isCategoriesShorthand)(sidebar)) {
        throw new Error(logger_1.default.interpolate `Invalid sidebar items collection code=${JSON.stringify(sidebar)} in ${place}: it must either be an array of sidebar items or a shorthand notation (which doesn't contain a code=${'type'} property). See url=${'https://docusaurus.io/docs/sidebar/items'} for all valid syntaxes.`);
    }
    const normalizedSidebar = Array.isArray(sidebar)
        ? sidebar
        : normalizeCategoriesShorthand(sidebar);
    return normalizedSidebar.flatMap((subItem) => normalizeItem(subItem));
}
function normalizeSidebars(sidebars) {
    return lodash_1.default.mapValues(sidebars, (sidebar, id) => normalizeSidebar(sidebar, logger_1.default.interpolate `sidebar name=${id}`));
}
