"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexTagNames = exports.TagNames = exports.ErrorLevel = exports.isAllowDeny = exports.EnumAllowDeny = exports.isValidYesNo = exports.EnumYesNo = exports.isValidChangeFreq = exports.CHANGEFREQ = exports.isResolution = exports.isPriceType = exports.validators = exports.EnumChangefreq = void 0;
/**
 * How frequently the page is likely to change. This value provides general
 * information to search engines and may not correlate exactly to how often they crawl the page. Please note that the
 * value of this tag is considered a hint and not a command. See
 * <https://www.sitemaps.org/protocol.html#xmlTagDefinitions> for the acceptable
 * values
 */
var EnumChangefreq;
(function (EnumChangefreq) {
    EnumChangefreq["DAILY"] = "daily";
    EnumChangefreq["MONTHLY"] = "monthly";
    EnumChangefreq["ALWAYS"] = "always";
    EnumChangefreq["HOURLY"] = "hourly";
    EnumChangefreq["WEEKLY"] = "weekly";
    EnumChangefreq["YEARLY"] = "yearly";
    EnumChangefreq["NEVER"] = "never";
})(EnumChangefreq = exports.EnumChangefreq || (exports.EnumChangefreq = {}));
const allowDeny = /^(?:allow|deny)$/;
exports.validators = {
    'price:currency': /^[A-Z]{3}$/,
    'price:type': /^(?:rent|purchase|RENT|PURCHASE)$/,
    'price:resolution': /^(?:HD|hd|sd|SD)$/,
    'platform:relationship': allowDeny,
    'restriction:relationship': allowDeny,
    restriction: /^([A-Z]{2}( +[A-Z]{2})*)?$/,
    platform: /^((web|mobile|tv)( (web|mobile|tv))*)?$/,
    language: /^zh-cn|zh-tw|([a-z]{2,3})$/,
    genres: /^(PressRelease|Satire|Blog|OpEd|Opinion|UserGenerated)(, *(PressRelease|Satire|Blog|OpEd|Opinion|UserGenerated))*$/,
    stock_tickers: /^(\w+:\w+(, *\w+:\w+){0,4})?$/,
};
function isPriceType(pt) {
    return exports.validators['price:type'].test(pt);
}
exports.isPriceType = isPriceType;
function isResolution(res) {
    return exports.validators['price:resolution'].test(res);
}
exports.isResolution = isResolution;
exports.CHANGEFREQ = Object.values(EnumChangefreq);
function isValidChangeFreq(freq) {
    return exports.CHANGEFREQ.includes(freq);
}
exports.isValidChangeFreq = isValidChangeFreq;
var EnumYesNo;
(function (EnumYesNo) {
    EnumYesNo["YES"] = "YES";
    EnumYesNo["NO"] = "NO";
    EnumYesNo["Yes"] = "Yes";
    EnumYesNo["No"] = "No";
    EnumYesNo["yes"] = "yes";
    EnumYesNo["no"] = "no";
})(EnumYesNo = exports.EnumYesNo || (exports.EnumYesNo = {}));
function isValidYesNo(yn) {
    return /^YES|NO|[Yy]es|[Nn]o$/.test(yn);
}
exports.isValidYesNo = isValidYesNo;
var EnumAllowDeny;
(function (EnumAllowDeny) {
    EnumAllowDeny["ALLOW"] = "allow";
    EnumAllowDeny["DENY"] = "deny";
})(EnumAllowDeny = exports.EnumAllowDeny || (exports.EnumAllowDeny = {}));
function isAllowDeny(ad) {
    return allowDeny.test(ad);
}
exports.isAllowDeny = isAllowDeny;
/**
 * How to handle errors in passed in urls
 */
var ErrorLevel;
(function (ErrorLevel) {
    /**
     * Validation will be skipped and nothing logged or thrown.
     */
    ErrorLevel["SILENT"] = "silent";
    /**
     * If an invalid value is encountered, a console.warn will be called with details
     */
    ErrorLevel["WARN"] = "warn";
    /**
     * An Error will be thrown on encountering invalid data.
     */
    ErrorLevel["THROW"] = "throw";
})(ErrorLevel = exports.ErrorLevel || (exports.ErrorLevel = {}));
var TagNames;
(function (TagNames) {
    TagNames["url"] = "url";
    TagNames["loc"] = "loc";
    TagNames["urlset"] = "urlset";
    TagNames["lastmod"] = "lastmod";
    TagNames["changefreq"] = "changefreq";
    TagNames["priority"] = "priority";
    TagNames["video:thumbnail_loc"] = "video:thumbnail_loc";
    TagNames["video:video"] = "video:video";
    TagNames["video:title"] = "video:title";
    TagNames["video:description"] = "video:description";
    TagNames["video:tag"] = "video:tag";
    TagNames["video:duration"] = "video:duration";
    TagNames["video:player_loc"] = "video:player_loc";
    TagNames["video:content_loc"] = "video:content_loc";
    TagNames["image:image"] = "image:image";
    TagNames["image:loc"] = "image:loc";
    TagNames["image:geo_location"] = "image:geo_location";
    TagNames["image:license"] = "image:license";
    TagNames["image:title"] = "image:title";
    TagNames["image:caption"] = "image:caption";
    TagNames["video:requires_subscription"] = "video:requires_subscription";
    TagNames["video:publication_date"] = "video:publication_date";
    TagNames["video:id"] = "video:id";
    TagNames["video:restriction"] = "video:restriction";
    TagNames["video:family_friendly"] = "video:family_friendly";
    TagNames["video:view_count"] = "video:view_count";
    TagNames["video:uploader"] = "video:uploader";
    TagNames["video:expiration_date"] = "video:expiration_date";
    TagNames["video:platform"] = "video:platform";
    TagNames["video:price"] = "video:price";
    TagNames["video:rating"] = "video:rating";
    TagNames["video:category"] = "video:category";
    TagNames["video:live"] = "video:live";
    TagNames["video:gallery_loc"] = "video:gallery_loc";
    TagNames["news:news"] = "news:news";
    TagNames["news:publication"] = "news:publication";
    TagNames["news:name"] = "news:name";
    TagNames["news:access"] = "news:access";
    TagNames["news:genres"] = "news:genres";
    TagNames["news:publication_date"] = "news:publication_date";
    TagNames["news:title"] = "news:title";
    TagNames["news:keywords"] = "news:keywords";
    TagNames["news:stock_tickers"] = "news:stock_tickers";
    TagNames["news:language"] = "news:language";
    TagNames["mobile:mobile"] = "mobile:mobile";
    TagNames["xhtml:link"] = "xhtml:link";
    TagNames["expires"] = "expires";
})(TagNames = exports.TagNames || (exports.TagNames = {}));
var IndexTagNames;
(function (IndexTagNames) {
    IndexTagNames["sitemap"] = "sitemap";
    IndexTagNames["sitemapindex"] = "sitemapindex";
    IndexTagNames["loc"] = "loc";
    IndexTagNames["lastmod"] = "lastmod";
})(IndexTagNames = exports.IndexTagNames || (exports.IndexTagNames = {}));
