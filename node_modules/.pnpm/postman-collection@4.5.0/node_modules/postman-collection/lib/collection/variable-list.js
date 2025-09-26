var _ = require('../util').lodash,
    PropertyList = require('./property-list').PropertyList,
    Property = require('./property').Property,
    Variable = require('./variable').Variable,

    VariableList;

_.inherit((

    /**
     * @constructor
     * @extends {PropertyList}
     *
     * @param {Property} parent -
     * @param {Object|Array} populate -
     */
    VariableList = function PostmanVariableList (parent, populate) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        VariableList.super_.call(this, Variable, parent, populate);
    }), PropertyList);

_.assign(VariableList.prototype, /** @lends VariableList.prototype */ {
    /**
     * Replaces the variable tokens inside a string with its actual values.
     *
     * @param {String} str -
     * @param {Object} [overrides] - additional objects to lookup for variable values
     * @returns {String}
     */
    replace (str, overrides) {
        return Property.replaceSubstitutions(str, this, overrides);
    },

    /**
     * Recursively replace strings in an object with instances of variables. Note that it clones the original object. If
     * the `mutate` param is set to true, then it replaces the same object instead of creating a new one.
     *
     * @param {Array|Object} obj -
     * @param {?Array<Object>=} [overrides] - additional objects to lookup for variable values
     * @param {Boolean=} [mutate=false] -
     * @returns {Array|Object}
     */
    substitute (obj, overrides, mutate) {
        var resolutionQueue = [], // we use this to store the queue of variable hierarchy

            // this is an intermediate object to stimulate a property (makes the do-while loop easier)
            variableSource = {
                variables: this,
                __parent: this.__parent
            };

        do { // iterate and accumulate as long as you find `.variables` in parent tree
            variableSource.variables && resolutionQueue.push(variableSource.variables);
            variableSource = variableSource.__parent;
        } while (variableSource);

        variableSource = null; // cautious cleanup

        return Property.replaceSubstitutionsIn(obj, _.union(resolutionQueue, overrides), mutate);
    },

    /**
     * Using this function, one can sync the values of this variable list from a reference object.
     *
     * @param {Object} obj -
     * @param {Boolean=} track -
     * @param {Boolean} [prune=true] -
     *
     * @returns {Object}
     */
    syncFromObject (obj, track, prune) {
        var list = this,
            ops = track && {
                created: [],
                updated: [],
                deleted: []
            },
            indexer = list._postman_listIndexKey,
            tmp;

        if (!_.isObject(obj)) { return ops; }

        // ensure that all properties in the object is updated in this list
        _.forOwn(obj, function (value, key) {
            // we need to create new variable if exists or update existing
            if (list.has(key)) {
                list.one(key).set(value);
                ops && ops.updated.push(key);
            }
            else {
                tmp = { value };
                tmp[indexer] = key;
                list.add(tmp);
                tmp = null;
                ops && ops.created.push(key);
            }
        });

        // now remove any variable that is not in source object
        // @note - using direct `this.reference` list of keys here so that we can mutate the list while iterating
        // on it
        if (prune !== false) {
            _.forEach(list.reference, function (value, key) {
                if (_.has(obj, key)) { return; } // de not delete if source obj has this variable
                list.remove(key); // use PropertyList functions to remove so that the .members array is cleared too
                ops && ops.deleted.push(key);
            });
        }

        return ops;
    },

    /**
     * Transfer all variables from this list to an object
     *
     * @param {Object=} [obj] -
     * @returns {Object}
     */
    syncToObject (obj) {
        var list = this;

        // in case user did not provide an object to mutate, create a new one
        !_.isObject(obj) && (obj = {});

        // delete extra variables from object that are not present in list
        _.forEach(obj, function (value, key) {
            !_.has(list.reference, key) && (delete obj[key]);
        });

        // we first sync all variables in this list to the object
        list.each(function (variable) {
            obj[variable.key] = variable.valueOf();
        });

        return obj;
    },

    /**
     * Fetches a variable and normalize its reference if disabled.
     * This updates the disabled variable `reference` in VariableList with its
     * last enabled duplicate(if found) in the `members` list.
     *
     * @private
     * @param {String} variableName - The name of the variable to get
     * @returns {Variable} - In case of duplicates, returns last enabled
     */
    oneNormalizedVariable (variableName) {
        var indexKey = this._postman_listIndexKey, // `key` for Variable
            variable = this.reference[variableName],
            i;

        if (variable && !variable.disabled) {
            return variable;
        }

        // traverse the members list in reverse direction in order to find the last enabled
        for (i = this.members.length - 1; i >= 0; i--) {
            variable = this.members[i];
            if (variable[indexKey] === variableName && !variable.disabled) {
                // update the input variable reference if comparison is not disabled
                this.reference[variableName] = variable;
                break; // return updated reference variable
            }
        }

        return this.reference[variableName];
    }
});

_.assign(VariableList, /** @lends VariableList */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     *
     * @note that this is directly accessed only in case of VariableList from _.findValue lodash util mixin
     */
    _postman_propertyName: 'VariableList',

    /**
     * Checks whether an object is a VariableList
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isVariableList: function (obj) {
        return Boolean(obj) && ((obj instanceof VariableList) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', VariableList._postman_propertyName));
    }
});

module.exports = {
    VariableList
};
