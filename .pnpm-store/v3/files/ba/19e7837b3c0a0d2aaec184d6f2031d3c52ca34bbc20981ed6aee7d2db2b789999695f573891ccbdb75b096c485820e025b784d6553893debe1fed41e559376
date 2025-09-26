/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Site } from './site';
type Params = {
    site: Site;
};
type SiteMessage = {
    type: 'warning' | 'error';
    message: string;
};
export declare function collectAllSiteMessages(params: Params): Promise<SiteMessage[]>;
export declare function emitSiteMessages(params: Params): Promise<void>;
export {};
