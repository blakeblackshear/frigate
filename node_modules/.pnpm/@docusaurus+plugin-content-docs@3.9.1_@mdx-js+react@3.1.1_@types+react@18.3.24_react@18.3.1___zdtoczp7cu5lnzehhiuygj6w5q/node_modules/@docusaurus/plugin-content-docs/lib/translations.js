"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoadedContentTranslationFiles = getLoadedContentTranslationFiles;
exports.translateLoadedContent = translateLoadedContent;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const constants_1 = require("./constants");
const utils_2 = require("./sidebars/utils");
function getVersionFileName(versionName) {
    if (versionName === constants_1.CURRENT_VERSION_NAME) {
        return versionName;
    }
    // I don't like this "version-" prefix,
    // but it's for consistency with site/versioned_docs
    return `version-${versionName}`;
}
function ensureNoSidebarDuplicateEntries(translationEntries) {
    const grouped = lodash_1.default.groupBy(translationEntries, (entry) => entry[0]);
    const duplicates = Object.entries(grouped).filter((entry) => entry[1].length > 1);
    if (duplicates.length > 0) {
        throw new Error(`Multiple docs sidebar items produce the same translation key.
- ${duplicates
            .map(([translationKey, entries]) => {
            return `${logger_1.default.code(translationKey)}: ${logger_1.default.num(entries.length)} duplicates found:\n  - ${entries
                .map((duplicate) => {
                const desc = duplicate[1].description;
                return `${logger_1.default.name(duplicate[1].message)} ${desc ? `(${logger_1.default.subdue(desc)})` : ''}`;
            })
                .join('\n  - ')}`;
        })
            .join('\n\n- ')}

To avoid translation key conflicts, use the ${logger_1.default.code('key')} attribute on the sidebar items above to uniquely identify them.
    `);
    }
}
function getSidebarTranslationFileContent(sidebar, sidebarName) {
    const categories = (0, utils_2.collectSidebarCategories)(sidebar);
    const categoryEntries = categories.flatMap((category) => {
        const entries = [];
        const categoryKey = category.key ?? category.label;
        entries.push([
            `sidebar.${sidebarName}.category.${categoryKey}`,
            {
                message: category.label,
                description: `The label for category ${category.label} in sidebar ${sidebarName}`,
            },
        ]);
        if (category.link?.type === 'generated-index') {
            if (category.link.title) {
                entries.push([
                    `sidebar.${sidebarName}.category.${categoryKey}.link.generated-index.title`,
                    {
                        message: category.link.title,
                        description: `The generated-index page title for category ${category.label} in sidebar ${sidebarName}`,
                    },
                ]);
            }
            if (category.link.description) {
                entries.push([
                    `sidebar.${sidebarName}.category.${categoryKey}.link.generated-index.description`,
                    {
                        message: category.link.description,
                        description: `The generated-index page description for category ${category.label} in sidebar ${sidebarName}`,
                    },
                ]);
            }
        }
        return entries;
    });
    const links = (0, utils_2.collectSidebarLinks)(sidebar);
    const linksEntries = links.map((link) => {
        const linkKey = link.key ?? link.label;
        return [
            `sidebar.${sidebarName}.link.${linkKey}`,
            {
                message: link.label,
                description: `The label for link ${link.label} in sidebar ${sidebarName}, linking to ${link.href}`,
            },
        ];
    });
    const docs = (0, utils_2.collectSidebarDocItems)(sidebar)
        .concat((0, utils_2.collectSidebarRefs)(sidebar))
        .filter((item) => item.translatable);
    const docLinksEntries = docs.map((doc) => {
        const docKey = doc.key ?? doc.label;
        return [
            `sidebar.${sidebarName}.doc.${docKey}`,
            {
                message: doc.label,
                description: `The label for the doc item ${doc.label} in sidebar ${sidebarName}, linking to the doc ${doc.id}`,
            },
        ];
    });
    const allEntries = [...categoryEntries, ...linksEntries, ...docLinksEntries];
    ensureNoSidebarDuplicateEntries(allEntries);
    return Object.fromEntries(allEntries);
}
function translateSidebar({ sidebar, sidebarName, sidebarsTranslations, }) {
    function transformSidebarCategoryLink(category) {
        if (!category.link) {
            return undefined;
        }
        if (category.link.type === 'generated-index') {
            const title = sidebarsTranslations[`sidebar.${sidebarName}.category.${category.label}.link.generated-index.title`]?.message ?? category.link.title;
            const description = sidebarsTranslations[`sidebar.${sidebarName}.category.${category.label}.link.generated-index.description`]?.message ?? category.link.description;
            return {
                ...category.link,
                title,
                description,
            };
        }
        return category.link;
    }
    return (0, utils_2.transformSidebarItems)(sidebar, (item) => {
        if (item.type === 'category') {
            const link = transformSidebarCategoryLink(item);
            const categoryKey = item.key ?? item.label;
            return {
                ...item,
                label: sidebarsTranslations[`sidebar.${sidebarName}.category.${categoryKey}`]
                    ?.message ?? item.label,
                ...(link && { link }),
            };
        }
        if (item.type === 'link') {
            const linkKey = item.key ?? item.label;
            return {
                ...item,
                label: sidebarsTranslations[`sidebar.${sidebarName}.link.${linkKey}`]
                    ?.message ?? item.label,
            };
        }
        if ((item.type === 'doc' || item.type === 'ref') && item.translatable) {
            const docKey = item.key ?? item.label;
            return {
                ...item,
                label: sidebarsTranslations[`sidebar.${sidebarName}.doc.${docKey}`]
                    ?.message ?? item.label,
            };
        }
        return item;
    });
}
function getSidebarsTranslations(version) {
    return (0, utils_1.mergeTranslations)(Object.entries(version.sidebars).map(([sidebarName, sidebar]) => getSidebarTranslationFileContent(sidebar, sidebarName)));
}
function translateSidebars(version, sidebarsTranslations) {
    return lodash_1.default.mapValues(version.sidebars, (sidebar, sidebarName) => translateSidebar({
        sidebar,
        sidebarName,
        sidebarsTranslations,
    }));
}
function getVersionTranslationFiles(version) {
    const versionTranslations = {
        'version.label': {
            message: version.label,
            description: `The label for version ${version.versionName}`,
        },
    };
    const sidebarsTranslations = getSidebarsTranslations(version);
    return [
        {
            path: getVersionFileName(version.versionName),
            content: (0, utils_1.mergeTranslations)([versionTranslations, sidebarsTranslations]),
        },
    ];
}
function translateVersion(version, translationFiles) {
    const versionTranslations = translationFiles[getVersionFileName(version.versionName)].content;
    return {
        ...version,
        label: versionTranslations['version.label']?.message ?? version.label,
        sidebars: translateSidebars(version, versionTranslations),
    };
}
function getVersionsTranslationFiles(versions) {
    return versions.flatMap(getVersionTranslationFiles);
}
function translateVersions(versions, translationFiles) {
    return versions.map((version) => translateVersion(version, translationFiles));
}
function getLoadedContentTranslationFiles(loadedContent) {
    return getVersionsTranslationFiles(loadedContent.loadedVersions);
}
function translateLoadedContent(loadedContent, translationFiles) {
    const translationFilesMap = lodash_1.default.keyBy(translationFiles, (f) => f.path);
    return {
        loadedVersions: translateVersions(loadedContent.loadedVersions, translationFilesMap),
    };
}
