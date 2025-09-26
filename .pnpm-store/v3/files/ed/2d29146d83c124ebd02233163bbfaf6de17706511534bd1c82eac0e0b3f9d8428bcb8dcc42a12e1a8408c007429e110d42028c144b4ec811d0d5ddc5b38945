"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSiteStorage = createSiteStorage;
const utils_1 = require("@docusaurus/utils");
const utils_common_1 = require("@docusaurus/utils-common");
function automaticNamespace(config) {
    const normalizedUrl = (0, utils_common_1.addTrailingSlash)((0, utils_1.normalizeUrl)([config.url, config.baseUrl]));
    return (0, utils_1.simpleHash)(normalizedUrl, 3);
}
function getNamespaceString(config) {
    if (config.future.experimental_storage.namespace === true) {
        return automaticNamespace(config);
    }
    else if (config.future.experimental_storage.namespace === false) {
        return null;
    }
    else {
        return config.future.experimental_storage.namespace;
    }
}
function createSiteStorage(config) {
    const { type } = config.future.experimental_storage;
    const namespaceString = getNamespaceString(config);
    const namespace = namespaceString ? `-${namespaceString}` : '';
    return {
        type,
        namespace,
    };
}
