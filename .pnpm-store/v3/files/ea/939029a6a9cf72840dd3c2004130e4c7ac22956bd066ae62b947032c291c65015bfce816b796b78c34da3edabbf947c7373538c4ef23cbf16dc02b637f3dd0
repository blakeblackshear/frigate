/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { TOCItem } from '@docusaurus/mdx-loader';
export type TOCTreeNode = {
    readonly value: string;
    readonly id: string;
    readonly level: number;
    readonly children: readonly TOCTreeNode[];
};
/**
 * Takes a flat TOC list (from the MDX loader) and treeifies it into what the
 * TOC components expect. Memoized for performance.
 */
export declare function useTreeifiedTOC(toc: TOCItem[]): readonly TOCTreeNode[];
/**
 * Takes a flat TOC list (from the MDX loader) and treeifies it into what the
 * TOC components expect, applying the `minHeadingLevel` and `maxHeadingLevel`.
 * Memoized for performance.
 *
 * **Important**: this is not the same as `useTreeifiedTOC(toc.filter(...))`,
 * because we have to filter the TOC after it has been treeified. This is mostly
 * to ensure that weird TOC structures preserve their semantics. For example, an
 * h3-h2-h4 sequence should not be treeified as an "h3 > h4" hierarchy with
 * min=3, max=4, but should rather be "[h3, h4]" (since the h2 heading has split
 * the two headings and they are not parent-children)
 */
export declare function useFilteredAndTreeifiedTOC({ toc, minHeadingLevel, maxHeadingLevel, }: {
    toc: readonly TOCItem[];
    minHeadingLevel: number;
    maxHeadingLevel: number;
}): readonly TOCTreeNode[];
//# sourceMappingURL=tocUtils.d.ts.map