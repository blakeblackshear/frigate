"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeURL = exports.chunk = exports.lineSeparatedURLsToSitemapOptions = exports.ReadlineStream = exports.mergeStreams = exports.validateSMIOptions = void 0;
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
const fs_1 = require("fs");
const stream_1 = require("stream");
const readline_1 = require("readline");
const url_1 = require("url");
const types_1 = require("./types");
const errors_1 = require("./errors");
const types_2 = require("./types");
function validate(subject, name, url, level) {
    Object.keys(subject).forEach((key) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const val = subject[key];
        if (types_2.validators[key] && !types_2.validators[key].test(val)) {
            if (level === types_1.ErrorLevel.THROW) {
                throw new errors_1.InvalidAttrValue(key, val, types_2.validators[key]);
            }
            else {
                console.warn(`${url}: ${name} key ${key} has invalid value: ${val}`);
            }
        }
    });
}
function handleError(error, level) {
    if (level === types_1.ErrorLevel.THROW) {
        throw error;
    }
    else if (level === types_1.ErrorLevel.WARN) {
        console.warn(error.name, error.message);
    }
}
/**
 * Verifies all data passed in will comply with sitemap spec.
 * @param conf Options to validate
 * @param level logging level
 * @param errorHandler error handling func
 */
function validateSMIOptions(conf, level = types_1.ErrorLevel.WARN, errorHandler = handleError) {
    if (!conf) {
        throw new errors_1.NoConfigError();
    }
    if (level === types_1.ErrorLevel.SILENT) {
        return conf;
    }
    const { url, changefreq, priority, news, video } = conf;
    if (!url) {
        errorHandler(new errors_1.NoURLError(), level);
    }
    if (changefreq) {
        if (!(0, types_1.isValidChangeFreq)(changefreq)) {
            errorHandler(new errors_1.ChangeFreqInvalidError(url, changefreq), level);
        }
    }
    if (priority) {
        if (!(priority >= 0.0 && priority <= 1.0)) {
            errorHandler(new errors_1.PriorityInvalidError(url, priority), level);
        }
    }
    if (news) {
        if (news.access &&
            news.access !== 'Registration' &&
            news.access !== 'Subscription') {
            errorHandler(new errors_1.InvalidNewsAccessValue(url, news.access), level);
        }
        if (!news.publication ||
            !news.publication.name ||
            !news.publication.language ||
            !news.publication_date ||
            !news.title) {
            errorHandler(new errors_1.InvalidNewsFormat(url), level);
        }
        validate(news, 'news', url, level);
        validate(news.publication, 'publication', url, level);
    }
    if (video) {
        video.forEach((vid) => {
            var _a;
            if (vid.duration !== undefined) {
                if (vid.duration < 0 || vid.duration > 28800) {
                    errorHandler(new errors_1.InvalidVideoDuration(url, vid.duration), level);
                }
            }
            if (vid.rating !== undefined && (vid.rating < 0 || vid.rating > 5)) {
                errorHandler(new errors_1.InvalidVideoRating(url, vid.title, vid.rating), level);
            }
            if (typeof vid !== 'object' ||
                !vid.thumbnail_loc ||
                !vid.title ||
                !vid.description) {
                // has to be an object and include required categories https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190
                errorHandler(new errors_1.InvalidVideoFormat(url), level);
            }
            if (vid.title.length > 100) {
                errorHandler(new errors_1.InvalidVideoTitle(url, vid.title.length), level);
            }
            if (vid.description.length > 2048) {
                errorHandler(new errors_1.InvalidVideoDescription(url, vid.description.length), level);
            }
            if (vid.view_count !== undefined && vid.view_count < 0) {
                errorHandler(new errors_1.InvalidVideoViewCount(url, vid.view_count), level);
            }
            if (vid.tag.length > 32) {
                errorHandler(new errors_1.InvalidVideoTagCount(url, vid.tag.length), level);
            }
            if (vid.category !== undefined && ((_a = vid.category) === null || _a === void 0 ? void 0 : _a.length) > 256) {
                errorHandler(new errors_1.InvalidVideoCategory(url, vid.category.length), level);
            }
            if (vid.family_friendly !== undefined &&
                !(0, types_1.isValidYesNo)(vid.family_friendly)) {
                errorHandler(new errors_1.InvalidVideoFamilyFriendly(url, vid.family_friendly), level);
            }
            if (vid.restriction) {
                if (!types_2.validators.restriction.test(vid.restriction)) {
                    errorHandler(new errors_1.InvalidVideoRestriction(url, vid.restriction), level);
                }
                if (!vid['restriction:relationship'] ||
                    !(0, types_1.isAllowDeny)(vid['restriction:relationship'])) {
                    errorHandler(new errors_1.InvalidVideoRestrictionRelationship(url, vid['restriction:relationship']), level);
                }
            }
            // TODO price element should be unbounded
            if ((vid.price === '' && vid['price:type'] === undefined) ||
                (vid['price:type'] !== undefined && !(0, types_1.isPriceType)(vid['price:type']))) {
                errorHandler(new errors_1.InvalidVideoPriceType(url, vid['price:type'], vid.price), level);
            }
            if (vid['price:resolution'] !== undefined &&
                !(0, types_1.isResolution)(vid['price:resolution'])) {
                errorHandler(new errors_1.InvalidVideoResolution(url, vid['price:resolution']), level);
            }
            if (vid['price:currency'] !== undefined &&
                !types_2.validators['price:currency'].test(vid['price:currency'])) {
                errorHandler(new errors_1.InvalidVideoPriceCurrency(url, vid['price:currency']), level);
            }
            validate(vid, 'video', url, level);
        });
    }
    return conf;
}
exports.validateSMIOptions = validateSMIOptions;
/**
 * Combines multiple streams into one
 * @param streams the streams to combine
 */
function mergeStreams(streams, options) {
    let pass = new stream_1.PassThrough(options);
    let waiting = streams.length;
    for (const stream of streams) {
        pass = stream.pipe(pass, { end: false });
        stream.once('end', () => --waiting === 0 && pass.emit('end'));
    }
    return pass;
}
exports.mergeStreams = mergeStreams;
/**
 * Wraps node's ReadLine in a stream
 */
class ReadlineStream extends stream_1.Readable {
    constructor(options) {
        if (options.autoDestroy === undefined) {
            options.autoDestroy = true;
        }
        options.objectMode = true;
        super(options);
        this._source = (0, readline_1.createInterface)({
            input: options.input,
            terminal: false,
            crlfDelay: Infinity,
        });
        // Every time there's data, push it into the internal buffer.
        this._source.on('line', (chunk) => {
            // If push() returns false, then stop reading from source.
            if (!this.push(chunk))
                this._source.pause();
        });
        // When the source ends, push the EOF-signaling `null` chunk.
        this._source.on('close', () => {
            this.push(null);
        });
    }
    // _read() will be called when the stream wants to pull more data in.
    // The advisory size argument is ignored in this case.
    _read(size) {
        this._source.resume();
    }
}
exports.ReadlineStream = ReadlineStream;
/**
 * Takes a stream likely from fs.createReadStream('./path') and returns a stream
 * of sitemap items
 * @param stream a stream of line separated urls.
 * @param opts.isJSON is the stream line separated JSON. leave undefined to guess
 */
function lineSeparatedURLsToSitemapOptions(stream, { isJSON } = {}) {
    return new ReadlineStream({ input: stream }).pipe(new stream_1.Transform({
        objectMode: true,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        transform: (line, encoding, cb) => {
            if (isJSON || (isJSON === undefined && line[0] === '{')) {
                cb(null, JSON.parse(line));
            }
            else {
                cb(null, line);
            }
        },
    }));
}
exports.lineSeparatedURLsToSitemapOptions = lineSeparatedURLsToSitemapOptions;
/**
 * Based on lodash's implementation of chunk.
 *
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 *
 * Based on Underscore.js, copyright Jeremy Ashkenas,
 * DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>
 *
 * This software consists of voluntary contributions made by many
 * individuals. For exact contribution history, see the revision history
 * available at https://github.com/lodash/lodash
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function chunk(array, size = 1) {
    size = Math.max(Math.trunc(size), 0);
    const length = array ? array.length : 0;
    if (!length || size < 1) {
        return [];
    }
    const result = Array(Math.ceil(length / size));
    let index = 0, resIndex = 0;
    while (index < length) {
        result[resIndex++] = array.slice(index, (index += size));
    }
    return result;
}
exports.chunk = chunk;
function boolToYESNO(bool) {
    if (bool === undefined) {
        return bool;
    }
    if (typeof bool === 'boolean') {
        return bool ? types_1.EnumYesNo.yes : types_1.EnumYesNo.no;
    }
    return bool;
}
/**
 * Converts the passed in sitemap entry into one capable of being consumed by SitemapItem
 * @param {string | SitemapItemLoose} elem the string or object to be converted
 * @param {string} hostname
 * @returns SitemapItemOptions a strict sitemap item option
 */
function normalizeURL(elem, hostname, lastmodDateOnly = false) {
    // SitemapItem
    // create object with url property
    let smi = {
        img: [],
        video: [],
        links: [],
        url: '',
    };
    let smiLoose;
    if (typeof elem === 'string') {
        smi.url = elem;
        smiLoose = { url: elem };
    }
    else {
        smiLoose = elem;
    }
    smi.url = new url_1.URL(smiLoose.url, hostname).toString();
    let img = [];
    if (smiLoose.img) {
        if (typeof smiLoose.img === 'string') {
            // string -> array of objects
            smiLoose.img = [{ url: smiLoose.img }];
        }
        else if (!Array.isArray(smiLoose.img)) {
            // object -> array of objects
            smiLoose.img = [smiLoose.img];
        }
        img = smiLoose.img.map((el) => (typeof el === 'string' ? { url: el } : el));
    }
    // prepend hostname to all image urls
    smi.img = img.map((el) => ({
        ...el,
        url: new url_1.URL(el.url, hostname).toString(),
    }));
    let links = [];
    if (smiLoose.links) {
        links = smiLoose.links;
    }
    smi.links = links.map((link) => {
        return { ...link, url: new url_1.URL(link.url, hostname).toString() };
    });
    if (smiLoose.video) {
        if (!Array.isArray(smiLoose.video)) {
            // make it an array
            smiLoose.video = [smiLoose.video];
        }
        smi.video = smiLoose.video.map((video) => {
            const nv = {
                ...video,
                family_friendly: boolToYESNO(video.family_friendly),
                live: boolToYESNO(video.live),
                requires_subscription: boolToYESNO(video.requires_subscription),
                tag: [],
                rating: undefined,
            };
            if (video.tag !== undefined) {
                nv.tag = !Array.isArray(video.tag) ? [video.tag] : video.tag;
            }
            if (video.rating !== undefined) {
                if (typeof video.rating === 'string') {
                    nv.rating = parseFloat(video.rating);
                }
                else {
                    nv.rating = video.rating;
                }
            }
            if (typeof video.view_count === 'string') {
                nv.view_count = parseInt(video.view_count, 10);
            }
            else if (typeof video.view_count === 'number') {
                nv.view_count = video.view_count;
            }
            return nv;
        });
    }
    // If given a file to use for last modified date
    if (smiLoose.lastmodfile) {
        const { mtime } = (0, fs_1.statSync)(smiLoose.lastmodfile);
        smi.lastmod = new Date(mtime).toISOString();
        // The date of last modification (YYYY-MM-DD)
    }
    else if (smiLoose.lastmodISO) {
        smi.lastmod = new Date(smiLoose.lastmodISO).toISOString();
    }
    else if (smiLoose.lastmod) {
        smi.lastmod = new Date(smiLoose.lastmod).toISOString();
    }
    if (lastmodDateOnly && smi.lastmod) {
        smi.lastmod = smi.lastmod.slice(0, 10);
    }
    delete smiLoose.lastmodfile;
    delete smiLoose.lastmodISO;
    smi = { ...smiLoose, ...smi };
    return smi;
}
exports.normalizeURL = normalizeURL;
