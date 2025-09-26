"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncate = truncate;
exports.reportUntruncatedBlogPosts = reportUntruncatedBlogPosts;
exports.paginateBlogPosts = paginateBlogPosts;
exports.shouldBeListed = shouldBeListed;
exports.getBlogTags = getBlogTags;
exports.parseBlogFileName = parseBlogFileName;
exports.generateBlogPosts = generateBlogPosts;
exports.applyProcessBlogPosts = applyProcessBlogPosts;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const frontMatter_1 = require("./frontMatter");
const authors_1 = require("./authors");
const authorsProblems_1 = require("./authorsProblems");
const readingTime_1 = require("./readingTime");
function truncate(fileString, truncateMarker) {
    return fileString.split(truncateMarker, 1).shift();
}
function reportUntruncatedBlogPosts({ blogPosts, onUntruncatedBlogPosts, }) {
    const untruncatedBlogPosts = blogPosts.filter((p) => !p.metadata.hasTruncateMarker);
    if (onUntruncatedBlogPosts !== 'ignore' && untruncatedBlogPosts.length > 0) {
        const message = logger_1.default.interpolate `Docusaurus found blog posts without truncation markers:
- ${untruncatedBlogPosts
            .map((p) => logger_1.default.path((0, utils_1.aliasedSitePathToRelativePath)(p.metadata.source)))
            .join('\n- ')}

We recommend using truncation markers (code=${`<!-- truncate -->`} or code=${`{/* truncate */}`}) in blog posts to create shorter previews on blog paginated lists.
Tip: turn this security off with the code=${`onUntruncatedBlogPosts: 'ignore'`} blog plugin option.`;
        logger_1.default.report(onUntruncatedBlogPosts)(message);
    }
}
function paginateBlogPosts({ blogPosts, basePageUrl, blogTitle, blogDescription, postsPerPageOption, pageBasePath, }) {
    const totalCount = blogPosts.length;
    const postsPerPage = postsPerPageOption === 'ALL' ? totalCount : postsPerPageOption;
    const numberOfPages = Math.max(1, Math.ceil(totalCount / postsPerPage));
    const pages = [];
    function permalink(page) {
        return page > 0
            ? (0, utils_1.normalizeUrl)([basePageUrl, pageBasePath, `${page + 1}`])
            : basePageUrl;
    }
    for (let page = 0; page < numberOfPages; page += 1) {
        pages.push({
            items: blogPosts
                .slice(page * postsPerPage, (page + 1) * postsPerPage)
                .map((item) => item.id),
            metadata: {
                permalink: permalink(page),
                page: page + 1,
                postsPerPage,
                totalPages: numberOfPages,
                totalCount,
                previousPage: page !== 0 ? permalink(page - 1) : undefined,
                nextPage: page < numberOfPages - 1 ? permalink(page + 1) : undefined,
                blogDescription,
                blogTitle,
            },
        });
    }
    return pages;
}
function shouldBeListed(blogPost) {
    return !blogPost.metadata.unlisted;
}
function getBlogTags({ blogPosts, ...params }) {
    const groups = (0, utils_1.groupTaggedItems)(blogPosts, (blogPost) => blogPost.metadata.tags);
    return lodash_1.default.mapValues(groups, ({ tag, items: tagBlogPosts }) => {
        const tagVisibility = (0, utils_1.getTagVisibility)({
            items: tagBlogPosts,
            isUnlisted: (item) => item.metadata.unlisted,
        });
        return {
            inline: tag.inline,
            label: tag.label,
            permalink: tag.permalink,
            description: tag.description,
            items: tagVisibility.listedItems.map((item) => item.id),
            pages: paginateBlogPosts({
                blogPosts: tagVisibility.listedItems,
                basePageUrl: tag.permalink,
                ...params,
            }),
            unlisted: tagVisibility.unlisted,
        };
    });
}
const DATE_FILENAME_REGEX = /^(?<folder>.*)(?<date>\d{4}[-/]\d{1,2}[-/]\d{1,2})[-/]?(?<text>.*?)(?:\/index)?.mdx?$/;
function parseBlogFileName(blogSourceRelative) {
    const dateFilenameMatch = blogSourceRelative.match(DATE_FILENAME_REGEX);
    if (dateFilenameMatch) {
        const { folder, text, date: dateString } = dateFilenameMatch.groups;
        // Always treat dates as UTC by adding the `Z`
        const date = new Date(`${dateString}Z`);
        const slugDate = dateString.replace(/-/g, '/');
        const slug = `/${slugDate}/${folder}${text}`;
        return { date, text: text, slug };
    }
    const text = blogSourceRelative.replace(/(?:\/index)?\.mdx?$/, '');
    const slug = `/${text}`;
    return { date: undefined, text, slug };
}
async function parseBlogPostMarkdownFile({ filePath, parseFrontMatter, }) {
    const fileContent = await fs_extra_1.default.readFile(filePath, 'utf-8');
    try {
        const result = await (0, utils_1.parseMarkdownFile)({
            filePath,
            fileContent,
            parseFrontMatter,
            removeContentTitle: true,
        });
        return {
            ...result,
            frontMatter: (0, frontMatter_1.validateBlogPostFrontMatter)(result.frontMatter),
        };
    }
    catch (err) {
        logger_1.default.error `Error while parsing blog post file path=${filePath}.`;
        throw err;
    }
}
const defaultReadingTime = ({ content, locale, options }) => (0, readingTime_1.calculateReadingTime)(content, locale, options);
async function processBlogSourceFile(blogSourceRelative, contentPaths, context, options, tagsFile, authorsMap) {
    const { siteConfig: { baseUrl, markdown: { parseFrontMatter }, }, siteDir, i18n, } = context;
    const { routeBasePath, tagsBasePath: tagsRouteBasePath, truncateMarker, showReadingTime, editUrl, } = options;
    // Lookup in localized folder in priority
    const blogDirPath = await (0, utils_1.getFolderContainingFile)((0, utils_1.getContentPathList)(contentPaths), blogSourceRelative);
    const blogSourceAbsolute = path_1.default.join(blogDirPath, blogSourceRelative);
    const { frontMatter, content, contentTitle, excerpt } = await parseBlogPostMarkdownFile({
        filePath: blogSourceAbsolute,
        parseFrontMatter,
    });
    const aliasedSource = (0, utils_1.aliasedSitePath)(blogSourceAbsolute, siteDir);
    const lastUpdate = await (0, utils_1.readLastUpdateData)(blogSourceAbsolute, options, frontMatter.last_update);
    const draft = (0, utils_1.isDraft)({ frontMatter });
    const unlisted = (0, utils_1.isUnlisted)({ frontMatter });
    if (draft) {
        return undefined;
    }
    if (frontMatter.id) {
        logger_1.default.warn `name=${'id'} header option is deprecated in path=${blogSourceRelative} file. Please use name=${'slug'} option instead.`;
    }
    const parsedBlogFileName = parseBlogFileName(blogSourceRelative);
    async function getDate() {
        // Prefer user-defined date.
        if (frontMatter.date) {
            if (typeof frontMatter.date === 'string') {
                // Always treat dates as UTC by adding the `Z`
                return new Date(`${frontMatter.date}Z`);
            }
            // YAML only converts YYYY-MM-DD to dates and leaves others as strings.
            return frontMatter.date;
        }
        else if (parsedBlogFileName.date) {
            return parsedBlogFileName.date;
        }
        try {
            const result = await (0, utils_1.getFileCommitDate)(blogSourceAbsolute, {
                age: 'oldest',
                includeAuthor: false,
            });
            return result.date;
        }
        catch (err) {
            logger_1.default.warn(err);
            return (await fs_extra_1.default.stat(blogSourceAbsolute)).birthtime;
        }
    }
    const date = await getDate();
    const title = frontMatter.title ?? contentTitle ?? parsedBlogFileName.text;
    const description = frontMatter.description ?? excerpt ?? '';
    const slug = frontMatter.slug ?? parsedBlogFileName.slug;
    const permalink = (0, utils_1.normalizeUrl)([baseUrl, routeBasePath, slug]);
    function getBlogEditUrl() {
        const blogPathRelative = path_1.default.relative(blogDirPath, path_1.default.resolve(blogSourceAbsolute));
        if (typeof editUrl === 'function') {
            return editUrl({
                blogDirPath: (0, utils_1.posixPath)(path_1.default.relative(siteDir, blogDirPath)),
                blogPath: (0, utils_1.posixPath)(blogPathRelative),
                permalink,
                locale: i18n.currentLocale,
            });
        }
        else if (typeof editUrl === 'string') {
            const isLocalized = blogDirPath === contentPaths.contentPathLocalized;
            const fileContentPath = isLocalized &&
                options.editLocalizedFiles &&
                contentPaths.contentPathLocalized
                ? contentPaths.contentPathLocalized
                : contentPaths.contentPath;
            const contentPathEditUrl = (0, utils_1.normalizeUrl)([
                editUrl,
                (0, utils_1.posixPath)(path_1.default.relative(siteDir, fileContentPath)),
            ]);
            return (0, utils_1.getEditUrl)(blogPathRelative, contentPathEditUrl);
        }
        return undefined;
    }
    const tagsBaseRoutePath = (0, utils_1.normalizeUrl)([
        baseUrl,
        routeBasePath,
        tagsRouteBasePath,
    ]);
    const authors = (0, authors_1.getBlogPostAuthors)({ authorsMap, frontMatter, baseUrl });
    (0, authorsProblems_1.reportAuthorsProblems)({
        authors,
        blogSourceRelative,
        options,
    });
    const tags = (0, utils_1.normalizeTags)({
        options,
        source: blogSourceRelative,
        frontMatterTags: frontMatter.tags,
        tagsBaseRoutePath,
        tagsFile,
    });
    return {
        id: slug,
        metadata: {
            permalink,
            editUrl: getBlogEditUrl(),
            source: aliasedSource,
            title,
            description,
            date,
            tags,
            readingTime: showReadingTime
                ? options.readingTime({
                    content,
                    frontMatter,
                    defaultReadingTime,
                    locale: i18n.currentLocale,
                })
                : undefined,
            hasTruncateMarker: truncateMarker.test(content),
            authors,
            frontMatter,
            unlisted,
            lastUpdatedAt: lastUpdate.lastUpdatedAt,
            lastUpdatedBy: lastUpdate.lastUpdatedBy,
        },
        content,
    };
}
async function generateBlogPosts(contentPaths, context, options, authorsMap) {
    const { include, exclude } = options;
    if (!(await fs_extra_1.default.pathExists(contentPaths.contentPath))) {
        return [];
    }
    const blogSourceFiles = await (0, utils_1.Globby)(include, {
        cwd: contentPaths.contentPath,
        ignore: exclude,
    });
    const tagsFile = await (0, utils_validation_1.getTagsFile)({ contentPaths, tags: options.tags });
    async function doProcessBlogSourceFile(blogSourceFile) {
        try {
            return await processBlogSourceFile(blogSourceFile, contentPaths, context, options, tagsFile, authorsMap);
        }
        catch (err) {
            throw new Error(`Processing of blog source file path=${blogSourceFile} failed.`, { cause: err });
        }
    }
    const blogPosts = (await Promise.all(blogSourceFiles.map(doProcessBlogSourceFile))).filter(Boolean);
    blogPosts.sort((a, b) => b.metadata.date.getTime() - a.metadata.date.getTime());
    if (options.sortPosts === 'ascending') {
        return blogPosts.reverse();
    }
    return blogPosts;
}
async function applyProcessBlogPosts({ blogPosts, processBlogPosts, }) {
    const processedBlogPosts = await processBlogPosts({ blogPosts });
    if (Array.isArray(processedBlogPosts)) {
        return processedBlogPosts;
    }
    return blogPosts;
}
