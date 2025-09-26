var _ = require('../util').lodash,

    __PARENT = '__parent',

    PropertyBase; // constructor

/**
 * @typedef PropertyBase.definition
 * @property {String|Description} [description]
 */
/**
 * Base of all properties in Postman Collection. It defines the root for all standalone properties for postman
 * collection.
 *
 * @constructor
 * @param {PropertyBase.definition} definition -
 */
PropertyBase = function PropertyBase (definition) {
    // In case definition object is missing, there is no point moving forward. Also if the definition is basic string
    // we do not need to do anything with it.
    if (!definition || typeof definition === 'string') { return; }

    // call the meta extraction functions to create the object where all keys that are prefixed with underscore can be
    // stored. more details on that can be retrieved from the propertyExtractMeta function itself.
    // @todo: make this a closed function to do getter and setter which is non enumerable
    var src = definition && definition.info || definition,
        meta = _(src).pickBy(PropertyBase.propertyIsMeta).mapKeys(PropertyBase.propertyUnprefixMeta).value();

    if (_.keys(meta).length) {
        this._ = _.isObject(this._) ?
            /* istanbul ignore next */
            _.mergeDefined(this._, meta) :
            meta;
    }
};

_.assign(PropertyBase.prototype, /** @lends PropertyBase.prototype */ {

    /**
     * Invokes the given iterator for every parent in the parent chain of the given element.
     *
     * @param {Object} options - A set of options for the parent chain traversal.
     * @param {?Boolean} [options.withRoot=false] - Set to true to include the collection object as well.
     * @param {Function} iterator - The function to call for every parent in the ancestry chain.
     * @todo Cache the results
     */
    forEachParent (options, iterator) {
        _.isFunction(options) && (iterator = options, options = {});
        if (!_.isFunction(iterator) || !_.isObject(options)) { return; }

        var parent = this.parent(),
            grandparent = parent && _.isFunction(parent.parent) && parent.parent();

        while (parent && (grandparent || options.withRoot)) {
            iterator(parent);
            parent = grandparent;
            grandparent = grandparent && _.isFunction(grandparent.parent) && grandparent.parent();
        }
    },

    /**
     * Tries to find the given property locally, and then proceeds to lookup in each parent,
     * going up the chain as necessary. Lookup will continue until `customizer` returns a truthy value. If used
     * without a customizer, the lookup will stop at the first parent that contains the property.
     *
     * @param {String} property -
     * @param {Function} [customizer] -
     * @returns {*|undefined}
     */
    findInParents (property, customizer) {
        var owner = this.findParentContaining(property, customizer);

        return owner ? owner[property] : undefined;
    },

    /**
     * Looks up the closest parent which has a truthy value for the given property. Lookup will continue
     * until `customizer` returns a truthy value. If used without a customizer,
     * the lookup will stop at the first parent that contains the property.
     *
     * @private
     * @param {String} property -
     * @param {Function} [customizer] -
     * @returns {PropertyBase|undefined}
     */
    findParentContaining (property, customizer) {
        var parent = this;

        // if customizer is present test with it
        if (customizer) {
            customizer = customizer.bind(this);

            do {
                // else check for existence
                if (customizer(parent)) {
                    return parent;
                }

                parent = parent.__parent;
            } while (parent);
        }

        // else check for existence
        else {
            do {
                if (parent[property]) {
                    return parent;
                }

                parent = parent.__parent;
            } while (parent);
        }
    },

    /**
     * Returns the JSON representation of a property, which conforms to the way it is defined in a collection.
     * You can use this method to get the instantaneous representation of any property, including a {@link Collection}.
     */
    toJSON () {
        return _.reduce(this, function (accumulator, value, key) {
            if (value === undefined) { // true/false/null need to be preserved.
                return accumulator;
            }

            // Handle plurality of PropertyLists in the SDK vs the exported JSON.
            // Basically, removes the trailing "s" from key if the value is a property list.
            // eslint-disable-next-line max-len
            if (value && value._postman_propertyIsList && !value._postman_proprtyIsSerialisedAsPlural && _.endsWith(key, 's')) {
                key = key.slice(0, -1);
            }

            // Handle 'PropertyBase's
            if (value && _.isFunction(value.toJSON)) {
                accumulator[key] = value.toJSON();

                return accumulator;
            }

            // Handle Strings
            if (_.isString(value)) {
                accumulator[key] = value;

                return accumulator;
            }

            // Everything else
            accumulator[key] = _.cloneElement(value);

            return accumulator;
        }, {});
    },

    /**
     * Returns the meta keys associated with the property
     *
     * @returns {*}
     */
    meta () {
        return arguments.length ? _.pick(this._, Array.prototype.slice.apply(arguments)) : _.cloneDeep(this._);
    },

    /**
     * Returns the parent of item
     *
     * @returns {*|undefined}
     */
    parent () {
        // @todo return grandparent only if it is a list
        return this && this.__parent && (this.__parent.__parent || this.__parent) || undefined;
    },

    /**
     * Accepts an object and sets it as the parent of the current property.
     *
     * @param {Object} parent The object to set as parent.
     * @private
     */
    setParent (parent) {
        _.assignHidden(this, __PARENT, parent);
    }
});

_.assign(PropertyBase, /** @lends PropertyBase */ {

    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'PropertyBase',

    /**
     * Filter function to check whether a key starts with underscore or not. These usually are the meta properties. It
     * returns `true` if the criteria is matched.
     *
     * @param {*} value -
     * @param {String} key -
     *
     * @returns {boolean}
     */
    propertyIsMeta: function (value, key) {
        return _.startsWith(key, '_') && (key !== '_');
    },

    /**
     * Map function that removes the underscore prefix from an object key.
     *
     * @param {*} value -
     * @param {String} key -
     * @returns {String}
     */
    propertyUnprefixMeta: function (value, key) {
        return _.trimStart(key, '_');
    },

    /**
     * Static function which allows calling toJSON() on any object.
     *
     * @param {Object} obj -
     * @returns {*}
     */
    toJSON: function (obj) {
        return PropertyBase.prototype.toJSON.call(obj);
    }
});

module.exports = {
    PropertyBase
};
