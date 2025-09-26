/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { RefObject } from 'react';
export type WordWrap = {
    readonly codeBlockRef: RefObject<HTMLPreElement>;
    readonly isEnabled: boolean;
    readonly isCodeScrollable: boolean;
    readonly toggle: () => void;
};
export declare function useCodeWordWrap(): WordWrap;
//# sourceMappingURL=useCodeWordWrap.d.ts.map