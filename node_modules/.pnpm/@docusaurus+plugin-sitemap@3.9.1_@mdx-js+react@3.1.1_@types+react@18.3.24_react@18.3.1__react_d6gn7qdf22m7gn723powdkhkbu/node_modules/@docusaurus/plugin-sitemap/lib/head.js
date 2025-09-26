"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNoIndexMetaRoute = isNoIndexMetaRoute;
// Maybe we want to add a routeConfig.metadata.noIndex instead?
// But using Helmet is more reliable for third-party plugins...
function isNoIndexMetaRoute({ routesBuildMetadata, route, }) {
    const routeBuildMetadata = routesBuildMetadata[route];
    if (routeBuildMetadata) {
        return routeBuildMetadata.noIndex;
    }
    return false;
}
