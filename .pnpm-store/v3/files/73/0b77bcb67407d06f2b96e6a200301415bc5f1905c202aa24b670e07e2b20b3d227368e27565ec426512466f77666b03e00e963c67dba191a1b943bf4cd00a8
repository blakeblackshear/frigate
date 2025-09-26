/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { RouteConfig, ReportingSeverity } from '@docusaurus/types';
type CollectedLinks = {
    [pathname: string]: {
        links: string[];
        anchors: string[];
    };
};
export declare function handleBrokenLinks({ collectedLinks, onBrokenLinks, onBrokenAnchors, routes, }: {
    collectedLinks: CollectedLinks;
    onBrokenLinks: ReportingSeverity;
    onBrokenAnchors: ReportingSeverity;
    routes: RouteConfig[];
}): Promise<void>;
export {};
