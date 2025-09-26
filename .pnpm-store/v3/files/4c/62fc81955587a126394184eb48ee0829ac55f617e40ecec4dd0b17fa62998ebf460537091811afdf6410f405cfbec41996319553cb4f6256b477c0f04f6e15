/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { SSGParams } from './ssgParams';
import type { PageCollectedData } from '../common';
export type SSGSuccess = {
    success: true;
    pathname: string;
    result: {
        collectedData: PageCollectedData;
        warnings: string[];
    };
};
export type SSGError = {
    success: false;
    pathname: string;
    error: Error;
};
export type SSGResult = SSGSuccess | SSGError;
export type SSGRenderer = {
    shutdown: () => Promise<void>;
    renderPathnames: (pathnames: string[]) => Promise<SSGResult[]>;
};
export declare function loadSSGRenderer({ params, }: {
    params: SSGParams;
}): Promise<SSGRenderer>;
