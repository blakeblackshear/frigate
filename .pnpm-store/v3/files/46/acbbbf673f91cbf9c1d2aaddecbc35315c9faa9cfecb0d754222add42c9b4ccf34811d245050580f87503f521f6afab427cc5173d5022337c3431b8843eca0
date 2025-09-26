"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalSSGResult = createGlobalSSGResult;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
function printSSGWarnings(results) {
    // Escape hatch because SWC is quite aggressive to report errors
    // See https://github.com/facebook/docusaurus/pull/10554
    // See https://github.com/swc-project/swc/discussions/9616#discussioncomment-10846201
    if (process.env.DOCUSAURUS_IGNORE_SSG_WARNINGS === 'true') {
        return;
    }
    const ignoredWarnings = [
        // TODO Docusaurus v4: remove with React 19 upgrade
        //  React 18 emit NULL chars, and minifier detects it
        //  see https://github.com/facebook/docusaurus/issues/9985
        'Unexpected null character',
    ];
    const keepWarning = (warning) => {
        return !ignoredWarnings.some((iw) => warning.includes(iw));
    };
    const resultsWithWarnings = results
        .map((success) => {
        return {
            ...success,
            warnings: success.result.warnings.filter(keepWarning),
        };
    })
        .filter((result) => result.warnings.length > 0);
    if (resultsWithWarnings.length) {
        const message = `Docusaurus static site generation process emitted warnings for ${resultsWithWarnings.length} path${resultsWithWarnings.length ? 's' : ''}
This is non-critical and can be disabled with DOCUSAURUS_IGNORE_SSG_WARNINGS=true
Troubleshooting guide: https://github.com/facebook/docusaurus/discussions/10580

- ${resultsWithWarnings
            .map((result) => `${logger_1.default.path(result.pathname)}:
  - ${result.warnings.join('\n  - ')}
`)
            .join('\n- ')}`;
        logger_1.default.warn(message);
    }
}
function throwSSGError(ssgErrors) {
    const message = `Docusaurus static site generation failed for ${ssgErrors.length} path${ssgErrors.length ? 's' : ''}:\n- ${ssgErrors
        .map((ssgError) => logger_1.default.path(ssgError.pathname))
        .join('\n- ')}`;
    // Note logging this error properly require using inspect(error,{depth})
    // See https://github.com/nodejs/node/issues/51637
    throw new Error(message, {
        cause: new AggregateError(ssgErrors.map((ssgError) => ssgError.error)),
    });
}
async function createGlobalSSGResult(ssgResults) {
    const [ssgSuccesses, ssgErrors] = lodash_1.default.partition(ssgResults, (result) => result.success);
    // For now, only success results emit warnings
    // For errors, we throw without warnings
    printSSGWarnings(ssgSuccesses);
    if (ssgErrors.length > 0) {
        throwSSGError(ssgErrors);
    }
    // If we only have SSG successes, we can consolidate those in a single result
    const collectedData = lodash_1.default.chain(ssgSuccesses)
        .keyBy((success) => success.pathname)
        .mapValues((ssgSuccess) => ssgSuccess.result.collectedData)
        .value();
    return { collectedData };
}
