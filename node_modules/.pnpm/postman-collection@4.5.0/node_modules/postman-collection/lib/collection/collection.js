var _ = require('../util').lodash,
    ItemGroup = require('./item-group').ItemGroup,
    VariableList = require('./variable-list').VariableList,
    Version = require('./version').Version,

    Collection, // constructor

    SCHEMA_URL = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

/**
 * The following is the object structure accepted as constructor parameter while calling `new Collection(...)`. It is
 * also the structure exported when {@link Property#toJSON} or {@link Property#toObjectResolved} is called on a
 * collection instance.
 *
 * @typedef Collection.definition
 *
 * @property {Object=} [info] The meta information regarding the collection is provided as the `info` object.
 * @property {String=} [info.id] Every collection is identified by the unique value of this property. It is recommended
 * that you maintain the same id since changing the id usually implies that is a different collection than it was
 * originally.
 * @property {String=} [info.name] A collection's friendly name is defined by this property. You would want to set this
 * field to a value that would allow you to easily identify this collection among a bunch of other collections.
 * @property {String=} [info.version] Postman allows you to version your collections as they grow, and this field holds
 * the version number. While optional, it is recommended that you use this field to its fullest extent.
 * @property {Array<(Item.definition|ItemGroup.definition)>} [item] Items are the basic unit for a Postman collection.
 * You can think of them as corresponding to a single API endpoint. Each Item has one request and may have multiple API
 * responses associated with it.
 * @property {Variable.definition=} [variable] Collection variables allow you to define a set of variables,
 * that are a *part of the collection*, as opposed to environments, which are separate entities.
 * @property {RequestAuth.definition=} [auth] Collection auth allows you to define an authentication,
 * that *applies to all items* in the collection.
 * @property {Array<Event.definition>=} [event] Postman allows you to configure scripts to run when specific events
 * occur.
 * @property {String|Version.definition=} [version] Version of the collection expressed in [semver](http://semver.org/)
 * format.
 *
 * @see {ItemGroup.definition} - Since `Collection` inherits {@link ItemGroup}, the properties supported by ItemGroup
 * are applicable as well.
 *
 * @example <caption>JSON definition of an example collection</caption>
 * {
 *     "info": {
 *         "name": "My Postman Collection",
 *         "version": "1.0.0"
 *     }
 *     "item": [{
 *         "request": "{{base-url}}/get"
 *     }],
 *     "variables": [{
 *         "id": "base-url",
 *         "value": "https://postman-echo.com"
 *     }]
 * }
 */
_.inherit((

    /**
     * Create or load an instance of [Postman Collection](https://www.getpostman.com/docs/collections) as a JavaScript
     * object that can be manipulated easily.
     *
     * A collection lets you group individual requests together. These requests can be further organized into folders to
     * accurately mirror your API. Requests can also store sample responses when saved in a collection. You can add
     * metadata like name and description too so that all the information that a developer needs to use your API is
     * available easily.
     *
     * @constructor
     * @extends {ItemGroup}
     *
     * @param {Collection.definition=} [definition] - Pass the initial definition of the collection (name, id, etc) as
     * the `definition` parameter. The definition object is structured exactly as the collection format as defined in
     * [https://www.schema.getpostman.com/](https://www.schema.getpostman.com/). This parameter is optional. That
     * implies that you can create an empty instance of collection and add requests and other properties in order to
     * build a new collection.
     * @param {Array<Object>=} [environments] - The collection instance constructor accepts the second parameter as an
     * array of environment objects. Environments objects store variable definitions that are inherited by
     * {@link Collection#variables}. These environment variables are usually the ones that are exported from the Postman
     * App to use them with different collections. Refer to Postman
     * [documentation on environment variables](https://www.getpostman.com/docs/environments).
     *
     * @example <caption>Load a Collection JSON file from disk</caption>
     * var fs = require('fs'), // needed to read JSON file from disk
     *     pretty = function (obj) { // function to neatly log the collection object to console
     *         return require('util').inspect(obj, {colors: true});
     *     },
     *     Collection = require('postman-collection').Collection,
     *     myCollection;
     *
     * // Load a collection to memory from a JSON file on disk (say, sample-collection.json)
     * myCollection = new Collection(JSON.stringify(fs.readFileSync('sample-collection.json').toString()));
     *
     * // log items at root level of the collection
     * console.log(pretty(myCollection));
     *
     * @example <caption>Create a blank collection and write to file</caption>
     * var fs = require('fs'),
     *     Collection = require('postman-collection').Collection,
     *     mycollection;
     *
     * myCollection = new Collection({
     *     info: {
     *         name: "my Collection"
     *     }
     * });
     *
     * // log the collection to console to see its contents
     * fs.writeFileSync('myCollection.postman_collection', JSON.stringify(myCollection, null, 2));
     */
    Collection = function PostmanCollection (definition, environments) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Collection.super_.call(this, definition);

        _.assign(this, /** @lends Collection.prototype */ {
            /**
             * The `variables` property holds a list of variables that are associated with a Collection. These variables
             * are stored within a collection so that they can be re-used and replaced in rest of the collection. For
             * example, if one has a variable named `port` with value `8080`, then one can write a request {@link Url}
             * as `http://localhost:{{port}}/my/endpoint` and that will be replaced to form
             * `http://localhost:8080/my/endpoint`. **Collection Variables** are like
             * [environment variables](https://www.getpostman.com/docs/environments), but stored locally within a
             * collection.
             *
             * @type {VariableList}
             *
             * @example <caption>Creating a collection with variables</caption>
             * var fs = require('fs'),
             *     Collection = require('postman-collection').Collection,
             *     mycollection;
             *
             * // Create a new empty collection.
             * myCollection = new Collection();
             *
             * // Add a variable to the collection
             * myCollection.variables.add({
             *     id: 'apiBaseUrl',
             *     value: 'http://timeapi.org',
             *     type: 'string'
             * });
             *
             * //Add a request that uses the variable that we just added.
             * myCollection.items.add({
             *     id: 'utc-time-now',
             *     name: 'Get the current time in UTC',
             *     request: '{{apiBaseUrl}}/utc/now'
             * });
             */
            variables: new VariableList(this, definition && definition.variable, environments),

            /**
             * The `version` key in collection is used to express the version of the collection. It is useful in either
             * tracking development iteration of an API server or the version of an API itself. It can also be used to
             * represent the number of iterations of the collection as it is updated through its lifetime.
             *
             * Version is expressed in [semver](http://semver.org/) format.
             *
             * @type {Version}
             * @optional
             *
             * @see {@link http://semver.org/}
             */
            version: (definition && definition.info && definition.info.version) ?
                new Version(definition.info.version) : undefined
        });
    }), ItemGroup);

_.assign(Collection.prototype, /** @lends Collection.prototype */ {
    /**
     * Using this function, one can sync the values of collection variables from a reference object.
     *
     * @param {Object} obj -
     * @param {Boolean=} [track] -
     *
     * @returns {Object}
     */
    syncVariablesFrom (obj, track) {
        return this.variables.syncFromObject(obj, track);
    },

    /**
     * Transfer the variables in this scope to an object
     *
     * @param {Object=} [obj] -
     *
     * @returns {Object}
     */
    syncVariablesTo (obj) {
        return this.variables.syncToObject(obj);
    },

    /**
     * Convert the collection to JSON compatible plain object
     *
     * @returns {Object}
     */
    toJSON () {
        var json = ItemGroup.prototype.toJSON.apply(this);

        // move ids and stuff from root level to `info` object
        json.info = {
            _postman_id: this.id,
            name: this.name,
            version: this.version,
            schema: SCHEMA_URL
        };

        delete json.id;
        delete json.name;
        delete json.version;

        if (_.has(json, 'description')) {
            json.info.description = this.description;
            delete json.description;
        }

        return json;
    }
});

_.assign(Collection, /** @lends Collection */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Collection',

    /**
     * Check whether an object is an instance of {@link ItemGroup}.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isCollection: function (obj) {
        return Boolean(obj) && ((obj instanceof Collection) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Collection._postman_propertyName));
    }
});

module.exports = {
    Collection
};
