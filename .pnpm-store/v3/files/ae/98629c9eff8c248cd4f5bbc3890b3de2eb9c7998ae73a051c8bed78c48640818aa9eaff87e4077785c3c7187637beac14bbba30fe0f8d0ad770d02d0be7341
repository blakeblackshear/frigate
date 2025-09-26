/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContextParams } from '../../server/site';
import type { HostPortOptions } from '../../server/getHostPort';
export type StartCLIOptions = HostPortOptions & Pick<LoadContextParams, 'locale' | 'config'> & {
    hotOnly?: boolean;
    open?: boolean;
    poll?: boolean | number;
    minify?: boolean;
};
export declare function start(siteDirParam?: string, cliOptions?: Partial<StartCLIOptions>): Promise<void>;
