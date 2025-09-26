/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import type { PropDocContent } from '@docusaurus/plugin-content-docs';
/**
 * The React context value returned by the `useDoc()` hook.
 * It contains useful data related to the currently browsed doc.
 */
export type DocContextValue = Pick<PropDocContent, 'metadata' | 'frontMatter' | 'toc' | 'assets' | 'contentTitle'>;
/**
 * This is a very thin layer around the `content` received from the MDX loader.
 * It provides metadata about the doc to the children tree.
 */
export declare function DocProvider({ children, content, }: {
    children: ReactNode;
    content: PropDocContent;
}): ReactNode;
/**
 * Returns the data of the currently browsed doc. Gives access to the doc's MDX
 * Component, front matter, metadata, TOC, etc. When swizzling a low-level
 * component (e.g. the "Edit this page" link) and you need some extra metadata,
 * you don't have to drill the props all the way through the component tree:
 * simply use this hook instead.
 */
export declare function useDoc(): DocContextValue;
