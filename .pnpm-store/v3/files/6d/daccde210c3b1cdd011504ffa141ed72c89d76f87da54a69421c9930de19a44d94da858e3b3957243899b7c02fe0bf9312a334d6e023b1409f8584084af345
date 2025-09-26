/// <reference types="node" />
import { URL } from 'url';
/**
 * How frequently the page is likely to change. This value provides general
 * information to search engines and may not correlate exactly to how often they crawl the page. Please note that the
 * value of this tag is considered a hint and not a command. See
 * <https://www.sitemaps.org/protocol.html#xmlTagDefinitions> for the acceptable
 * values
 */
export declare enum EnumChangefreq {
    DAILY = "daily",
    MONTHLY = "monthly",
    ALWAYS = "always",
    HOURLY = "hourly",
    WEEKLY = "weekly",
    YEARLY = "yearly",
    NEVER = "never"
}
export declare const validators: {
    [index: string]: RegExp;
};
export declare function isPriceType(pt: string | PriceType): pt is PriceType;
export declare function isResolution(res: string): res is Resolution;
export declare const CHANGEFREQ: EnumChangefreq[];
export declare function isValidChangeFreq(freq: string): freq is EnumChangefreq;
export declare enum EnumYesNo {
    YES = "YES",
    NO = "NO",
    Yes = "Yes",
    No = "No",
    yes = "yes",
    no = "no"
}
export declare function isValidYesNo(yn: string): yn is EnumYesNo;
export declare enum EnumAllowDeny {
    ALLOW = "allow",
    DENY = "deny"
}
export declare function isAllowDeny(ad: string): ad is EnumAllowDeny;
/**
 * https://support.google.com/webmasters/answer/74288?hl=en&ref_topic=4581190
 */
export interface NewsItem {
    access?: 'Registration' | 'Subscription';
    publication: {
        name: string;
        /**
         * The `<language>` is the language of your publication. Use an ISO 639
         * language code (2 or 3 letters).
         */
        language: string;
    };
    /**
     * @example 'PressRelease, Blog'
     */
    genres?: string;
    /**
     * Article publication date in W3C format, using either the "complete date" (YYYY-MM-DD) format or the "complete date
     * plus hours, minutes, and seconds"
     */
    publication_date: string;
    /**
     * The title of the news article
     * @example 'Companies A, B in Merger Talks'
     */
    title: string;
    /**
     * @example 'business, merger, acquisition'
     */
    keywords?: string;
    /**
     * @example 'NASDAQ:A, NASDAQ:B'
     */
    stock_tickers?: string;
}
/**
 * Sitemap Image
 * https://support.google.com/webmasters/answer/178636?hl=en&ref_topic=4581190
 */
export interface Img {
    /**
     * The URL of the image
     * @example 'https://example.com/image.jpg'
     */
    url: string;
    /**
     * The caption of the image
     * @example 'Thanksgiving dinner'
     */
    caption?: string;
    /**
     * The title of the image
     * @example 'Star Wars EP IV'
     */
    title?: string;
    /**
     * The geographic location of the image.
     * @example 'Limerick, Ireland'
     */
    geoLocation?: string;
    /**
     * A URL to the license of the image.
     * @example 'https://example.com/license.txt'
     */
    license?: string;
}
interface VideoItemBase {
    /**
     * A URL pointing to the video thumbnail image file
     * @example "https://rtv3-img-roosterteeth.akamaized.net/store/0e841100-289b-4184-ae30-b6a16736960a.jpg/sm/thumb3.jpg"
     */
    thumbnail_loc: string;
    /**
     * The title of the video
     * @example '2018:E6 - GoldenEye: Source'
     */
    title: string;
    /**
     * A description of the video. Maximum 2048 characters.
     * @example 'We play gun game in GoldenEye: Source with a good friend of ours. His name is Gruchy. Dan Gruchy.'
     */
    description: string;
    /**
     * A URL pointing to the actual video media file. Should be one of the supported formats. HTML is not a supported
     * format. Flash is allowed, but no longer supported on most mobile platforms, and so may be indexed less well. Must
     * not be the same as the `<loc>` URL.
     * @example "http://streamserver.example.com/video123.mp4"
     */
    content_loc?: string;
    /**
     * A URL pointing to a player for a specific video. Usually this is the information in the src element of an `<embed>`
     * tag. Must not be the same as the `<loc>` URL
     * @example "https://roosterteeth.com/embed/rouletsplay-2018-goldeneye-source"
     */
    player_loc?: string;
    /**
     * A string the search engine can append as a query param to enable automatic
     * playback. Equivilant to auto play attr on player_loc tag.
     * @example 'ap=1'
     */
    'player_loc:autoplay'?: string;
    /**
     * Whether the search engine can embed the video in search results. Allowed values are yes or no.
     */
    'player_loc:allow_embed'?: EnumYesNo;
    /**
     * The length of the video in seconds
     * @example 600
     */
    duration?: number;
    /**
     * The date after which the video will no longer be available.
     * @example "2012-07-16T19:20:30+08:00"
     */
    expiration_date?: string;
    /**
     * The number of times the video has been viewed
     */
    view_count?: number;
    /**
     * The date the video was first published, in W3C format.
     * @example "2012-07-16T19:20:30+08:00"
     */
    publication_date?: string;
    /**
     * A short description of the broad category that the video belongs to. This is a string no longer than 256 characters.
     * @example Baking
     */
    category?: string;
    /**
     * Whether to show or hide your video in search results from specific countries.
     * @example "IE GB US CA"
     */
    restriction?: string;
    /**
     * Whether the countries in restriction are allowed or denied
     * @example 'deny'
     */
    'restriction:relationship'?: EnumAllowDeny;
    gallery_loc?: string;
    /**
     * [Optional] Specifies the URL of a webpage with additional information about this uploader. This URL must be in the same domain as the <loc> tag.
     * @see https://developers.google.com/search/docs/advanced/sitemaps/video-sitemaps
     * @example http://www.example.com/users/grillymcgrillerson
     */
    'uploader:info'?: string;
    'gallery_loc:title'?: string;
    /**
     * The price to download or view the video. Omit this tag for free videos.
     * @example "1.99"
     */
    price?: string;
    /**
     * Specifies the resolution of the purchased version. Supported values are hd and sd.
     * @example "HD"
     */
    'price:resolution'?: Resolution;
    /**
     * Specifies the currency in ISO4217 format.
     * @example "USD"
     */
    'price:currency'?: string;
    /**
     * Specifies the purchase option. Supported values are rend and own.
     * @example "rent"
     */
    'price:type'?: PriceType;
    /**
     * The video uploader's name. Only one <video:uploader> is allowed per video. String value, max 255 characters.
     * @example "GrillyMcGrillerson"
     */
    uploader?: string;
    /**
     * Whether to show or hide your video in search results on specified platform types. This is a list of space-delimited
     * platform types. See <https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190> for more detail
     * @example "tv"
     */
    platform?: string;
    id?: string;
    'platform:relationship'?: EnumAllowDeny;
}
export declare type PriceType = 'rent' | 'purchase' | 'RENT' | 'PURCHASE';
export declare type Resolution = 'HD' | 'hd' | 'sd' | 'SD';
/**
 * Sitemap video. <https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190>
 */
export interface VideoItem extends VideoItemBase {
    /**
     * An arbitrary string tag describing the video. Tags are generally very short descriptions of key concepts associated
     * with a video or piece of content.
     * @example ['Baking']
     */
    tag: string[];
    /**
     * The rating of the video. Supported values are float numbers.
     * @example 2.5
     */
    rating?: number;
    family_friendly?: EnumYesNo;
    /**
     * Indicates whether a subscription (either paid or free) is required to view
     * the video. Allowed values are yes or no.
     */
    requires_subscription?: EnumYesNo;
    /**
     * Indicates whether the video is a live stream. Supported values are yes or no.
     */
    live?: EnumYesNo;
}
/**
 * Sitemap video. <https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190>
 */
export interface VideoItemLoose extends VideoItemBase {
    /**
     * An arbitrary string tag describing the video. Tags are generally very short descriptions of key concepts associated
     * with a video or piece of content.
     * @example ['Baking']
     */
    tag?: string | string[];
    /**
     * The rating of the video. Supported values are float numbers.
     * @example 2.5
     */
    rating?: string | number;
    family_friendly?: EnumYesNo | boolean;
    requires_subscription?: EnumYesNo | boolean;
    /**
     * Indicates whether the video is a live stream. Supported values are yes or no.
     */
    live?: EnumYesNo | boolean;
}
/**
 * https://support.google.com/webmasters/answer/189077
 */
export interface LinkItem {
    /**
     * @example 'en'
     */
    lang: string;
    /**
     * @example 'en-us'
     */
    hreflang?: string;
    url: string;
}
export interface IndexItem {
    url: string;
    lastmod?: string;
}
interface SitemapItemBase {
    lastmod?: string;
    changefreq?: EnumChangefreq;
    fullPrecisionPriority?: boolean;
    priority?: number;
    news?: NewsItem;
    expires?: string;
    androidLink?: string;
    ampLink?: string;
    url: string;
}
/**
 * Strict options for individual sitemap entries
 */
export interface SitemapItem extends SitemapItemBase {
    img: Img[];
    video: VideoItem[];
    links: LinkItem[];
}
/**
 * Options for individual sitemap entries prior to normalization
 */
export interface SitemapItemLoose extends SitemapItemBase {
    video?: VideoItemLoose | VideoItemLoose[];
    img?: string | Img | (string | Img)[];
    links?: LinkItem[];
    lastmodfile?: string | Buffer | URL;
    lastmodISO?: string;
    lastmodrealtime?: boolean;
}
/**
 * How to handle errors in passed in urls
 */
export declare enum ErrorLevel {
    /**
     * Validation will be skipped and nothing logged or thrown.
     */
    SILENT = "silent",
    /**
     * If an invalid value is encountered, a console.warn will be called with details
     */
    WARN = "warn",
    /**
     * An Error will be thrown on encountering invalid data.
     */
    THROW = "throw"
}
export declare type ErrorHandler = (error: Error, level: ErrorLevel) => void;
export declare enum TagNames {
    url = "url",
    loc = "loc",
    urlset = "urlset",
    lastmod = "lastmod",
    changefreq = "changefreq",
    priority = "priority",
    'video:thumbnail_loc' = "video:thumbnail_loc",
    'video:video' = "video:video",
    'video:title' = "video:title",
    'video:description' = "video:description",
    'video:tag' = "video:tag",
    'video:duration' = "video:duration",
    'video:player_loc' = "video:player_loc",
    'video:content_loc' = "video:content_loc",
    'image:image' = "image:image",
    'image:loc' = "image:loc",
    'image:geo_location' = "image:geo_location",
    'image:license' = "image:license",
    'image:title' = "image:title",
    'image:caption' = "image:caption",
    'video:requires_subscription' = "video:requires_subscription",
    'video:publication_date' = "video:publication_date",
    'video:id' = "video:id",
    'video:restriction' = "video:restriction",
    'video:family_friendly' = "video:family_friendly",
    'video:view_count' = "video:view_count",
    'video:uploader' = "video:uploader",
    'video:expiration_date' = "video:expiration_date",
    'video:platform' = "video:platform",
    'video:price' = "video:price",
    'video:rating' = "video:rating",
    'video:category' = "video:category",
    'video:live' = "video:live",
    'video:gallery_loc' = "video:gallery_loc",
    'news:news' = "news:news",
    'news:publication' = "news:publication",
    'news:name' = "news:name",
    'news:access' = "news:access",
    'news:genres' = "news:genres",
    'news:publication_date' = "news:publication_date",
    'news:title' = "news:title",
    'news:keywords' = "news:keywords",
    'news:stock_tickers' = "news:stock_tickers",
    'news:language' = "news:language",
    'mobile:mobile' = "mobile:mobile",
    'xhtml:link' = "xhtml:link",
    'expires' = "expires"
}
export declare enum IndexTagNames {
    sitemap = "sitemap",
    sitemapindex = "sitemapindex",
    loc = "loc",
    lastmod = "lastmod"
}
export {};
