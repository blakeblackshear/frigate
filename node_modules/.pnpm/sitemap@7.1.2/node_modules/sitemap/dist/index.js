"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleSitemapAndIndex = exports.IndexObjectStreamToJSON = exports.XMLToSitemapIndexStream = exports.parseSitemapIndex = exports.ObjectStreamToJSON = exports.XMLToSitemapItemStream = exports.parseSitemap = exports.xmlLint = exports.ReadlineStream = exports.normalizeURL = exports.validateSMIOptions = exports.mergeStreams = exports.lineSeparatedURLsToSitemapOptions = exports.SitemapStream = exports.streamToPromise = exports.SitemapAndIndexStream = exports.SitemapIndexStream = exports.IndexTagNames = exports.SitemapItemStream = void 0;
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
var sitemap_item_stream_1 = require("./lib/sitemap-item-stream");
Object.defineProperty(exports, "SitemapItemStream", { enumerable: true, get: function () { return sitemap_item_stream_1.SitemapItemStream; } });
var sitemap_index_stream_1 = require("./lib/sitemap-index-stream");
Object.defineProperty(exports, "IndexTagNames", { enumerable: true, get: function () { return sitemap_index_stream_1.IndexTagNames; } });
Object.defineProperty(exports, "SitemapIndexStream", { enumerable: true, get: function () { return sitemap_index_stream_1.SitemapIndexStream; } });
Object.defineProperty(exports, "SitemapAndIndexStream", { enumerable: true, get: function () { return sitemap_index_stream_1.SitemapAndIndexStream; } });
var sitemap_stream_1 = require("./lib/sitemap-stream");
Object.defineProperty(exports, "streamToPromise", { enumerable: true, get: function () { return sitemap_stream_1.streamToPromise; } });
Object.defineProperty(exports, "SitemapStream", { enumerable: true, get: function () { return sitemap_stream_1.SitemapStream; } });
__exportStar(require("./lib/errors"), exports);
__exportStar(require("./lib/types"), exports);
var utils_1 = require("./lib/utils");
Object.defineProperty(exports, "lineSeparatedURLsToSitemapOptions", { enumerable: true, get: function () { return utils_1.lineSeparatedURLsToSitemapOptions; } });
Object.defineProperty(exports, "mergeStreams", { enumerable: true, get: function () { return utils_1.mergeStreams; } });
Object.defineProperty(exports, "validateSMIOptions", { enumerable: true, get: function () { return utils_1.validateSMIOptions; } });
Object.defineProperty(exports, "normalizeURL", { enumerable: true, get: function () { return utils_1.normalizeURL; } });
Object.defineProperty(exports, "ReadlineStream", { enumerable: true, get: function () { return utils_1.ReadlineStream; } });
var xmllint_1 = require("./lib/xmllint");
Object.defineProperty(exports, "xmlLint", { enumerable: true, get: function () { return xmllint_1.xmlLint; } });
var sitemap_parser_1 = require("./lib/sitemap-parser");
Object.defineProperty(exports, "parseSitemap", { enumerable: true, get: function () { return sitemap_parser_1.parseSitemap; } });
Object.defineProperty(exports, "XMLToSitemapItemStream", { enumerable: true, get: function () { return sitemap_parser_1.XMLToSitemapItemStream; } });
Object.defineProperty(exports, "ObjectStreamToJSON", { enumerable: true, get: function () { return sitemap_parser_1.ObjectStreamToJSON; } });
var sitemap_index_parser_1 = require("./lib/sitemap-index-parser");
Object.defineProperty(exports, "parseSitemapIndex", { enumerable: true, get: function () { return sitemap_index_parser_1.parseSitemapIndex; } });
Object.defineProperty(exports, "XMLToSitemapIndexStream", { enumerable: true, get: function () { return sitemap_index_parser_1.XMLToSitemapIndexStream; } });
Object.defineProperty(exports, "IndexObjectStreamToJSON", { enumerable: true, get: function () { return sitemap_index_parser_1.IndexObjectStreamToJSON; } });
var sitemap_simple_1 = require("./lib/sitemap-simple");
Object.defineProperty(exports, "simpleSitemapAndIndex", { enumerable: true, get: function () { return sitemap_simple_1.simpleSitemapAndIndex; } });
