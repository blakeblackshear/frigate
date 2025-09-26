var _ = require('../util').lodash,
    Property = require('./property').Property,
    PropertyBase = require('./property-base').PropertyBase,

    FormParam;

/**
 * @typedef FormParam.definition
 * @property {String} key The name ("key") of the form data parameter.
 * @property {String} value The value of the parameter.
 */
_.inherit((

    /**
     * Represents a Form Data parameter, which can exist in request body.
     *
     * @constructor
     * @param {FormParam.definition} options Pass the initial definition of the form data parameter.
     */
    FormParam = function PostmanFormParam (options = {}) {
        FormParam.super_.apply(this, arguments);

        this.key = options.key || '';
        this.value = options.value || '';
        this.type = options.type;
        this.src = options.src;
        this.contentType = options.contentType;
        this.fileName = options.fileName;
    }), Property);

_.assign(FormParam.prototype, /** @lends FormParam.prototype */ {
    /**
     * Converts the FormParameter to a single param string.
     *
     * @returns {String}
     */
    toString () {
        return this.key + '=' + this.value;
    },

    /**
     * Returns the value of the form parameter (if any).
     *
     * @returns {*|String}
     */
    valueOf () {
        return this.value; // can be multiple types, so just return whatever we have instead of being too clever
    },

    /**
     * Convert the form-param to JSON compatible plain object.
     *
     * @returns {Object}
     */
    toJSON () {
        var obj = PropertyBase.toJSON(this);

        // remove value from file param if it's empty or non-string (can be non-serializable ReadStream)
        if (obj.type === 'file' && (typeof obj.value !== 'string' || !obj.value)) {
            _.unset(obj, 'value');
        }

        return obj;
    }
});

_.assign(FormParam, /** @lends FormParam */ {

    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'FormParam',

    /**
     * Declare the list index key, so that property lists of form parameters work correctly
     *
     * @type {String}
     */
    _postman_propertyIndexKey: 'key',

    /**
     * Form params can have multiple values, so set this to true.
     *
     * @type {Boolean}
     */
    _postman_propertyAllowsMultipleValues: true,

    /**
     * Parse a form data string into an array of objects, where each object contains a key and a value.
     *
     * @todo implement this, not implemented yet.
     * @param formdata {String}
     * @returns {Array}
     */
    parse: _.noop
});

module.exports = {
    FormParam
};
