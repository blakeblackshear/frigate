"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleSitemapAndIndex = void 0;
const sitemap_index_stream_1 = require("./sitemap-index-stream");
const sitemap_stream_1 = require("./sitemap-stream");
const utils_1 = require("./utils");
const zlib_1 = require("zlib");
const fs_1 = require("fs");
const path_1 = require("path");
const stream_1 = require("stream");
const util_1 = require("util");
const url_1 = require("url");
const pipeline = (0, util_1.promisify)(stream_1.pipeline);
/**
 *
 * @param {object} options -
 * @param {string} options.hostname - The hostname for all URLs
 * @param {string} [options.sitemapHostname] - The hostname for the sitemaps if different than hostname
 * @param {SitemapItemLoose[] | string | Readable | string[]} options.sourceData - The urls you want to make a sitemap out of.
 * @param {string} options.destinationDir - where to write the sitemaps and index
 * @param {string} [options.publicBasePath] - where the sitemaps are relative to the hostname. Defaults to root.
 * @param {number} [options.limit] - how many URLs to write before switching to a new file. Defaults to 50k
 * @param {boolean} [options.gzip] - whether to compress the written files. Defaults to true
 * @returns {Promise<void>} an empty promise that resolves when everything is done
 */
const simpleSitemapAndIndex = async ({ hostname, sitemapHostname = hostname, // if different
/**
 * Pass a line separated list of sitemap items or a stream or an array
 */
sourceData, destinationDir, limit = 50000, gzip = true, publicBasePath = './', }) => {
    await fs_1.promises.mkdir(destinationDir, { recursive: true });
    const sitemapAndIndexStream = new sitemap_index_stream_1.SitemapAndIndexStream({
        limit,
        getSitemapStream: (i) => {
            const sitemapStream = new sitemap_stream_1.SitemapStream({
                hostname,
            });
            const path = `./sitemap-${i}.xml`;
            const writePath = (0, path_1.resolve)(destinationDir, path + (gzip ? '.gz' : ''));
            if (!publicBasePath.endsWith('/')) {
                publicBasePath += '/';
            }
            const publicPath = (0, path_1.normalize)(publicBasePath + path);
            let pipeline;
            if (gzip) {
                pipeline = sitemapStream
                    .pipe((0, zlib_1.createGzip)()) // compress the output of the sitemap
                    .pipe((0, fs_1.createWriteStream)(writePath)); // write it to sitemap-NUMBER.xml
            }
            else {
                pipeline = sitemapStream.pipe((0, fs_1.createWriteStream)(writePath)); // write it to sitemap-NUMBER.xml
            }
            return [
                new url_1.URL(`${publicPath}${gzip ? '.gz' : ''}`, sitemapHostname).toString(),
                sitemapStream,
                pipeline,
            ];
        },
    });
    let src;
    if (typeof sourceData === 'string') {
        src = (0, utils_1.lineSeparatedURLsToSitemapOptions)((0, fs_1.createReadStream)(sourceData));
    }
    else if (sourceData instanceof stream_1.Readable) {
        src = sourceData;
    }
    else if (Array.isArray(sourceData)) {
        src = stream_1.Readable.from(sourceData);
    }
    else {
        throw new Error("unhandled source type. You've passed in data that is not supported");
    }
    const writePath = (0, path_1.resolve)(destinationDir, `./sitemap-index.xml${gzip ? '.gz' : ''}`);
    if (gzip) {
        return pipeline(src, sitemapAndIndexStream, (0, zlib_1.createGzip)(), (0, fs_1.createWriteStream)(writePath));
    }
    else {
        return pipeline(src, sitemapAndIndexStream, (0, fs_1.createWriteStream)(writePath));
    }
};
exports.simpleSitemapAndIndex = simpleSitemapAndIndex;
exports.default = exports.simpleSitemapAndIndex;
