/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ContentPaths, TagsFile, TagsFileInput, TagsPluginOptions } from '@docusaurus/utils';
export declare function ensureUniquePermalinks(tags: TagsFile): void;
export declare function normalizeTagsFile(data: TagsFileInput): TagsFile;
type GetTagsFileParams = {
    tags: TagsPluginOptions['tags'];
    contentPaths: ContentPaths;
};
export declare function getTagsFilePathsToWatch({ tags, contentPaths, }: GetTagsFileParams): string[];
export declare function getTagsFile({ tags, contentPaths, }: GetTagsFileParams): Promise<TagsFile | null>;
export {};
//# sourceMappingURL=tagsFile.d.ts.map