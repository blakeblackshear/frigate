/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Author, AuthorsMap, BlogPost, BlogPostFrontMatter } from '@docusaurus/plugin-content-blog';
type AuthorsParam = {
    frontMatter: BlogPostFrontMatter;
    authorsMap: AuthorsMap | undefined;
    baseUrl: string;
};
export declare function normalizeImageUrl({ imageURL, baseUrl, }: {
    imageURL: string | undefined;
    baseUrl: string;
}): string | undefined;
export declare function getBlogPostAuthors(params: AuthorsParam): Author[];
/**
 * Group blog posts by author key
 * Blog posts with only inline authors are ignored
 */
export declare function groupBlogPostsByAuthorKey({ blogPosts, authorsMap, }: {
    blogPosts: BlogPost[];
    authorsMap: AuthorsMap | undefined;
}): Record<string, BlogPost[]>;
export {};
