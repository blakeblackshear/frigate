"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexObjectStreamToJSON = exports.parseSitemapIndex = exports.XMLToSitemapIndexStream = void 0;
const sax_1 = __importDefault(require("sax"));
const stream_1 = require("stream");
const types_1 = require("./types");
function isValidTagName(tagName) {
    // This only works because the enum name and value are the same
    return tagName in types_1.IndexTagNames;
}
function tagTemplate() {
    return {
        url: '',
    };
}
const defaultLogger = (level, ...message) => console[level](...message);
const defaultStreamOpts = {
    logger: defaultLogger,
};
// TODO does this need to end with `options`
/**
 * Takes a stream of xml and transforms it into a stream of IndexItems
 * Use this to parse existing sitemap indices into config options compatible with this library
 */
class XMLToSitemapIndexStream extends stream_1.Transform {
    constructor(opts = defaultStreamOpts) {
        var _a;
        opts.objectMode = true;
        super(opts);
        this.saxStream = sax_1.default.createStream(true, {
            xmlns: true,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            strictEntities: true,
            trim: true,
        });
        this.level = opts.level || types_1.ErrorLevel.WARN;
        if (this.level !== types_1.ErrorLevel.SILENT && opts.logger !== false) {
            this.logger = (_a = opts.logger) !== null && _a !== void 0 ? _a : defaultLogger;
        }
        else {
            this.logger = () => undefined;
        }
        let currentItem = tagTemplate();
        let currentTag;
        this.saxStream.on('opentagstart', (tag) => {
            currentTag = tag.name;
        });
        this.saxStream.on('opentag', (tag) => {
            if (!isValidTagName(tag.name)) {
                this.logger('warn', 'unhandled tag', tag.name);
            }
        });
        this.saxStream.on('text', (text) => {
            switch (currentTag) {
                case types_1.IndexTagNames.loc:
                    currentItem.url = text;
                    break;
                case types_1.IndexTagNames.lastmod:
                    currentItem.lastmod = text;
                    break;
                default:
                    this.logger('log', 'unhandled text for tag:', currentTag, `'${text}'`);
                    break;
            }
        });
        this.saxStream.on('cdata', (_text) => {
            switch (currentTag) {
                default:
                    this.logger('log', 'unhandled cdata for tag:', currentTag);
                    break;
            }
        });
        this.saxStream.on('attribute', (attr) => {
            switch (currentTag) {
                case types_1.IndexTagNames.sitemapindex:
                    break;
                default:
                    this.logger('log', 'unhandled attr', currentTag, attr.name);
            }
        });
        this.saxStream.on('closetag', (tag) => {
            switch (tag) {
                case types_1.IndexTagNames.sitemap:
                    this.push(currentItem);
                    currentItem = tagTemplate();
                    break;
                default:
                    break;
            }
        });
    }
    _transform(data, encoding, callback) {
        try {
            // correcting the type here can be done without making it a breaking change
            // TODO fix this
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.saxStream.write(data, encoding);
            callback();
        }
        catch (error) {
            callback(error);
        }
    }
}
exports.XMLToSitemapIndexStream = XMLToSitemapIndexStream;
/**
  Read xml and resolve with the configuration that would produce it or reject with
  an error
  ```
  const { createReadStream } = require('fs')
  const { parseSitemapIndex, createSitemap } = require('sitemap')
  parseSitemapIndex(createReadStream('./example-index.xml')).then(
    // produces the same xml
    // you can, of course, more practically modify it or store it
    (xmlConfig) => console.log(createSitemap(xmlConfig).toString()),
    (err) => console.log(err)
  )
  ```
  @param {Readable} xml what to parse
  @return {Promise<IndexItem[]>} resolves with list of index items that can be fed into a SitemapIndexStream. Rejects with an Error object.
 */
async function parseSitemapIndex(xml) {
    const urls = [];
    return new Promise((resolve, reject) => {
        xml
            .pipe(new XMLToSitemapIndexStream())
            .on('data', (smi) => urls.push(smi))
            .on('end', () => {
            resolve(urls);
        })
            .on('error', (error) => {
            reject(error);
        });
    });
}
exports.parseSitemapIndex = parseSitemapIndex;
const defaultObjectStreamOpts = {
    lineSeparated: false,
};
/**
 * A Transform that converts a stream of objects into a JSON Array or a line
 * separated stringified JSON
 * @param [lineSeparated=false] whether to separate entries by a new line or comma
 */
class IndexObjectStreamToJSON extends stream_1.Transform {
    constructor(opts = defaultObjectStreamOpts) {
        opts.writableObjectMode = true;
        super(opts);
        this.lineSeparated = opts.lineSeparated;
        this.firstWritten = false;
    }
    _transform(chunk, encoding, cb) {
        if (!this.firstWritten) {
            this.firstWritten = true;
            if (!this.lineSeparated) {
                this.push('[');
            }
        }
        else if (this.lineSeparated) {
            this.push('\n');
        }
        else {
            this.push(',');
        }
        if (chunk) {
            this.push(JSON.stringify(chunk));
        }
        cb();
    }
    _flush(cb) {
        if (!this.lineSeparated) {
            this.push(']');
        }
        cb();
    }
}
exports.IndexObjectStreamToJSON = IndexObjectStreamToJSON;
