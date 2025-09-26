/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { DocusaurusConfig, SiteStorage } from '@docusaurus/types';
type PartialFuture = Pick<DocusaurusConfig['future'], 'experimental_storage'>;
type PartialConfig = Pick<DocusaurusConfig, 'url' | 'baseUrl'> & {
    future: PartialFuture;
};
export declare function createSiteStorage(config: PartialConfig): SiteStorage;
export {};
