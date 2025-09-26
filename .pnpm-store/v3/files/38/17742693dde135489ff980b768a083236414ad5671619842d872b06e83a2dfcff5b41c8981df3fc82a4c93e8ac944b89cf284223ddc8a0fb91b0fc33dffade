var _ = require('../util').lodash,
    Property = require('./property').Property,

    E = '',
    ANY = 'any',
    NULL = 'null',
    STRING = 'string',

    Variable;

/**
 * The object representation of a Variable consists the variable value and type. It also optionally includes the `id`
 * and a friendly `name` of the variable. The `id` and the `name` of a variable is usually managed and used when a
 * variable is made part of a {@link VariableList} instance.
 *
 * @typedef {Object} Variable.definition
 * @property {*=} [value] - The value of the variable that will be stored and will be typecast to the `type`
 * set in the variable or passed along in this parameter.
 * @property {String=} [type] - The type of this variable from the list of types defined at {@link Variable.types}.
 *
 * @example
 * {
 *     "id": "my-var-1",
 *     "name": "MyFirstVariable",
 *     "value": "Hello World",
 *     "type": "string"
 * }
 */
_.inherit((

    /**
     * A variable inside a collection is similar to variables in any programming construct. The variable has an
     * identifier name (provided by its id) and a value. A variable is optionally accompanied by a variable type. One
     * or more variables can be associated with a collection and can be referred from anywhere else in the collection
     * using the double-brace {{variable-id}} format. Properties can then use the `.toObjectResolved` function to
     * procure an object representation of the property with all variable references replaced by corresponding values.
     *
     * @constructor
     * @extends {Property}
     * @param {Variable.definition=} [definition] - Specify the initial value and type of the variable.
     */
    Variable = function PostmanVariable (definition) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Variable.super_.apply(this, arguments);

        // check what is the property name for indexing this variable
        var indexer = this.constructor._postman_propertyIndexKey;

        _.assign(this, /** @lends Variable.prototype */ {
            /**
             * @type {Variable.types}
             */
            type: ANY,

            /**
             * @type {*}
             */
            value: undefined
        });

        if (!_.isNil(definition)) {
            /**
             * The name of the variable. This is used for referencing this variable from other locations and scripts
             *
             * @type {String}
             * @name key
             * @memberOf Variable.prototype
             */
            _.has(definition, indexer) && (this[indexer] = definition[indexer]);
            this.update(definition);
        }
    }), Property);

_.assign(Variable.prototype, /** @lends Variable.prototype */ {
    /**
     * Gets the value of the variable.
     *
     * @returns {Variable.types}
     */
    get () {
        return _.isFunction(this.value) ? this.castOut(this.value()) : this.castOut(this.value);
    },

    /**
     * Sets the value of the variable.
     *
     * @param {*} value -
     */
    set (value) {
        // @todo - figure out how secure is this!
        this.value = _.isFunction(value) ? value : this.castIn(value);
    },

    /**
     * An alias of this.get and this.set.
     *
     * @param {*=} [value] -
     * @returns {*}
     */
    valueOf (value) {
        arguments.length && this.set(value);

        return this.get();
    },

    /**
     * Returns the stringified value of the variable.
     *
     * @returns {String}
     */
    toString () {
        var value = this.valueOf();

        // returns String representation of null as it's a valid JSON type
        // refer: https://github.com/postmanlabs/postman-app-support/issues/8493
        if (value === null) {
            return NULL;
        }

        // returns empty string if the value is undefined or does not implement
        // the toString method
        return (!_.isNil(value) && _.isFunction(value.toString)) ? value.toString() : E;
    },

    /**
     * Typecasts a value to the {@link Variable.types} of this {@link Variable}. Returns the value of the variable
     * converted to the type specified in {@link Variable#type}.
     *
     * @param {*} value -
     * @returns {*}
     */
    cast (value) {
        return this.castOut(value);
    },

    /**
     * Typecasts a value to the {@link Variable.types} of this {@link Variable}. Returns the value of the variable
     * converted to the type specified in {@link Variable#type}.
     *
     * @private
     * @param {*} value -
     * @returns {*}
     */
    castIn (value) {
        var handler = Variable.types[this.type] || Variable.types.any;

        return _.isFunction(handler) ? handler(value) : handler.in(value);
    },

    /**
     * Typecasts a value from the {@link Variable.types} of this {@link Variable}. Returns the value of the variable
     * converted to the type specified in {@link Variable#type}.
     *
     * @private
     * @param {*} value -
     * @returns {*}
     */
    castOut (value) {
        var handler = Variable.types[this.type] || Variable.types.any;

        return _.isFunction(handler) ? handler(value) : handler.out(value);
    },

    /**
     * Sets or gets the type of the value.
     *
     * @param {String} typeName -
     * @param {Boolean} _noCast -
     * @returns {String} - returns the current type of the variable from the list of {@link Variable.types}
     */
    valueType (typeName, _noCast) {
        !_.isNil(typeName) && (typeName = typeName.toString().toLowerCase()); // sanitize
        if (!Variable.types[typeName]) {
            return this.type || ANY; // @todo: throw new Error('Invalid variable type.');
        }

        // set type if it is valid
        this.type = typeName;

        // 1. get the current value
        // 2. set the new type if it is valid and cast the stored value
        // 3. then set the interstitial value
        var interstitialCastValue;

        // do not touch value functions
        if (!(_noCast || _.isFunction(this.value))) {
            interstitialCastValue = this.get();
            this.set(interstitialCastValue);
            interstitialCastValue = null; // just a precaution
        }

        return this.type;
    },

    /**
     * Updates the type and value of a variable from an object or JSON definition of the variable.
     *
     * @param {Variable.definition} options -
     */
    update (options) {
        if (!_.isObject(options)) {
            return;
        }
        // set type and value.
        // @note that we cannot update the key, once created during construction
        _.has(options, 'type') && this.valueType(options.type, _.has(options, 'value'));
        _.has(options, 'value') && this.set(options.value);
        _.has(options, 'system') && (this.system = options.system);
        _.has(options, 'disabled') && (this.disabled = options.disabled);
        _.has(options, 'description') && (this.describe(options.description));
    }
});

_.assign(Variable, /** @lends Variable */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Variable',

    /**
     * Specify the key to be used while indexing this object
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyIndexKey: 'key',

    /**
     * The possible supported types of a variable is defined here. The keys defined here are the possible values of
     * {@link Variable#type}.
     *
     * Additional variable types can be supported by adding the type-casting function to this enumeration.
     *
     * @enum {Function}
     * @readonly
     */
    types: {
        /**
         * When a variable's `type` is set to "string", it ensures that {@link Variable#get} converts the value of the
         * variable to a string before returning the data.
         */
        string: String,

        /**
         * A boolean type of variable can either be set to `true` or `false`. Any other value set is converted to
         * Boolean when procured from {@link Variable#get}.
         */
        boolean: Boolean,

        /**
         * A "number" type variable ensures that the value is always represented as a number. A non-number type value
         * is returned as `NaN`.
         */
        number: Number,

        /**
         * A "array" type value stores Array data format
         */
        array: {
            /**
             * @param {Array} val -
             * @returns {String}
             */
            in (val) {
                var value;

                try {
                    // @todo: should we check if `val` is a valid Array or Array string?
                    value = typeof val === STRING ? val : JSON.stringify(val);
                }
                catch (e) {
                    value = NULL;
                }

                return value;
            },

            /**
             * A "array" type value stores Array data format
             *
             * @param {String} val -
             * @returns {Object}
             */
            out (val) {
                var value;

                try {
                    value = JSON.parse(val);
                }
                catch (e) {
                    value = undefined;
                }

                return Array.isArray(value) ? value : undefined;
            }
        },

        /**
         * A "object" type value stores Object data format
         */
        object: {
            /**
             * @param {Object} val -
             * @returns {String}
             */
            in (val) {
                var value;

                try {
                    // @todo: should we check if `val` is a valid JSON string?
                    value = typeof val === STRING ? val : JSON.stringify(val);
                }
                catch (e) {
                    value = NULL;
                }

                return value;
            },

            /**
             * A "object" type value stores Object data format
             *
             * @param {String} val -
             * @returns {Object}
             */
            out (val) {
                var value;

                try {
                    value = JSON.parse(val);
                }
                catch (e) {
                    value = undefined;
                }

                return (value instanceof Object && !Array.isArray(value)) ? value : undefined;
            }
        },

        /**
         * Free-form type of a value. This is the default for any variable, unless specified otherwise. It ensures that
         * the variable can store data in any type and no conversion is done while using {@link Variable#get}.
         */
        any: {
            /**
             * @param {*} val -
             * @returns {*}
             */
            in (val) {
                return val; // pass through
            },

            /**
             * @param {*} val -
             * @returns {*}
             */
            out (val) {
                return val; // pass through
            }
        }
    },

    /**
     * @param {*} obj -
     * @returns {Boolean}
     */
    isVariable: function (obj) {
        return Boolean(obj) && ((obj instanceof Variable) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Variable._postman_propertyName));
    }
});

module.exports = {
    Variable
};
