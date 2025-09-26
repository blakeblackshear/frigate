var _ = require('../util').lodash,
    Property = require('./property').Property,
    Script = require('./script').Script,

    Event;

/**
 * @typedef Event.definition
 * @property {String} listen The event-name that this script will be called for. Usually either "test" or "prerequest"
 * @property {Script|String} script A {@link Script} instance that will be executed on this event. In case of a
 * string, a new {@link Script} is created.
 * @example <caption>Constructing an event</caption>
 * var Event = require('postman-collection').Event,
 *     rawEvent = {
 *         listen: 'test',
 *         script: 'tests["response code is 401"] = responseCode.code === 401'
 *     },
 *     myEvent;
 * myEvent = new Event(rawEvent);
 */
_.inherit((

    /**
     * A Postman event definition that refers to an event to be listened to and a script reference or definition to be
     * executed.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {Event.definition} definition Pass the initial definition of the event as the options parameter.
     */
    Event = function PostmanEvent (definition) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Event.super_.call(this, definition);
        // set initial values of this event
        definition && this.update(definition);
    }), Property);

_.assign(Event.prototype, /** @lends Event.prototype */ {
    /**
     * Update an event.
     *
     * @param {Event.definition} definition -
     */
    update (definition) {
        if (!definition) {
            return;
        }

        var result,
            script = definition.script;

        if (Script.isScript(script)) {
            result = script;
        }
        else if (_.isArray(script) || _.isString(script)) {
            result = new Script({ exec: script });
        }
        else if (_.isObject(script)) {
            result = new Script(script);
        }

        _.mergeDefined(this, /** @lends Event.prototype */ {
            /**
             * Name of the event that this instance is intended to listen to.
             *
             * @type {String}
             */
            listen: _.isString(definition.listen) ? definition.listen : undefined,

            /**
             * The script that is to be executed when this event is triggered.
             *
             * @type {Script}
             */
            script: result
        });
    }
});

_.assign(Event, /** @lends Event */ {

    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Event'
});

module.exports = {
    Event
};
