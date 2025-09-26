/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type Configuration } from 'webpack';
import type webpack from 'webpack';
import type { CurrentBundler } from '@docusaurus/types';
export declare function formatStatsErrorMessage(statsJson: ReturnType<webpack.Stats['toJson']> | undefined): string | undefined;
export declare function printStatsWarnings(statsJson: ReturnType<webpack.Stats['toJson']> | undefined): void;
declare global {
    interface Error {
        /** @see https://webpack.js.org/api/node/#error-handling */
        details?: unknown;
    }
}
export declare function compile({ configs, currentBundler, }: {
    configs: Configuration[];
    currentBundler: CurrentBundler;
}): Promise<webpack.MultiStats>;
//# sourceMappingURL=compiler.d.ts.map