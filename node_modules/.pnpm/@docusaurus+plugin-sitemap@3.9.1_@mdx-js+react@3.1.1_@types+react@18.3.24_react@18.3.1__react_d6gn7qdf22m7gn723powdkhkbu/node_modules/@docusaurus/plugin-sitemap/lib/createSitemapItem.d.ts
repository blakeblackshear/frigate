/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { SitemapItem } from './types';
import type { DocusaurusConfig, RouteConfig } from '@docusaurus/types';
import type { PluginOptions } from './options';
export declare function createSitemapItem({ route, siteConfig, options, }: {
    route: RouteConfig;
    siteConfig: DocusaurusConfig;
    options: PluginOptions;
}): Promise<SitemapItem>;
