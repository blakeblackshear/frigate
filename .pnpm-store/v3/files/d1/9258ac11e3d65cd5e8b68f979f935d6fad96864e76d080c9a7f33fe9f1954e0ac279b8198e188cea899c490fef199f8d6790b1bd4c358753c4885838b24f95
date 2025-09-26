/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type LoadContextParams } from '../server/site';
export type DeployCLIOptions = Pick<LoadContextParams, 'config' | 'outDir'> & {
    locale?: [string, ...string[]];
    skipBuild?: boolean;
    targetDir?: string;
};
export declare function deploy(siteDirParam?: string, cliOptions?: Partial<DeployCLIOptions>): Promise<void>;
