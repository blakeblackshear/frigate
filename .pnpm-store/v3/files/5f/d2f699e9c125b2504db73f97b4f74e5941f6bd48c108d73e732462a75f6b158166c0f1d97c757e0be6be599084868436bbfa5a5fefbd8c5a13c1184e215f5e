"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SitemapItemStream = void 0;
const stream_1 = require("stream");
const errors_1 = require("./errors");
const types_1 = require("./types");
const sitemap_xml_1 = require("./sitemap-xml");
function attrBuilder(conf, keys) {
    if (typeof keys === 'string') {
        keys = [keys];
    }
    const iv = {};
    return keys.reduce((attrs, key) => {
        // eslint-disable-next-line
        if (conf[key] !== undefined) {
            const keyAr = key.split(':');
            if (keyAr.length !== 2) {
                throw new errors_1.InvalidAttr(key);
            }
            attrs[keyAr[1]] = conf[key];
        }
        return attrs;
    }, iv);
}
/**
 * Takes a stream of SitemapItemOptions and spits out xml for each
 * @example
 * // writes <url><loc>https://example.com</loc><url><url><loc>https://example.com/2</loc><url>
 * const smis = new SitemapItemStream({level: 'warn'})
 * smis.pipe(writestream)
 * smis.write({url: 'https://example.com', img: [], video: [], links: []})
 * smis.write({url: 'https://example.com/2', img: [], video: [], links: []})
 * smis.end()
 * @param level - Error level
 */
class SitemapItemStream extends stream_1.Transform {
    constructor(opts = { level: types_1.ErrorLevel.WARN }) {
        opts.objectMode = true;
        super(opts);
        this.level = opts.level || types_1.ErrorLevel.WARN;
    }
    _transform(item, encoding, callback) {
        this.push((0, sitemap_xml_1.otag)(types_1.TagNames.url));
        this.push((0, sitemap_xml_1.element)(types_1.TagNames.loc, item.url));
        if (item.lastmod) {
            this.push((0, sitemap_xml_1.element)(types_1.TagNames.lastmod, item.lastmod));
        }
        if (item.changefreq) {
            this.push((0, sitemap_xml_1.element)(types_1.TagNames.changefreq, item.changefreq));
        }
        if (item.priority !== undefined && item.priority !== null) {
            if (item.fullPrecisionPriority) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames.priority, item.priority.toString()));
            }
            else {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames.priority, item.priority.toFixed(1)));
            }
        }
        item.video.forEach((video) => {
            this.push((0, sitemap_xml_1.otag)(types_1.TagNames['video:video']));
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:thumbnail_loc'], video.thumbnail_loc));
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:title'], video.title));
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:description'], video.description));
            if (video.content_loc) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:content_loc'], video.content_loc));
            }
            if (video.player_loc) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:player_loc'], attrBuilder(video, [
                    'player_loc:autoplay',
                    'player_loc:allow_embed',
                ]), video.player_loc));
            }
            if (video.duration) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:duration'], video.duration.toString()));
            }
            if (video.expiration_date) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:expiration_date'], video.expiration_date));
            }
            if (video.rating !== undefined) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:rating'], video.rating.toString()));
            }
            if (video.view_count !== undefined) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:view_count'], video.view_count.toString()));
            }
            if (video.publication_date) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:publication_date'], video.publication_date));
            }
            for (const tag of video.tag) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:tag'], tag));
            }
            if (video.category) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:category'], video.category));
            }
            if (video.family_friendly) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:family_friendly'], video.family_friendly));
            }
            if (video.restriction) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:restriction'], attrBuilder(video, 'restriction:relationship'), video.restriction));
            }
            if (video.gallery_loc) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:gallery_loc'], { title: video['gallery_loc:title'] }, video.gallery_loc));
            }
            if (video.price) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:price'], attrBuilder(video, [
                    'price:resolution',
                    'price:currency',
                    'price:type',
                ]), video.price));
            }
            if (video.requires_subscription) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:requires_subscription'], video.requires_subscription));
            }
            if (video.uploader) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:uploader'], attrBuilder(video, 'uploader:info'), video.uploader));
            }
            if (video.platform) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:platform'], attrBuilder(video, 'platform:relationship'), video.platform));
            }
            if (video.live) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:live'], video.live));
            }
            if (video.id) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['video:id'], { type: 'url' }, video.id));
            }
            this.push((0, sitemap_xml_1.ctag)(types_1.TagNames['video:video']));
        });
        item.links.forEach((link) => {
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['xhtml:link'], {
                rel: 'alternate',
                hreflang: link.lang || link.hreflang,
                href: link.url,
            }));
        });
        if (item.expires) {
            this.push((0, sitemap_xml_1.element)(types_1.TagNames.expires, new Date(item.expires).toISOString()));
        }
        if (item.androidLink) {
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['xhtml:link'], {
                rel: 'alternate',
                href: item.androidLink,
            }));
        }
        if (item.ampLink) {
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['xhtml:link'], {
                rel: 'amphtml',
                href: item.ampLink,
            }));
        }
        if (item.news) {
            this.push((0, sitemap_xml_1.otag)(types_1.TagNames['news:news']));
            this.push((0, sitemap_xml_1.otag)(types_1.TagNames['news:publication']));
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:name'], item.news.publication.name));
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:language'], item.news.publication.language));
            this.push((0, sitemap_xml_1.ctag)(types_1.TagNames['news:publication']));
            if (item.news.access) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:access'], item.news.access));
            }
            if (item.news.genres) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:genres'], item.news.genres));
            }
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:publication_date'], item.news.publication_date));
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:title'], item.news.title));
            if (item.news.keywords) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:keywords'], item.news.keywords));
            }
            if (item.news.stock_tickers) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['news:stock_tickers'], item.news.stock_tickers));
            }
            this.push((0, sitemap_xml_1.ctag)(types_1.TagNames['news:news']));
        }
        // Image handling
        item.img.forEach((image) => {
            this.push((0, sitemap_xml_1.otag)(types_1.TagNames['image:image']));
            this.push((0, sitemap_xml_1.element)(types_1.TagNames['image:loc'], image.url));
            if (image.caption) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['image:caption'], image.caption));
            }
            if (image.geoLocation) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['image:geo_location'], image.geoLocation));
            }
            if (image.title) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['image:title'], image.title));
            }
            if (image.license) {
                this.push((0, sitemap_xml_1.element)(types_1.TagNames['image:license'], image.license));
            }
            this.push((0, sitemap_xml_1.ctag)(types_1.TagNames['image:image']));
        });
        this.push((0, sitemap_xml_1.ctag)(types_1.TagNames.url));
        callback();
    }
}
exports.SitemapItemStream = SitemapItemStream;
