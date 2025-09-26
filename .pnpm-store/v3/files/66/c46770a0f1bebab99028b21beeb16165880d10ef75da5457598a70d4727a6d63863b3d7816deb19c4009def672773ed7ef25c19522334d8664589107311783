"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAllRoutes = createAllRoutes;
exports.buildAllRoutes = buildAllRoutes;
const utils_1 = require("@docusaurus/utils");
function createPageRouteMetadata(metadata) {
    const lastUpdatedAt = metadata.type === 'mdx' ? metadata.lastUpdatedAt : undefined;
    return {
        sourceFilePath: (0, utils_1.aliasedSitePathToRelativePath)(metadata.source),
        lastUpdatedAt,
    };
}
async function createAllRoutes(param) {
    const routes = await buildAllRoutes(param);
    routes.forEach(param.actions.addRoute);
}
async function buildAllRoutes({ content, actions, options, }) {
    const { createData } = actions;
    async function buildMDXPageRoute(metadata) {
        await createData(
        // Note that this created data path must be in sync with
        // metadataPath provided to mdx-loader.
        `${(0, utils_1.docuHash)(metadata.source)}.json`, metadata);
        return {
            path: metadata.permalink,
            component: options.mdxPageComponent,
            exact: true,
            metadata: createPageRouteMetadata(metadata),
            modules: {
                content: metadata.source,
            },
        };
    }
    async function buildJSXRoute(metadata) {
        return {
            path: metadata.permalink,
            component: metadata.source,
            exact: true,
            metadata: createPageRouteMetadata(metadata),
            modules: {
                config: `@generated/docusaurus.config`,
            },
        };
    }
    async function buildPageRoute(metadata) {
        return metadata.type === 'mdx'
            ? buildMDXPageRoute(metadata)
            : buildJSXRoute(metadata);
    }
    return Promise.all(content.map(buildPageRoute));
}
