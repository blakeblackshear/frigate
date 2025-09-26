var _ = require('../util').lodash,
    url_parse = require('postman-url-encoder/parser').parse,
    PropertyBase = require('./property-base').PropertyBase,
    QueryParam = require('./query-param').QueryParam,
    PropertyList = require('./property-list').PropertyList,
    VariableList = require('./variable-list').VariableList,

    E = '',
    STRING = 'string',
    FUNCTION = 'function',
    PROTOCOL_HTTPS = 'https',
    PROTOCOL_HTTP = 'http',
    HTTPS_PORT = '443',
    HTTP_PORT = '80',
    PATH_SEPARATOR = '/',
    PATH_VARIABLE_SEPARATOR = '.',
    PATH_VARIABLE_IDENTIFIER = ':',
    PORT_SEPARATOR = ':',
    DOMAIN_SEPARATOR = '.',
    PROTOCOL_SEPARATOR = '://',
    AUTH_SEPARATOR = ':',
    AUTH_CREDENTIALS_SEPARATOR = '@',
    QUERY_SEPARATOR = '?',
    SEARCH_SEPARATOR = '#',

    DEFAULT_PROTOCOL = PROTOCOL_HTTP + PROTOCOL_SEPARATOR,

    MATCH_1 = '$1',

    regexes = {
        trimPath: /^\/((.+))$/,
        splitDomain: /\.(?![^{]*\}{2})/g
    },

    /**
     * Returns path variable name from the path segment.
     *
     * @private
     * @param {String} pathSegment -
     * @returns {String|null}
     */
    parsePathVariable = function (pathSegment) {
        if (String(pathSegment).startsWith(PATH_VARIABLE_IDENTIFIER)) {
            const separatorIndex = pathSegment.indexOf(PATH_VARIABLE_SEPARATOR);

            // remove path variable prefix and everything followed by the separator
            return pathSegment.slice(1, separatorIndex === -1 ? undefined : separatorIndex) || null;
        }

        return null;
    },

    Url;

_.inherit((

    /**
     * Defines a URL.
     *
     * @constructor
     * @extends {PropertyBase}
     * @param {Object|String} options -
     */
    Url = function PostmanUrl (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Url.super_.apply(this, arguments);

        // create the url properties
        this.update(options);
    }), PropertyBase);

_.assign(Url.prototype, /** @lends Url.prototype */ {
    /**
     * Set a URL.
     *
     * @draft
     * @param {String|Object} url -
     */
    update (url) {
        !url && (url = E);
        var parsedUrl = _.isString(url) ? Url.parse(url) : url,
            auth = parsedUrl.auth,
            protocol = parsedUrl.protocol,
            port = parsedUrl.port,
            path = parsedUrl.path,
            hash = parsedUrl.hash,
            host = parsedUrl.host,
            query = parsedUrl.query,
            variable = parsedUrl.variable;

        // convert object based query string to array
        // @todo: create a key value parser
        if (query) {
            if (_.isString(query)) {
                query = QueryParam.parse(query);
            }

            if (!_.isArray(query) && _.keys(query).length) {
                query = _.map(_.keys(query), function (key) {
                    return {
                        key: key,
                        value: query[key]
                    };
                });
            }
        }

        // backward compatibility with path variables being storing thins with `id`
        if (_.isArray(variable)) {
            variable = _.map(variable, function (v) {
                _.isObject(v) && (v.key = v.key || v.id); // @todo Remove once path variables are deprecated

                return v;
            });
        }

        // expand string path name
        if (_.isString(path)) {
            path && (path = path.replace(regexes.trimPath, MATCH_1)); // remove leading slash for valid path
            // if path is blank string, we set it to undefined, if '/' then single blank string array
            path = path ? (path === PATH_SEPARATOR ? [E] : path.split(PATH_SEPARATOR)) : undefined;
        }

        // expand host string
        _.isString(host) && (host = host.split(regexes.splitDomain));

        _.assign(this, /** @lends Url.prototype */ {
            /**
             * @type {{ user: String, password: String }}
             */
            auth: auth,

            /**
             * @type {String}
             */
            protocol: protocol,

            /**
             * @type {String}
             */
            port: port,

            /**
             * @type {Array<String>}
             */
            path: path,

            /**
             * @type {String}
             */
            hash: hash,

            /**
             * @type {Array<String>}
             */
            host: host,

            /**
             * @type {PropertyList<QueryParam>}
             *
             * @todo consider setting this as undefined in v4 otherwise it's
             * difficult to detect URL like `localhost/?`.
             * currently it's replying upon a single member with empty key.
             */
            query: new PropertyList(QueryParam, this, query || []),

            /**
             * @type {VariableList}
             */
            variables: new VariableList(this, variable || [])
        });
    },

    /**
     * Add query parameters to the URL.
     *
     * @param {Object|String} params Key value pairs to add to the URL.
     */
    addQueryParams (params) {
        params = _.isString(params) ? QueryParam.parse(params) : params;
        this.query.populate(params);
    },

    /**
     * Removes query parameters from the URL.
     *
     * @param {Array<QueryParam>|Array<String>|String} params Params should be an array of strings, or an array of
     * actual query parameters, or a string containing the parameter key.
     * @note Input should *not* be a query string.
     */
    removeQueryParams (params) {
        params = _.isArray(params) ? _.map(params, function (param) {
            return param.key ? param.key : param;
        }) : [params];
        this.query.remove(function (param) {
            return _.includes(params, param.key);
        });
    },

    /**
     * @private
     * @deprecated discontinued in v4.0
     */
    getRaw () {
        throw new Error('`Url#getRaw` has been discontinued, use `Url#toString` instead.');
    },

    /**
     * Unparses a {PostmanUrl} into a string.
     *
     * @param {Boolean=} forceProtocol - Forces the URL to have a protocol
     * @returns {String}
     */
    toString (forceProtocol) {
        var rawUrl = E,
            protocol = this.protocol,
            queryString,
            authString;

        forceProtocol && !protocol && (protocol = DEFAULT_PROTOCOL);

        if (protocol) {
            rawUrl += (_.endsWith(protocol, PROTOCOL_SEPARATOR) ? protocol : protocol + PROTOCOL_SEPARATOR);
        }

        if (this.auth) {
            if (typeof this.auth.user === STRING) {
                authString = this.auth.user;
            }


            if (typeof this.auth.password === STRING) {
                !authString && (authString = E);
                authString += AUTH_SEPARATOR + this.auth.password;
            }

            if (typeof authString === STRING) {
                rawUrl += authString + AUTH_CREDENTIALS_SEPARATOR;
            }
        }

        if (this.host) {
            rawUrl += this.getHost();
        }

        if (typeof _.get(this.port, 'toString') === FUNCTION) {
            rawUrl += PORT_SEPARATOR + this.port.toString();
        }

        if (this.path) {
            rawUrl += this.getPath();
        }

        if (this.query && this.query.count()) {
            queryString = this.getQueryString();

            // either all the params are disabled or a single param is like { key: '' } (http://localhost?)
            // in that case, query separator ? must be included in the raw URL.
            // @todo return undefined or string from getQueryString method to distinguish
            // no params vs empty param.
            if (queryString === E) {
                // check if there's any enabled param, if so, set queryString to empty string
                // otherwise (all disabled), it will be set as undefined
                queryString = this.query.find(function (param) { return !(param && param.disabled); }) && E;
            }

            if (typeof queryString === STRING) {
                rawUrl += QUERY_SEPARATOR + queryString;
            }
        }

        if (typeof this.hash === STRING) {
            rawUrl += SEARCH_SEPARATOR + this.hash;
        }

        return rawUrl;
    },

    /**
     * Returns the request path, with a leading '/'.
     *
     * @param {?Boolean=} [unresolved=false] -
     * @returns {String}
     */
    getPath (unresolved) {
        // for unresolved case, this is super simple as that is how raw data is stored
        if (unresolved) {
            return PATH_SEPARATOR + this.path.join(PATH_SEPARATOR);
        }

        var self = this,
            segments;

        segments = _.transform(this.path, function (res, segment) {
            const variableKey = parsePathVariable(segment),
                variableValue = self.variables.get(variableKey);

            if (variableValue && typeof variableValue === STRING) {
                // replace the variable with its value while preserving the suffix
                segment = variableValue + segment.slice(variableKey.length + 1);
            }

            res.push(segment);
        }, []);

        return PATH_SEPARATOR + segments.join(PATH_SEPARATOR); // add leading slash
    },

    /**
     * Returns the stringified query string for this URL.
     *
     * @returns {String}
     */
    getQueryString () {
        if (!this.query.count()) {
            return E;
        }

        return QueryParam.unparse(this.query.all());
    },

    /**
     * Returns the complete path, including the query string.
     *
     * @returns {*|String}
     * @example /something/postman?hi=notbye
     */
    getPathWithQuery () {
        var path = this.getPath(),
            queryString = this.getQueryString();

        // Check if the queryString exists to figure out if we need to add a `?` alongside the queryString
        if (queryString) {
            path += (QUERY_SEPARATOR + queryString);
        }

        return path;
    },

    /**
     * Returns the host part of the URL
     *
     * @returns {String}
     */
    getHost () {
        if (!this.host) {
            return E;
        }

        return _.isArray(this.host) ? this.host.join(DOMAIN_SEPARATOR) : this.host.toString();
    },

    /**
     * Returns the host *and* port (if any), separated by a ":"
     *
     * @param {?Boolean} [forcePort=false] - forces the port to be added even for the protocol default ones (89, 443)
     * @returns {String}
     */
    getRemote (forcePort) {
        var host = this.getHost(),
            port = this.port && this.port.toString();

        if (forcePort && !port) { // this (!port) works since it assumes port as a string
            port = this.protocol && (this.protocol === PROTOCOL_HTTPS) ? HTTPS_PORT : HTTP_PORT;
        }

        return port ? (host + PORT_SEPARATOR + port) : host;
    },

    /**
     * Returns a OAuth1.0-a compatible representation of the request URL, also called "Base URL".
     * For details, http://oauth.net/core/1.0a/#anchor13
     *
     * todo: should we ignore the auth parameters of the URL or not? (the standard does not mention them)
     * we currently are.
     *
     * @private
     * @returns {String}
     *
     * @deprecated since v3.5 in favour of getBaseUrl
     * @note not discontinue yet because it's used in Twitter APIs public collections
     */
    getOAuth1BaseUrl () {
        var protocol = this.protocol || PROTOCOL_HTTP,
            port = this.port ? this.port.toString() : undefined,
            host = ((port === HTTP_PORT ||
                port === HTTPS_PORT ||
                port === undefined) && this.host.join(DOMAIN_SEPARATOR)) || (this.host.join(DOMAIN_SEPARATOR) +
                    PORT_SEPARATOR + port),
            path = this.getPath();

        protocol = (_.endsWith(protocol, PROTOCOL_SEPARATOR) ? protocol : protocol + PROTOCOL_SEPARATOR);

        return protocol.toLowerCase() + host.toLowerCase() + path;
    }
});

_.assign(Url, /** @lends Url */ {

    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Url',

    /**
     * Parses a string to a PostmanUrl, decomposing the URL into it's constituent parts,
     * such as path, host, port, etc.
     *
     * @param {String} url -
     * @returns {Object}
     */
    parse: function (url) {
        url = url_parse(url);

        var pathVariables,
            pathVariableKeys = {};

        if (url.auth) {
            url.auth = {
                user: url.auth[0],
                password: url.auth[1]
            };
        }

        if (url.query) {
            url.query = url.query.map(QueryParam.parseSingle);
        }

        // extract path variables
        pathVariables = _.transform(url.path, function (res, segment) {
            if ((segment = parsePathVariable(segment)) && !pathVariableKeys[segment]) {
                pathVariableKeys[segment] = true;
                res.push({ key: segment });
            }
        }, []);
        url.variable = pathVariables.length ? pathVariables : undefined;

        return url;
    },

    /**
     * Checks whether an object is a Url
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isUrl: function (obj) {
        return Boolean(obj) && ((obj instanceof Url) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Url._postman_propertyName));
    }
});

module.exports = {
    Url
};
