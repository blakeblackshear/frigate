/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/** Custom error thrown when git is not found in `PATH`. */
export declare class GitNotFoundError extends Error {
}
/** Custom error thrown when the current file is not tracked by git. */
export declare class FileNotTrackedError extends Error {
}
/**
 * Fetches the git history of a file and returns a relevant commit date.
 * It gets the commit date instead of author date so that amended commits
 * can have their dates updated.
 *
 * @throws {@link GitNotFoundError} If git is not found in `PATH`.
 * @throws {@link FileNotTrackedError} If the current file is not tracked by git.
 * @throws Also throws when `git log` exited with non-zero, or when it outputs
 * unexpected text.
 */
export declare function getFileCommitDate(
/** Absolute path to the file. */
file: string, args: {
    /**
     * `"oldest"` is the commit that added the file, following renames;
     * `"newest"` is the last commit that edited the file.
     */
    age?: 'oldest' | 'newest';
    /** Use `includeAuthor: true` to get the author information as well. */
    includeAuthor?: false;
}): Promise<{
    /** Relevant commit date. */
    date: Date;
    /** Timestamp returned from git, converted to **milliseconds**. */
    timestamp: number;
}>;
/**
 * Fetches the git history of a file and returns a relevant commit date.
 * It gets the commit date instead of author date so that amended commits
 * can have their dates updated.
 *
 * @throws {@link GitNotFoundError} If git is not found in `PATH`.
 * @throws {@link FileNotTrackedError} If the current file is not tracked by git.
 * @throws Also throws when `git log` exited with non-zero, or when it outputs
 * unexpected text.
 */
export declare function getFileCommitDate(
/** Absolute path to the file. */
file: string, args: {
    /**
     * `"oldest"` is the commit that added the file, following renames;
     * `"newest"` is the last commit that edited the file.
     */
    age?: 'oldest' | 'newest';
    includeAuthor: true;
}): Promise<{
    /** Relevant commit date. */
    date: Date;
    /** Timestamp returned from git, converted to **milliseconds**. */
    timestamp: number;
    /** The author's name, as returned from git. */
    author: string;
}>;
//# sourceMappingURL=gitUtils.d.ts.map