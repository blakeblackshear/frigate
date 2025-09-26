/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Optional } from 'utility-types';
export type Tag = {
    /** The display label of a tag */
    label: string;
    /** Permalink to this tag's page, without the `/tags/` base path. */
    permalink: string;
    /** An optional description of the tag */
    description: string | undefined;
};
export type TagsFileInput = Record<string, Partial<Tag> | null>;
export type TagsFile = Record<string, Tag>;
export type TagsPluginOptions = {
    /** Path to the tags file. */
    tags: string | false | null | undefined;
    /** The behavior of Docusaurus when it finds inline tags. */
    onInlineTags: 'ignore' | 'log' | 'warn' | 'throw';
};
export type TagMetadata = Tag & {
    inline: boolean;
};
/** What the tags list page should know about each tag. */
export type TagsListItem = Tag & {
    /** Number of posts/docs with this tag. */
    count: number;
};
/** What the tag's own page should know about the tag. */
export type TagModule = TagsListItem & {
    /** The tags list page's permalink. */
    allTagsPath: string;
    /** Is this tag unlisted? (when it only contains unlisted items) */
    unlisted: boolean;
};
export type FrontMatterTag = string | Optional<Tag, 'description'>;
export declare function normalizeTag({ tag, tagsFile, tagsBaseRoutePath, }: {
    tag: FrontMatterTag;
    tagsBaseRoutePath: string;
    tagsFile: TagsFile | null;
}): TagMetadata;
export declare function normalizeTags({ options, source, frontMatterTags, tagsBaseRoutePath, tagsFile, }: {
    options: TagsPluginOptions;
    source: string;
    frontMatterTags: FrontMatterTag[] | undefined;
    tagsBaseRoutePath: string;
    tagsFile: TagsFile | null;
}): TagMetadata[];
export declare function reportInlineTags({ tags, source, options, }: {
    tags: TagMetadata[];
    source: string;
    options: TagsPluginOptions;
}): void;
type TaggedItemGroup<Item> = {
    tag: TagMetadata;
    items: Item[];
};
/**
 * Permits to group docs/blog posts by tag (provided by front matter).
 *
 * @returns a map from tag permalink to the items and other relevant tag data.
 * The record is indexed by permalink, because routes must be unique in the end.
 * Labels may vary on 2 MD files but they are normalized. Docs with
 * label='some label' and label='some-label' should end up in the same page.
 */
export declare function groupTaggedItems<Item>(items: readonly Item[], 
/**
 * A callback telling me how to get the tags list of the current item. Usually
 * simply getting it from some metadata of the current item.
 */
getItemTags: (item: Item) => readonly TagMetadata[]): {
    [permalink: string]: TaggedItemGroup<Item>;
};
/**
 * Permits to get the "tag visibility" (hard to find a better name)
 * IE, is this tag listed or unlisted
 * And which items should be listed when this tag is browsed
 */
export declare function getTagVisibility<Item>({ items, isUnlisted, }: {
    items: Item[];
    isUnlisted: (item: Item) => boolean;
}): {
    unlisted: boolean;
    listedItems: Item[];
};
export {};
//# sourceMappingURL=tags.d.ts.map