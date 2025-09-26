/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { VersionTag, VersionTags } from './types';
import type { SidebarItemDoc } from './sidebars/types';
import type { PropSidebars, PropVersionMetadata, PropTagDocList, PropTagsListPage, PropSidebarItemLink, DocMetadata, LoadedVersion } from '@docusaurus/plugin-content-docs';
export declare function toSidebarDocItemLinkProp({ item, doc, }: {
    item: SidebarItemDoc;
    doc: Pick<DocMetadata, 'id' | 'title' | 'permalink' | 'unlisted' | 'frontMatter'>;
}): PropSidebarItemLink;
export declare function toSidebarsProp(loadedVersion: Pick<LoadedVersion, 'docs' | 'sidebars'>): PropSidebars;
export declare function toVersionMetadataProp(pluginId: string, loadedVersion: LoadedVersion): PropVersionMetadata;
export declare function toTagDocListProp({ allTagsPath, tag, docs, }: {
    allTagsPath: string;
    tag: VersionTag;
    docs: DocMetadata[];
}): PropTagDocList;
export declare function toTagsListTagsProp(versionTags: VersionTags): PropTagsListPage['tags'];
