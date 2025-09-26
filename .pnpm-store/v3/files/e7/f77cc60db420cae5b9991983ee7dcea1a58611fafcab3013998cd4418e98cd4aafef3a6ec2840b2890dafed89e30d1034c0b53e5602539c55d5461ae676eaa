var _ = require('../util').lodash,
    Property = require('./property').Property,
    PropertyBase = require('./property-base').PropertyBase,
    VariableList = require('./variable-list').VariableList,
    MutationTracker = require('./mutation-tracker').MutationTracker,

    /**
     * Known variable mutation types.
     *
     * @private
     * @constant
     * @type {Object}
     */
    MUTATIONS = {
        SET: 'set',
        UNSET: 'unset'
    },

    VariableScope;

/**
 * Environment and Globals of postman is exported and imported in a specified data structure. This data structure can be
 * passed on to the constructor parameter of {@link VariableScope} or {@link VariableList} to instantiate an instance of
 * the same with pre-populated values from arguments.
 *
 * @typedef VariableScope.definition
 * @property {String} [id] ID of the scope
 * @property {String} [name] A name of the scope
 * @property {Array.<Variable.definition>} [values] A list of variables defined in an array in form of `{name:String,
 * value:String}`
 *
 * @example <caption>JSON definition of a VariableScope (environment, globals, etc)</caption>
 * {
 *   "name": "globals",
 *   "values": [{
 *     "key": "var-1",
 *     "value": "value-1"
 *   }, {
 *     "key": "var-2",
 *     "value": "value-2"
 *   }]
 * }
 */
_.inherit((

    /**
     * VariableScope is a representation of a list of variables in Postman, such as the environment variables or the
     * globals. Using this object, it is easy to perform operations on this list of variables such as get a variable or
     * set a variable.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {VariableScope.definition} definition The constructor accepts an initial set of values for initialising
     * the scope
     * @param {Array<VariableList>=} layers Additional parent scopes to search for and resolve variables
     *
     * @example <caption>Load a environment from file, modify and save back</caption>
     * var fs = require('fs'), // assuming NodeJS
     *     env,
     *     sum;
     *
     * // load env from file assuming it has initial data
     * env = new VariableScope(JSON.parse(fs.readFileSync('./my-postman-environment.postman_environment').toString()));
     *
     * // get two variables and add them
     * sum = env.get('one-var') + env.get('another-var');
     *
     * // save it back in environment and write to file
     * env.set('sum', sum, 'number');
     * fs.writeFileSync('./sum-of-vars.postman_environment', JSON.stringify(env.toJSON()));
     */
    VariableScope = function PostmanVariableScope (definition, layers) {
        // in case the definition is an array (legacy format) or existing as list, we convert to actual format
        if (_.isArray(definition) || VariableList.isVariableList(definition)) {
            definition = { values: definition };
        }

        // we accept parent scopes to increase search area. Here we normalize the argument to be an array
        // so we can easily loop though them and add them to the instance.
        layers && !_.isArray(layers) && (layers = [layers]);

        // this constructor is intended to inherit and as such the super constructor is required to be executed
        VariableScope.super_.call(this, definition);

        var values = definition && definition.values, // access the values (need this var to reuse access)

            // enable mutation tracking if `mutations` are in definition (restore the state)
            // or is enabled  through options
            mutations = definition && definition.mutations,
            ii,
            i;

        /**
         * @memberof VariableScope.prototype
         * @type {VariableList}
         */
        this.values = new VariableList(this, VariableList.isVariableList(values) ? values.toJSON() : values);
        // in above line, we clone the values if it is already a list. there is no point directly using the instance of
        // a variable list since one cannot be created with a parent reference to begin with.

        if (layers) {
            this._layers = [];

            for (i = 0, ii = layers.length; i < ii; i++) {
                VariableList.isVariableList(layers[i]) && this._layers.push(layers[i]);
            }
        }

        // restore previously tracked mutations
        if (mutations) {
            this.mutations = new MutationTracker(mutations);
        }
    }), Property);

/**
 * @note Handling disabled and duplicate variables:
 * | method | single enabled    | single disabled | with duplicates                                                    |
 * |--------|-------------------|-----------------|------------------------------------------------------------------- |
 * | has    | true              | false           | true (if last enabled) OR false (if all disabled)                  |
 * | get    | {Variable}        | undefined       | last enabled {Variable} OR undefined (if all disabled)             |
 * | set    | update {Variable} | new {Variable}  | update last enabled {Variable} OR new {Variable} (if all disabled) |
 * | unset  | delete {Variable} | noop            | delete all enabled {Variable}                                      |
 *
 * @todo Expected behavior of `unset` with duplicates:
 * delete last enabled {Variable} and update the reference with last enabled in rest of the list.
 * This requires unique identifier in the variable list for mutations to work correctly.
 */
_.assign(VariableScope.prototype, /** @lends VariableScope.prototype */ {
    /**
     * Defines whether this property instances requires an id
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyRequiresId: true,

    /**
     * @private
     * @deprecated discontinued in v4.0
     */
    variables: function () {
        // eslint-disable-next-line max-len
        throw new Error('`VariableScope#variables` has been discontinued, use `VariableScope#syncVariablesTo` instead.');
    },

    /**
     * Converts a list of Variables into an object where key is `_postman_propertyIndexKey` and value is determined
     * by the `valueOf` function
     *
     * @param {Boolean} excludeDisabled -
     * @param {Boolean} caseSensitive -
     * @returns {Object}
     */
    toObject: function (excludeDisabled, caseSensitive) {
        // if the scope has no layers, we simply export the contents of primary store
        if (!this._layers) {
            return this.values.toObject(excludeDisabled, caseSensitive);
        }

        var mergedLayers = {};

        _.forEachRight(this._layers, function (layer) {
            _.assign(mergedLayers, layer.toObject(excludeDisabled, caseSensitive));
        });

        return _.assign(mergedLayers, this.values.toObject(excludeDisabled, caseSensitive));
    },

    /**
     * Determines whether one particular variable is defined in this scope of variables.
     *
     * @param {String} key - The name of the variable to check
     * @returns {Boolean} - Returns true if an enabled variable with given key is present in current or parent scopes,
     *                      false otherwise
     */
    has: function (key) {
        var variable = this.values.oneNormalizedVariable(key),
            i,
            ii;

        // if a variable is disabled or does not exist in local scope,
        // we search all the layers and return the first occurrence.
        if ((!variable || variable.disabled === true) && this._layers) {
            for (i = 0, ii = this._layers.length; i < ii; i++) {
                variable = this._layers[i].oneNormalizedVariable(key);
                if (variable && variable.disabled !== true) { break; }
            }
        }

        return Boolean(variable && variable.disabled !== true);
    },

    /**
     * Fetches a variable from the current scope or from parent scopes if present.
     *
     * @param {String} key - The name of the variable to get.
     * @returns {*} The value of the specified variable across scopes.
     */
    get: function (key) {
        var variable = this.values.oneNormalizedVariable(key),
            i,
            ii;

        // if a variable does not exist in local scope, we search all the layers and return the first occurrence.
        if ((!variable || variable.disabled === true) && this._layers) {
            for (i = 0, ii = this._layers.length; i < ii; i++) {
                variable = this._layers[i].oneNormalizedVariable(key);
                if (variable && variable.disabled !== true) { break; }
            }
        }

        return (variable && variable.disabled !== true) ? variable.valueOf() : undefined;
    },

    /**
     * Creates a new variable, or updates an existing one.
     *
     * @param {String} key - The name of the variable to set.
     * @param {*} value - The value of the variable to be set.
     * @param {Variable.types} [type] - Optionally, the value of the variable can be set to a type
     */
    set: function (key, value, type) {
        var variable = this.values.oneNormalizedVariable(key),

            // create an object that will be used as setter
            update = { key, value };

        _.isString(type) && (update.type = type);

        // If a variable by the name key exists, update it's value and return.
        // @note adds new variable if existing is disabled. Disabled variables are not updated.
        if (variable && !variable.disabled) {
            variable.update(update);
        }
        else {
            this.values.add(update);
        }

        // track the change if mutation tracking is enabled
        this._postman_enableTracking && this.mutations.track(MUTATIONS.SET, key, value);
    },

    /**
     * Removes the variable with the specified name.
     *
     * @param {String} key -
     */
    unset: function (key) {
        var lastDisabledVariable;

        this.values.remove(function (variable) {
            // bail out if variable name didn't match
            if (variable.key !== key) {
                return false;
            }

            // don't delete disabled variables
            if (variable.disabled) {
                lastDisabledVariable = variable;

                return false;
            }

            // delete all enabled variables
            return true;
        });

        // restore the reference with the last disabled variable
        if (lastDisabledVariable) {
            this.values.reference[key] = lastDisabledVariable;
        }

        // track the change if mutation tracking is enabled
        this._postman_enableTracking && this.mutations.track(MUTATIONS.UNSET, key);
    },

    /**
     * Removes *all* variables from the current scope. This is a destructive action.
     */
    clear: function () {
        var mutations = this.mutations;

        // track the change if mutation tracking is enabled
        // do this before deleting the keys
        if (this._postman_enableTracking) {
            this.values.each(function (variable) {
                mutations.track(MUTATIONS.UNSET, variable.key);
            });
        }

        this.values.clear();
    },

    /**
     * Replace all variable names with their values in the given template.
     *
     * @param {String|Object} template - A string or an object to replace variables in
     * @returns {String|Object} The string or object with variables (if any) substituted with their values
     */
    replaceIn: function (template) {
        if (_.isString(template) || _.isArray(template)) {
            // convert template to object because replaceSubstitutionsIn only accepts objects
            var result = Property.replaceSubstitutionsIn({ template }, _.concat(this.values, this._layers));

            return result.template;
        }

        if (_.isObject(template)) {
            return Property.replaceSubstitutionsIn(template, _.concat(this.values, this._layers));
        }

        return template;
    },

    /**
     * Enable mutation tracking.
     *
     * @note: Would do nothing if already enabled.
     * @note: Any previously tracked mutations would be reset when starting a new tracking session.
     *
     * @param {MutationTracker.definition} [options] Options for Mutation Tracker. See {@link MutationTracker}
     */
    enableTracking: function (options) {
        // enabled already, do nothing
        if (this._postman_enableTracking) {
            return;
        }

        /**
         * Controls if mutation tracking is enabled
         *
         * @memberof VariableScope.prototype
         *
         * @private
         * @property {Boolean}
         */
        this._postman_enableTracking = true;

        // we don't want to add more mutations to existing mutations
        // that will lead to mutations not capturing the correct state
        // so we reset this with the new instance
        this.mutations = new MutationTracker(options);
    },

    /**
     * Disable mutation tracking.
     */
    disableTracking: function () {
        // disable further tracking but keep the tracked mutations
        this._postman_enableTracking = false;
    },

    /**
     * Apply a mutation instruction on this variable scope.
     *
     * @private
     * @param {String} instruction Instruction identifying the type of the mutation, e.g. `set`, `unset`
     * @param {String} key -
     * @param {*} value -
     */
    applyMutation: function (instruction, key, value) {
        // we know that `set` and `unset` are the only supported instructions
        // and we know the parameter signature of both is the same as the items in a mutation
        /* istanbul ignore else */
        if (this[instruction]) {
            this[instruction](key, value);
        }
    },

    /**
     * Using this function, one can sync the values of this variable list from a reference object.
     *
     * @private
     * @param {Object} obj -
     * @param {Boolean=} [track] -
     * @returns {Object}
     */
    syncVariablesFrom: function (obj, track) {
        return this.values.syncFromObject(obj, track);
    },

    /**
     * Transfer the variables in this scope to an object
     *
     * @private
     * @param {Object=} [obj] -
     * @returns {Object}
     */
    syncVariablesTo: function (obj) {
        return this.values.syncToObject(obj);
    },

    /**
     * Convert this variable scope into a JSON serialisable object. Useful to transport or store, environment and
     * globals as a whole.
     *
     * @returns {Object}
     */
    toJSON: function () {
        var obj = PropertyBase.toJSON(this);

        // @todo - remove this when pluralisation is complete
        if (obj.value) {
            obj.values = obj.value;
            delete obj.value;
        }

        // ensure that the concept of layers is not exported as JSON. JSON cannot retain references and this will end up
        // being a pointless object post JSONification.
        if (obj._layers) {
            delete obj._layers;
        }

        // ensure that tracking flag is not serialized
        // otherwise, it is very easy to let tracking trickle to many instances leading to a snowball effect
        if (obj._postman_enableTracking) {
            delete obj._postman_enableTracking;
        }

        return obj;
    },

    /**
     * Adds a variable list to the current instance in order to increase the surface area of variable resolution.
     * This enables consumers to search across scopes (eg. environment and globals).
     *
     * @private
     * @param {VariableList} [list] -
     */
    addLayer: function (list) {
        if (!VariableList.isVariableList(list)) {
            return;
        }

        !this._layers && (this._layers = []); // lazily initialize layers
        this._layers.push(list);
    }
});

_.assign(VariableScope, /** @lends VariableScope */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     *
     * @note that this is directly accessed only in case of VariableScope from _.findValue lodash util mixin
     */
    _postman_propertyName: 'VariableScope',

    /**
     * Check whether an object is an instance of {@link VariableScope}.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isVariableScope: function (obj) {
        return Boolean(obj) && ((obj instanceof VariableScope) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', VariableScope._postman_propertyName));
    }
});

module.exports = {
    VariableScope
};
