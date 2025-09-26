"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPluginActionsUtils = createPluginActionsUtils;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const routeConfig_1 = require("./routeConfig");
// TODO refactor historical action system and make this side-effect-free
//  If the function were pure, we could more easily compare previous/next values
//  on site reloads, and bail-out of the reload process earlier
//  Particularly, createData() modules should rather be declarative
async function createPluginActionsUtils({ plugin, generatedFilesDir, baseUrl, trailingSlash, }) {
    const pluginId = plugin.options.id;
    // Plugins data files are namespaced by pluginName/pluginId
    // TODO Docusaurus v4 breaking change
    //  module aliasing should be automatic
    //  we should never find local absolute FS paths in the codegen registry
    const aliasedSource = (source) => `@generated/${(0, utils_1.posixPath)(path_1.default.relative(generatedFilesDir, source))}`;
    // TODO use @generated data dir here!
    // The module registry should not contain absolute paths
    const dataDir = path_1.default.join(generatedFilesDir, plugin.name, pluginId);
    const pluginRouteContext = {
        name: plugin.name,
        id: pluginId,
    };
    const pluginRouteContextModulePath = path_1.default.join(dataDir, `__plugin.json`);
    // TODO not ideal place to generate that file
    // move to codegen step instead!
    await (0, utils_1.generate)('/', pluginRouteContextModulePath, JSON.stringify(pluginRouteContext, null, 2));
    const routes = [];
    let globalData;
    const actions = {
        addRoute(initialRouteConfig) {
            // Trailing slash behavior is handled generically for all plugins
            const finalRouteConfig = (0, routeConfig_1.applyRouteTrailingSlash)(initialRouteConfig, {
                baseUrl,
                trailingSlash,
            });
            routes.push({
                ...finalRouteConfig,
                context: {
                    ...(finalRouteConfig.context && { data: finalRouteConfig.context }),
                    plugin: aliasedSource(pluginRouteContextModulePath),
                },
            });
        },
        async createData(name, data) {
            const modulePath = path_1.default.join(dataDir, name);
            const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            await (0, utils_1.generate)(dataDir, name, dataString);
            return modulePath;
        },
        setGlobalData(data) {
            globalData = data;
        },
    };
    return {
        // Some variables are mutable, so we expose a getter instead of the value
        getRoutes: () => routes,
        getGlobalData: () => globalData,
        getActions: () => actions,
    };
}
