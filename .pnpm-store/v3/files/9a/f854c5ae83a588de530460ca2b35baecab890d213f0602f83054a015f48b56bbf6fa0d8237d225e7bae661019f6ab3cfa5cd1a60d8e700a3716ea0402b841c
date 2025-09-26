var _ = require('../util').lodash,

    Property = require('./property').Property,
    PropertyList = require('./property-list').PropertyList,

    E = '',
    AMPERSAND = '&',
    STRING = 'string',
    EQUALS = '=',
    EMPTY = '',
    HASH = '#',
    REGEX_HASH = /#/g,
    REGEX_EQUALS = /=/g, // eslint-disable-line no-div-regex
    REGEX_AMPERSAND = /&/g,
    REGEX_EXTRACT_VARS = /{{[^{}]*[&#=][^{}]*}}/g,

    QueryParam,

    /**
     * Percent encode reserved chars (&, = and #) in the given string.
     *
     * @private
     * @param {String} str -
     * @param {Boolean} encodeEquals -
     * @returns {String}
     */
    encodeReservedChars = function (str, encodeEquals) {
        if (!str) {
            return str;
        }

        // eslint-disable-next-line lodash/prefer-includes
        str.indexOf(AMPERSAND) !== -1 && (str = str.replace(REGEX_AMPERSAND, '%26'));

        // eslint-disable-next-line lodash/prefer-includes
        str.indexOf(HASH) !== -1 && (str = str.replace(REGEX_HASH, '%23'));

        // eslint-disable-next-line lodash/prefer-includes
        encodeEquals && str.indexOf(EQUALS) !== -1 && (str = str.replace(REGEX_EQUALS, '%3D'));

        return str;
    },

    /**
     * Normalize the given param string by percent-encoding the reserved chars
     * such that it won't affect the re-parsing.
     *
     * @note `&`, `=` and `#` needs to be percent-encoded otherwise re-parsing
     * the same URL string will generate different output
     *
     * @private
     * @param {String} str -
     * @param {Boolean} encodeEquals -
     * @returns {String}
     */
    normalizeParam = function (str, encodeEquals) {
        // bail out if the given sting is null or empty
        if (!(str && typeof str === STRING)) {
            return str;
        }

        // bail out if the given string does not include reserved chars
        // eslint-disable-next-line lodash/prefer-includes
        if (str.indexOf(AMPERSAND) === -1 && str.indexOf(HASH) === -1) {
            // eslint-disable-next-line lodash/prefer-includes
            if (!(encodeEquals && str.indexOf(EQUALS) !== -1)) {
                return str;
            }
        }

        var normalizedString = '',
            pointer = 0,
            variable,
            match,
            index;

        // find all the instances of {{<variable>}} which includes reserved chars
        while ((match = REGEX_EXTRACT_VARS.exec(str)) !== null) {
            variable = match[0];
            index = match.index;

            // [pointer, index) string is normalized + the matched variable
            normalizedString += encodeReservedChars(str.slice(pointer, index), encodeEquals) + variable;

            // update the pointer
            pointer = index + variable.length;
        }

        // whatever left in the string is normalized as well
        if (pointer < str.length) {
            normalizedString += encodeReservedChars(str.slice(pointer), encodeEquals);
        }

        return normalizedString;
    };

/**
 * @typedef QueryParam.definition
 * @property {String} key The name ("key") of the query parameter.
 * @property {String} value The value of the parameter.
 */
_.inherit((

    /**
     * Represents a URL query parameter, which can exist in request URL or POST data.
     *
     * @constructor
     * @extends {Property}
     * @param {FormParam.definition|String} options Pass the initial definition of the query parameter. In case of
     * string, the query parameter is parsed using {@link QueryParam.parseSingle}.
     */
    QueryParam = function PostmanQueryParam (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        QueryParam.super_.apply(this, arguments);

        this.update(options);
    }), Property);

_.assign(QueryParam.prototype, /** @lends QueryParam.prototype */ {
    /**
     * Converts the QueryParameter to a single param string.
     *
     * @returns {String}
     */
    toString () {
        return QueryParam.unparseSingle(this);
    },

    /**
     * Updates the key and value of the query parameter
     *
     * @param {String|Object} param -
     * @param {String} param.key -
     * @param {String=} [param.value] -
     */
    update (param) {
        _.assign(this, /** @lends QueryParam.prototype */ _.isString(param) ? QueryParam.parseSingle(param) : {
            key: _.get(param, 'key'), // we do not replace falsey with blank string since null has a meaning
            value: _.get(param, 'value')
        });
        _.has(param, 'system') && (this.system = param.system);
    },

    valueOf () {
        return _.isString(this.value) ? this.value : EMPTY;
    }
});

_.assign(QueryParam, /** @lends QueryParam */ {

    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'QueryParam',

    /**
     * Declare the list index key, so that property lists of query parameters work correctly
     *
     * @type {String}
     */
    _postman_propertyIndexKey: 'key',

    /**
     * Query params can have multiple values, so set this to true.
     *
     * @type {Boolean}
     */
    _postman_propertyAllowsMultipleValues: true,

    /**
     * Parse a query string into an array of objects, where each object contains a key and a value.
     *
     * @param {String} query -
     * @returns {Array}
     */
    parse: function (query) {
        return _.isString(query) ? query.split(AMPERSAND).map(QueryParam.parseSingle) : [];
    },

    /**
     * Parses a single query parameter.
     *
     * @param {String} param -
     * @param {Number} idx -
     * @param {String[]} all - array of all params, in case this is being called while parsing multiple params.
     * @returns {{key: String|null, value: String|null}}
     */
    parseSingle: function (param, idx, all) {
        // helps handle weird edge cases such as "/get?a=b&&"
        if (param === EMPTY && // if param is empty
            _.isNumber(idx) && // this and the next condition ensures that this is part of a map call
            _.isArray(all) &&
            idx !== (all && (all.length - 1))) { // not last parameter in the array
            return { key: null, value: null };
        }

        var index = (typeof param === STRING) ? param.indexOf(EQUALS) : -1,
            paramObj = {};

        // this means that there was no value for this key (not even blank, so we store this info) and the value is set
        // to null
        if (index < 0) {
            paramObj.key = param.substr(0, param.length);
            paramObj.value = null;
        }
        else {
            paramObj.key = param.substr(0, index);
            paramObj.value = param.substr(index + 1);
        }

        return paramObj;
    },

    /**
     * Create a query string from array of parameters (or object of key-values).
     *
     * @note Disabled parameters are excluded.
     *
     * @param {Array|Object} params -
     * @returns {String}
     */
    unparse: function (params) {
        if (!params) { return EMPTY; }

        var str,
            firstEnabledParam = true;

        // Convert hash maps to an array of params
        if (!_.isArray(params) && !PropertyList.isPropertyList(params)) {
            return _.reduce(params, function (result, value, key) {
                result && (result += AMPERSAND);

                return result + QueryParam.unparseSingle({ key, value });
            }, EMPTY);
        }

        // construct a query parameter string from the list, with considerations for disabled values
        str = params.reduce(function (result, param) {
            // bail out if param is disabled
            if (param.disabled === true) { return result; }

            // don't add '&' for the very first enabled param
            if (firstEnabledParam) {
                firstEnabledParam = false;
            }
            // add '&' before concatenating param
            else {
                result += AMPERSAND;
            }

            return result + QueryParam.unparseSingle(param);
        }, EMPTY);

        return str;
    },

    /**
     * Takes a query param and converts to string
     *
     * @param {Object} obj -
     * @returns {String}
     */
    unparseSingle: function (obj) {
        if (!obj) { return EMPTY; }

        var key = obj.key,
            value = obj.value,
            result;

        if (typeof key === STRING) {
            result = normalizeParam(key, true);
        }
        else {
            result = E;
        }

        if (typeof value === STRING) {
            result += EQUALS + normalizeParam(value);
        }

        return result;
    }
});

module.exports = {
    QueryParam
};
