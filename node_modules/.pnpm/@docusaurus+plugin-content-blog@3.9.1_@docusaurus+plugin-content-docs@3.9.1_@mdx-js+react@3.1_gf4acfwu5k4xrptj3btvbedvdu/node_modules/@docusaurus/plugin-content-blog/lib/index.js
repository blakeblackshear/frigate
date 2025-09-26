"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = void 0;
exports.default = pluginContentBlog;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const mdx_loader_1 = require("@docusaurus/mdx-loader");
const blogUtils_1 = require("./blogUtils");
const footnoteIDFixer_1 = tslib_1.__importDefault(require("./remark/footnoteIDFixer"));
const translations_1 = require("./translations");
const feed_1 = require("./feed");
const routes_1 = require("./routes");
const authorsMap_1 = require("./authorsMap");
const contentHelpers_1 = require("./contentHelpers");
const PluginName = 'docusaurus-plugin-content-blog';
async function pluginContentBlog(context, options) {
    const { siteDir, siteConfig, generatedFilesDir, localizationDir, i18n: { currentLocale }, } = context;
    const router = siteConfig.future.experimental_router;
    const isBlogFeedDisabledBecauseOfHashRouter = router === 'hash' && !!options.feedOptions.type;
    if (isBlogFeedDisabledBecauseOfHashRouter) {
        logger_1.default.warn(`${PluginName} feed feature does not support the Hash Router. Feeds won't be generated.`);
    }
    const { baseUrl } = siteConfig;
    const shouldTranslate = (0, utils_1.getLocaleConfig)(context.i18n).translate;
    const contentPaths = {
        contentPath: path_1.default.resolve(siteDir, options.path),
        contentPathLocalized: shouldTranslate
            ? (0, utils_1.getPluginI18nPath)({
                localizationDir,
                pluginName: PluginName,
                pluginId: options.id,
            })
            : undefined,
    };
    const pluginId = options.id ?? utils_1.DEFAULT_PLUGIN_ID;
    const pluginDataDirRoot = path_1.default.join(generatedFilesDir, PluginName);
    const dataDir = path_1.default.join(pluginDataDirRoot, pluginId);
    // TODO Docusaurus v4 breaking change
    //  module aliasing should be automatic
    //  we should never find local absolute FS paths in the codegen registry
    const aliasedSource = (source) => `~blog/${(0, utils_1.posixPath)(path_1.default.relative(pluginDataDirRoot, source))}`;
    const authorsMapFilePath = await (0, utils_1.getDataFilePath)({
        filePath: options.authorsMapPath,
        contentPaths,
    });
    const contentHelpers = (0, contentHelpers_1.createContentHelpers)();
    async function createBlogMDXLoaderRule() {
        const { admonitions, rehypePlugins, remarkPlugins, recmaPlugins, truncateMarker, beforeDefaultRemarkPlugins, beforeDefaultRehypePlugins, } = options;
        const contentDirs = (0, utils_1.getContentPathList)(contentPaths);
        const mdxLoaderItem = await (0, mdx_loader_1.createMDXLoaderItem)({
            useCrossCompilerCache: siteConfig.future.experimental_faster.mdxCrossCompilerCache,
            admonitions,
            remarkPlugins,
            rehypePlugins,
            recmaPlugins,
            beforeDefaultRemarkPlugins: [
                footnoteIDFixer_1.default,
                ...beforeDefaultRemarkPlugins,
            ],
            beforeDefaultRehypePlugins,
            staticDirs: siteConfig.staticDirectories.map((dir) => path_1.default.resolve(siteDir, dir)),
            siteDir,
            isMDXPartial: (0, utils_1.createAbsoluteFilePathMatcher)(options.exclude, contentDirs),
            metadataPath: (mdxPath) => {
                // Note that metadataPath must be the same/in-sync as
                // the path from createData for each MDX.
                const aliasedPath = (0, utils_1.aliasedSitePath)(mdxPath, siteDir);
                return path_1.default.join(dataDir, `${(0, utils_1.docuHash)(aliasedPath)}.json`);
            },
            // For blog posts a title in markdown is always removed
            // Blog posts title are rendered separately
            removeContentTitle: true,
            // createAssets converts relative paths to require() calls
            createAssets: ({ filePath }) => {
                const blogPost = contentHelpers.sourceToBlogPost.get((0, utils_1.aliasedSitePath)(filePath, siteDir));
                if (!blogPost) {
                    throw new Error(`Blog post not found for  filePath=${filePath}`);
                }
                return {
                    image: blogPost.metadata.frontMatter.image,
                    authorsImageUrls: blogPost.metadata.authors.map((author) => author.imageURL),
                };
            },
            markdownConfig: siteConfig.markdown,
            resolveMarkdownLink: ({ linkPathname, sourceFilePath }) => {
                return (0, utils_1.resolveMarkdownLinkPathname)(linkPathname, {
                    sourceFilePath,
                    sourceToPermalink: contentHelpers.sourceToPermalink,
                    siteDir,
                    contentPaths,
                });
            },
        });
        function createBlogMarkdownLoader() {
            const markdownLoaderOptions = {
                truncateMarker,
            };
            return {
                loader: path_1.default.resolve(__dirname, './markdownLoader.js'),
                options: markdownLoaderOptions,
            };
        }
        return {
            test: /\.mdx?$/i,
            include: contentDirs
                // Trailing slash is important, see https://github.com/facebook/docusaurus/pull/3970
                .map(utils_1.addTrailingPathSeparator),
            use: [mdxLoaderItem, createBlogMarkdownLoader()],
        };
    }
    const blogMDXLoaderRule = await createBlogMDXLoaderRule();
    return {
        name: PluginName,
        getPathsToWatch() {
            const { include } = options;
            const contentMarkdownGlobs = (0, utils_1.getContentPathList)(contentPaths).flatMap((contentPath) => include.map((pattern) => `${contentPath}/${pattern}`));
            const tagsFilePaths = (0, utils_validation_1.getTagsFilePathsToWatch)({
                contentPaths,
                tags: options.tags,
            });
            return [
                authorsMapFilePath,
                ...tagsFilePaths,
                ...contentMarkdownGlobs,
            ].filter(Boolean);
        },
        getTranslationFiles() {
            return (0, translations_1.getTranslationFiles)(options);
        },
        // Fetches blog contents and returns metadata for the necessary routes.
        async loadContent() {
            const { postsPerPage: postsPerPageOption, routeBasePath, tagsBasePath, blogDescription, blogTitle, blogSidebarTitle, pageBasePath, authorsBasePath, authorsMapPath, } = options;
            const baseBlogUrl = (0, utils_1.normalizeUrl)([baseUrl, routeBasePath]);
            const blogTagsListPath = (0, utils_1.normalizeUrl)([baseBlogUrl, tagsBasePath]);
            const authorsMap = await (0, authorsMap_1.getAuthorsMap)({
                contentPaths,
                authorsMapPath,
                authorsBaseRoutePath: (0, utils_1.normalizeUrl)([
                    baseUrl,
                    routeBasePath,
                    authorsBasePath,
                ]),
                baseUrl,
            });
            (0, authorsMap_1.checkAuthorsMapPermalinkCollisions)(authorsMap);
            let blogPosts = await (0, blogUtils_1.generateBlogPosts)(contentPaths, context, options, authorsMap);
            blogPosts = await (0, blogUtils_1.applyProcessBlogPosts)({
                blogPosts,
                processBlogPosts: options.processBlogPosts,
            });
            (0, blogUtils_1.reportUntruncatedBlogPosts)({
                blogPosts,
                onUntruncatedBlogPosts: options.onUntruncatedBlogPosts,
            });
            const listedBlogPosts = blogPosts.filter(blogUtils_1.shouldBeListed);
            if (!blogPosts.length) {
                return {
                    blogSidebarTitle,
                    blogPosts: [],
                    blogListPaginated: [],
                    blogTags: {},
                    blogTagsListPath,
                    authorsMap,
                };
            }
            // Collocate next and prev metadata.
            listedBlogPosts.forEach((blogPost, index) => {
                const prevItem = index > 0 ? listedBlogPosts[index - 1] : null;
                if (prevItem) {
                    blogPost.metadata.prevItem = {
                        title: prevItem.metadata.title,
                        permalink: prevItem.metadata.permalink,
                    };
                }
                const nextItem = index < listedBlogPosts.length - 1
                    ? listedBlogPosts[index + 1]
                    : null;
                if (nextItem) {
                    blogPost.metadata.nextItem = {
                        title: nextItem.metadata.title,
                        permalink: nextItem.metadata.permalink,
                    };
                }
            });
            const blogListPaginated = (0, blogUtils_1.paginateBlogPosts)({
                blogPosts: listedBlogPosts,
                blogTitle,
                blogDescription,
                postsPerPageOption,
                basePageUrl: baseBlogUrl,
                pageBasePath,
            });
            const blogTags = (0, blogUtils_1.getBlogTags)({
                blogPosts,
                postsPerPageOption,
                blogDescription,
                blogTitle,
                pageBasePath,
            });
            return {
                blogSidebarTitle,
                blogPosts,
                blogListPaginated,
                blogTags,
                blogTagsListPath,
                authorsMap,
            };
        },
        async contentLoaded({ content, actions }) {
            contentHelpers.updateContent(content);
            await (0, routes_1.createAllRoutes)({
                baseUrl,
                content,
                actions,
                options,
                aliasedSource,
            });
        },
        translateContent({ content, translationFiles }) {
            return (0, translations_1.translateContent)(content, translationFiles);
        },
        configureWebpack() {
            return {
                resolve: {
                    alias: {
                        '~blog': pluginDataDirRoot,
                    },
                },
                module: {
                    rules: [blogMDXLoaderRule],
                },
            };
        },
        async postBuild({ outDir, content }) {
            if (!content.blogPosts.length ||
                !options.feedOptions.type ||
                isBlogFeedDisabledBecauseOfHashRouter) {
                return;
            }
            await (0, feed_1.createBlogFeedFiles)({
                blogPosts: content.blogPosts,
                options,
                outDir,
                siteConfig,
                locale: currentLocale,
                contentPaths,
            });
        },
        injectHtmlTags({ content }) {
            if (!content.blogPosts.length ||
                !options.feedOptions.type ||
                isBlogFeedDisabledBecauseOfHashRouter) {
                return {};
            }
            return { headTags: (0, feed_1.createFeedHtmlHeadTags)({ context, options }) };
        },
    };
}
var options_1 = require("./options");
Object.defineProperty(exports, "validateOptions", { enumerable: true, get: function () { return options_1.validateOptions; } });
