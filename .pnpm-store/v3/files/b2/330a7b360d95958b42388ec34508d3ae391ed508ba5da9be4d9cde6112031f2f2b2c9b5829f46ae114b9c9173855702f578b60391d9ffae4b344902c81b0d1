"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBlogFeedFiles = createBlogFeedFiles;
exports.createFeedHtmlHeadTags = createFeedHtmlHeadTags;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const feed_1 = require("feed");
const srcset = tslib_1.__importStar(require("srcset"));
const utils_1 = require("@docusaurus/utils");
const utils_common_1 = require("@docusaurus/utils-common");
const cheerio_1 = require("cheerio");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
async function generateBlogFeed({ blogPosts, options, siteConfig, outDir, locale, }) {
    if (!blogPosts.length) {
        return null;
    }
    const { feedOptions, routeBasePath } = options;
    const { url: siteUrl, baseUrl, title, favicon, trailingSlash } = siteConfig;
    const blogBaseUrl = (0, utils_common_1.applyTrailingSlash)((0, utils_1.normalizeUrl)([siteUrl, baseUrl, routeBasePath]), {
        trailingSlash,
        baseUrl,
    });
    const blogPostsForFeed = feedOptions.limit === false || feedOptions.limit === null
        ? blogPosts
        : blogPosts.slice(0, feedOptions.limit);
    const updated = blogPostsForFeed[0]?.metadata.date;
    const feed = new feed_1.Feed({
        id: blogBaseUrl,
        title: feedOptions.title ?? `${title} Blog`,
        updated,
        language: feedOptions.language ?? locale,
        link: blogBaseUrl,
        description: feedOptions.description ?? `${siteConfig.title} Blog`,
        favicon: favicon ? (0, utils_1.normalizeUrl)([siteUrl, baseUrl, favicon]) : undefined,
        copyright: feedOptions.copyright,
    });
    const createFeedItems = options.feedOptions.createFeedItems ?? defaultCreateFeedItems;
    const feedItems = await createFeedItems({
        blogPosts: blogPostsForFeed,
        siteConfig,
        outDir,
        defaultCreateFeedItems,
    });
    feedItems.forEach(feed.addItem);
    return feed;
}
async function defaultCreateFeedItems({ blogPosts, siteConfig, outDir, }) {
    const { url: siteUrl, baseUrl, trailingSlash } = siteConfig;
    function toFeedAuthor(author) {
        return { name: author.name, link: author.url, email: author.email };
    }
    return Promise.all(blogPosts.map(async (post) => {
        const { metadata: { title: metadataTitle, permalink, date, description, authors, tags, }, } = post;
        const content = await (0, utils_1.readOutputHTMLFile)(permalink.replace(baseUrl, ''), outDir, trailingSlash);
        const $ = (0, cheerio_1.load)(content);
        const blogPostAbsoluteUrl = (0, utils_common_1.applyTrailingSlash)((0, utils_1.normalizeUrl)([siteUrl, permalink]), {
            trailingSlash,
            baseUrl,
        });
        const toAbsoluteUrl = (src) => String(new URL(src, blogPostAbsoluteUrl));
        // Make links and image urls absolute
        // See https://github.com/facebook/docusaurus/issues/9136
        $(`div#${utils_common_1.blogPostContainerID} a, div#${utils_common_1.blogPostContainerID} img`).each((_, elm) => {
            if (elm.tagName === 'a') {
                const { href } = elm.attribs;
                if (href) {
                    elm.attribs.href = toAbsoluteUrl(href);
                }
            }
            else if (elm.tagName === 'img') {
                const { src, srcset: srcsetAttr } = elm.attribs;
                if (src) {
                    elm.attribs.src = toAbsoluteUrl(src);
                }
                if (srcsetAttr) {
                    elm.attribs.srcset = srcset.stringify(srcset.parse(srcsetAttr).map((props) => ({
                        ...props,
                        url: toAbsoluteUrl(props.url),
                    })));
                }
            }
        });
        const feedItem = {
            title: metadataTitle,
            id: blogPostAbsoluteUrl,
            link: blogPostAbsoluteUrl,
            date,
            description,
            // Atom feed demands the "term", while other feeds use "name"
            category: tags.map((tag) => ({ name: tag.label, term: tag.label })),
            content: $(`#${utils_common_1.blogPostContainerID}`).html(),
        };
        // json1() method takes the first item of authors array
        // it causes an error when authors array is empty
        const feedItemAuthors = authors.map(toFeedAuthor);
        if (feedItemAuthors.length > 0) {
            feedItem.author = feedItemAuthors;
        }
        return feedItem;
    }));
}
async function resolveXsltFilePaths({ xsltFilePath, contentPaths, }) {
    const xsltAbsolutePath = path_1.default.isAbsolute(xsltFilePath)
        ? xsltFilePath
        : (await (0, utils_1.getDataFilePath)({ filePath: xsltFilePath, contentPaths })) ??
            path_1.default.resolve(contentPaths.contentPath, xsltFilePath);
    if (!(await fs_extra_1.default.pathExists(xsltAbsolutePath))) {
        throw new Error(logger_1.default.interpolate `Blog feed XSLT file not found at path=${path_1.default.relative(process.cwd(), xsltAbsolutePath)}`);
    }
    const parsedPath = path_1.default.parse(xsltAbsolutePath);
    const cssAbsolutePath = path_1.default.resolve(parsedPath.dir, `${parsedPath.name}.css`);
    if (!(await fs_extra_1.default.pathExists(xsltAbsolutePath))) {
        throw new Error(logger_1.default.interpolate `Blog feed XSLT file was found at path=${path_1.default.relative(process.cwd(), xsltAbsolutePath)}
But its expected co-located CSS file could not be found at path=${path_1.default.relative(process.cwd(), cssAbsolutePath)}
If you want to provide a custom XSLT file, you must provide a CSS file with the exact same name.`);
    }
    return { xsltAbsolutePath, cssAbsolutePath };
}
async function generateXsltFiles({ xsltFilePath, generatePath, contentPaths, }) {
    const { xsltAbsolutePath, cssAbsolutePath } = await resolveXsltFilePaths({
        xsltFilePath,
        contentPaths,
    });
    const xsltOutputPath = path_1.default.join(generatePath, path_1.default.basename(xsltAbsolutePath));
    const cssOutputPath = path_1.default.join(generatePath, path_1.default.basename(cssAbsolutePath));
    await fs_extra_1.default.copy(xsltAbsolutePath, xsltOutputPath);
    await fs_extra_1.default.copy(cssAbsolutePath, cssOutputPath);
}
// This modifies the XML feed content to add a relative href to the XSLT file
// Good enough for now: we probably don't need a full XML parser just for that
// See also https://darekkay.com/blog/rss-styling/
function injectXslt({ feedContent, xsltFilePath, }) {
    return feedContent.replace('<?xml version="1.0" encoding="utf-8"?>', `<?xml version="1.0" encoding="utf-8"?><?xml-stylesheet type="text/xsl" href="${path_1.default.basename(xsltFilePath)}"?>`);
}
const FeedConfigs = {
    rss: {
        outputFileName: 'rss.xml',
        getContent: (feed) => feed.rss2(),
        getXsltFilePath: (xslt) => xslt.rss,
    },
    atom: {
        outputFileName: 'atom.xml',
        getContent: (feed) => feed.atom1(),
        getXsltFilePath: (xslt) => xslt.atom,
    },
    json: {
        outputFileName: 'feed.json',
        getContent: (feed) => feed.json1(),
        getXsltFilePath: () => null,
    },
};
async function createBlogFeedFile({ feed, feedType, generatePath, feedOptions, contentPaths, }) {
    try {
        const feedConfig = FeedConfigs[feedType];
        let feedContent = feedConfig.getContent(feed);
        const xsltFilePath = feedConfig.getXsltFilePath(feedOptions.xslt);
        if (xsltFilePath) {
            await generateXsltFiles({ xsltFilePath, contentPaths, generatePath });
            feedContent = injectXslt({ feedContent, xsltFilePath });
        }
        const outputPath = path_1.default.join(generatePath, feedConfig.outputFileName);
        await fs_extra_1.default.outputFile(outputPath, feedContent);
    }
    catch (err) {
        throw new Error(`Generating ${feedType} feed failed.`, {
            cause: err,
        });
    }
}
function shouldBeInFeed(blogPost) {
    const excluded = blogPost.metadata.frontMatter.draft ||
        blogPost.metadata.frontMatter.unlisted;
    return !excluded;
}
async function createBlogFeedFiles({ blogPosts: allBlogPosts, options, siteConfig, outDir, locale, contentPaths, }) {
    const blogPosts = allBlogPosts.filter(shouldBeInFeed);
    const feed = await generateBlogFeed({
        blogPosts,
        options,
        siteConfig,
        outDir,
        locale,
    });
    const feedTypes = options.feedOptions.type;
    if (!feed || !feedTypes) {
        return;
    }
    await Promise.all(feedTypes.map((feedType) => createBlogFeedFile({
        feed,
        feedType,
        generatePath: path_1.default.join(outDir, options.routeBasePath),
        feedOptions: options.feedOptions,
        contentPaths,
    })));
}
function createFeedHtmlHeadTags({ context, options, }) {
    const feedTypes = options.feedOptions.type;
    if (!feedTypes) {
        return [];
    }
    const feedTitle = options.feedOptions.title ?? context.siteConfig.title;
    const feedsConfig = {
        rss: {
            type: 'application/rss+xml',
            path: 'rss.xml',
            title: `${feedTitle} RSS Feed`,
        },
        atom: {
            type: 'application/atom+xml',
            path: 'atom.xml',
            title: `${feedTitle} Atom Feed`,
        },
        json: {
            type: 'application/json',
            path: 'feed.json',
            title: `${feedTitle} JSON Feed`,
        },
    };
    const headTags = [];
    feedTypes.forEach((feedType) => {
        const { type, path: feedConfigPath, title: feedConfigTitle, } = feedsConfig[feedType];
        headTags.push({
            tagName: 'link',
            attributes: {
                rel: 'alternate',
                type,
                href: (0, utils_1.normalizeUrl)([
                    context.siteConfig.baseUrl,
                    options.routeBasePath,
                    feedConfigPath,
                ]),
                title: feedConfigTitle,
            },
        });
    });
    return headTags;
}
