var _ = require('../util').lodash,

    E = '',
    DEFAULT_MIMETYPE = 'text/plain',

    Description;

/**
 * @typedef Description.definition
 * @property {String} content
 * @property {String} type
 */
/**
 * This is one of the properties that are (if provided) processed by all other properties. Any property can have an
 * instance of `Description` property assigned to it with the key name `description` and it should be treated as
 * something that "describes" the property within which it belongs. Usually this property is used to generate
 * documentation and other contextual information for a property in a Collection.
 *
 * @constructor
 *
 * @param {Description.definition|String} [definition] The content of the description can be passed as a string when it
 * is in `text/plain` format or otherwise be sent as part of an object adhering to the {@link Description.definition}
 * structure having `content` and `type`.
 *
 * @example <caption>Add a description to an instance of Collection</caption>
 *  var SDK = require('postman-collection'),
 *     Collection = SDK.Collection,
 *     Description = SDK.Description,
 *     mycollection;
 *
 * // create a blank collection
 * myCollection = new Collection();
 * myCollection.description = new Description({
 *     content: '&lt;h1&gt;Hello World&lt;/h1&gt;&lt;p&gt;I am a Collection&lt;/p&gt;',
 *     type: 'text/html'
 * });
 *
 * // alternatively, you could also use the `.describe` method of any property to set or update the description of the
 * // property.
 * myCollection.describe('Hey! This is a cool collection.');
 */
Description = function PostmanPropertyDescription (definition) {
    // if the definition is a string, it implies that this is a get of URL
    _.isString(definition) && (definition = {
        content: definition,
        type: DEFAULT_MIMETYPE
    });

    // populate the description
    definition && this.update(definition);
};

_.assign(Description.prototype, /** @lends Description.prototype */ {
    /**
     * Updates the content of this description property.
     *
     * @param {String|Description.definition} content -
     * @param {String=} [type] -
     * @todo parse version of description
     */
    update (content, type) {
        _.isObject(content) && ((type = content.type), (content = content.content));
        _.assign(this, /** @lends Description.prototype */ {
            /**
             * The raw content of the description
             *
             * @type {String}
             */
            content: content,

            /**
             * The mime-type of the description.
             *
             * @type {String}
             */
            type: type || DEFAULT_MIMETYPE
        });
    },

    /**
     * Returns stringified Description.
     *
     * @returns {String}
     */
    toString () {
        return this.content || E;
    },

    /**
     * Creates a JSON representation of the Description (as a plain Javascript object).
     *
     * @returns {{content: *, type: *, version: (String|*)}}
     */
    toJSON () {
        return {
            content: this.content,
            type: this.type
        };
    }
});

_.assign(Description, /** @lends Description */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Description',

    /**
     * Checks whether a property is an instance of Description object.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isDescription: function (obj) {
        return Boolean(obj) && ((obj instanceof Description) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Description._postman_propertyName));
    }
});

module.exports = {
    Description
};
