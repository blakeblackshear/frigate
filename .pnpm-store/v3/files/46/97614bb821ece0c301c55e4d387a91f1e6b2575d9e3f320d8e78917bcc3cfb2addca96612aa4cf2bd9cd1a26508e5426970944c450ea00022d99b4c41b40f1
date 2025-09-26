/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import type { PropBlogPostContent, BlogMetadata } from '@docusaurus/plugin-content-blog';
export declare function useBlogMetadata(): BlogMetadata;
/**
 * The React context value returned by the `useBlogPost()` hook.
 * It contains useful data related to the currently browsed blog post.
 */
export type BlogPostContextValue = Pick<PropBlogPostContent, 'metadata' | 'frontMatter' | 'assets' | 'toc'> & {
    readonly isBlogPostPage: boolean;
};
/**
 * This is a very thin layer around the `content` received from the MDX loader.
 * It provides metadata about the blog post to the children tree.
 */
export declare function BlogPostProvider({ children, content, isBlogPostPage, }: {
    children: ReactNode;
    content: PropBlogPostContent;
    isBlogPostPage?: boolean;
}): ReactNode;
/**
 * Returns the data of the currently browsed blog post. Gives access to
 * front matter, metadata, TOC, etc.
 * When swizzling a low-level component (e.g. the "Edit this page" link)
 * and you need some extra metadata, you don't have to drill the props
 * all the way through the component tree: simply use this hook instead.
 */
export declare function useBlogPost(): BlogPostContextValue;
