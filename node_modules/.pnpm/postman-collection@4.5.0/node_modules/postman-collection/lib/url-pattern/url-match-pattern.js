var _ = require('../util').lodash,
    Property = require('../collection/property').Property,
    Url = require('../collection/url').Url,

    STRING = 'string',
    UNDEFINED = 'undefined',

    MATCH_ALL = '*',
    PREFIX_DELIMITER = '^',
    PROTOCOL_DELIMITER = '+',
    POSTFIX_DELIMITER = '$',
    MATCH_ALL_URLS = '<all_urls>',
    ALLOWED_PROTOCOLS = ['http', 'https', 'file', 'ftp'],
    ALLOWED_PROTOCOLS_REGEX = ALLOWED_PROTOCOLS.join('|'),

    // @todo initialize this and ALLOWED_PROTOCOLS via UrlMatchPattern options
    DEFAULT_PROTOCOL_PORT = {
        ftp: '21',
        http: '80',
        https: '443'
    },

    regexes = {
        escapeMatcher: /[.+^${}()|[\]\\]/g,
        escapeMatchReplacement: '\\$&',
        questionmarkMatcher: /\?/g,
        questionmarkReplacment: '.',
        starMatcher: '*',
        starReplacement: '.*',
        // @todo match valid HOST name
        // @note PATH is required(can be empty '/' or '/*') i.e, {PROTOCOL}://{HOST}/
        patternSplit: '^((' + ALLOWED_PROTOCOLS_REGEX + '|\\*)(\\+(' + ALLOWED_PROTOCOLS_REGEX +
            '))*)://(\\*|\\*\\.[^*/:]+|[^*/:]+)(:\\*|:\\d+)?(/.*)$'
    },

    UrlMatchPattern;

/**
 * @typedef UrlMatchPattern.definition
 * @property {String} pattern The url match pattern string
 */
_.inherit((

    /**
     * UrlMatchPattern allows to create rules to define Urls to match for.
     * It is based on Google's Match Pattern - https://developer.chrome.com/extensions/match_patterns
     *
     * @constructor
     * @extends {Property}
     * @param {UrlMatchPattern.definition} options -
     *
     * @example <caption>An example UrlMatchPattern</caption>
     * var matchPattern = new UrlMatchPattern('https://*.google.com/*');
    */
    UrlMatchPattern = function UrlMatchPattern (options) {
        // called as new UrlMatchPattern('https+http://*.example.com/*')
        if (_.isString(options)) {
            options = { pattern: options };
        }

        // this constructor is intended to inherit and as such the super constructor is required to be executed
        UrlMatchPattern.super_.apply(this, arguments);

        // Assign defaults before proceeding
        _.assign(this, /** @lends UrlMatchPattern */ {
            /**
             * The url match pattern string
             *
             * @type {String}
             */
            pattern: MATCH_ALL_URLS
        });

        this.update(options);
    }), Property);

_.assign(UrlMatchPattern.prototype, /** @lends UrlMatchPattern.prototype */ {
    /**
     * Assigns the given properties to the UrlMatchPattern.
     *
     * @param {{ pattern: (string) }} options -
     */
    update (options) {
        _.has(options, 'pattern') && (_.isString(options.pattern) && !_.isEmpty(options.pattern)) &&
            (this.pattern = options.pattern);

        // create a match pattern and store it on cache
        this._matchPatternObject = this.createMatchPattern();
    },

    /**
     * Used to generate the match regex object from the match string we have.
     *
     * @private
     * @returns {*} Match regex object
     */
    createMatchPattern () {
        var matchPattern = this.pattern,
            // Check the match pattern of sanity and split it into protocol, host and path
            match = matchPattern.match(regexes.patternSplit);

        if (!match) {
            // This ensures it is a invalid match pattern
            return;
        }

        return {
            protocols: _.uniq(match[1].split(PROTOCOL_DELIMITER)),
            host: match[5],
            port: match[6] && match[6].substr(1), // remove leading `:`
            path: this.globPatternToRegexp(match[7])
        };
    },

    /**
     * Converts a given glob pattern into a regular expression.
     *
     * @private
     * @param {String} pattern Glob pattern string
     * @returns {RegExp=}
     */
    globPatternToRegexp (pattern) {
        // Escape everything except ? and *.
        pattern = pattern.replace(regexes.escapeMatcher, regexes.escapeMatchReplacement);
        pattern = pattern.replace(regexes.questionmarkMatcher, regexes.questionmarkReplacment);
        pattern = pattern.replace(regexes.starMatcher, regexes.starReplacement);

        // eslint-disable-next-line security/detect-non-literal-regexp
        return new RegExp(PREFIX_DELIMITER + pattern + POSTFIX_DELIMITER);
    },

    /**
     * Tests if the given protocol string, is allowed by the pattern.
     *
     * @param {String=} protocol The protocol to be checked if the pattern allows.
     * @returns {Boolean=}
     */
    testProtocol (protocol) {
        var matchRegexObject = this._matchPatternObject;

        return _.includes(ALLOWED_PROTOCOLS, protocol) &&
            (_.includes(matchRegexObject.protocols, MATCH_ALL) || _.includes(matchRegexObject.protocols, protocol));
    },

    /**
     * Returns the protocols supported
     *
     * @returns {Array.<String>}
     */
    getProtocols () {
        return _.get(this, '_matchPatternObject.protocols') || [];
    },

    /**
     * Tests if the given host string, is allowed by the pattern.
     *
     * @param {String=} host The host to be checked if the pattern allows.
     * @returns {Boolean=}
     */
    testHost (host) {
        /*
        * For Host match, we are considering the port with the host, hence we are using getRemote() instead of getHost()
        * We need to address three cases for the host urlStr
        * 1. * It matches all the host + protocol,  hence we are not having any parsing logic for it.
        * 2. *.foo.bar.com Here the prefix could be anything but it should end with foo.bar.com
        * 3. foo.bar.com This is the absolute matching needs to done.
        */
        var matchRegexObject = this._matchPatternObject;

        return (
            this.matchAnyHost(matchRegexObject) ||
            this.matchAbsoluteHostPattern(matchRegexObject, host) ||
            this.matchSuffixHostPattern(matchRegexObject, host)
        );
    },

    /**
     * Checks whether the matchRegexObject has the MATCH_ALL host.
     *
     * @private
     * @param {Object=} matchRegexObject The regex object generated by the createMatchPattern function.
     * @returns {Boolean}
     */
    matchAnyHost (matchRegexObject) {
        return matchRegexObject.host === MATCH_ALL;
    },


    /**
      * Check for the (*.foo.bar.com) kind of matches with the remote provided.
     *
      * @private
      * @param {Object=} matchRegexObject The regex object generated by the createMatchPattern function.
      * @param {String=} remote The remote url (host+port) of the url for which the hostpattern needs to checked
      * @returns {Boolean}
      */
    matchSuffixHostPattern (matchRegexObject, remote) {
        var hostSuffix = matchRegexObject.host.substr(2);

        return matchRegexObject.host[0] === MATCH_ALL && (remote === hostSuffix || remote.endsWith('.' + hostSuffix));
    },

    /**
     * Check for the absolute host match.
     *
     * @private
     * @param {Object=} matchRegexObject The regex object generated by the createMatchPattern function.
     * @param {String=} remote The remote url, host+port of the url for which the hostpattern needs to checked
     * @returns {Boolean}
     */
    matchAbsoluteHostPattern (matchRegexObject, remote) {
        return matchRegexObject.host === remote;
    },

    /**
     * Tests if the current pattern allows the given port.
     *
     * @param {String} port The port to be checked if the pattern allows.
     * @param {String} protocol Protocol to refer default port.
     * @returns {Boolean}
     */
    testPort (port, protocol) {
        var portRegex = this._matchPatternObject.port,

            // default port for given protocol
            defaultPort = protocol && DEFAULT_PROTOCOL_PORT[protocol];

        // return true if both given port and match pattern are absent
        if (typeof port === UNDEFINED && typeof portRegex === UNDEFINED) {
            return true;
        }

        // convert integer port to string
        (port && typeof port !== STRING) && (port = String(port));

        // assign default port or portRegex
        !port && (port = defaultPort);
        !portRegex && (portRegex = defaultPort);

        // matches * or specific port
        return (
            portRegex === MATCH_ALL ||
            portRegex === port
        );
    },

    /**
     * Tests if the current pattern allows the given path.
     *
     * @param {String=} path The path to be checked if the pattern allows.
     * @returns {Boolean=}
     */
    testPath (path) {
        var matchRegexObject = this._matchPatternObject;

        return !_.isEmpty(path.match(matchRegexObject.path));
    },

    /**
      * Tests the url string with the match pattern provided.
      * Follows the https://developer.chrome.com/extensions/match_patterns pattern for pattern validation and matching
      *
      * @param {String=} urlStr The url string for which the proxy match needs to be done.
      * @returns {Boolean=}
      */
    test (urlStr) {
        /*
        * This function executes the code in the following sequence for early return avoiding the costly regex matches.
        * To avoid most of the memory consuming code.
        * 1. It check whether the match string is <all_urls> in that case, it return immediately without any further
        *    processing.
        * 2. Checks whether the matchPattern follows the rules, https://developer.chrome.com/extensions/match_patterns,
        *    If not then, don't process it.
        * 3. Check for the protocol, as it is a normal array check.
        * 4. Checks the host, as it doesn't involve regex match and has only string comparisons.
        * 5. Finally, checks for the path, which actually involves the Regex matching, the slow process.
        */
        // If the matchPattern is <all_urls> then there is no need for any validations.
        if (this.pattern === MATCH_ALL_URLS) {
            return true;
        }

        // Empty _matchPatternObject represents the match is INVALID match
        if (_.isEmpty(this._matchPatternObject)) {
            return false;
        }

        const url = new Url(urlStr);

        return (this.testProtocol(url.protocol) &&
            this.testHost(url.getHost()) &&
            this.testPort(url.port, url.protocol) &&
            this.testPath(url.getPath()));
    },

    /**
     * Returns a string representation of the match pattern
     *
     * @returns {String} pattern
     */
    toString () {
        return String(this.pattern);
    },

    /**
     * Returns the JSON representation.
     *
     * @returns {{ pattern: (String) }}
     */
    toJSON () {
        var pattern;

        pattern = this.toString();

        return { pattern };
    }
});

_.assign(UrlMatchPattern, /** @lends UrlMatchPattern */ {
    /**
     * Defines the name of this property for internal use
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'UrlMatchPattern',

    /**
     * Multiple protocols in the match pattern should be separated by this string
     *
     * @readOnly
     * @type {String}
     */
    PROTOCOL_DELIMITER: PROTOCOL_DELIMITER,

    /**
     * String representation for matching all urls - <all_urls>
     *
     * @readOnly
     * @type {String}
     */
    MATCH_ALL_URLS: MATCH_ALL_URLS
});

module.exports = {
    UrlMatchPattern
};
