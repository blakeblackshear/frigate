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
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const blogUtils_1 = require("./blogUtils");
const props_1 = require("./props");
const authors_1 = require("./authors");
async function createAllRoutes(param) {
    const routes = await buildAllRoutes(param);
    routes.forEach(param.actions.addRoute);
}
async function buildAllRoutes({ baseUrl, content, actions, options, aliasedSource, }) {
    const { blogListComponent, blogPostComponent, blogTagsListComponent, blogAuthorsListComponent, blogAuthorsPostsComponent, blogTagsPostsComponent, blogArchiveComponent, routeBasePath, archiveBasePath, blogTitle, authorsBasePath, postsPerPage, blogDescription, } = options;
    const pluginId = options.id;
    const { createData } = actions;
    const { blogSidebarTitle, blogPosts, blogListPaginated, blogTags, blogTagsListPath, authorsMap, } = content;
    const authorsListPath = (0, utils_1.normalizeUrl)([
        baseUrl,
        routeBasePath,
        authorsBasePath,
    ]);
    const listedBlogPosts = blogPosts.filter(blogUtils_1.shouldBeListed);
    const blogPostsById = lodash_1.default.keyBy(blogPosts, (post) => post.id);
    function getBlogPostById(id) {
        const blogPost = blogPostsById[id];
        if (!blogPost) {
            throw new Error(`unexpected, can't find blog post id=${id}`);
        }
        return blogPost;
    }
    const sidebarBlogPosts = options.blogSidebarCount === 'ALL'
        ? blogPosts
        : blogPosts.slice(0, options.blogSidebarCount);
    async function createSidebarModule() {
        const sidebarProp = (0, props_1.toBlogSidebarProp)({
            blogSidebarTitle,
            blogPosts: sidebarBlogPosts,
        });
        const modulePath = await createData(`blog-post-list-prop-${pluginId}.json`, sidebarProp);
        return aliasedSource(modulePath);
    }
    async function createBlogMetadataModule() {
        const blogMetadata = {
            blogBasePath: (0, utils_1.normalizeUrl)([baseUrl, routeBasePath]),
            blogTitle,
            authorsListPath,
        };
        const modulePath = await createData(`blogMetadata-${pluginId}.json`, blogMetadata);
        return aliasedSource(modulePath);
    }
    // TODO we should have a parent blog route,
    //  and inject blog metadata + sidebar as a parent context
    //  unfortunately we can't have a parent route for blog yet
    //  because if both blog/docs are using routeBasePath /,
    //  React router config rendering doesn't support that well
    const sidebarModulePath = await createSidebarModule();
    const blogMetadataModulePath = await createBlogMetadataModule();
    function blogPostItemsModule(ids) {
        return ids.map((id) => {
            return {
                content: {
                    __import: true,
                    path: getBlogPostById(id).metadata.source,
                    query: {
                        truncated: true,
                    },
                },
            };
        });
    }
    function createArchiveRoute() {
        if (archiveBasePath && listedBlogPosts.length) {
            return [
                {
                    path: (0, utils_1.normalizeUrl)([baseUrl, routeBasePath, archiveBasePath]),
                    component: blogArchiveComponent,
                    exact: true,
                    props: {
                        archive: { blogPosts: listedBlogPosts },
                    },
                },
            ];
        }
        return [];
    }
    function createBlogPostRouteMetadata(blogPostMeta) {
        return {
            sourceFilePath: (0, utils_1.aliasedSitePathToRelativePath)(blogPostMeta.source),
            lastUpdatedAt: blogPostMeta.lastUpdatedAt,
        };
    }
    await Promise.all(blogPosts.map(async (blogPost) => {
        const { metadata } = blogPost;
        await createData(
        // Note that this created data path must be in sync with
        // metadataPath provided to mdx-loader.
        `${(0, utils_1.docuHash)(metadata.source)}.json`, metadata);
    }));
    function createBlogPostRoute(blogPost) {
        return {
            path: blogPost.metadata.permalink,
            component: blogPostComponent,
            exact: true,
            modules: {
                sidebar: sidebarModulePath,
                content: blogPost.metadata.source,
            },
            metadata: createBlogPostRouteMetadata(blogPost.metadata),
            context: {
                blogMetadata: blogMetadataModulePath,
            },
        };
    }
    function createBlogPostRoutes() {
        return blogPosts.map(createBlogPostRoute);
    }
    function createBlogPostsPaginatedRoutes() {
        return blogListPaginated.map((paginated) => {
            return {
                path: paginated.metadata.permalink,
                component: blogListComponent,
                exact: true,
                modules: {
                    sidebar: sidebarModulePath,
                    items: blogPostItemsModule(paginated.items),
                },
                props: {
                    metadata: paginated.metadata,
                },
            };
        });
    }
    function createTagsRoutes() {
        // Tags. This is the last part so we early-return if there are no tags.
        if (Object.keys(blogTags).length === 0) {
            return [];
        }
        const tagsListRoute = {
            path: blogTagsListPath,
            component: blogTagsListComponent,
            exact: true,
            modules: {
                sidebar: sidebarModulePath,
            },
            props: {
                tags: (0, props_1.toTagsProp)({ blogTags }),
            },
        };
        function createTagPaginatedRoutes(tag) {
            return tag.pages.map((paginated) => {
                return {
                    path: paginated.metadata.permalink,
                    component: blogTagsPostsComponent,
                    exact: true,
                    modules: {
                        sidebar: sidebarModulePath,
                        items: blogPostItemsModule(paginated.items),
                    },
                    props: {
                        tag: (0, props_1.toTagProp)({ tag, blogTagsListPath }),
                        listMetadata: paginated.metadata,
                    },
                };
            });
        }
        const tagsPaginatedRoutes = Object.values(blogTags).flatMap(createTagPaginatedRoutes);
        return [tagsListRoute, ...tagsPaginatedRoutes];
    }
    function createAuthorsRoutes() {
        if (authorsMap === undefined || Object.keys(authorsMap).length === 0) {
            return [];
        }
        const blogPostsByAuthorKey = (0, authors_1.groupBlogPostsByAuthorKey)({
            authorsMap,
            blogPosts,
        });
        const authors = Object.values(authorsMap);
        return [
            createAuthorListRoute(),
            ...authors.flatMap(createAuthorPaginatedRoute),
        ];
        function createAuthorListRoute() {
            return {
                path: authorsListPath,
                component: blogAuthorsListComponent,
                exact: true,
                modules: {
                    sidebar: sidebarModulePath,
                },
                props: {
                    authors: authors.map((author) => (0, props_1.toAuthorItemProp)({
                        author,
                        count: blogPostsByAuthorKey[author.key]?.length ?? 0,
                    })),
                },
                context: {
                    blogMetadata: blogMetadataModulePath,
                },
            };
        }
        function createAuthorPaginatedRoute(author) {
            const authorBlogPosts = blogPostsByAuthorKey[author.key] ?? [];
            if (!author.page) {
                return [];
            }
            const pages = (0, blogUtils_1.paginateBlogPosts)({
                blogPosts: authorBlogPosts,
                basePageUrl: author.page.permalink,
                blogDescription,
                blogTitle,
                pageBasePath: authorsBasePath,
                postsPerPageOption: postsPerPage,
            });
            return pages.map(({ metadata, items }) => {
                return {
                    path: metadata.permalink,
                    component: blogAuthorsPostsComponent,
                    exact: true,
                    modules: {
                        items: blogPostItemsModule(items),
                        sidebar: sidebarModulePath,
                    },
                    props: {
                        author: (0, props_1.toAuthorItemProp)({ author, count: authorBlogPosts.length }),
                        listMetadata: metadata,
                    },
                    context: {
                        blogMetadata: blogMetadataModulePath,
                    },
                };
            });
        }
    }
    return [
        ...createBlogPostRoutes(),
        ...createBlogPostsPaginatedRoutes(),
        ...createTagsRoutes(),
        ...createArchiveRoute(),
        ...createAuthorsRoutes(),
    ];
}
