import {
  __commonJS,
  __name
} from "./chunk-DLQEHMXD.mjs";

// ../../node_modules/.pnpm/@braintree+sanitize-url@7.1.1/node_modules/@braintree/sanitize-url/dist/constants.js
var require_constants = __commonJS({
  "../../node_modules/.pnpm/@braintree+sanitize-url@7.1.1/node_modules/@braintree/sanitize-url/dist/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BLANK_URL = exports.relativeFirstCharacters = exports.whitespaceEscapeCharsRegex = exports.urlSchemeRegex = exports.ctrlCharactersRegex = exports.htmlCtrlEntityRegex = exports.htmlEntitiesRegex = exports.invalidProtocolRegex = void 0;
    exports.invalidProtocolRegex = /^([^\w]*)(javascript|data|vbscript)/im;
    exports.htmlEntitiesRegex = /&#(\w+)(^\w|;)?/g;
    exports.htmlCtrlEntityRegex = /&(newline|tab);/gi;
    exports.ctrlCharactersRegex = /[\u0000-\u001F\u007F-\u009F\u2000-\u200D\uFEFF]/gim;
    exports.urlSchemeRegex = /^.+(:|&colon;)/gim;
    exports.whitespaceEscapeCharsRegex = /(\\|%5[cC])((%(6[eE]|72|74))|[nrt])/g;
    exports.relativeFirstCharacters = [".", "/"];
    exports.BLANK_URL = "about:blank";
  }
});

// ../../node_modules/.pnpm/@braintree+sanitize-url@7.1.1/node_modules/@braintree/sanitize-url/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/.pnpm/@braintree+sanitize-url@7.1.1/node_modules/@braintree/sanitize-url/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sanitizeUrl = void 0;
    var constants_1 = require_constants();
    function isRelativeUrlWithoutProtocol(url) {
      return constants_1.relativeFirstCharacters.indexOf(url[0]) > -1;
    }
    __name(isRelativeUrlWithoutProtocol, "isRelativeUrlWithoutProtocol");
    function decodeHtmlCharacters(str) {
      var removedNullByte = str.replace(constants_1.ctrlCharactersRegex, "");
      return removedNullByte.replace(constants_1.htmlEntitiesRegex, function(match, dec) {
        return String.fromCharCode(dec);
      });
    }
    __name(decodeHtmlCharacters, "decodeHtmlCharacters");
    function isValidUrl(url) {
      return URL.canParse(url);
    }
    __name(isValidUrl, "isValidUrl");
    function decodeURI(uri) {
      try {
        return decodeURIComponent(uri);
      } catch (e) {
        return uri;
      }
    }
    __name(decodeURI, "decodeURI");
    function sanitizeUrl(url) {
      if (!url) {
        return constants_1.BLANK_URL;
      }
      var charsToDecode;
      var decodedUrl = decodeURI(url.trim());
      do {
        decodedUrl = decodeHtmlCharacters(decodedUrl).replace(constants_1.htmlCtrlEntityRegex, "").replace(constants_1.ctrlCharactersRegex, "").replace(constants_1.whitespaceEscapeCharsRegex, "").trim();
        decodedUrl = decodeURI(decodedUrl);
        charsToDecode = decodedUrl.match(constants_1.ctrlCharactersRegex) || decodedUrl.match(constants_1.htmlEntitiesRegex) || decodedUrl.match(constants_1.htmlCtrlEntityRegex) || decodedUrl.match(constants_1.whitespaceEscapeCharsRegex);
      } while (charsToDecode && charsToDecode.length > 0);
      var sanitizedUrl = decodedUrl;
      if (!sanitizedUrl) {
        return constants_1.BLANK_URL;
      }
      if (isRelativeUrlWithoutProtocol(sanitizedUrl)) {
        return sanitizedUrl;
      }
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
      if (urlScheme === "mailto:" || urlScheme.includes("://")) {
        return backSanitized;
      }
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
    __name(sanitizeUrl, "sanitizeUrl");
    exports.sanitizeUrl = sanitizeUrl;
  }
});

export {
  require_dist
};
