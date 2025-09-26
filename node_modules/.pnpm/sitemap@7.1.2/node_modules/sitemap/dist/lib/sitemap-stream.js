"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamToPromise = exports.SitemapStream = exports.closetag = exports.stylesheetInclude = void 0;
const stream_1 = require("stream");
const types_1 = require("./types");
const utils_1 = require("./utils");
const sitemap_item_stream_1 = require("./sitemap-item-stream");
const errors_1 = require("./errors");
const xmlDec = '<?xml version="1.0" encoding="UTF-8"?>';
const stylesheetInclude = (url) => {
    return `<?xml-stylesheet type="text/xsl" href="${url}"?>`;
};
exports.stylesheetInclude = stylesheetInclude;
const urlsetTagStart = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const getURLSetNs = ({ news, video, image, xhtml, custom }, xslURL) => {
    let ns = xmlDec;
    if (xslURL) {
        ns += (0, exports.stylesheetInclude)(xslURL);
    }
    ns += urlsetTagStart;
    if (news) {
        ns += ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
    }
    if (xhtml) {
        ns += ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
    }
    if (image) {
        ns += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    }
    if (video) {
        ns += ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
    }
    if (custom) {
        ns += ' ' + custom.join(' ');
    }
    return ns + '>';
};
exports.closetag = '</urlset>';
const defaultXMLNS = {
    news: true,
    xhtml: true,
    image: true,
    video: true,
};
const defaultStreamOpts = {
    xmlns: defaultXMLNS,
};
/**
 * A [Transform](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream)
 * for turning a
 * [Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams)
 * of either [SitemapItemOptions](#sitemap-item-options) or url strings into a
 * Sitemap. The readable stream it transforms **must** be in object mode.
 */
class SitemapStream extends stream_1.Transform {
    constructor(opts = defaultStreamOpts) {
        opts.objectMode = true;
        super(opts);
        this.hasHeadOutput = false;
        this.hostname = opts.hostname;
        this.level = opts.level || types_1.ErrorLevel.WARN;
        this.errorHandler = opts.errorHandler;
        this.smiStream = new sitemap_item_stream_1.SitemapItemStream({ level: opts.level });
        this.smiStream.on('data', (data) => this.push(data));
        this.lastmodDateOnly = opts.lastmodDateOnly || false;
        this.xmlNS = opts.xmlns || defaultXMLNS;
        this.xslUrl = opts.xslUrl;
    }
    _transform(item, encoding, callback) {
        if (!this.hasHeadOutput) {
            this.hasHeadOutput = true;
            this.push(getURLSetNs(this.xmlNS, this.xslUrl));
        }
        if (!this.smiStream.write((0, utils_1.validateSMIOptions)((0, utils_1.normalizeURL)(item, this.hostname, this.lastmodDateOnly), this.level, this.errorHandler))) {
            this.smiStream.once('drain', callback);
        }
        else {
            process.nextTick(callback);
        }
    }
    _flush(cb) {
        if (!this.hasHeadOutput) {
            cb(new errors_1.EmptySitemap());
        }
        else {
            this.push(exports.closetag);
            cb();
        }
    }
}
exports.SitemapStream = SitemapStream;
/**
 * Converts a readable stream into a promise that resolves with the concatenated data from the stream.
 *
 * The function listens for 'data' events from the stream, and when the stream ends, it resolves the promise with the concatenated data. If an error occurs while reading from the stream, the promise is rejected with the error.
 *
 * ⚠️ CAUTION: This function should not generally be used in production / when writing to files as it holds a copy of the entire file contents in memory until finished.
 *
 * @param {Readable} stream - The readable stream to convert to a promise.
 * @returns {Promise<Buffer>} A promise that resolves with the concatenated data from the stream as a Buffer, or rejects with an error if one occurred while reading from the stream. If the stream is empty, the promise is rejected with an EmptyStream error.
 * @throws {EmptyStream} If the stream is empty.
 */
function streamToPromise(stream) {
    return new Promise((resolve, reject) => {
        const drain = [];
        stream
            // Error propagation is not automatic
            // Bubble up errors on the read stream
            .on('error', reject)
            .pipe(new stream_1.Writable({
            write(chunk, enc, next) {
                drain.push(chunk);
                next();
            },
        }))
            // This bubbles up errors when writing to the internal buffer
            // This is unlikely to happen, but we have this for completeness
            .on('error', reject)
            .on('finish', () => {
            if (!drain.length) {
                reject(new errors_1.EmptyStream());
            }
            else {
                resolve(Buffer.concat(drain));
            }
        });
    });
}
exports.streamToPromise = streamToPromise;
