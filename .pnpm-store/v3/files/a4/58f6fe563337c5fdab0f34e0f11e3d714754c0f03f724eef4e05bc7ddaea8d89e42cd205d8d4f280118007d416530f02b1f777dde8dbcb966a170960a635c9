/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { StartCLIOptions } from './start';
import type { LoadedPlugin, Props } from '@docusaurus/types';
type PollingOptions = {
    usePolling: boolean;
    interval: number | undefined;
};
export declare function createPollingOptions(cliOptions: StartCLIOptions): PollingOptions;
export type FileWatchEventName = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
export type FileWatchEvent = {
    name: FileWatchEventName;
    path: string;
};
type WatchParams = {
    pathsToWatch: string[];
    siteDir: string;
} & PollingOptions;
/**
 * Watch file system paths for changes and emit events
 * Returns an async handle to stop watching
 */
export declare function watch(params: WatchParams, callback: (event: FileWatchEvent) => void): () => Promise<void>;
export declare function getSitePathsToWatch({ props }: {
    props: Props;
}): string[];
export declare function getPluginPathsToWatch({ siteDir, plugin, }: {
    siteDir: string;
    plugin: LoadedPlugin;
}): string[];
export declare function setupSiteFileWatchers({ props, cliOptions, }: {
    props: Props;
    cliOptions: StartCLIOptions;
}, callback: (params: {
    plugin: LoadedPlugin | null;
    event: FileWatchEvent;
}) => void): void;
export {};
