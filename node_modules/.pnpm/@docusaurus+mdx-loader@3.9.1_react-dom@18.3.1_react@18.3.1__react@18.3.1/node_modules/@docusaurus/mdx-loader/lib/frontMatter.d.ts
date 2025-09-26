/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { FormatInput } from './index';
export type MDXFrontMatter = {
    format?: FormatInput;
};
export declare const DefaultMDXFrontMatter: MDXFrontMatter;
export declare function validateMDXFrontMatter(frontMatter: unknown): MDXFrontMatter;
//# sourceMappingURL=frontMatter.d.ts.map