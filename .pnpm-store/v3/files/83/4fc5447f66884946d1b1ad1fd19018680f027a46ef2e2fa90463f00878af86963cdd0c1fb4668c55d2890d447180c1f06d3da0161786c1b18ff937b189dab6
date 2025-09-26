/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import type { BrokenLinks } from '@docusaurus/useBrokenLinks';
export type StatefulBrokenLinks = BrokenLinks & {
    getCollectedLinks: () => string[];
    getCollectedAnchors: () => string[];
};
export declare const createStatefulBrokenLinks: () => StatefulBrokenLinks;
export declare const useBrokenLinksContext: () => BrokenLinks;
export declare function BrokenLinksProvider({ children, brokenLinks, }: {
    children: ReactNode;
    brokenLinks: BrokenLinks;
}): ReactNode;
