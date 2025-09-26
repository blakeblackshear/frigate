"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileNotTrackedError = exports.GitNotFoundError = void 0;
exports.getFileCommitDate = getFileCommitDate;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const os_1 = tslib_1.__importDefault(require("os"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const execa_1 = tslib_1.__importDefault(require("execa"));
const p_queue_1 = tslib_1.__importDefault(require("p-queue"));
// Quite high/conservative concurrency value (it was previously "Infinity")
// See https://github.com/facebook/docusaurus/pull/10915
const DefaultGitCommandConcurrency = 
// TODO Docusaurus v4: bump node, availableParallelism() now always exists
(typeof os_1.default.availableParallelism === 'function'
    ? os_1.default.availableParallelism()
    : os_1.default.cpus().length) * 4;
const GitCommandConcurrencyEnv = process.env.DOCUSAURUS_GIT_COMMAND_CONCURRENCY
    ? parseInt(process.env.DOCUSAURUS_GIT_COMMAND_CONCURRENCY, 10)
    : undefined;
const GitCommandConcurrency = GitCommandConcurrencyEnv && GitCommandConcurrencyEnv > 0
    ? GitCommandConcurrencyEnv
    : DefaultGitCommandConcurrency;
// We use a queue to avoid running too many concurrent Git commands at once
// See https://github.com/facebook/docusaurus/issues/10348
const GitCommandQueue = new p_queue_1.default({
    concurrency: GitCommandConcurrency,
});
const realHasGitFn = () => {
    try {
        return execa_1.default.sync('git', ['--version']).exitCode === 0;
    }
    catch (error) {
        return false;
    }
};
// The hasGit call is synchronous IO so we memoize it
// The user won't install Git in the middle of a build anyway...
const hasGit = process.env.NODE_ENV === 'test' ? realHasGitFn : lodash_1.default.memoize(realHasGitFn);
/** Custom error thrown when git is not found in `PATH`. */
class GitNotFoundError extends Error {
}
exports.GitNotFoundError = GitNotFoundError;
/** Custom error thrown when the current file is not tracked by git. */
class FileNotTrackedError extends Error {
}
exports.FileNotTrackedError = FileNotTrackedError;
async function getFileCommitDate(file, { age = 'oldest', includeAuthor = false, }) {
    if (!hasGit()) {
        throw new GitNotFoundError(`Failed to retrieve git history for "${file}" because git is not installed.`);
    }
    if (!(await fs_extra_1.default.pathExists(file))) {
        throw new Error(`Failed to retrieve git history for "${file}" because the file does not exist.`);
    }
    // We add a "RESULT:" prefix to make parsing easier
    // See why: https://github.com/facebook/docusaurus/pull/10022
    const resultFormat = includeAuthor ? 'RESULT:%ct,%an' : 'RESULT:%ct';
    const args = [
        `--format=${resultFormat}`,
        '--max-count=1',
        age === 'oldest' ? '--follow --diff-filter=A' : undefined,
    ]
        .filter(Boolean)
        .join(' ');
    const command = `git -c log.showSignature=false log ${args} -- "${path_1.default.basename(file)}"`;
    const result = (await GitCommandQueue.add(() => {
        return (0, execa_1.default)(command, {
            cwd: path_1.default.dirname(file),
            shell: true,
        });
    }));
    if (result.exitCode !== 0) {
        throw new Error(`Failed to retrieve the git history for file "${file}" with exit code ${result.exitCode}: ${result.stderr}`);
    }
    // We only parse the output line starting with our "RESULT:" prefix
    // See why https://github.com/facebook/docusaurus/pull/10022
    const regex = includeAuthor
        ? /(?:^|\n)RESULT:(?<timestamp>\d+),(?<author>.+)(?:$|\n)/
        : /(?:^|\n)RESULT:(?<timestamp>\d+)(?:$|\n)/;
    const output = result.stdout.trim();
    if (!output) {
        throw new FileNotTrackedError(`Failed to retrieve the git history for file "${file}" because the file is not tracked by git.`);
    }
    const match = output.match(regex);
    if (!match) {
        throw new Error(`Failed to retrieve the git history for file "${file}" with unexpected output: ${output}`);
    }
    const timestampInSeconds = Number(match.groups.timestamp);
    const timestamp = timestampInSeconds * 1000;
    const date = new Date(timestamp);
    if (includeAuthor) {
        return { date, timestamp, author: match.groups.author };
    }
    return { date, timestamp };
}
//# sourceMappingURL=gitUtils.js.map