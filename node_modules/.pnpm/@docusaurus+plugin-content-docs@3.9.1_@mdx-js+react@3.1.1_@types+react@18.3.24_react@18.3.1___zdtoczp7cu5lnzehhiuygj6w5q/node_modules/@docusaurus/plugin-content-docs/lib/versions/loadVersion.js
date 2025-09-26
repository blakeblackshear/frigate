"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadVersion = loadVersion;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const docs_1 = require("../docs");
const sidebars_1 = require("../sidebars");
const utils_2 = require("../sidebars/utils");
function ensureNoDuplicateDocId(docs) {
    const duplicatesById = lodash_1.default.chain(docs)
        .sort((d1, d2) => {
        // Need to sort because Globby order is non-deterministic
        // TODO maybe we should create a deterministic glob utils?
        //  see https://github.com/sindresorhus/globby/issues/131
        return d1.source.localeCompare(d2.source);
    })
        .groupBy((d) => d.id)
        .pickBy((group) => group.length > 1)
        .value();
    const duplicateIdEntries = Object.entries(duplicatesById);
    if (duplicateIdEntries.length) {
        const idMessages = duplicateIdEntries
            .map(([id, duplicateDocs]) => {
            return logger_1.default.interpolate `- code=${id} found in number=${duplicateDocs.length} docs:
  - ${duplicateDocs
                .map((d) => (0, utils_1.aliasedSitePathToRelativePath)(d.source))
                .join('\n  - ')}`;
        })
            .join('\n\n');
        const message = `The docs plugin found docs sharing the same id:
\n${idMessages}\n
Docs should have distinct ids.
In case of conflict, you can rename the docs file, or use the ${logger_1.default.code('id')} front matter to assign an explicit distinct id to each doc.
    `;
        throw new Error(message);
    }
}
async function loadVersionDocsBase({ tagsFile, context, options, versionMetadata, env, }) {
    const docFiles = await (0, docs_1.readVersionDocs)(versionMetadata, options);
    if (docFiles.length === 0) {
        throw new Error(`Docs version "${versionMetadata.versionName}" has no docs! At least one doc should exist at "${path_1.default.relative(context.siteDir, versionMetadata.contentPath)}".`);
    }
    function processVersionDoc(docFile) {
        return (0, docs_1.processDocMetadata)({
            docFile,
            versionMetadata,
            context,
            options,
            env,
            tagsFile,
        });
    }
    const docs = await Promise.all(docFiles.map(processVersionDoc));
    ensureNoDuplicateDocId(docs);
    return docs;
}
async function doLoadVersion({ context, options, versionMetadata, env, }) {
    const tagsFile = await (0, utils_validation_1.getTagsFile)({
        contentPaths: versionMetadata,
        tags: options.tags,
    });
    const docsBase = await loadVersionDocsBase({
        tagsFile,
        context,
        options,
        versionMetadata,
        env,
    });
    // TODO we only ever need draftIds in further code, not full draft items
    // To simplify and prevent mistakes, avoid exposing draft
    // replace draft=>draftIds in content loaded
    const [drafts, docs] = lodash_1.default.partition(docsBase, (doc) => doc.draft);
    const sidebars = await (0, sidebars_1.loadSidebars)(versionMetadata.sidebarFilePath, {
        sidebarItemsGenerator: options.sidebarItemsGenerator,
        numberPrefixParser: options.numberPrefixParser,
        docs,
        drafts,
        version: versionMetadata,
        sidebarOptions: {
            sidebarCollapsed: options.sidebarCollapsed,
            sidebarCollapsible: options.sidebarCollapsible,
        },
        categoryLabelSlugger: (0, utils_1.createSlugger)(),
    });
    const sidebarsUtils = (0, utils_2.createSidebarsUtils)(sidebars);
    const docsById = (0, docs_1.createDocsByIdIndex)(docs);
    const allDocIds = Object.keys(docsById);
    sidebarsUtils.checkLegacyVersionedSidebarNames({
        sidebarFilePath: versionMetadata.sidebarFilePath,
        versionMetadata,
    });
    sidebarsUtils.checkSidebarsDocIds({
        allDocIds,
        sidebarFilePath: versionMetadata.sidebarFilePath,
        versionMetadata,
    });
    return {
        ...versionMetadata,
        docs: (0, docs_1.addDocNavigation)({
            docs,
            sidebarsUtils,
        }),
        drafts,
        sidebars,
    };
}
async function loadVersion(params) {
    try {
        return await doLoadVersion(params);
    }
    catch (err) {
        // TODO use error cause (but need to refactor many tests)
        logger_1.default.error `Loading of version failed for version name=${params.versionMetadata.versionName}`;
        throw err;
    }
}
