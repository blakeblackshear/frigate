"use strict";

const crypto = require("node:crypto");

/** @typedef {import("fs").Stats} Stats */
/** @typedef {import("fs").ReadStream} ReadStream */

/**
 * Generate a tag for a stat.
 * @param {Stats} stats stats
 * @returns {{ hash: string, buffer?: Buffer }} etag
 */
function statTag(stats) {
  const mtime = stats.mtime.getTime().toString(16);
  const size = stats.size.toString(16);
  return {
    hash: `W/"${size}-${mtime}"`
  };
}

/**
 * Generate an entity tag.
 * @param {Buffer | ReadStream} entity entity
 * @returns {Promise<{ hash: string, buffer?: Buffer }>} etag
 */
async function entityTag(entity) {
  const sha1 = crypto.createHash("sha1");
  if (!Buffer.isBuffer(entity)) {
    let byteLength = 0;

    /** @type {Buffer[]} */
    const buffers = [];
    await new Promise((resolve, reject) => {
      entity.on("data", chunk => {
        sha1.update(chunk);
        buffers.push(/** @type {Buffer} */chunk);
        byteLength += /** @type {Buffer} */chunk.byteLength;
      }).on("end", () => {
        resolve(sha1);
      }).on("error", reject);
    });
    return {
      buffer: Buffer.concat(buffers),
      hash: `"${byteLength.toString(16)}-${sha1.digest("base64").slice(0, 27)}"`
    };
  }
  if (entity.byteLength === 0) {
    // Fast-path empty
    return {
      hash: '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"'
    };
  }

  // Compute hash of entity
  const hash = sha1.update(entity).digest("base64").slice(0, 27);

  // Compute length of entity
  const {
    byteLength
  } = entity;
  return {
    hash: `"${byteLength.toString(16)}-${hash}"`
  };
}

/**
 * Create a simple ETag.
 * @param {Buffer | ReadStream | Stats} entity entity
 * @returns {Promise<{ hash: string, buffer?: Buffer }>} etag
 */
async function etag(entity) {
  const isStrong = Buffer.isBuffer(entity) || typeof (/** @type {ReadStream} */entity.pipe) === "function";
  return isStrong ? entityTag(/** @type {Buffer | ReadStream} */entity) : statTag(/** @type {import("fs").Stats} */entity);
}
module.exports = etag;