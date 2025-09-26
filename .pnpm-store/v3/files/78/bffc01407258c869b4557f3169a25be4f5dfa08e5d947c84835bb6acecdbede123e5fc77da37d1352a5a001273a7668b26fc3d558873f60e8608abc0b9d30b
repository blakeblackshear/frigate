"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = void 0;
exports.default = pluginContentDocs;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const mdx_loader_1 = require("@docusaurus/mdx-loader");
const sidebars_1 = require("./sidebars");
const generator_1 = require("./sidebars/generator");
const version_1 = require("./versions/version");
const cli_1 = tslib_1.__importDefault(require("./cli"));
const constants_1 = require("./constants");
const globalData_1 = require("./globalData");
const translations_1 = require("./translations");
const routes_1 = require("./routes");
const contentHelpers_1 = require("./contentHelpers");
const loadVersion_1 = require("./versions/loadVersion");
// MDX loader is not 100% deterministic, leading to cache invalidation issue
// This permits to invalidate the MDX loader cache entries when content changes
// Problem documented here: https://github.com/facebook/docusaurus/pull/10934
// TODO this is not a perfect solution, find better?
async function createMdxLoaderDependencyFile({ dataDir, options, versionsMetadata, }) {
    // Disabled for unit tests, the side effect produces infinite watch loops
    // TODO find a better way :/
    if (process.env.NODE_ENV === 'test') {
        return undefined;
    }
    const filePath = path_1.default.join(dataDir, '__mdx-loader-dependency.json');
    // the cache is invalidated whenever this file content changes
    const fileContent = {
        options,
        versionsMetadata,
    };
    await fs_extra_1.default.ensureDir(dataDir);
    await fs_extra_1.default.writeFile(filePath, JSON.stringify(fileContent));
    return filePath;
}
async function pluginContentDocs(context, options) {
    const { siteDir, generatedFilesDir, baseUrl, siteConfig } = context;
    // Mutate options to resolve sidebar path according to siteDir
    options.sidebarPath = (0, sidebars_1.resolveSidebarPathOption)(siteDir, options.sidebarPath);
    const versionsMetadata = await (0, version_1.readVersionsMetadata)({ context, options });
    const pluginId = options.id;
    const pluginDataDirRoot = path_1.default.join(generatedFilesDir, 'docusaurus-plugin-content-docs');
    const dataDir = path_1.default.join(pluginDataDirRoot, pluginId);
    // TODO Docusaurus v4 breaking change
    //  module aliasing should be automatic
    //  we should never find local absolute FS paths in the codegen registry
    const aliasedSource = (source) => `~docs/${(0, utils_1.posixPath)(path_1.default.relative(pluginDataDirRoot, source))}`;
    // TODO env should be injected into all plugins
    const env = process.env.NODE_ENV;
    const contentHelpers = (0, contentHelpers_1.createContentHelpers)();
    async function createDocsMDXLoaderRule() {
        const { rehypePlugins, remarkPlugins, recmaPlugins, beforeDefaultRehypePlugins, beforeDefaultRemarkPlugins, } = options;
        const contentDirs = versionsMetadata
            .flatMap(utils_1.getContentPathList)
            // Trailing slash is important, see https://github.com/facebook/docusaurus/pull/3970
            .map(utils_1.addTrailingPathSeparator);
        return (0, mdx_loader_1.createMDXLoaderRule)({
            include: contentDirs,
            options: {
                dependencies: [
                    await createMdxLoaderDependencyFile({
                        dataDir,
                        options,
                        versionsMetadata,
                    }),
                ].filter((d) => typeof d === 'string'),
                useCrossCompilerCache: siteConfig.future.experimental_faster.mdxCrossCompilerCache,
                admonitions: options.admonitions,
                remarkPlugins,
                rehypePlugins,
                recmaPlugins,
                beforeDefaultRehypePlugins,
                beforeDefaultRemarkPlugins,
                staticDirs: siteConfig.staticDirectories.map((dir) => path_1.default.resolve(siteDir, dir)),
                siteDir,
                isMDXPartial: (0, utils_1.createAbsoluteFilePathMatcher)(options.exclude, contentDirs),
                metadataPath: (mdxPath) => {
                    // Note that metadataPath must be the same/in-sync as
                    // the path from createData for each MDX.
                    const aliasedPath = (0, utils_1.aliasedSitePath)(mdxPath, siteDir);
                    return path_1.default.join(dataDir, `${(0, utils_1.docuHash)(aliasedPath)}.json`);
                },
                // createAssets converts relative paths to require() calls
                createAssets: ({ frontMatter }) => ({
                    image: frontMatter.image,
                }),
                markdownConfig: siteConfig.markdown,
                resolveMarkdownLink: ({ linkPathname, sourceFilePath }) => {
                    const version = (0, version_1.getVersionFromSourceFilePath)(sourceFilePath, versionsMetadata);
                    return (0, utils_1.resolveMarkdownLinkPathname)(linkPathname, {
                        sourceFilePath,
                        sourceToPermalink: contentHelpers.sourceToPermalink,
                        siteDir,
                        contentPaths: version,
                    });
                },
            },
        });
    }
    const docsMDXLoaderRule = await createDocsMDXLoaderRule();
    return {
        name: 'docusaurus-plugin-content-docs',
        extendCli(cli) {
            const isDefaultPluginId = pluginId === utils_1.DEFAULT_PLUGIN_ID;
            // Need to create one distinct command per plugin instance
            // otherwise 2 instances would try to execute the command!
            const command = isDefaultPluginId
                ? 'docs:version'
                : `docs:version:${pluginId}`;
            const commandDescription = isDefaultPluginId
                ? 'Tag a new docs version'
                : `Tag a new docs version (${pluginId})`;
            cli
                .command(command)
                .arguments('<version>')
                .description(commandDescription)
                .action((version) => cli_1.default.cliDocsVersionCommand(version, options, context));
        },
        getTranslationFiles({ content }) {
            return (0, translations_1.getLoadedContentTranslationFiles)(content);
        },
        getPathsToWatch() {
            function getVersionPathsToWatch(version) {
                const result = [
                    ...options.include.flatMap((pattern) => (0, utils_1.getContentPathList)(version).map((docsDirPath) => `${docsDirPath}/${pattern}`)),
                    ...(0, utils_validation_1.getTagsFilePathsToWatch)({
                        contentPaths: version,
                        tags: options.tags,
                    }),
                    `${version.contentPath}/**/${generator_1.CategoryMetadataFilenamePattern}`,
                ];
                if (typeof version.sidebarFilePath === 'string') {
                    result.unshift(version.sidebarFilePath);
                }
                return result;
            }
            return versionsMetadata.flatMap(getVersionPathsToWatch);
        },
        async loadContent() {
            return {
                loadedVersions: await Promise.all(versionsMetadata.map((versionMetadata) => (0, loadVersion_1.loadVersion)({
                    context,
                    options,
                    env,
                    versionMetadata,
                }))),
            };
        },
        translateContent({ content, translationFiles }) {
            return (0, translations_1.translateLoadedContent)(content, translationFiles);
        },
        async contentLoaded({ content, actions }) {
            contentHelpers.updateContent(content);
            const versions = content.loadedVersions.map(version_1.toFullVersion);
            await (0, routes_1.createAllRoutes)({
                baseUrl,
                versions,
                options,
                actions,
                aliasedSource,
            });
            actions.setGlobalData({
                path: (0, utils_1.normalizeUrl)([baseUrl, options.routeBasePath]),
                versions: versions.map(globalData_1.toGlobalDataVersion),
                breadcrumbs: options.breadcrumbs,
            });
        },
        configureWebpack() {
            return {
                ignoreWarnings: [
                    // Suppress warnings about non-existing of versions file.
                    (e) => e.message.includes("Can't resolve") &&
                        e.message.includes(constants_1.VERSIONS_JSON_FILE),
                ],
                resolve: {
                    alias: {
                        '~docs': pluginDataDirRoot,
                    },
                },
                module: {
                    rules: [docsMDXLoaderRule],
                },
            };
        },
    };
}
var options_1 = require("./options");
Object.defineProperty(exports, "validateOptions", { enumerable: true, get: function () { return options_1.validateOptions; } });
