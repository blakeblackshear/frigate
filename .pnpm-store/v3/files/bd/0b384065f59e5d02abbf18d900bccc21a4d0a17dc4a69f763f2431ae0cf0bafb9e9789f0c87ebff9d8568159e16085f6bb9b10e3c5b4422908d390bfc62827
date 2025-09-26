var _ = require('../util').lodash,
    Property = require('./property').Property,
    PropertyList = require('./property-list').PropertyList,
    EventList = require('./event-list').EventList,
    Request = require('./request').Request,
    RequestAuth = require('./request-auth').RequestAuth,
    Response = require('./response').Response,

    Item,

    /**
     * @private
     * @type {String}
     */
    OBJECT = 'object',

    /**
     * @private
     * @type {String}
     */
    STRING = 'string',

    /**
     * Extracts `auth` from an entity. Checks if `auth` is present and it is not falsy type.
     *
     * @private
     *
     * @param {Object} [entity] -
     */
    extractAuth = function (entity) {
        var auth;

        return (entity && (auth = entity.auth) && RequestAuth.isValidType(auth.type)) ? auth : undefined;
    },

    /**
     * Extracts `protocolProfileBehavior` from an entity.
     *
     * @private
     *
     * @param {Item|ItemGroup} entity -
     * @returns {Object}
     */
    extractProtocolProfileBehavior = function (entity) {
        var protocolProfileBehavior = entity && entity.protocolProfileBehavior;

        return typeof protocolProfileBehavior === OBJECT ? protocolProfileBehavior : {};
    };

/**
 * The following defines the object (or JSON) structure that one can pass to the Item while creating a new Item
 * instance. This is also the object structure returned when `.toJSON()` is called on an Item instance.
 *
 * @typedef Item.definition
 *
 * @property {Request.definition=} [request] A request represents an HTTP request. If a string, the string is assumed to
 * be the request URL and the method is assumed to be 'GET'.
 * @property {Array<Response.definition>=} [responses] Sample responses for this request can be stored along with the
 * item definition.
 * @property {Array<Event.definition>=} [events] Postman allows you to configure scripts to run when specific events
 * occur. These scripts are stored here, and can be referenced in the collection by their id.
 *
 * @example
 * {
 *     "name": "Get Headers from Echo",
 *     "id": "my-request-1",
 *     "description": "Makes a GET call to echo service and returns the client headers that were sent",
 *
 *     "request": {
 *         "url": "https://postman-echo.com/headers",
 *         "method": "GET"
 *     }
 * }
 *
 * @todo add response and event to example
 */
_.inherit((

    /**
     * A Postman Collection Item that holds your request definition, responses and other stuff. An Item essentially is
     * a HTTP request definition along with the sample responses and test scripts clubbed together. One or more of these
     * items can be grouped together and placed in an {@link ItemGroup} and as such forms a {@link Collection} of
     * requests.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {Item.definition=} [definition] While creating a new instance of Item, one can provide the initial
     * configuration of the item with the the request it sends, the expected sample responses, tests, etc
     *
     * @example <caption>Add a new Item to a folder in a collection instance</caption>
     * var Collection = require('postman-collection').Collection,
     *     Item = require('postman-collection').Item,
     *     myCollection;
     *
     * myCollection = new Collection({
     *     "item": [{
     *         "id": "my-folder-1",
     *         "name": "The solo folder in this collection",
     *         "item": [] // blank array indicates this is a folder
     *     }]
     * }); // create a collection with an empty folder
     * // add a request to "my-folder-1" that sends a GET request
     * myCollection.items.one("my-folder-1").items.add(new Item({
     *     "name": "Send a GET request",
     *     "id": "my-get-request",
     *     "request": {
     *         "url": "https://postman-echo.com/get",
     *         "method": "GET"
     *     }
     * }));
     */
    Item = function PostmanItem (definition) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Item.super_.apply(this, arguments);

        _.mergeDefined(this, /** @lends Item.prototype */ {
            /**
             * The instance of the {@link Request} object inside an Item defines the HTTP request that is supposed to be
             * sent. It further contains the request method, url, request body, etc.
             *
             * @type {Request}
             */
            request: definition && (new Request(definition.request)),

            /**
             * An Item also contains a list of sample responses that is expected when the request defined in the item is
             * executed. The sample responses are useful in elaborating API usage and is also useful for other
             * integrations that use the sample responses to do something - say a mock service.
             *
             * @type {PropertyList<Response>}
             */
            responses: new PropertyList(Response, this, definition && definition.response),

            /**
             * Events are a set of of {@link Script}s that are executed when certain activities are triggered on an
             * Item. For example, on defining an event that listens to the "test" event, would cause the associated
             * script of the event to be executed when the test runs.
             *
             * @type {EventList}
             *
             * @example <caption>Add a script to be executed on "prerequest" event</caption>
             * var Collection = require('postman-collection').Collection,
             *     Item = require('postman-collection').Item,
             *     myCollection;
             *
             * myCollection = new Collection({
             *     "item": [{
             *         "name": "Send a GET request",
             *         "id": "my-get-request",
             *         "request": {
             *             "url": "https://postman-echo.com/get",
             *             "method": "GET"
             *         }
             *     }]
             * }); // create a collection with one request
             *
             * // add a pre-request script to the event list
             * myCollection.items.one('my-get-request').events.add({
             *     "listen": "prerequest",
             *     "script": {
             *         "type": "text/javascript",
             *         "exec": "console.log(new Date())"
             *     }
             * });
             */
            events: new EventList(this, definition && definition.event),

            /**
             * Set of configurations used to alter the usual behavior of sending the request.
             *
             * @type {Object}
             */
            protocolProfileBehavior: definition && typeof definition.protocolProfileBehavior === OBJECT ?
                definition.protocolProfileBehavior : undefined
        });
    }), Property);

_.assign(Item.prototype, /** @lends Item.prototype */ {
    /**
     * Defines whether this property instances requires an id
     *
     * @private
     * @readOnly
     * @type {Boolean}
     */
    _postman_propertyRequiresId: true,

    /**
     * Fetches applicable AuthType from the current item.
     *
     * @returns {RequestAuth}
     *
     * @note Since v3.0 release, this returns the entire auth RequestAuth, instead of just the parameters
     *
     * @todo Deprecate this and use getAuthResolved instead
     */
    getAuth: function () {
        var requestAuth;

        // find auth on request, if not found or empty auth, lookup in the parents
        // eslint-disable-next-line no-cond-assign
        return (requestAuth = extractAuth(this.request)) ? requestAuth : this.findInParents('auth', extractAuth);
    },

    /**
     * Fetches protocol profile behavior for the current Item
     *
     * @private
     * @returns {Object}
     *
     * @note This will not inherit protocol profile behaviors from parent,
     * use `getProtocolProfileBehaviorResolved` to achieve that behavior.
     */
    getProtocolProfileBehavior: function () {
        return extractProtocolProfileBehavior(this);
    },

    /**
     * Fetches protocol profile behavior applicable for the current Item,
     * inherited from parent ItemGroup(s).
     *
     * @private
     * @returns {Object}
     */
    getProtocolProfileBehaviorResolved: function () {
        var protocolProfileBehavior = extractProtocolProfileBehavior(this);

        // inherit protocolProfileBehavior from ItemGroup(s)
        this.forEachParent({ withRoot: true }, function (entity) {
            protocolProfileBehavior = {

                ...extractProtocolProfileBehavior(entity),
                ...protocolProfileBehavior
            };
        });

        return protocolProfileBehavior;
    },

    /**
     * Set or update protocol profile behavior for the current Item.
     *
     * @example <caption> Set or update protocol profile behavior </caption>
     * item.setProtocolProfileBehavior('strictSSL', false);
     *
     * @private
     * @param {String} key - protocol profile behavior name
     * @param {*} value - protocol profile behavior value
     * @returns {Item}
     */
    setProtocolProfileBehavior: function (key, value) {
        // bail out if key is non-string
        if (typeof key !== STRING) { return this; }

        !this.protocolProfileBehavior && (this.protocolProfileBehavior = {});

        this.protocolProfileBehavior[key] = value;

        return this;
    },

    /**
     * Unset or delete protocol profile behavior for the current Item.
     *
     * @example <caption> Unset protocol profile behavior </caption>
     * item.unsetProtocolProfileBehavior('strictSSL');
     *
     * @private
     * @param {String} key - protocol profile behavior name to unset
     * @returns {Item}
     */
    unsetProtocolProfileBehavior: function (key) {
        // bail out if property protocolProfileBehavior is not set or key is non-string
        if (!(typeof this.protocolProfileBehavior === OBJECT && typeof key === STRING)) {
            return this;
        }

        if (_.has(this.protocolProfileBehavior, key)) {
            delete this.protocolProfileBehavior[key];
        }

        return this;
    },

    /**
     * Returns {@link Event}s corresponding to a particular event name. If no name is given, returns all events. This
     * is useful when you want to trigger all associated scripts for an event.
     *
     * @param {String} name - one of the available event types such as `test`, `prerequest`, `postrequest`, etc.
     * @returns {Array<Event>}
     *
     * @example <caption>Get all events for an item and evaluate their scripts</caption>
     * var fs = require('fs'), // needed to read JSON file from disk
     *     Collection = require('postman-collection').Collection,
     *     myCollection;
     *
     * // Load a collection to memory from a JSON file on disk (say, sample-collection.json)
     * myCollection = new Collection(JSON.stringify(fs.readFileSync('sample-collection.json').toString()));
     *
     * // assuming the collection has a request called "my-request-1" in root, we get it's test events
     * myCollection.items.one("my-request-1").getEvents("test").forEach(function (event) {
     *     event.script && eval(event.script.toSource());
     * });
     *
     * @todo decide appropriate verb names based on the fact that it gets events for a specific listener name
     * @draft
     */
    getEvents: function (name) {
        if (!name) {
            return this.events.all(); // return all events if name is not provided.
        }

        return this.events.filter(function (ev) {
            return ev.listen === name;
        });
    },

    /**
     * Sets authentication method for the request within this item
     *
     * @param {?String|RequestAuth.definition} type -
     * @param {VariableList=} [options] -
     *
     * @note This function was previously (in v2 of SDK) used to clone request and populate headers. Now it is used to
     * only set auth information to request
     */
    authorizeRequestUsing: function (type, options) {
        if (!this.request) { this.request = new Request(); } // worst case

        return this.request.authorizeUsing(type, options);
    },

    /**
     * Returns the path of the item
     *
     * @returns {Array<string>}
     */
    getPath: function () {
        const path = [],
            pushItem = (item) => { path.push(item.name); };

        pushItem(this);
        this.forEachParent({ withRoot: true }, pushItem);

        return path.reverse();
    }
});

_.assign(Item, /** @lends Item */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Item',

    /**
     * Check whether an object is an instance of PostmanItem.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isItem: function (obj) {
        return Boolean(obj) && ((obj instanceof Item) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Item._postman_propertyName));
    }
});

module.exports = {
    Item
};
