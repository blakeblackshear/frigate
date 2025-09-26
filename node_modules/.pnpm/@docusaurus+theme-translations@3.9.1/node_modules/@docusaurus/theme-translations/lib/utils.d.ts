/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { TranslationFileContent } from '@docusaurus/types';
export declare function getThemes(): Promise<{
    name: string;
    src: string[];
}[]>;
export declare function extractThemeCodeMessages(targetDirs?: string[]): Promise<TranslationFileContent>;
//# sourceMappingURL=utils.d.ts.map