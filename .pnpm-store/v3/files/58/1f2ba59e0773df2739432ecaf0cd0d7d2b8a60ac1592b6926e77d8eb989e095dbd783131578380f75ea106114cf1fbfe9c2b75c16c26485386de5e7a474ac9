/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext } from '@docusaurus/types';
import type { AuthorsMap, PluginOptions, BlogPost, BlogTags, BlogPaginated } from '@docusaurus/plugin-content-blog';
import type { BlogContentPaths } from './types';
export declare function truncate(fileString: string, truncateMarker: RegExp): string;
export declare function reportUntruncatedBlogPosts({ blogPosts, onUntruncatedBlogPosts, }: {
    blogPosts: BlogPost[];
    onUntruncatedBlogPosts: PluginOptions['onUntruncatedBlogPosts'];
}): void;
export declare function paginateBlogPosts({ blogPosts, basePageUrl, blogTitle, blogDescription, postsPerPageOption, pageBasePath, }: {
    blogPosts: BlogPost[];
    basePageUrl: string;
    blogTitle: string;
    blogDescription: string;
    postsPerPageOption: number | 'ALL';
    pageBasePath: string;
}): BlogPaginated[];
export declare function shouldBeListed(blogPost: BlogPost): boolean;
export declare function getBlogTags({ blogPosts, ...params }: {
    blogPosts: BlogPost[];
    blogTitle: string;
    blogDescription: string;
    postsPerPageOption: number | 'ALL';
    pageBasePath: string;
}): BlogTags;
type ParsedBlogFileName = {
    date: Date | undefined;
    text: string;
    slug: string;
};
export declare function parseBlogFileName(blogSourceRelative: string): ParsedBlogFileName;
export declare function generateBlogPosts(contentPaths: BlogContentPaths, context: LoadContext, options: PluginOptions, authorsMap?: AuthorsMap): Promise<BlogPost[]>;
export declare function applyProcessBlogPosts({ blogPosts, processBlogPosts, }: {
    blogPosts: BlogPost[];
    processBlogPosts: PluginOptions['processBlogPosts'];
}): Promise<BlogPost[]>;
export {};
