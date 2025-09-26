/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/** Thin wrapper around `crypto.createHash("md5")`. */
export declare function md5Hash(str: string): string;
/** Creates an MD5 hash and truncates it to the given length. */
export declare function simpleHash(str: string, length: number): string;
/**
 * Given an input string, convert to kebab-case and append a hash, avoiding name
 * collision. Also removes part of the string if its larger than the allowed
 * filename per OS, avoiding `ERRNAMETOOLONG` error.
 */
export declare function docuHash(strInput: string, options?: {
    hashExtra?: string;
    hashLength?: number;
}): string;
//# sourceMappingURL=hashUtils.d.ts.map