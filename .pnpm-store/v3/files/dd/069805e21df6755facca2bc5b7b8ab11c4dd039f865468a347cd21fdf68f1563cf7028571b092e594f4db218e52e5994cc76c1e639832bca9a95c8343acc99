"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPluginByIdentifier = getPluginByIdentifier;
exports.aggregateAllContent = aggregateAllContent;
exports.toPluginRoute = toPluginRoute;
exports.aggregateRoutes = aggregateRoutes;
exports.aggregateGlobalData = aggregateGlobalData;
exports.mergeGlobalData = mergeGlobalData;
exports.formatPluginName = formatPluginName;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
function getPluginByIdentifier({ plugins, pluginIdentifier, }) {
    const plugin = plugins.find((p) => p.name === pluginIdentifier.name && p.options.id === pluginIdentifier.id);
    if (!plugin) {
        throw new Error(logger_1.default.interpolate `Plugin not found for identifier ${formatPluginName(pluginIdentifier)}`);
    }
    return plugin;
}
function aggregateAllContent(loadedPlugins) {
    return lodash_1.default.chain(loadedPlugins)
        .groupBy((item) => item.name)
        .mapValues((nameItems) => lodash_1.default.chain(nameItems)
        .groupBy((item) => item.options.id)
        .mapValues((idItems) => idItems[0].content)
        .value())
        .value();
}
function toPluginRoute({ plugin, route, }) {
    return { plugin: { name: plugin.name, id: plugin.options.id }, ...route };
}
function aggregateRoutes(loadedPlugins) {
    return loadedPlugins.flatMap((plugin) => plugin.routes.map((route) => toPluginRoute({ plugin, route })));
}
function aggregateGlobalData(loadedPlugins) {
    const globalData = {};
    loadedPlugins.forEach((plugin) => {
        var _a;
        if (plugin.globalData !== undefined) {
            globalData[_a = plugin.name] ?? (globalData[_a] = {});
            globalData[plugin.name][plugin.options.id] = plugin.globalData;
        }
    });
    return globalData;
}
function mergeGlobalData(...globalDataList) {
    const result = {};
    const allPluginIdentifiers = globalDataList.flatMap((gd) => Object.keys(gd).flatMap((name) => Object.keys(gd[name]).map((id) => ({ name, id }))));
    allPluginIdentifiers.forEach(({ name, id }) => {
        const allData = globalDataList
            .map((gd) => gd?.[name]?.[id])
            .filter((d) => typeof d !== 'undefined');
        const mergedData = allData.length === 1 ? allData[0] : Object.assign({}, ...allData);
        result[name] ?? (result[name] = {});
        result[name][id] = mergedData;
    });
    return result;
}
// This is primarily useful for colored logging purpose
// Do not rely on this for logic
function formatPluginName(plugin) {
    let formattedName = plugin.name;
    // Hacky way to reduce string size for logging purpose
    formattedName = formattedName.replace('docusaurus-plugin-content-', '');
    formattedName = formattedName.replace('docusaurus-plugin-', '');
    formattedName = formattedName.replace('docusaurus-theme-', '');
    formattedName = formattedName.replace('-plugin', '');
    formattedName = logger_1.default.name(formattedName);
    const id = 'id' in plugin ? plugin.id : plugin.options.id;
    const formattedId = logger_1.default.subdue(id);
    return `${formattedName}@${formattedId}`;
}
