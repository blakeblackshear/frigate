/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export type TOCHighlightConfig = {
    /** A class name that all TOC links share. */
    linkClassName: string;
    /** The class name applied to the active (highlighted) link. */
    linkActiveClassName: string;
    /**
     * The minimum heading level that the TOC includes. Only headings that are in
     * this range will be eligible as "active heading".
     */
    minHeadingLevel: number;
    /** @see {@link TOCHighlightConfig.minHeadingLevel} */
    maxHeadingLevel: number;
};
/**
 * Side-effect that applies the active class name to the TOC heading that the
 * user is currently viewing. Disabled when `config` is undefined.
 */
export declare function useTOCHighlight(config: TOCHighlightConfig | undefined): void;
//# sourceMappingURL=useTOCHighlight.d.ts.map