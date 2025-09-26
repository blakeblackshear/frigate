"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUniquePluginInstanceIds = ensureUniquePluginInstanceIds;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
/**
 * It is forbidden to have 2 plugins of the same name sharing the same ID.
 * This is required to support multi-instance plugins without conflict.
 */
function ensureUniquePluginInstanceIds(plugins) {
    const pluginsByName = lodash_1.default.groupBy(plugins, (p) => p.name);
    Object.entries(pluginsByName).forEach(([pluginName, pluginInstances]) => {
        const pluginInstancesById = lodash_1.default.groupBy(pluginInstances, (p) => p.options.id ?? utils_1.DEFAULT_PLUGIN_ID);
        Object.entries(pluginInstancesById).forEach(([pluginId, pluginInstancesWithId]) => {
            if (pluginInstancesWithId.length !== 1) {
                throw new Error(`Plugin "${pluginName}" is used ${pluginInstancesWithId.length} times with ID "${pluginId}".\nTo use the same plugin multiple times on a Docusaurus site, you need to assign a unique ID to each plugin instance.${pluginId === utils_1.DEFAULT_PLUGIN_ID
                    ? `\n\nThe plugin ID is "${utils_1.DEFAULT_PLUGIN_ID}" by default. It's possible that the preset you are using already includes a plugin instance, in which case you either want to disable the plugin in the preset (to use a single instance), or assign another ID to your extra plugin instance (to use multiple instances).`
                    : ''}`);
            }
        });
    });
}
