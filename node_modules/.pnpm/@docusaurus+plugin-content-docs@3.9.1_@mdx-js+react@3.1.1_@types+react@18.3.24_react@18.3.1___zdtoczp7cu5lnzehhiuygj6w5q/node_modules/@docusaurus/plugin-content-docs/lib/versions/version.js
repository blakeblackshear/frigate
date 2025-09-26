"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultVersionBanner = getDefaultVersionBanner;
exports.getVersionBanner = getVersionBanner;
exports.getVersionBadge = getVersionBadge;
exports.getVersionNoIndex = getVersionNoIndex;
exports.filterVersions = filterVersions;
exports.readVersionsMetadata = readVersionsMetadata;
exports.toFullVersion = toFullVersion;
exports.getVersionFromSourceFilePath = getVersionFromSourceFilePath;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const constants_1 = require("../constants");
const validation_1 = require("./validation");
const files_1 = require("./files");
const utils_2 = require("../sidebars/utils");
const categoryGeneratedIndex_1 = require("../categoryGeneratedIndex");
function getVersionEditUrls({ contentPath, contentPathLocalized, context, options, }) {
    // If the user is using the functional form of editUrl,
    // she has total freedom and we can't compute a "version edit url"
    if (!options.editUrl || typeof options.editUrl === 'function') {
        return { editUrl: undefined, editUrlLocalized: undefined };
    }
    // Intermediate var just to please TS not narrowing to "string"
    const editUrlOption = options.editUrl;
    const getEditUrl = () => {
        const editDirPath = options.editCurrentVersion ? options.path : contentPath;
        return (0, utils_1.normalizeUrl)([
            editUrlOption,
            (0, utils_1.posixPath)(path_1.default.relative(context.siteDir, path_1.default.resolve(context.siteDir, editDirPath))),
        ]);
    };
    const getEditUrlLocalized = () => {
        if (!contentPathLocalized) {
            return undefined;
        }
        const editDirPathLocalized = options.editCurrentVersion
            ? (0, files_1.getDocsDirPathLocalized)({
                localizationDir: context.localizationDir,
                versionName: constants_1.CURRENT_VERSION_NAME,
                pluginId: options.id,
            })
            : contentPathLocalized;
        return (0, utils_1.normalizeUrl)([
            editUrlOption,
            (0, utils_1.posixPath)(path_1.default.relative(context.siteDir, path_1.default.resolve(context.siteDir, editDirPathLocalized))),
        ]);
    };
    return { editUrl: getEditUrl(), editUrlLocalized: getEditUrlLocalized() };
}
/**
 * The default version banner depends on the version's relative position to the
 * latest version. More recent ones are "unreleased", and older ones are
 * "unmaintained".
 */
function getDefaultVersionBanner({ versionName, versionNames, lastVersionName, }) {
    // Current version: good, no banner
    if (versionName === lastVersionName) {
        return null;
    }
    // Upcoming versions: unreleased banner
    if (versionNames.indexOf(versionName) < versionNames.indexOf(lastVersionName)) {
        return 'unreleased';
    }
    // Older versions: display unmaintained banner
    return 'unmaintained';
}
function getVersionBanner(context) {
    const { versionName, options } = context;
    const versionBannerOption = options.versions[versionName]?.banner;
    if (versionBannerOption) {
        return versionBannerOption === 'none' ? null : versionBannerOption;
    }
    return getDefaultVersionBanner(context);
}
function getVersionBadge({ versionName, versionNames, options, }) {
    // If site is not versioned or only one version is included
    // we don't show the version badge by default
    // See https://github.com/facebook/docusaurus/issues/3362
    const defaultVersionBadge = versionNames.length !== 1;
    return options.versions[versionName]?.badge ?? defaultVersionBadge;
}
function getVersionNoIndex({ versionName, options, }) {
    return options.versions[versionName]?.noIndex ?? false;
}
function getVersionClassName({ versionName, options, }) {
    const defaultVersionClassName = `docs-version-${versionName}`;
    return options.versions[versionName]?.className ?? defaultVersionClassName;
}
function getVersionLabel({ versionName, options, }) {
    const defaultVersionLabel = versionName === constants_1.CURRENT_VERSION_NAME ? 'Next' : versionName;
    return options.versions[versionName]?.label ?? defaultVersionLabel;
}
function getVersionPathPart({ versionName, options, lastVersionName, }) {
    function getDefaultVersionPathPart() {
        if (versionName === lastVersionName) {
            return '';
        }
        return versionName === constants_1.CURRENT_VERSION_NAME ? 'next' : versionName;
    }
    return options.versions[versionName]?.path ?? getDefaultVersionPathPart();
}
async function createVersionMetadata(context) {
    const { versionName, lastVersionName, options, context: loadContext } = context;
    const { sidebarFilePath, contentPath, contentPathLocalized } = await (0, files_1.getVersionMetadataPaths)(context);
    const versionPathPart = getVersionPathPart(context);
    const routePath = (0, utils_1.normalizeUrl)([
        loadContext.baseUrl,
        options.routeBasePath,
        versionPathPart,
    ]);
    const versionEditUrls = getVersionEditUrls({
        contentPath,
        contentPathLocalized,
        context: loadContext,
        options,
    });
    return {
        versionName,
        label: getVersionLabel(context),
        banner: getVersionBanner(context),
        badge: getVersionBadge(context),
        noIndex: getVersionNoIndex(context),
        className: getVersionClassName(context),
        path: routePath,
        tagsPath: (0, utils_1.normalizeUrl)([routePath, options.tagsBasePath]),
        ...versionEditUrls,
        isLast: versionName === lastVersionName,
        routePriority: versionPathPart === '' ? -1 : undefined,
        sidebarFilePath,
        contentPath,
        contentPathLocalized,
    };
}
/**
 * Filter versions according to provided options (i.e. `onlyIncludeVersions`).
 *
 * Note: we preserve the order in which versions are provided; the order of the
 * `onlyIncludeVersions` array does not matter
 */
function filterVersions(versionNamesUnfiltered, options) {
    if (options.onlyIncludeVersions) {
        return versionNamesUnfiltered.filter((name) => options.onlyIncludeVersions.includes(name));
    }
    return versionNamesUnfiltered;
}
function getLastVersionName({ versionNames, options, }) {
    return (options.lastVersion ??
        versionNames.find((name) => name !== constants_1.CURRENT_VERSION_NAME) ??
        constants_1.CURRENT_VERSION_NAME);
}
async function readVersionsMetadata({ context, options, }) {
    const allVersionNames = await (0, files_1.readVersionNames)(context.siteDir, options);
    (0, validation_1.validateVersionsOptions)(allVersionNames, options);
    const versionNames = filterVersions(allVersionNames, options);
    const lastVersionName = getLastVersionName({ versionNames, options });
    return Promise.all(versionNames.map((versionName) => createVersionMetadata({
        versionName,
        versionNames,
        lastVersionName,
        context,
        options,
    })));
}
function toFullVersion(version) {
    const sidebarsUtils = (0, utils_2.createSidebarsUtils)(version.sidebars);
    return {
        ...version,
        sidebarsUtils,
        categoryGeneratedIndices: (0, categoryGeneratedIndex_1.getCategoryGeneratedIndexMetadataList)({
            docs: version.docs,
            sidebarsUtils,
        }),
    };
}
function getVersionFromSourceFilePath(filePath, versionsMetadata) {
    const versionFound = versionsMetadata.find((version) => (0, utils_1.getContentPathList)(version).some((docsDirPath) => filePath.startsWith(docsDirPath)));
    if (!versionFound) {
        throw new Error(`Unexpected error: file at "${filePath}" does not belong to any docs version!`);
    }
    return versionFound;
}
