var _ = require('../util').lodash,
    PropertyBase = require('./property-base').PropertyBase,

    __PARENT = '__parent',
    DEFAULT_INDEX_ATTR = 'id',
    DEFAULT_INDEXCASE_ATTR = false,
    DEFAULT_INDEXMULTI_ATTR = false,

    PropertyList;

/**
 * An item constructed of PropertyList.Type.
 *
 * @typedef {Object} PropertyList.Type
 */
_.inherit((

    /**
     * @constructor
     * @param {Function} type -
     * @param {Object} parent -
     * @param {Array} populate -
     */
    PropertyList = function PostmanPropertyList (type, parent, populate) {
        // @todo add this test sometime later
        // if (!type) {
        //     throw new Error('postman-collection: cannot initialise a list without a type parameter');
        // }

        PropertyList.super_.call(this); // call super with appropriate options

        this.setParent(parent); // save reference to parent
        _.assign(this, /** @lends PropertyList.prototype */ {
            /**
             * @private
             * @type {Array}
             */
            members: this.members || [],

            /**
             * @private
             * @type {Object}
             * @note This should not be used, and it's not guaranteed to be in sync with the actual list of members.
             */
            reference: this.reference || {},

            /**
             * @private
             * @type {Function}
             */
            Type: type
        });

        // if the type this list holds has its own index key, then use the same
        _.getOwn(type, '_postman_propertyIndexKey') && (this._postman_listIndexKey = type._postman_propertyIndexKey);

        // if the type has case sensitivity flags, set the same
        _.getOwn(type, '_postman_propertyIndexCaseInsensitive') && (this._postman_listIndexCaseInsensitive =
            type._postman_propertyIndexCaseInsensitive);

        // if the type allows multiple values, set the flag
        _.getOwn(type, '_postman_propertyAllowsMultipleValues') && (this._postman_listAllowsMultipleValues =
            type._postman_propertyAllowsMultipleValues);

        // prepopulate
        populate && this.populate(populate);
    }), PropertyBase);

_.assign(PropertyList.prototype, /** @lends PropertyList.prototype */ {

    /**
     * Indicates that this element contains a number of other elements.
     *
     * @private
     */
    _postman_propertyIsList: true,

    /**
     * Holds the attribute to index this PropertyList by. Default: 'id'
     *
     * @private
     * @type {String}
     */
    _postman_listIndexKey: DEFAULT_INDEX_ATTR,

    /**
     * Holds the attribute whether indexing of this list is case sensitive or not
     *
     * @private
     * @type {String}
     */
    _postman_listIndexCaseInsensitive: DEFAULT_INDEXCASE_ATTR,

    /**
     * Holds the attribute whether exporting the index retains duplicate index items
     *
     * @private
     * @type {String}
     */
    _postman_listAllowsMultipleValues: DEFAULT_INDEXMULTI_ATTR,

    /**
     * Insert an element at the end of this list. When a reference member specified via second parameter is found, the
     * member is inserted at an index before the reference member.
     *
     * @param {PropertyList.Type} item -
     * @param {PropertyList.Type|String} [before] -
     */
    insert: function (item, before) {
        if (!_.isObject(item)) { return; } // do not proceed on empty param

        var duplicate = this.indexOf(item),
            index;

        // remove from previous list
        PropertyList.isPropertyList(item[__PARENT]) && (item[__PARENT] !== this) && item[__PARENT].remove(item);
        // inject the parent reference
        _.assignHidden(item, __PARENT, this);

        // ensure that we do not double insert things into member array
        (duplicate > -1) && this.members.splice(duplicate, 1);
        // find the position of the reference element
        before && (before = this.indexOf(before));

        // inject to the members array ata position or at the end in case no item is there for reference
        (before > -1) ? this.members.splice(before, 0, item) : this.members.push(item);

        // store reference by id, so create the index string. we first ensure that the index value is truthy and then
        // recheck that the string conversion of the same is truthy as well.
        if ((index = item[this._postman_listIndexKey]) && (index = String(index))) {
            // desensitise case, if the property needs it to be
            this._postman_listIndexCaseInsensitive && (index = index.toLowerCase());

            // if multiple values are allowed, the reference may contain an array of items, mapped to an index.
            if (this._postman_listAllowsMultipleValues && Object.hasOwnProperty.call(this.reference, index)) {
                // if the value is not an array, convert it to an array.
                !_.isArray(this.reference[index]) && (this.reference[index] = [this.reference[index]]);

                // add the item to the array of items corresponding to this index
                this.reference[index].push(item);
            }
            else {
                this.reference[index] = item;
            }
        }
    },

    /**
     * Insert an element at the end of this list. When a reference member specified via second parameter is found, the
     * member is inserted at an index after the reference member.
     *
     * @param {PropertyList.Type} item -
     * @param {PropertyList.Type|String} [after] -
     */
    insertAfter: function (item, after) {
        // convert item to positional reference
        return this.insert(item, this.idx(this.indexOf(after) + 1));
    },

    /**
     * Adds or moves an item to the end of this list.
     *
     * @param {PropertyList.Type} item -
     */
    append: function (item) {
        return this.insert(item);
    },

    /**
     * Adds or moves an item to the beginning of this list.
     *
     * @param {PropertyList.Type} item -
     */
    prepend: function (item) {
        return this.insert(item, this.idx(0));
    },

    /**
     * Add an item or item definition to this list.
     *
     * @param {Object|PropertyList.Type} item -
     * @todo
     * - remove item from original parent if already it has a parent
     * - validate that the original parent's constructor matches this parent's constructor
     */
    add: function (item) {
        // do not proceed on empty param, but empty strings are in fact valid.
        // eslint-disable-next-line lodash/prefer-is-nil
        if (_.isNull(item) || _.isUndefined(item) || _.isNaN(item)) { return; }

        // create new instance of the item based on the type specified if it is not already
        this.insert((item.constructor === this.Type) ? item :
            // if the property has a create static function, use it.
            // eslint-disable-next-line prefer-spread
            (_.has(this.Type, 'create') ? this.Type.create.apply(this.Type, arguments) : new this.Type(item)));
    },

    /**
     * Add an item or update an existing item
     *
     * @param {PropertyList.Type} item -
     * @returns {?Boolean}
     */
    upsert: function (item) {
        // do not proceed on empty param, but empty strings are in fact valid.
        if (_.isNil(item) || _.isNaN(item)) { return null; }

        var indexer = this._postman_listIndexKey,
            existing = this.one(item[indexer]);

        if (existing) {
            if (!_.isFunction(existing.update)) {
                throw new Error('collection: unable to upsert into a list of Type that does not support .update()');
            }
            existing.update(item);

            return false;
        }

        // since there is no existing item, just add a new one
        this.add(item);

        return true; // indicate added
    },

    /**
     * Removes all elements from the PropertyList for which the predicate returns truthy.
     *
     * @param {Function|String|PropertyList.Type} predicate -
     * @param {Object} context Optional context to bind the predicate to.
     */
    remove: function (predicate, context) {
        var match; // to be used if predicate is an ID

        !context && (context = this);

        if (_.isString(predicate)) {
            // if predicate is id, then create a function to remove that
            // need to take care of case sensitivity as well :/
            match = this._postman_listIndexCaseInsensitive ? predicate.toLowerCase() : predicate;
            predicate = function (item) {
                var id = item[this._postman_listIndexKey];

                this._postman_listIndexCaseInsensitive && (id = id.toLowerCase());

                return id === match;
            }.bind(this);
        }
        else if (predicate instanceof this.Type) {
            // in case an object reference is sent, prepare it for removal using direct reference comparison
            match = predicate;
            predicate = function (item) {
                return (item === match);
            };
        }

        _.isFunction(predicate) && _.remove(this.members, function (item) {
            var index;

            if (predicate.apply(context, arguments)) {
                if ((index = item[this._postman_listIndexKey]) && (index = String(index))) {
                    this._postman_listIndexCaseInsensitive && (index = index.toLowerCase());

                    if (this._postman_listAllowsMultipleValues && _.isArray(this.reference[index])) {
                        // since we have an array of multiple values, remove only the value for which the
                        // predicate returned truthy. If the array becomes empty, just delete it.
                        _.remove(this.reference[index], function (each) {
                            return each === item;
                        });

                        // If the array becomes empty, remove it
                        /* istanbul ignore next */
                        (this.reference[index].length === 0) && (delete this.reference[index]);

                        // If the array contains only one element, remove the array, and assign the element
                        // as the reference value
                        (this.reference[index].length === 1) && (this.reference[index] = this.reference[index][0]);
                    }
                    else {
                        delete this.reference[index];
                    }
                }
                delete item[__PARENT]; // unlink from its parent

                return true;
            }
        }.bind(this));
    },

    /**
     * Removes all items in the list
     */
    clear: function () {
        // we unlink every member from it's parent (assuming this is their parent)
        this.all().forEach(PropertyList._unlinkItemFromParent);

        this.members.length = 0; // remove all items from list

        // now we remove all items from index reference
        Object.keys(this.reference).forEach(function (key) {
            delete this.reference[key];
        }.bind(this));
    },

    /**
     * Load one or more items
     *
     * @param {Object|Array} items -
     */
    populate: function (items) {
        // if Type supports parsing of string headers then do it before adding it.
        _.isString(items) && _.isFunction(this.Type.parse) && (items = this.Type.parse(items));
        // add a single item or an array of items.
        _.forEach(_.isArray(items) ? items :
            // if population is not an array, we send this as single item in an array or send each property separately
            // if the core Type supports Type.create
            ((_.isPlainObject(items) && _.has(this.Type, 'create')) ? items : [items]), this.add.bind(this));
    },

    /**
     * Clears the list and adds new items.
     *
     * @param {Object|Array} items -
     */
    repopulate: function (items) {
        this.clear();
        this.populate(items);
    },

    /**
     * Add or update values from a source list.
     *
     * @param {PropertyList|Array} source -
     * @param {Boolean} [prune=false] Setting this to `true` will cause the extra items from the list to be deleted
     */
    assimilate: function (source, prune) {
        var members = PropertyList.isPropertyList(source) ? source.members : source,
            list = this,
            indexer = list._postman_listIndexKey,
            sourceKeys = {}; // keeps track of added / updated keys for later exclusion

        if (!_.isArray(members)) {
            return;
        }

        members.forEach(function (item) {
            /* istanbul ignore if */
            if (!(item && _.has(item, indexer))) { return; }
            list.upsert(item);
            sourceKeys[item[indexer]] = true;
        });

        // now remove any variable that is not in source object
        // @note - using direct `this.reference` list of keys here so that we can mutate the list while iterating
        // on it
        if (prune) {
            _.forEach(list.reference, function (value, key) {
                if (_.has(sourceKeys, key)) { return; } // de not delete if source obj has this variable
                list.remove(key); // use PropertyList functions to remove so that the .members array is cleared too
            });
        }
    },

    /**
     * Returns a map of all items.
     *
     * @returns {Object}
     */
    all: function () {
        return _.clone(this.members);
    },

    /**
     * Get Item in this list by `ID` reference. If multiple values are allowed, the last value is returned.
     *
     * @param {String} id -
     * @returns {PropertyList.Type}
     */
    one: function (id) {
        var val = this.reference[this._postman_listIndexCaseInsensitive ? String(id).toLowerCase() : id];

        if (this._postman_listAllowsMultipleValues && Array.isArray(val)) {
            return val.length ? val[val.length - 1] :
                /* istanbul ignore next */
                undefined;
        }

        return val;
    },

    /**
     * Get the value of an item in this list. This is similar to {@link PropertyList.one} barring the fact that it
     * returns the value of the underlying type of the list content instead of the item itself.
     *
     * @param {String|Function} key -
     * @returns {PropertyList.Type|*}
     */
    get: function (key) {
        var member = this.one(key);

        if (!member) { return; } // eslint-disable-line getter-return

        return member.valueOf();
    },

    /**
     * Iterate on each item of this list.
     *
     * @param {Function} iterator -
     * @param {Object} context -
     */
    each: function (iterator, context) {
        _.forEach(this.members, _.isFunction(iterator) ? iterator.bind(context || this.__parent) : iterator);
    },

    /**
     * @param {Function} rule -
     * @param {Object} context -
     */
    filter: function (rule, context) {
        return _.filter(this.members, _.isFunction(rule) && _.isObject(context) ? rule.bind(context) : rule);
    },

    /**
     * Find an item within the item group
     *
     * @param {Function} rule -
     * @param {Object} [context] -
     * @returns {Item|ItemGroup}
     */
    find: function (rule, context) {
        return _.find(this.members, _.isFunction(rule) && _.isObject(context) ? rule.bind(context) : rule);
    },

    /**
     * Iterates over the property list.
     *
     * @param {Function} iterator Function to call on each item.
     * @param {Object} context Optional context, defaults to the PropertyList itself.
     */
    map: function (iterator, context) {
        return _.map(this.members, _.isFunction(iterator) ? iterator.bind(context || this) : iterator);
    },

    /**
     * Iterates over the property list and accumulates the result.
     *
     * @param {Function} iterator Function to call on each item.
     * @param {*} accumulator Accumulator initial value
     * @param {Object} context Optional context, defaults to the PropertyList itself.
     */
    reduce: function (iterator, accumulator, context) {
        return _.reduce(this.members, _.isFunction(iterator) ?
            iterator.bind(context || this) :
            /* istanbul ignore next */
            iterator
        , accumulator);
    },

    /**
     * Returns the length of the PropertyList
     *
     * @returns {Number}
     */
    count: function () {
        return this.members.length;
    },

    /**
     * Get a member of this list by it's index
     *
     * @param {Number} index -
     * @returns {PropertyList.Type}
     */
    idx: function (index) {
        return this.members[index];
    },

    /**
     * Find the index of an item in this list
     *
     * @param {String|Object} item -
     * @returns {Number}
     */
    indexOf: function (item) {
        return this.members.indexOf(_.isString(item) ? (item = this.one(item)) : item);
    },

    /**
     * Check whether an item exists in this list
     *
     * @param {String|PropertyList.Type} item -
     * @param {*=} value -
     * @returns {Boolean}
     */
    has: function (item, value) {
        var match,
            val,
            i;

        match = _.isString(item) ?
            this.reference[this._postman_listIndexCaseInsensitive ? item.toLowerCase() : item] :
            this.filter(function (member) {
                return member === item;
            });

        // If we don't have a match, there's nothing to do
        if (!match) { return false; }

        // if no value is provided, just check if item exists
        if (arguments.length === 1) {
            return Boolean(_.isArray(match) ? match.length : match);
        }

        // If this property allows multiple values and we get an array, we need to iterate through it and see
        // if any element matches.
        if (this._postman_listAllowsMultipleValues && _.isArray(match)) {
            for (i = 0; i < match.length; i++) {
                // use the value of the current element
                val = _.isFunction(match[i].valueOf) ? match[i].valueOf() :
                    /* istanbul ignore next */
                    match[i];

                if (val === value) { return true; }
            }

            // no matches were found, so return false here.
            return false;
        }

        // We didn't have an array, so just check if the matched value equals the provided value.
        _.isFunction(match.valueOf) && (match = match.valueOf());

        return match === value;
    },

    /**
     * Iterates over all parents of the property list
     *
     * @param {Function} iterator -
     * @param {Object=} [context] -
     */
    eachParent: function (iterator, context) {
        // validate parameters
        if (!_.isFunction(iterator)) { return; }
        !context && (context = this);

        var parent = this.__parent,
            prev;

        // iterate till there is no parent
        while (parent) {
            // call iterator with the parent and previous parent
            iterator.call(context, parent, prev);

            // update references
            prev = parent;
            parent = parent.__parent;
        }
    },

    /**
     * Converts a list of Properties into an object where key is `_postman_propertyIndexKey` and value is determined
     * by the `valueOf` function
     *
     * @param {?Boolean} [excludeDisabled=false] - When set to true, disabled properties are excluded from the resultant
     * object.
     * @param {?Boolean} [caseSensitive] - When set to true, properties are treated strictly as per their original
     * case. The default value for this property also depends on the case insensitivity definition of the current
     * property.
     * @param {?Boolean} [multiValue=false] - When set to true, only the first value of a multi valued property is
     * returned.
     * @param {Boolean} [sanitizeKeys=false] - When set to true, properties with falsy keys are removed.
     * @todo Change the function signature to an object of options instead of the current structure.
     * @returns {Object}
     */
    toObject: function (excludeDisabled, caseSensitive, multiValue, sanitizeKeys) {
        var obj = {}, // create transformation data accumulator

            // gather all the switches of the list
            key = this._postman_listIndexKey,
            sanitiseKeys = this._postman_sanitizeKeys || sanitizeKeys,
            sensitive = !this._postman_listIndexCaseInsensitive || caseSensitive,
            multivalue = this._postman_listAllowsMultipleValues || multiValue;

        // iterate on each member to create the transformation object
        this.each(function (member) {
            // Bail out for the current member if ANY of the conditions below is true:
            // 1. The member is falsy.
            // 2. The member does not have the specified property list index key.
            // 3. The member is disabled and disabled properties have to be ignored.
            // 4. The member has a falsy key, and sanitize is true.
            if (!member || !_.has(member, key) || (excludeDisabled && member.disabled) ||
                (sanitiseKeys && !member[key])) {
                return;
            }

            // based on case sensitivity settings, we get the property name of the item
            var prop = sensitive ? member[key] : String(member[key]).toLowerCase();

            // now, if transformation object already has a member with same property name, we either overwrite it or
            // append to an array of values based on multi-value support
            if (multivalue && _.has(obj, prop)) {
                (!Array.isArray(obj[prop])) && (obj[prop] = [obj[prop]]);
                obj[prop].push(member.valueOf());
            }
            else {
                obj[prop] = member.valueOf();
            }
        });

        return obj;
    },

    /**
     * Adds ability to convert a list to a string provided it's underlying format has unparse function defined.
     *
     * @returns {String}
     */
    toString: function () {
        if (this.Type.unparse) {
            return this.Type.unparse(this.members);
        }

        return this.constructor ? this.constructor.prototype.toString.call(this) : '';
    },

    toJSON: function () {
        if (!this.count()) {
            return [];
        }

        return _.map(this.members, function (member) {
            // use member.toJSON if it exists
            if (!_.isEmpty(member) && _.isFunction(member.toJSON)) {
                return member.toJSON();
            }

            return _.reduce(member, function (accumulator, value, key) {
                if (value === undefined) { // true/false/null need to be preserved.
                    return accumulator;
                }

                // Handle plurality of PropertyLists in the SDK vs the exported JSON.
                // Basically, removes the trailing "s" from key if the value is a property list.
                if (value && value._postman_propertyIsList && !value._postman_proprtyIsSerialisedAsPlural &&
                    _.endsWith(key, 's')) {
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
        });
    }
});

_.assign(PropertyList, /** @lends PropertyList */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'PropertyList',

    /**
     * Removes child-parent links for the provided PropertyList member.
     *
     * @param {Property} item - The property for which to perform parent de-linking.
     * @private
     */
    _unlinkItemFromParent: function (item) {
        item.__parent && (delete item.__parent); // prevents V8 from making unnecessary look-ups if there is no __parent
    },

    /**
     * Checks whether an object is a PropertyList
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isPropertyList: function (obj) {
        return Boolean(obj) && ((obj instanceof PropertyList) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', PropertyList._postman_propertyName));
    }
});

module.exports = {
    PropertyList
};
