/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
type CausalChain = [Error, ...Error[]];
export declare function getErrorCausalChain(error: Error): CausalChain;
export {};
//# sourceMappingURL=errorUtils.d.ts.map