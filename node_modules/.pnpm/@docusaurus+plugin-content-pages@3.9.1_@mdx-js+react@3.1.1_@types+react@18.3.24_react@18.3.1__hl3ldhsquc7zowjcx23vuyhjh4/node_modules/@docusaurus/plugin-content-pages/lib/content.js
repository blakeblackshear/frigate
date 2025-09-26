"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPagesContentPaths = createPagesContentPaths;
exports.loadPagesContent = loadPagesContent;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const frontMatter_1 = require("./frontMatter");
function createPagesContentPaths({ context, options, }) {
    const { siteDir, localizationDir } = context;
    const shouldTranslate = (0, utils_1.getLocaleConfig)(context.i18n).translate;
    return {
        contentPath: path_1.default.resolve(siteDir, options.path),
        contentPathLocalized: shouldTranslate
            ? (0, utils_1.getPluginI18nPath)({
                localizationDir,
                pluginName: 'docusaurus-plugin-content-pages',
                pluginId: options.id,
            })
            : undefined,
    };
}
const isMarkdownSource = (source) => source.endsWith('.md') || source.endsWith('.mdx');
async function loadPagesContent(params) {
    const { options } = params;
    const pagesFiles = await (0, utils_1.Globby)(params.options.include, {
        cwd: params.contentPaths.contentPath,
        ignore: options.exclude,
    });
    async function doProcessPageSourceFile(relativeSource) {
        try {
            return await processPageSourceFile(relativeSource, params);
        }
        catch (err) {
            throw new Error(`Processing of page source file path=${relativeSource} failed.`, { cause: err });
        }
    }
    return (await Promise.all(pagesFiles.map(doProcessPageSourceFile))).filter((res) => {
        return res !== undefined;
    });
}
async function processPageSourceFile(relativeSource, params) {
    const { context, options, contentPaths } = params;
    const { siteConfig, baseUrl, siteDir, i18n } = context;
    const { editUrl } = options;
    // Lookup in localized folder in priority
    const contentPath = await (0, utils_1.getFolderContainingFile)((0, utils_1.getContentPathList)(contentPaths), relativeSource);
    const source = path_1.default.join(contentPath, relativeSource);
    const aliasedSourcePath = (0, utils_1.aliasedSitePath)(source, siteDir);
    const filenameSlug = (0, utils_1.encodePath)((0, utils_1.fileToPath)(relativeSource));
    if (!isMarkdownSource(relativeSource)) {
        // For now, slug can't be customized for JSX pages
        const slug = filenameSlug;
        const permalink = (0, utils_1.normalizeUrl)([baseUrl, options.routeBasePath, slug]);
        return {
            type: 'jsx',
            permalink,
            source: aliasedSourcePath,
        };
    }
    const content = await fs_extra_1.default.readFile(source, 'utf-8');
    const { frontMatter: unsafeFrontMatter, contentTitle, excerpt, } = await (0, utils_1.parseMarkdownFile)({
        filePath: source,
        fileContent: content,
        parseFrontMatter: siteConfig.markdown.parseFrontMatter,
    });
    const frontMatter = (0, frontMatter_1.validatePageFrontMatter)(unsafeFrontMatter);
    const slug = frontMatter.slug ?? filenameSlug;
    const permalink = (0, utils_1.normalizeUrl)([baseUrl, options.routeBasePath, slug]);
    const pagesDirPath = await (0, utils_1.getFolderContainingFile)((0, utils_1.getContentPathList)(contentPaths), relativeSource);
    const pagesSourceAbsolute = path_1.default.join(pagesDirPath, relativeSource);
    function getPagesEditUrl() {
        const pagesPathRelative = path_1.default.relative(pagesDirPath, path_1.default.resolve(pagesSourceAbsolute));
        if (typeof editUrl === 'function') {
            return editUrl({
                pagesDirPath: (0, utils_1.posixPath)(path_1.default.relative(siteDir, pagesDirPath)),
                pagesPath: (0, utils_1.posixPath)(pagesPathRelative),
                permalink,
                locale: i18n.currentLocale,
            });
        }
        else if (typeof editUrl === 'string') {
            const isLocalized = pagesDirPath === contentPaths.contentPathLocalized;
            const fileContentPath = isLocalized &&
                options.editLocalizedFiles &&
                contentPaths.contentPathLocalized
                ? contentPaths.contentPathLocalized
                : contentPaths.contentPath;
            const contentPathEditUrl = (0, utils_1.normalizeUrl)([
                editUrl,
                (0, utils_1.posixPath)(path_1.default.relative(siteDir, fileContentPath)),
            ]);
            return (0, utils_1.getEditUrl)(pagesPathRelative, contentPathEditUrl);
        }
        return undefined;
    }
    const lastUpdatedData = await (0, utils_1.readLastUpdateData)(source, options, frontMatter.last_update);
    if ((0, utils_1.isDraft)({ frontMatter })) {
        return undefined;
    }
    const unlisted = (0, utils_1.isUnlisted)({ frontMatter });
    return {
        type: 'mdx',
        permalink,
        source: aliasedSourcePath,
        title: frontMatter.title ?? contentTitle,
        description: frontMatter.description ?? excerpt,
        frontMatter,
        lastUpdatedBy: lastUpdatedData.lastUpdatedBy,
        lastUpdatedAt: lastUpdatedData.lastUpdatedAt,
        editUrl: getPagesEditUrl(),
        unlisted,
    };
}
