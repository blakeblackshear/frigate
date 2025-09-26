"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStreamToJSON = exports.parseSitemap = exports.XMLToSitemapItemStream = void 0;
const sax_1 = __importDefault(require("sax"));
const stream_1 = require("stream");
const types_1 = require("./types");
function isValidTagName(tagName) {
    // This only works because the enum name and value are the same
    return tagName in types_1.TagNames;
}
function tagTemplate() {
    return {
        img: [],
        video: [],
        links: [],
        url: '',
    };
}
function videoTemplate() {
    return {
        tag: [],
        thumbnail_loc: '',
        title: '',
        description: '',
    };
}
const imageTemplate = {
    url: '',
};
const linkTemplate = {
    lang: '',
    url: '',
};
function newsTemplate() {
    return {
        publication: { name: '', language: '' },
        publication_date: '',
        title: '',
    };
}
const defaultLogger = (level, ...message) => console[level](...message);
const defaultStreamOpts = {
    logger: defaultLogger,
};
// TODO does this need to end with `options`
/**
 * Takes a stream of xml and transforms it into a stream of SitemapItems
 * Use this to parse existing sitemaps into config options compatible with this library
 */
class XMLToSitemapItemStream extends stream_1.Transform {
    constructor(opts = defaultStreamOpts) {
        var _a;
        opts.objectMode = true;
        super(opts);
        this.error = null;
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
        let currentVideo = videoTemplate();
        let currentImage = { ...imageTemplate };
        let currentLink = { ...linkTemplate };
        let dontpushCurrentLink = false;
        this.saxStream.on('opentagstart', (tag) => {
            currentTag = tag.name;
            if (currentTag.startsWith('news:') && !currentItem.news) {
                currentItem.news = newsTemplate();
            }
        });
        this.saxStream.on('opentag', (tag) => {
            if (isValidTagName(tag.name)) {
                if (tag.name === 'xhtml:link') {
                    if (typeof tag.attributes.rel === 'string' ||
                        typeof tag.attributes.href === 'string') {
                        return;
                    }
                    if (tag.attributes.rel.value === 'alternate' &&
                        tag.attributes.hreflang) {
                        currentLink.url = tag.attributes.href.value;
                        if (typeof tag.attributes.hreflang === 'string')
                            return;
                        currentLink.lang = tag.attributes.hreflang.value;
                    }
                    else if (tag.attributes.rel.value === 'alternate') {
                        dontpushCurrentLink = true;
                        currentItem.androidLink = tag.attributes.href.value;
                    }
                    else if (tag.attributes.rel.value === 'amphtml') {
                        dontpushCurrentLink = true;
                        currentItem.ampLink = tag.attributes.href.value;
                    }
                    else {
                        this.logger('log', 'unhandled attr for xhtml:link', tag.attributes);
                        this.err(`unhandled attr for xhtml:link ${tag.attributes}`);
                    }
                }
            }
            else {
                this.logger('warn', 'unhandled tag', tag.name);
                this.err(`unhandled tag: ${tag.name}`);
            }
        });
        this.saxStream.on('text', (text) => {
            switch (currentTag) {
                case 'mobile:mobile':
                    break;
                case types_1.TagNames.loc:
                    currentItem.url = text;
                    break;
                case types_1.TagNames.changefreq:
                    if ((0, types_1.isValidChangeFreq)(text)) {
                        currentItem.changefreq = text;
                    }
                    break;
                case types_1.TagNames.priority:
                    currentItem.priority = parseFloat(text);
                    break;
                case types_1.TagNames.lastmod:
                    currentItem.lastmod = text;
                    break;
                case types_1.TagNames['video:thumbnail_loc']:
                    currentVideo.thumbnail_loc = text;
                    break;
                case types_1.TagNames['video:tag']:
                    currentVideo.tag.push(text);
                    break;
                case types_1.TagNames['video:duration']:
                    currentVideo.duration = parseInt(text, 10);
                    break;
                case types_1.TagNames['video:player_loc']:
                    currentVideo.player_loc = text;
                    break;
                case types_1.TagNames['video:content_loc']:
                    currentVideo.content_loc = text;
                    break;
                case types_1.TagNames['video:requires_subscription']:
                    if ((0, types_1.isValidYesNo)(text)) {
                        currentVideo.requires_subscription = text;
                    }
                    break;
                case types_1.TagNames['video:publication_date']:
                    currentVideo.publication_date = text;
                    break;
                case types_1.TagNames['video:id']:
                    currentVideo.id = text;
                    break;
                case types_1.TagNames['video:restriction']:
                    currentVideo.restriction = text;
                    break;
                case types_1.TagNames['video:view_count']:
                    currentVideo.view_count = parseInt(text, 10);
                    break;
                case types_1.TagNames['video:uploader']:
                    currentVideo.uploader = text;
                    break;
                case types_1.TagNames['video:family_friendly']:
                    if ((0, types_1.isValidYesNo)(text)) {
                        currentVideo.family_friendly = text;
                    }
                    break;
                case types_1.TagNames['video:expiration_date']:
                    currentVideo.expiration_date = text;
                    break;
                case types_1.TagNames['video:platform']:
                    currentVideo.platform = text;
                    break;
                case types_1.TagNames['video:price']:
                    currentVideo.price = text;
                    break;
                case types_1.TagNames['video:rating']:
                    currentVideo.rating = parseFloat(text);
                    break;
                case types_1.TagNames['video:category']:
                    currentVideo.category = text;
                    break;
                case types_1.TagNames['video:live']:
                    if ((0, types_1.isValidYesNo)(text)) {
                        currentVideo.live = text;
                    }
                    break;
                case types_1.TagNames['video:gallery_loc']:
                    currentVideo.gallery_loc = text;
                    break;
                case types_1.TagNames['image:loc']:
                    currentImage.url = text;
                    break;
                case types_1.TagNames['image:geo_location']:
                    currentImage.geoLocation = text;
                    break;
                case types_1.TagNames['image:license']:
                    currentImage.license = text;
                    break;
                case types_1.TagNames['news:access']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.access = text;
                    break;
                case types_1.TagNames['news:genres']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.genres = text;
                    break;
                case types_1.TagNames['news:publication_date']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.publication_date = text;
                    break;
                case types_1.TagNames['news:keywords']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.keywords = text;
                    break;
                case types_1.TagNames['news:stock_tickers']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.stock_tickers = text;
                    break;
                case types_1.TagNames['news:language']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.publication.language = text;
                    break;
                case types_1.TagNames['video:title']:
                    currentVideo.title += text;
                    break;
                case types_1.TagNames['video:description']:
                    currentVideo.description += text;
                    break;
                case types_1.TagNames['news:name']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.publication.name += text;
                    break;
                case types_1.TagNames['news:title']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.title += text;
                    break;
                case types_1.TagNames['image:caption']:
                    if (!currentImage.caption) {
                        currentImage.caption = text;
                    }
                    else {
                        currentImage.caption += text;
                    }
                    break;
                case types_1.TagNames['image:title']:
                    if (!currentImage.title) {
                        currentImage.title = text;
                    }
                    else {
                        currentImage.title += text;
                    }
                    break;
                default:
                    this.logger('log', 'unhandled text for tag:', currentTag, `'${text}'`);
                    this.err(`unhandled text for tag: ${currentTag} '${text}'`);
                    break;
            }
        });
        this.saxStream.on('cdata', (text) => {
            switch (currentTag) {
                case types_1.TagNames['video:title']:
                    currentVideo.title += text;
                    break;
                case types_1.TagNames['video:description']:
                    currentVideo.description += text;
                    break;
                case types_1.TagNames['news:name']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.publication.name += text;
                    break;
                case types_1.TagNames['news:title']:
                    if (!currentItem.news) {
                        currentItem.news = newsTemplate();
                    }
                    currentItem.news.title += text;
                    break;
                case types_1.TagNames['image:caption']:
                    if (!currentImage.caption) {
                        currentImage.caption = text;
                    }
                    else {
                        currentImage.caption += text;
                    }
                    break;
                case types_1.TagNames['image:title']:
                    if (!currentImage.title) {
                        currentImage.title = text;
                    }
                    else {
                        currentImage.title += text;
                    }
                    break;
                default:
                    this.logger('log', 'unhandled cdata for tag:', currentTag);
                    this.err(`unhandled cdata for tag: ${currentTag}`);
                    break;
            }
        });
        this.saxStream.on('attribute', (attr) => {
            switch (currentTag) {
                case types_1.TagNames['urlset']:
                case types_1.TagNames['xhtml:link']:
                case types_1.TagNames['video:id']:
                    break;
                case types_1.TagNames['video:restriction']:
                    if (attr.name === 'relationship' && (0, types_1.isAllowDeny)(attr.value)) {
                        currentVideo['restriction:relationship'] = attr.value;
                    }
                    else {
                        this.logger('log', 'unhandled attr', currentTag, attr.name);
                        this.err(`unhandled attr: ${currentTag} ${attr.name}`);
                    }
                    break;
                case types_1.TagNames['video:price']:
                    if (attr.name === 'type' && (0, types_1.isPriceType)(attr.value)) {
                        currentVideo['price:type'] = attr.value;
                    }
                    else if (attr.name === 'currency') {
                        currentVideo['price:currency'] = attr.value;
                    }
                    else if (attr.name === 'resolution' && (0, types_1.isResolution)(attr.value)) {
                        currentVideo['price:resolution'] = attr.value;
                    }
                    else {
                        this.logger('log', 'unhandled attr for video:price', attr.name);
                        this.err(`unhandled attr: ${currentTag} ${attr.name}`);
                    }
                    break;
                case types_1.TagNames['video:player_loc']:
                    if (attr.name === 'autoplay') {
                        currentVideo['player_loc:autoplay'] = attr.value;
                    }
                    else if (attr.name === 'allow_embed' && (0, types_1.isValidYesNo)(attr.value)) {
                        currentVideo['player_loc:allow_embed'] = attr.value;
                    }
                    else {
                        this.logger('log', 'unhandled attr for video:player_loc', attr.name);
                        this.err(`unhandled attr: ${currentTag} ${attr.name}`);
                    }
                    break;
                case types_1.TagNames['video:platform']:
                    if (attr.name === 'relationship' && (0, types_1.isAllowDeny)(attr.value)) {
                        currentVideo['platform:relationship'] = attr.value;
                    }
                    else {
                        this.logger('log', 'unhandled attr for video:platform', attr.name, attr.value);
                        this.err(`unhandled attr: ${currentTag} ${attr.name} ${attr.value}`);
                    }
                    break;
                case types_1.TagNames['video:gallery_loc']:
                    if (attr.name === 'title') {
                        currentVideo['gallery_loc:title'] = attr.value;
                    }
                    else {
                        this.logger('log', 'unhandled attr for video:galler_loc', attr.name);
                        this.err(`unhandled attr: ${currentTag} ${attr.name}`);
                    }
                    break;
                case types_1.TagNames['video:uploader']:
                    if (attr.name === 'info') {
                        currentVideo['uploader:info'] = attr.value;
                    }
                    else {
                        this.logger('log', 'unhandled attr for video:uploader', attr.name);
                        this.err(`unhandled attr: ${currentTag} ${attr.name}`);
                    }
                    break;
                default:
                    this.logger('log', 'unhandled attr', currentTag, attr.name);
                    this.err(`unhandled attr: ${currentTag} ${attr.name}`);
            }
        });
        this.saxStream.on('closetag', (tag) => {
            switch (tag) {
                case types_1.TagNames.url:
                    this.push(currentItem);
                    currentItem = tagTemplate();
                    break;
                case types_1.TagNames['video:video']:
                    currentItem.video.push(currentVideo);
                    currentVideo = videoTemplate();
                    break;
                case types_1.TagNames['image:image']:
                    currentItem.img.push(currentImage);
                    currentImage = { ...imageTemplate };
                    break;
                case types_1.TagNames['xhtml:link']:
                    if (!dontpushCurrentLink) {
                        currentItem.links.push(currentLink);
                    }
                    currentLink = { ...linkTemplate };
                    break;
                default:
                    break;
            }
        });
    }
    _transform(data, encoding, callback) {
        try {
            const cb = () => callback(this.level === types_1.ErrorLevel.THROW ? this.error : null);
            // correcting the type here can be done without making it a breaking change
            // TODO fix this
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (!this.saxStream.write(data, encoding)) {
                this.saxStream.once('drain', cb);
            }
            else {
                process.nextTick(cb);
            }
        }
        catch (error) {
            callback(error);
        }
    }
    err(msg) {
        if (!this.error)
            this.error = new Error(msg);
    }
}
exports.XMLToSitemapItemStream = XMLToSitemapItemStream;
/**
  Read xml and resolve with the configuration that would produce it or reject with
  an error
  ```
  const { createReadStream } = require('fs')
  const { parseSitemap, createSitemap } = require('sitemap')
  parseSitemap(createReadStream('./example.xml')).then(
    // produces the same xml
    // you can, of course, more practically modify it or store it
    (xmlConfig) => console.log(createSitemap(xmlConfig).toString()),
    (err) => console.log(err)
  )
  ```
  @param {Readable} xml what to parse
  @return {Promise<SitemapItem[]>} resolves with list of sitemap items that can be fed into a SitemapStream. Rejects with an Error object.
 */
async function parseSitemap(xml) {
    const urls = [];
    return new Promise((resolve, reject) => {
        xml
            .pipe(new XMLToSitemapItemStream())
            .on('data', (smi) => urls.push(smi))
            .on('end', () => {
            resolve(urls);
        })
            .on('error', (error) => {
            reject(error);
        });
    });
}
exports.parseSitemap = parseSitemap;
const defaultObjectStreamOpts = {
    lineSeparated: false,
};
/**
 * A Transform that converts a stream of objects into a JSON Array or a line
 * separated stringified JSON
 * @param [lineSeparated=false] whether to separate entries by a new line or comma
 */
class ObjectStreamToJSON extends stream_1.Transform {
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
exports.ObjectStreamToJSON = ObjectStreamToJSON;
