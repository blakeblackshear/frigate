"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUrl = void 0;
var constants_1 = require("./constants");
function isRelativeUrlWithoutProtocol(url) {
    return constants_1.relativeFirstCharacters.indexOf(url[0]) > -1;
}
function decodeHtmlCharacters(str) {
    var removedNullByte = str.replace(constants_1.ctrlCharactersRegex, "");
    return removedNullByte.replace(constants_1.htmlEntitiesRegex, function (match, dec) {
        return String.fromCharCode(dec);
    });
}
function isValidUrl(url) {
    return URL.canParse(url);
}
function decodeURI(uri) {
    try {
        return decodeURIComponent(uri);
    }
    catch (e) {
        // Ignoring error
        // It is possible that the URI contains a `%` not associated
        // with URI/URL-encoding.
        return uri;
    }
}
function sanitizeUrl(url) {
    if (!url) {
        return constants_1.BLANK_URL;
    }
    var charsToDecode;
    var decodedUrl = decodeURI(url.trim());
    do {
        decodedUrl = decodeHtmlCharacters(decodedUrl)
            .replace(constants_1.htmlCtrlEntityRegex, "")
            .replace(constants_1.ctrlCharactersRegex, "")
            .replace(constants_1.whitespaceEscapeCharsRegex, "")
            .trim();
        decodedUrl = decodeURI(decodedUrl);
        charsToDecode =
            decodedUrl.match(constants_1.ctrlCharactersRegex) ||
                decodedUrl.match(constants_1.htmlEntitiesRegex) ||
                decodedUrl.match(constants_1.htmlCtrlEntityRegex) ||
                decodedUrl.match(constants_1.whitespaceEscapeCharsRegex);
    } while (charsToDecode && charsToDecode.length > 0);
    var sanitizedUrl = decodedUrl;
    if (!sanitizedUrl) {
        return constants_1.BLANK_URL;
    }
    if (isRelativeUrlWithoutProtocol(sanitizedUrl)) {
        return sanitizedUrl;
    }
    // Remove any leading whitespace before checking the URL scheme
    var trimmedUrl = sanitizedUrl.trimStart();
    var urlSchemeParseResults = trimmedUrl.match(constants_1.urlSchemeRegex);
    if (!urlSchemeParseResults) {
        return sanitizedUrl;
    }
    var urlScheme = urlSchemeParseResults[0].toLowerCase().trim();
    if (constants_1.invalidProtocolRegex.test(urlScheme)) {
        return constants_1.BLANK_URL;
    }
    var backSanitized = trimmedUrl.replace(/\\/g, "/");
    // Handle special cases for mailto: and custom deep-link protocols
    if (urlScheme === "mailto:" || urlScheme.includes("://")) {
        return backSanitized;
    }
    // For http and https URLs, perform additional validation
    if (urlScheme === "http:" || urlScheme === "https:") {
        if (!isValidUrl(backSanitized)) {
            return constants_1.BLANK_URL;
        }
        var url_1 = new URL(backSanitized);
        url_1.protocol = url_1.protocol.toLowerCase();
        url_1.hostname = url_1.hostname.toLowerCase();
        return url_1.toString();
    }
    return backSanitized;
}
exports.sanitizeUrl = sanitizeUrl;
