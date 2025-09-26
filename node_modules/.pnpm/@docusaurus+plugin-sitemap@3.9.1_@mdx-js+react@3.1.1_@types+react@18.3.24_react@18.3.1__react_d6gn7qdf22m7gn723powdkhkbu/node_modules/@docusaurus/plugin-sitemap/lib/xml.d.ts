/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LastModOption, SitemapItem } from './types';
export declare function sitemapItemsToXmlString(items: SitemapItem[], options: {
    lastmod: LastModOption | null;
}): Promise<string>;
