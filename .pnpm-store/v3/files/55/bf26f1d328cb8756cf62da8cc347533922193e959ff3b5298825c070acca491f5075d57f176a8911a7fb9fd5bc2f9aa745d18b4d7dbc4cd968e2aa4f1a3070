"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTagsProp = toTagsProp;
exports.toTagProp = toTagProp;
exports.toAuthorItemProp = toAuthorItemProp;
exports.toBlogSidebarProp = toBlogSidebarProp;
function toTagsProp({ blogTags }) {
    return Object.values(blogTags)
        .filter((tag) => !tag.unlisted)
        .map((tag) => ({
        label: tag.label,
        permalink: tag.permalink,
        description: tag.description,
        count: tag.items.length,
    }));
}
function toTagProp({ blogTagsListPath, tag, }) {
    return {
        label: tag.label,
        permalink: tag.permalink,
        description: tag.description,
        allTagsPath: blogTagsListPath,
        count: tag.items.length,
        unlisted: tag.unlisted,
    };
}
function toAuthorItemProp({ author, count, }) {
    return {
        ...author,
        count,
    };
}
function toBlogSidebarProp({ blogSidebarTitle, blogPosts, }) {
    return {
        title: blogSidebarTitle,
        items: blogPosts.map((blogPost) => ({
            title: blogPost.metadata.frontMatter.sidebar_label ?? blogPost.metadata.title,
            permalink: blogPost.metadata.permalink,
            unlisted: blogPost.metadata.unlisted,
            date: blogPost.metadata.date,
        })),
    };
}
