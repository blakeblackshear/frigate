export type InputFileSystem = import("webpack").Compilation["inputFileSystem"];
export type Stats = import("fs").Stats;
export type Task<T> = () => Promise<T>;
/** @typedef {import("webpack").Compilation["inputFileSystem"] } InputFileSystem */
/** @typedef {import("fs").Stats } Stats */
/**
 * @param {InputFileSystem} inputFileSystem
 * @param {string} path
 * @return {Promise<undefined | Stats>}
 */
export function stat(
  inputFileSystem: InputFileSystem,
  path: string
): Promise<undefined | Stats>;
/**
 * @param {InputFileSystem} inputFileSystem
 * @param {string} path
 * @return {Promise<string | Buffer>}
 */
export function readFile(
  inputFileSystem: InputFileSystem,
  path: string
): Promise<string | Buffer>;
/**
 * @template T
 * @typedef {() => Promise<T>} Task
 */
/**
 * Run tasks with limited concurency.
 * @template T
 * @param {number} limit - Limit of tasks that run at once.
 * @param {Task<T>[]} tasks - List of tasks to run.
 * @returns {Promise<T[]>} A promise that fulfills to an array of the results
 */
export function throttleAll<T>(limit: number, tasks: Task<T>[]): Promise<T[]>;
