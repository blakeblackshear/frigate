var _ = require('../util').lodash,
    PropertyList = require('./property-list').PropertyList,
    Event = require('./event').Event,

    EventList;

_.inherit((

    /**
     * A type of {@link PropertyList}, EventList handles resolving events from parents. If an {@link ItemGroup} contains
     * a set of events, each {@link Item} in that group will inherit those events from its parent, and so on.
     *
     * @constructor
     * @param {Object} parent -
     * @param {Object[]} populate -
     * @extends {PropertyList}
     *
     * This is useful when we need to have a common test across all requests.
     */
    EventList = function PostmanEventList (parent, populate) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        EventList.super_.call(this, Event, parent, populate);
    }), PropertyList);

_.assign(EventList.prototype, /** @lends EventList.prototype */ {
    /**
     * Returns an array of listeners filtered by the listener name
     *
     * @note
     * If one needs to access disabled events, use {@link PropertyList#all} or
     * any other similar {@link PropertyList} method.
     *
     * @param {String} name -
     * @returns {Array<Event>}
     */
    listeners (name) {
        var all;

        // we first procure all matching events from this list
        all = this.listenersOwn(name);

        this.eachParent(function (parent) {
            var parentEvents;

            // we check that the parent is not immediate mother. then we check whether the non immediate mother has a
            // valid `events` store and only if this store has events with specified listener, we push them to the
            // array we are compiling for return
            (parent !== this.__parent) && EventList.isEventList(parent.events) &&
                (parentEvents = parent.events.listenersOwn(name)) && parentEvents.length &&
                all.unshift.apply(all, parentEvents); // eslint-disable-line prefer-spread
        }, this);

        return all;
    },

    /**
     * Returns all events with specific listeners only within this list. Refer to {@link EventList#listeners} for
     * procuring all inherited events
     *
     * @param {string} name -
     * @returns {Array<Event>}
     */
    listenersOwn (name) {
        return this.filter(function (event) {
            return (!event.disabled && event.listen === name);
        });
    }
});

_.assign(EventList, /** @lends EventList */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'EventList',

    /**
     * Checks if the given object is an EventList.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isEventList: function (obj) {
        return Boolean(obj) && ((obj instanceof EventList) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', EventList._postman_propertyName));
    }
});

module.exports = {
    EventList
};
