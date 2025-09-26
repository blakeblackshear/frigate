"use strict";
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptySitemap = exports.EmptyStream = exports.InvalidVideoPriceCurrency = exports.InvalidVideoResolution = exports.InvalidVideoPriceType = exports.InvalidVideoRestrictionRelationship = exports.InvalidVideoRestriction = exports.InvalidVideoFamilyFriendly = exports.InvalidVideoCategory = exports.InvalidVideoTagCount = exports.InvalidVideoViewCount = exports.InvalidVideoTitle = exports.XMLLintUnavailable = exports.InvalidNewsAccessValue = exports.InvalidNewsFormat = exports.InvalidAttr = exports.InvalidAttrValue = exports.InvalidVideoRating = exports.InvalidVideoDescription = exports.InvalidVideoDuration = exports.InvalidVideoFormat = exports.UndefinedTargetFolder = exports.PriorityInvalidError = exports.ChangeFreqInvalidError = exports.NoConfigError = exports.NoURLError = void 0;
/**
 * URL in SitemapItem does not exist
 */
class NoURLError extends Error {
    constructor(message) {
        super(message || 'URL is required');
        this.name = 'NoURLError';
        Error.captureStackTrace(this, NoURLError);
    }
}
exports.NoURLError = NoURLError;
/**
 * Config was not passed to SitemapItem constructor
 */
class NoConfigError extends Error {
    constructor(message) {
        super(message || 'SitemapItem requires a configuration');
        this.name = 'NoConfigError';
        Error.captureStackTrace(this, NoConfigError);
    }
}
exports.NoConfigError = NoConfigError;
/**
 * changefreq property in sitemap is invalid
 */
class ChangeFreqInvalidError extends Error {
    constructor(url, changefreq) {
        super(`${url}: changefreq "${changefreq}" is invalid`);
        this.name = 'ChangeFreqInvalidError';
        Error.captureStackTrace(this, ChangeFreqInvalidError);
    }
}
exports.ChangeFreqInvalidError = ChangeFreqInvalidError;
/**
 * priority property in sitemap is invalid
 */
class PriorityInvalidError extends Error {
    constructor(url, priority) {
        super(`${url}: priority "${priority}" must be a number between 0 and 1 inclusive`);
        this.name = 'PriorityInvalidError';
        Error.captureStackTrace(this, PriorityInvalidError);
    }
}
exports.PriorityInvalidError = PriorityInvalidError;
/**
 * SitemapIndex target Folder does not exists
 */
class UndefinedTargetFolder extends Error {
    constructor(message) {
        super(message || 'Target folder must exist');
        this.name = 'UndefinedTargetFolder';
        Error.captureStackTrace(this, UndefinedTargetFolder);
    }
}
exports.UndefinedTargetFolder = UndefinedTargetFolder;
class InvalidVideoFormat extends Error {
    constructor(url) {
        super(`${url} video must include thumbnail_loc, title and description fields for videos`);
        this.name = 'InvalidVideoFormat';
        Error.captureStackTrace(this, InvalidVideoFormat);
    }
}
exports.InvalidVideoFormat = InvalidVideoFormat;
class InvalidVideoDuration extends Error {
    constructor(url, duration) {
        super(`${url} duration "${duration}" must be an integer of seconds between 0 and 28800`);
        this.name = 'InvalidVideoDuration';
        Error.captureStackTrace(this, InvalidVideoDuration);
    }
}
exports.InvalidVideoDuration = InvalidVideoDuration;
class InvalidVideoDescription extends Error {
    constructor(url, length) {
        const message = `${url}: video description is too long ${length} vs limit of 2048 characters.`;
        super(message);
        this.name = 'InvalidVideoDescription';
        Error.captureStackTrace(this, InvalidVideoDescription);
    }
}
exports.InvalidVideoDescription = InvalidVideoDescription;
class InvalidVideoRating extends Error {
    constructor(url, title, rating) {
        super(`${url}: video "${title}" rating "${rating}" must be between 0 and 5 inclusive`);
        this.name = 'InvalidVideoRating';
        Error.captureStackTrace(this, InvalidVideoRating);
    }
}
exports.InvalidVideoRating = InvalidVideoRating;
class InvalidAttrValue extends Error {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(key, val, validator) {
        super('"' +
            val +
            '" tested against: ' +
            validator +
            ' is not a valid value for attr: "' +
            key +
            '"');
        this.name = 'InvalidAttrValue';
        Error.captureStackTrace(this, InvalidAttrValue);
    }
}
exports.InvalidAttrValue = InvalidAttrValue;
// InvalidAttr is only thrown when attrbuilder is called incorrectly internally
/* istanbul ignore next */
class InvalidAttr extends Error {
    constructor(key) {
        super('"' + key + '" is malformed');
        this.name = 'InvalidAttr';
        Error.captureStackTrace(this, InvalidAttr);
    }
}
exports.InvalidAttr = InvalidAttr;
class InvalidNewsFormat extends Error {
    constructor(url) {
        super(`${url} News must include publication, publication name, publication language, title, and publication_date for news`);
        this.name = 'InvalidNewsFormat';
        Error.captureStackTrace(this, InvalidNewsFormat);
    }
}
exports.InvalidNewsFormat = InvalidNewsFormat;
class InvalidNewsAccessValue extends Error {
    constructor(url, access) {
        super(`${url} News access "${access}" must be either Registration, Subscription or not be present`);
        this.name = 'InvalidNewsAccessValue';
        Error.captureStackTrace(this, InvalidNewsAccessValue);
    }
}
exports.InvalidNewsAccessValue = InvalidNewsAccessValue;
class XMLLintUnavailable extends Error {
    constructor(message) {
        super(message || 'xmlLint is not installed. XMLLint is required to validate');
        this.name = 'XMLLintUnavailable';
        Error.captureStackTrace(this, XMLLintUnavailable);
    }
}
exports.XMLLintUnavailable = XMLLintUnavailable;
class InvalidVideoTitle extends Error {
    constructor(url, length) {
        super(`${url}: video title is too long ${length} vs 100 character limit`);
        this.name = 'InvalidVideoTitle';
        Error.captureStackTrace(this, InvalidVideoTitle);
    }
}
exports.InvalidVideoTitle = InvalidVideoTitle;
class InvalidVideoViewCount extends Error {
    constructor(url, count) {
        super(`${url}: video view count must be positive, view count was ${count}`);
        this.name = 'InvalidVideoViewCount';
        Error.captureStackTrace(this, InvalidVideoViewCount);
    }
}
exports.InvalidVideoViewCount = InvalidVideoViewCount;
class InvalidVideoTagCount extends Error {
    constructor(url, count) {
        super(`${url}: video can have no more than 32 tags, this has ${count}`);
        this.name = 'InvalidVideoTagCount';
        Error.captureStackTrace(this, InvalidVideoTagCount);
    }
}
exports.InvalidVideoTagCount = InvalidVideoTagCount;
class InvalidVideoCategory extends Error {
    constructor(url, count) {
        super(`${url}: video category can only be 256 characters but was passed ${count}`);
        this.name = 'InvalidVideoCategory';
        Error.captureStackTrace(this, InvalidVideoCategory);
    }
}
exports.InvalidVideoCategory = InvalidVideoCategory;
class InvalidVideoFamilyFriendly extends Error {
    constructor(url, fam) {
        super(`${url}: video family friendly must be yes or no, was passed "${fam}"`);
        this.name = 'InvalidVideoFamilyFriendly';
        Error.captureStackTrace(this, InvalidVideoFamilyFriendly);
    }
}
exports.InvalidVideoFamilyFriendly = InvalidVideoFamilyFriendly;
class InvalidVideoRestriction extends Error {
    constructor(url, code) {
        super(`${url}: video restriction must be one or more two letter country codes. Was passed "${code}"`);
        this.name = 'InvalidVideoRestriction';
        Error.captureStackTrace(this, InvalidVideoRestriction);
    }
}
exports.InvalidVideoRestriction = InvalidVideoRestriction;
class InvalidVideoRestrictionRelationship extends Error {
    constructor(url, val) {
        super(`${url}: video restriction relationship must be either allow or deny. Was passed "${val}"`);
        this.name = 'InvalidVideoRestrictionRelationship';
        Error.captureStackTrace(this, InvalidVideoRestrictionRelationship);
    }
}
exports.InvalidVideoRestrictionRelationship = InvalidVideoRestrictionRelationship;
class InvalidVideoPriceType extends Error {
    constructor(url, priceType, price) {
        super(priceType === undefined && price === ''
            ? `${url}: video priceType is required when price is not provided`
            : `${url}: video price type "${priceType}" is not "rent" or "purchase"`);
        this.name = 'InvalidVideoPriceType';
        Error.captureStackTrace(this, InvalidVideoPriceType);
    }
}
exports.InvalidVideoPriceType = InvalidVideoPriceType;
class InvalidVideoResolution extends Error {
    constructor(url, resolution) {
        super(`${url}: video price resolution "${resolution}" is not hd or sd`);
        this.name = 'InvalidVideoResolution';
        Error.captureStackTrace(this, InvalidVideoResolution);
    }
}
exports.InvalidVideoResolution = InvalidVideoResolution;
class InvalidVideoPriceCurrency extends Error {
    constructor(url, currency) {
        super(`${url}: video price currency "${currency}" must be a three capital letter abbrieviation for the country currency`);
        this.name = 'InvalidVideoPriceCurrency';
        Error.captureStackTrace(this, InvalidVideoPriceCurrency);
    }
}
exports.InvalidVideoPriceCurrency = InvalidVideoPriceCurrency;
class EmptyStream extends Error {
    constructor() {
        super('You have ended the stream before anything was written. streamToPromise MUST be called before ending the stream.');
        this.name = 'EmptyStream';
        Error.captureStackTrace(this, EmptyStream);
    }
}
exports.EmptyStream = EmptyStream;
class EmptySitemap extends Error {
    constructor() {
        super('You ended the stream without writing anything.');
        this.name = 'EmptySitemap';
        Error.captureStackTrace(this, EmptyStream);
    }
}
exports.EmptySitemap = EmptySitemap;
