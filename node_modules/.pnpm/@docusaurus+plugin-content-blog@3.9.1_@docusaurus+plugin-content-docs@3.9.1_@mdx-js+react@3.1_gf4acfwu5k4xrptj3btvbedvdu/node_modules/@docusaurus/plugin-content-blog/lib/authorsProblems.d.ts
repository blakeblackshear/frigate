/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Author, PluginOptions } from '@docusaurus/plugin-content-blog';
export declare function reportAuthorsProblems(params: {
    authors: Author[];
    blogSourceRelative: string;
    options: Pick<PluginOptions, 'onInlineAuthors' | 'authorsMapPath'>;
}): void;
export declare function reportInlineAuthors({ authors, blogSourceRelative, options: { onInlineAuthors, authorsMapPath }, }: {
    authors: Author[];
    blogSourceRelative: string;
    options: Pick<PluginOptions, 'onInlineAuthors' | 'authorsMapPath'>;
}): void;
export declare function reportDuplicateAuthors({ authors, blogSourceRelative, }: {
    authors: Author[];
    blogSourceRelative: string;
}): void;
