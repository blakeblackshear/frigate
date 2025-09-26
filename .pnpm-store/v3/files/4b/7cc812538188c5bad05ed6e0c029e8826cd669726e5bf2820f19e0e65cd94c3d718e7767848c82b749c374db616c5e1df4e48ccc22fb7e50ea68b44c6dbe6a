"use strict";

/** @typedef {import("webpack").Compilation["inputFileSystem"] } InputFileSystem */

/** @typedef {import("fs").Stats } Stats */

/**
 * @param {InputFileSystem} inputFileSystem
 * @param {string} path
 * @return {Promise<undefined | Stats>}
 */
function stat(inputFileSystem, path) {
  return new Promise((resolve, reject) => {
    inputFileSystem.stat(path,
    /**
     * @param {null | undefined | NodeJS.ErrnoException} err
     * @param {undefined | Stats} stats
     */
    // @ts-ignore
    (err, stats) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(stats);
    });
  });
}
/**
 * @param {InputFileSystem} inputFileSystem
 * @param {string} path
 * @return {Promise<string | Buffer>}
 */


function readFile(inputFileSystem, path) {
  return new Promise((resolve, reject) => {
    inputFileSystem.readFile(path,
    /**
     * @param {null | undefined | NodeJS.ErrnoException} err
     * @param {undefined | string | Buffer} data
     */
    (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(
      /** @type {string | Buffer} */
      data);
    });
  });
}

const notSettled = Symbol(`not-settled`);
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

function throttleAll(limit, tasks) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError(`Expected \`limit\` to be a finite number > 0, got \`${limit}\` (${typeof limit})`);
  }

  if (!Array.isArray(tasks) || !tasks.every(task => typeof task === `function`)) {
    throw new TypeError(`Expected \`tasks\` to be a list of functions returning a promise`);
  }

  return new Promise((resolve, reject) => {
    const result = Array(tasks.length).fill(notSettled);
    const entries = tasks.entries();

    const next = () => {
      const {
        done,
        value
      } = entries.next();

      if (done) {
        const isLast = !result.includes(notSettled);

        if (isLast) {
          resolve(
          /** @type{T[]} **/
          result);
        }

        return;
      }

      const [index, task] = value;
      /**
       * @param {T} x
       */

      const onFulfilled = x => {
        result[index] = x;
        next();
      };

      task().then(onFulfilled, reject);
    };

    Array(limit).fill(0).forEach(next);
  });
}

module.exports = {
  stat,
  readFile,
  throttleAll
};