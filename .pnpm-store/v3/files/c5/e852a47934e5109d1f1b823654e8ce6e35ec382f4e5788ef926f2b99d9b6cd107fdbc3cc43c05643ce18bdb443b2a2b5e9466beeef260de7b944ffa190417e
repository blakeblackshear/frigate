/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type LoadContextParams } from '../../server/site';
export type BuildCLIOptions = Pick<LoadContextParams, 'config' | 'outDir'> & {
    locale?: [string, ...string[]];
    bundleAnalyzer?: boolean;
    minify?: boolean;
    dev?: boolean;
};
export declare function build(siteDirParam?: string, cliOptions?: Partial<BuildCLIOptions>): Promise<void>;
