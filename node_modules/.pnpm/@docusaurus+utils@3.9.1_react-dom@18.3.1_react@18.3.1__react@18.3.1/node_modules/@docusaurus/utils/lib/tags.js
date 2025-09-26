"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTag = normalizeTag;
exports.normalizeTags = normalizeTags;
exports.reportInlineTags = reportInlineTags;
exports.groupTaggedItems = groupTaggedItems;
exports.getTagVisibility = getTagVisibility;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const urlUtils_1 = require("./urlUtils");
// We always apply tagsBaseRoutePath on purpose. For versioned docs, v1/doc.md
// and v2/doc.md tags with custom permalinks don't lead to the same created
// page. tagsBaseRoutePath is different for each doc version
function normalizeTagPermalink({ tagsBaseRoutePath, permalink, }) {
    return (0, urlUtils_1.normalizeUrl)([tagsBaseRoutePath, permalink]);
}
function normalizeInlineTag(tagsBaseRoutePath, frontMatterTag) {
    function toTagObject(tagString) {
        return {
            inline: true,
            label: tagString,
            permalink: lodash_1.default.kebabCase(tagString),
            description: undefined,
        };
    }
    const tag = typeof frontMatterTag === 'string'
        ? toTagObject(frontMatterTag)
        : { ...frontMatterTag, description: frontMatterTag.description };
    return {
        inline: true,
        label: tag.label,
        permalink: normalizeTagPermalink({
            permalink: tag.permalink,
            tagsBaseRoutePath,
        }),
        description: tag.description,
    };
}
function normalizeTag({ tag, tagsFile, tagsBaseRoutePath, }) {
    if (typeof tag === 'string') {
        const tagDescription = tagsFile?.[tag];
        if (tagDescription) {
            // pre-defined tag from tags.yml
            return {
                inline: false,
                label: tagDescription.label,
                permalink: normalizeTagPermalink({
                    permalink: tagDescription.permalink,
                    tagsBaseRoutePath,
                }),
                description: tagDescription.description,
            };
        }
    }
    // legacy inline tag object, always inline, unknown because isn't a string
    return normalizeInlineTag(tagsBaseRoutePath, tag);
}
function normalizeTags({ options, source, frontMatterTags, tagsBaseRoutePath, tagsFile, }) {
    const tags = (frontMatterTags ?? []).map((tag) => normalizeTag({ tag, tagsBaseRoutePath, tagsFile }));
    if (tagsFile !== null) {
        reportInlineTags({ tags, source, options });
    }
    return tags;
}
function reportInlineTags({ tags, source, options, }) {
    if (options.onInlineTags === 'ignore') {
        return;
    }
    const inlineTags = tags.filter((tag) => tag.inline);
    if (inlineTags.length > 0) {
        const uniqueUnknownTags = [...new Set(inlineTags.map((tag) => tag.label))];
        const tagListString = uniqueUnknownTags.join(', ');
        logger_1.default.report(options.onInlineTags)(`Tags [${tagListString}] used in ${source} are not defined in ${options.tags ?? 'tags.yml'}`);
    }
}
/**
 * Permits to group docs/blog posts by tag (provided by front matter).
 *
 * @returns a map from tag permalink to the items and other relevant tag data.
 * The record is indexed by permalink, because routes must be unique in the end.
 * Labels may vary on 2 MD files but they are normalized. Docs with
 * label='some label' and label='some-label' should end up in the same page.
 */
function groupTaggedItems(items, 
/**
 * A callback telling me how to get the tags list of the current item. Usually
 * simply getting it from some metadata of the current item.
 */
getItemTags) {
    const result = {};
    items.forEach((item) => {
        getItemTags(item).forEach((tag) => {
            var _a;
            // Init missing tag groups
            // TODO: it's not really clear what should be the behavior if 2 tags have
            // the same permalink but the label is different for each
            // For now, the first tag found wins
            result[_a = tag.permalink] ?? (result[_a] = {
                tag,
                items: [],
            });
            // Add item to group
            result[tag.permalink].items.push(item);
        });
    });
    // If user add twice the same tag to a md doc (weird but possible),
    // we don't want the item to appear twice in the list...
    Object.values(result).forEach((group) => {
        group.items = lodash_1.default.uniq(group.items);
    });
    return result;
}
/**
 * Permits to get the "tag visibility" (hard to find a better name)
 * IE, is this tag listed or unlisted
 * And which items should be listed when this tag is browsed
 */
function getTagVisibility({ items, isUnlisted, }) {
    const allItemsUnlisted = items.every(isUnlisted);
    // When a tag is full of unlisted items, we display all the items
    // when tag is browsed, but we mark the tag as unlisted
    if (allItemsUnlisted) {
        return { unlisted: true, listedItems: items };
    }
    // When a tag has some listed items, the tag remains listed
    // but we filter its unlisted items
    return {
        unlisted: false,
        listedItems: items.filter((item) => !isUnlisted(item)),
    };
}
//# sourceMappingURL=tags.js.map