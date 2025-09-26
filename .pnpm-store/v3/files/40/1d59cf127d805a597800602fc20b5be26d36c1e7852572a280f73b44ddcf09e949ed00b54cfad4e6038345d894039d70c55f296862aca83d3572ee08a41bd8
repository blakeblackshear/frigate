"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatStatsErrorMessage = formatStatsErrorMessage;
exports.printStatsWarnings = printStatsWarnings;
exports.compile = compile;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const formatWebpackMessages_1 = tslib_1.__importDefault(require("./legacy/formatWebpackMessages"));
function formatStatsErrorMessage(statsJson) {
    if (statsJson?.errors?.length) {
        // TODO formatWebpackMessages does not print stack-traces
        // Also the error causal chain is lost here
        // We log the stacktrace inside serverEntry.tsx for now (not ideal)
        const { errors } = (0, formatWebpackMessages_1.default)(statsJson);
        return errors
            .map((str) => logger_1.default.red(str))
            .join(`\n\n${logger_1.default.yellow('--------------------------')}\n\n`);
    }
    return undefined;
}
function printStatsWarnings(statsJson) {
    if (statsJson?.warnings?.length) {
        statsJson.warnings?.forEach((warning) => {
            logger_1.default.warn(warning);
        });
    }
}
function compile({ configs, currentBundler, }) {
    return new Promise((resolve, reject) => {
        const compiler = currentBundler.instance(configs);
        compiler.run((err, stats) => {
            if (err) {
                logger_1.default.error(err.stack ?? err);
                if (err.details) {
                    logger_1.default.error(err.details);
                }
                reject(err);
            }
            // Let plugins consume all the stats
            const errorsWarnings = stats?.toJson('errors-warnings');
            if (stats?.hasErrors()) {
                const statsErrorMessage = formatStatsErrorMessage(errorsWarnings);
                reject(new Error(`Failed to compile due to Webpack errors.\n${statsErrorMessage}`));
            }
            printStatsWarnings(errorsWarnings);
            // Webpack 5 requires calling close() so that persistent caching works
            // See https://github.com/webpack/webpack.js.org/pull/4775
            compiler.close((errClose) => {
                if (errClose) {
                    logger_1.default.error(`Error while closing Webpack compiler: ${errClose}`);
                    reject(errClose);
                }
                else {
                    resolve(stats);
                }
            });
        });
    });
}
//# sourceMappingURL=compiler.js.map