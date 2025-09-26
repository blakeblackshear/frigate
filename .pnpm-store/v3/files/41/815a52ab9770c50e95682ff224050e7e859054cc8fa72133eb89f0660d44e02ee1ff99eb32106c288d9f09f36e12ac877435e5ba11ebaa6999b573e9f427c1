"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SitemapAndIndexStream = exports.SitemapIndexStream = exports.IndexTagNames = void 0;
const stream_1 = require("stream");
const types_1 = require("./types");
const sitemap_stream_1 = require("./sitemap-stream");
const sitemap_xml_1 = require("./sitemap-xml");
var IndexTagNames;
(function (IndexTagNames) {
    IndexTagNames["sitemap"] = "sitemap";
    IndexTagNames["loc"] = "loc";
    IndexTagNames["lastmod"] = "lastmod";
})(IndexTagNames = exports.IndexTagNames || (exports.IndexTagNames = {}));
const xmlDec = '<?xml version="1.0" encoding="UTF-8"?>';
const sitemapIndexTagStart = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const closetag = '</sitemapindex>';
const defaultStreamOpts = {};
class SitemapIndexStream extends stream_1.Transform {
    constructor(opts = defaultStreamOpts) {
        var _a;
        opts.objectMode = true;
        super(opts);
        this.hasHeadOutput = false;
        this.lastmodDateOnly = opts.lastmodDateOnly || false;
        this.level = (_a = opts.level) !== null && _a !== void 0 ? _a : types_1.ErrorLevel.WARN;
        this.xslUrl = opts.xslUrl;
    }
    _transform(item, encoding, callback) {
        if (!this.hasHeadOutput) {
            this.hasHeadOutput = true;
            let stylesheet = '';
            if (this.xslUrl) {
                stylesheet = (0, sitemap_stream_1.stylesheetInclude)(this.xslUrl);
            }
            this.push(xmlDec + stylesheet + sitemapIndexTagStart);
        }
        this.push((0, sitemap_xml_1.otag)(IndexTagNames.sitemap));
        if (typeof item === 'string') {
            this.push((0, sitemap_xml_1.element)(IndexTagNames.loc, item));
        }
        else {
            this.push((0, sitemap_xml_1.element)(IndexTagNames.loc, item.url));
            if (item.lastmod) {
                const lastmod = new Date(item.lastmod).toISOString();
                this.push((0, sitemap_xml_1.element)(IndexTagNames.lastmod, this.lastmodDateOnly ? lastmod.slice(0, 10) : lastmod));
            }
        }
        this.push((0, sitemap_xml_1.ctag)(IndexTagNames.sitemap));
        callback();
    }
    _flush(cb) {
        this.push(closetag);
        cb();
    }
}
exports.SitemapIndexStream = SitemapIndexStream;
// const defaultSIStreamOpts: SitemapAndIndexStreamOptions = {};
class SitemapAndIndexStream extends SitemapIndexStream {
    constructor(opts) {
        var _a;
        opts.objectMode = true;
        super(opts);
        this.i = 0;
        this.getSitemapStream = opts.getSitemapStream;
        [this.idxItem, this.currentSitemap, this.currentSitemapPipeline] =
            this.getSitemapStream(0);
        this.limit = (_a = opts.limit) !== null && _a !== void 0 ? _a : 45000;
    }
    _writeSMI(item, callback) {
        this.i++;
        if (!this.currentSitemap.write(item)) {
            this.currentSitemap.once('drain', callback);
        }
        else {
            process.nextTick(callback);
        }
    }
    _transform(item, encoding, callback) {
        var _a;
        if (this.i === 0) {
            this._writeSMI(item, () => super._transform(this.idxItem, encoding, callback));
        }
        else if (this.i % this.limit === 0) {
            const onFinish = () => {
                const [idxItem, currentSitemap, currentSitemapPipeline] = this.getSitemapStream(this.i / this.limit);
                this.currentSitemap = currentSitemap;
                this.currentSitemapPipeline = currentSitemapPipeline;
                // push to index stream
                this._writeSMI(item, () => 
                // push to index stream
                super._transform(idxItem, encoding, callback));
            };
            (_a = this.currentSitemapPipeline) === null || _a === void 0 ? void 0 : _a.on('finish', onFinish);
            this.currentSitemap.end(!this.currentSitemapPipeline ? onFinish : undefined);
        }
        else {
            this._writeSMI(item, callback);
        }
    }
    _flush(cb) {
        var _a;
        const onFinish = () => super._flush(cb);
        (_a = this.currentSitemapPipeline) === null || _a === void 0 ? void 0 : _a.on('finish', onFinish);
        this.currentSitemap.end(!this.currentSitemapPipeline ? onFinish : undefined);
    }
}
exports.SitemapAndIndexStream = SitemapAndIndexStream;
