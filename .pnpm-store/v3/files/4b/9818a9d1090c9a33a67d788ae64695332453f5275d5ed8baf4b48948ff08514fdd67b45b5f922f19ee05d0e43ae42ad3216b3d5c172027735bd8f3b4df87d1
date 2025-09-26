var _ = require('../util').lodash,
    PropertyList = require('../collection/property-list').PropertyList,
    Url = require('../collection/url').Url,
    UrlMatchPattern = require('./url-match-pattern').UrlMatchPattern,

    MATCH_ALL_URLS = UrlMatchPattern.MATCH_ALL_URLS,

    UrlMatchPatternList;

_.inherit((

    /**
     * UrlMatchPattern is a list of UrlMatchPatterns.
     * This allows you to test for any url over a list of match patterns.
     *
     * @constructor
     * @extends {PropertyList}
     *
     * @param {Object} parent -
     * @param {String[]} list -
     * @example <caption>An example UrlMatchPatternList</caption>
     * var matchPatternList = new UrlMatchPatternList(['https://*.google.com/*']);
    */
    UrlMatchPatternList = function (parent, list) {
        UrlMatchPatternList.super_.call(this, UrlMatchPattern, parent, list);
    }), PropertyList);

_.assign(UrlMatchPatternList.prototype, /** @lends UrlMatchPatternList.prototype */ {

    /**
     * Allows this property to be serialised into its plural form.
     * This is here because Property.prototype.toJSON() tries to singularise
     * the keys which are PropertyLists.
     * i.e. when a property has a key - `matches = new PropertyList()`,
     * toJSON on the property tries to singularise 'matches' and ends up with 'matche'.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_proprtyIsSerialisedAsPlural: true,

    /**
      * Tests the url string with the match pattern list provided to see if it matches any of it.
      * Follows the https://developer.chrome.com/extensions/match_patterns pattern for pattern validation and matching
      *
      * @param {String=} [urlStr] The url string for which the proxy match needs to be done.
      * @returns {Boolean=}
      */
    test: function (urlStr) {
        /*
         * Similar to the UrlMatchPattern.test, however instead of testing
         * MATCH_ALL_URLS and Regex conditions serially with each of the pattern,
         * this method first searches for MATCH_ALL_URLS in all patterns
         * and then moves on to the slower Regex based searches.
         */
        var url,
            matchAllUrlsPattern,
            matchedSpecificPattern;

        matchAllUrlsPattern = this.find(function (urlMatchPattern) {
            return urlMatchPattern.pattern === MATCH_ALL_URLS;
        });

        if (_.isObject(matchAllUrlsPattern)) {
            return true;
        }

        url = new Url(urlStr);

        matchedSpecificPattern = this.find(function (urlMatchPattern) {
            var matchRegexObject = urlMatchPattern._matchPatternObject;

            // Empty matchRegexObject represents the match is INVALID match
            if (_.isEmpty(matchRegexObject)) {
                return false;
            }

            return (urlMatchPattern.testProtocol(url.protocol) &&
                urlMatchPattern.testHost(url.getHost()) &&
                urlMatchPattern.testPort(url.port, url.protocol) &&
                urlMatchPattern.testPath(url.getPath()));
        });

        return Boolean(matchedSpecificPattern);
    }
});

_.assign(UrlMatchPatternList, /** @lends UrlMatchPatternList */ {
    /**
     * Defines the name of this property for internal use
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'UrlMatchPatternList'
});

module.exports = {
    UrlMatchPatternList
};
