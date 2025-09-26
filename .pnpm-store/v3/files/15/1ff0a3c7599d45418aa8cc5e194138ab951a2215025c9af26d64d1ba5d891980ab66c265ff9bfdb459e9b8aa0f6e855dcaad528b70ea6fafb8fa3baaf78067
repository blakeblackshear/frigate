/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import _ from 'lodash';
import type { StartCLIOptions } from './start';
import type { LoadedPlugin, RouterType } from '@docusaurus/types';
export type OpenUrlContext = {
    host: string;
    port: number;
    getOpenUrl: ({ baseUrl, router, }: {
        baseUrl: string;
        router: RouterType;
    }) => string;
};
export declare function createOpenUrlContext({ cliOptions, }: {
    cliOptions: StartCLIOptions;
}): Promise<OpenUrlContext>;
type StartParams = {
    siteDirParam: string;
    cliOptions: Partial<StartCLIOptions>;
};
export declare function createReloadableSite(startParams: StartParams): Promise<{
    get: () => import("../../server/site").Site;
    getOpenUrl: () => string;
    reload: _.DebouncedFunc<() => Promise<void>>;
    reloadPlugin: (plugin: LoadedPlugin) => Promise<void>;
    openUrlContext: OpenUrlContext;
}>;
export {};
