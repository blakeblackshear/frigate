"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAllRoutes = buildAllRoutes;
exports.createAllRoutes = createAllRoutes;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const props_1 = require("./props");
function createDocRouteMetadata(docMeta) {
    return {
        sourceFilePath: (0, utils_1.aliasedSitePathToRelativePath)(docMeta.source),
        lastUpdatedAt: docMeta.lastUpdatedAt,
    };
}
async function buildVersionCategoryGeneratedIndexRoutes({ version, options, }) {
    async function buildCategoryGeneratedIndexRoute(categoryGeneratedIndex) {
        return {
            path: categoryGeneratedIndex.permalink,
            component: options.docCategoryGeneratedIndexComponent,
            exact: true,
            props: {
                categoryGeneratedIndex,
            },
            // Same as doc, this sidebar route attribute permits to associate this
            // subpage to the given sidebar
            ...(categoryGeneratedIndex.sidebar && {
                sidebar: categoryGeneratedIndex.sidebar,
            }),
        };
    }
    return Promise.all(version.categoryGeneratedIndices.map(buildCategoryGeneratedIndexRoute));
}
async function buildVersionDocRoutes({ version, actions, options, }) {
    return Promise.all(version.docs.map(async (doc) => {
        await actions.createData(
        // Note that this created data path must be in sync with
        // metadataPath provided to mdx-loader.
        `${(0, utils_1.docuHash)(doc.source)}.json`, doc);
        const docRoute = {
            path: doc.permalink,
            component: options.docItemComponent,
            exact: true,
            modules: {
                content: doc.source,
            },
            metadata: createDocRouteMetadata(doc),
            // Because the parent (DocRoot) comp need to access it easily
            // This permits to render the sidebar once without unmount/remount when
            // navigating (and preserve sidebar state)
            ...(doc.sidebar && {
                sidebar: doc.sidebar,
            }),
        };
        return docRoute;
    }));
}
async function buildVersionSidebarRoute(param) {
    const [docRoutes, categoryGeneratedIndexRoutes] = await Promise.all([
        buildVersionDocRoutes(param),
        buildVersionCategoryGeneratedIndexRoutes(param),
    ]);
    const subRoutes = [...docRoutes, ...categoryGeneratedIndexRoutes];
    return {
        path: param.version.path,
        exact: false,
        component: param.options.docRootComponent,
        routes: subRoutes,
    };
}
function getVersionTags(docs) {
    const groups = (0, utils_1.groupTaggedItems)(docs, (doc) => doc.tags);
    return lodash_1.default.mapValues(groups, ({ tag, items: tagDocs }) => {
        const tagVisibility = (0, utils_1.getTagVisibility)({
            items: tagDocs,
            isUnlisted: (item) => item.unlisted,
        });
        return {
            inline: tag.inline,
            label: tag.label,
            permalink: tag.permalink,
            description: tag.description,
            docIds: tagVisibility.listedItems.map((item) => item.id),
            unlisted: tagVisibility.unlisted,
        };
    });
}
async function buildVersionTagsRoutes(param) {
    const { version, options } = param;
    const versionTags = getVersionTags(version.docs);
    async function buildTagsListRoute() {
        const tags = (0, props_1.toTagsListTagsProp)(versionTags);
        // Don't create a tags list page if there's no tag
        if (tags.length === 0) {
            return null;
        }
        return {
            path: version.tagsPath,
            exact: true,
            component: options.docTagsListComponent,
            props: {
                tags,
            },
        };
    }
    async function buildTagDocListRoute(tag) {
        return {
            path: tag.permalink,
            component: options.docTagDocListComponent,
            exact: true,
            props: {
                tag: (0, props_1.toTagDocListProp)({
                    allTagsPath: version.tagsPath,
                    tag,
                    docs: version.docs,
                }),
            },
        };
    }
    const [tagsListRoute, allTagsDocListRoutes] = await Promise.all([
        buildTagsListRoute(),
        Promise.all(Object.values(versionTags).map(buildTagDocListRoute)),
    ]);
    return lodash_1.default.compact([tagsListRoute, ...allTagsDocListRoutes]);
}
async function buildVersionRoutes(param) {
    const { version, options } = param;
    async function buildVersionSubRoutes() {
        const [sidebarRoute, tagsRoutes] = await Promise.all([
            buildVersionSidebarRoute(param),
            buildVersionTagsRoutes(param),
        ]);
        return [sidebarRoute, ...tagsRoutes];
    }
    async function doBuildVersionRoutes() {
        return {
            path: version.path,
            exact: false,
            component: options.docVersionRootComponent,
            routes: await buildVersionSubRoutes(),
            props: {
                // TODO Docusaurus v4 breaking change?
                //  expose version metadata as route context instead of props
                version: (0, props_1.toVersionMetadataProp)(options.id, version),
            },
            priority: version.routePriority,
        };
    }
    try {
        return await doBuildVersionRoutes();
    }
    catch (err) {
        logger_1.default.error `Can't create version routes for version name=${version.versionName}`;
        throw err;
    }
}
// TODO we want this buildAllRoutes function to be easily testable
// Ideally, we should avoid side effects here (ie not injecting actions)
async function buildAllRoutes(param) {
    const subRoutes = await Promise.all(param.versions.map((version) => buildVersionRoutes({
        ...param,
        version,
    })));
    // all docs routes are wrapped under a single parent route, this ensures
    // the theme layout never unmounts/remounts when navigating between versions
    return [
        {
            path: (0, utils_1.normalizeUrl)([param.baseUrl, param.options.routeBasePath]),
            exact: false,
            component: param.options.docsRootComponent,
            routes: subRoutes,
        },
    ];
}
async function createAllRoutes(param) {
    const routes = await buildAllRoutes(param);
    routes.forEach(param.actions.addRoute);
}
