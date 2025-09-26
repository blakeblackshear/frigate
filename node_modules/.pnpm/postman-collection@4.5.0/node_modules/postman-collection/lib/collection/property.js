var _ = require('../util').lodash,
    uuid = require('uuid'),
    PropertyBase = require('./property-base').PropertyBase,
    Description = require('./description').Description,
    Substitutor = require('../superstring').Substitutor,

    DISABLED = 'disabled',
    DESCRIPTION = 'description',
    REGEX_EXTRACT_VARS = Substitutor.REGEX_EXTRACT_VARS,

    Property; // constructor

/**
 * Recursively traverses a variable and detects all instances of variable
 * replacements within the string of the object.
 *
 * @private
 * @param {*} value Any JS variable within which we are trying to discover {{variables}}
 * @param {Set.<Object>} seen Set of objects traversed before to avoid infinite recursion
 * @param {Set.<Object>} result Set of variables to accumulate result in the recursive call
 * @returns {Object} Set of variables
 */
function _findSubstitutions (value, seen = new Set(), result = new Set()) {
    if (!value || seen.has(value)) {
        return result;
    }

    if (Array.isArray(value)) {
        seen.add(value);

        for (let i = 0, ii = value.length; i < ii; i++) {
            _findSubstitutions(value[i], seen, result);
        }
    }
    else if (typeof value === 'object') {
        seen.add(value);

        for (const key in value) {
            if (Object.hasOwnProperty.call(value, key)) {
                _findSubstitutions(value[key], seen, result);
            }
        }
    }
    else if (typeof value === 'string') {
        let match;

        while ((match = REGEX_EXTRACT_VARS.exec(value)) !== null) {
            result.add(match[0].slice(2, -2));
        }
    }

    return result;
}

/**
 * @typedef Property.definition
 * @property {String=} [id] A unique string that identifies the property.
 * @property {String=} [name] A distinctive and human-readable name of the property.
 * @property {Boolean=} [disabled] Denotes whether the property is disabled or not.
 * @property {Object=} [info] The meta information regarding the Property is provided as the `info` object.
 * @property {String=} [info.id] If set, this is used instead of the definition root's id.
 * @property {String=} [info.name] If set, this is used instead of the definition root's name.
 */
_.inherit((

    /**
     * The Property class forms the base of all postman collection SDK elements. This is to be used only for SDK
     * development or to extend the SDK with additional functionalities. All SDK classes (constructors) that are
     * supposed to be identifyable (i.e. ones that can have a `name` and `id`) are derived from this class.
     *
     * For more information on what is the structure of the `definition` the function parameter, have a look at
     * {@link Property.definition}.
     *
     * > This is intended to be a private class except for those who want to extend the SDK itself and add more
     * > functionalities.
     *
     * @constructor
     * @extends {PropertyBase}
     *
     * @param {Property.definition=} [definition] Every constructor inherited from `Property` is required to call the
     * super constructor function. This implies that construction parameters of every inherited member is propagated
     * to be sent up to this point.
     *
     * @see Property.definition
     */
    Property = function PostmanProperty (definition) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Property.super_.apply(this, arguments);

        // The definition can have an `info` object that stores the identification of this property. If that is present,
        // we use it instead of the definition root.
        var src = definition && definition.info || definition,
            id;

        // first we extract id from all possible sources
        // we also check if this property is marked to require an ID, we generate one if not found.
        id = (src && src.id) || this.id || (this._ && this._.postman_id) || (this._postman_propertyRequiresId &&
            uuid.v4());

        /**
         * The `id` of the property is a unique string that identifies this property and can be used to refer to
         * this property from relevant other places. It is a good practice to define the id or let the system
         * auto generate a UUID if one is not defined for properties that require an `id`.
         *
         * @name id
         * @type {String}
         * @memberOf Property.prototype
         *
         * @note The property can also be present in the `postman_id` meta in case it is not specified in the
         * object. An auto-generated property is used wherever one is not specified
         */
        id && (this.id = id);

        /**
         * A property can have a distinctive and human-readable name. This is to be used to display the name of the
         * property within Postman, Newman or other runtimes that consume collection. In certain cases, the absence
         * of name might cause the runtime to use the `id` as a fallback.
         *
         * @name name
         * @memberOf Property.prototype
         * @type {String}
         */
        src && src.name && (this.name = src.name);

        /**
         * This (optional) flag denotes whether this property is disabled or not. Usually, this is helpful when a
         * property is part of a {@link PropertyList}. For example, in a PropertyList of {@link Header}s, the ones
         * that are disabled can be filtered out and not processed.
         *
         * @type {Boolean}
         * @optional
         * @name disabled
         *
         * @memberOf Property.prototype
         */
        definition && _.has(definition, DISABLED) && (this.disabled = Boolean(definition.disabled));

        /**
         * The `description` property holds the detailed documentation of any property.
         * It is recommended that this property be updated using the [describe](#describe) function.
         *
         * @type {Description}
         * @see Property#describe
         *
         * @example <caption>Accessing descriptions of all root items in a collection</caption>
         * var fs = require('fs'), // needed to read JSON file from disk
         *     Collection = require('postman-collection').Collection,
         *     myCollection;
         *
         * // Load a collection to memory from a JSON file on disk (say, sample-collection.json)
         * myCollection = new Collection(JSON.stringify(fs.readFileSync('sample-collection.json').toString()));
         *
         * // Log the description of all root items
         * myCollection.item.all().forEach(function (item) {
         *     console.log(item.name || 'Untitled Item');
         *     item.description && console.log(item.description.toString());
         * });
         */
        // eslint-disable-next-line max-len
        _.has(src, DESCRIPTION) && (this.description = _.createDefined(src, DESCRIPTION, Description, this.description));
    }), PropertyBase);

_.assign(Property.prototype, /** @lends Property.prototype */ {
    /**
     * This function allows to describe the property for the purpose of detailed identification or documentation
     * generation. This function sets or updates the `description` child-property of this property.
     *
     * @param {String} content The content of the description can be provided here as a string. Note that it is expected
     * that if the content is formatted in any other way than simple text, it should be specified in the subsequent
     * `type` parameter.
     * @param {String=} [type="text/plain"] The type of the content.
     *
     * @example <caption>Add a description to an instance of Collection</caption>
     *  var Collection = require('postman-collection').Collection,
     *     mycollection;
     *
     * // create a blank collection
     * myCollection = new Collection();
     * myCollection.describe('Hey! This is a cool collection.');
     *
     * console.log(myCollection.description.toString()); // read the description
     */
    describe (content, type) {
        (Description.isDescription(this.description) ? this.description : (this.description = new Description()))
            .update(content, type);
    },

    /**
     * Returns an object representation of the Property with its variable references substituted.
     *
     * @example <caption>Resolve an object using variable definitions from itself and its parents</caption>
     * property.toObjectResolved();
     *
     * @example <caption>Resolve an object using variable definitions on a different object</caption>
     * property.toObjectResolved(item);
     *
     * @example <caption>Resolve an object using variables definitions as a flat list of variables</caption>
     * property.toObjectResolved(null, [variablesDefinition1, variablesDefinition1], {ignoreOwnVariables: true});
     *
     * @private
     * @draft
     * @param {?Item|ItemGroup=} [scope] - One can specifically provide an item or group with `.variables`. In
     * the event one is not provided, the variables are taken from this object or one from the parent tree.
     * @param {Array<Object>} overrides - additional objects to lookup for variable values
     * @param {Object} [options] -
     * @param {Boolean} [options.ignoreOwnVariables] - if set to true, `.variables` on self(or scope)
     * will not be used for variable resolution. Only variables in `overrides` will be used for resolution.
     * @returns {Object|undefined}
     * @throws {Error} If `variables` cannot be resolved up the parent chain.
     */
    toObjectResolved (scope, overrides, options) {
        var ignoreOwnVariables = options && options.ignoreOwnVariables,
            variableSourceObj,
            variables,
            reference;

        // ensure you do not substitute variables itself!
        reference = this.toJSON();
        _.isArray(reference.variable) && (delete reference.variable);

        // if `ignoreScopeVariables` is turned on, ignore `.variables` and resolve with only `overrides`
        // otherwise find `.variables` on current object or `scope`
        if (ignoreOwnVariables) {
            return Property.replaceSubstitutionsIn(reference, overrides);
        }

        // 1. if variables is passed as params, use it or fall back to oneself
        // 2. for a source from point (1), and look for `.variables`
        // 3. if `.variables` is not found, then rise up the parent to find first .variables
        variableSourceObj = scope || this;
        do {
            variables = variableSourceObj.variables;
            variableSourceObj = variableSourceObj.__parent;
        } while (!variables && variableSourceObj);

        if (!variables) { // worst case = no variable param and none detected in tree or object
            throw Error('Unable to resolve variables. Require a List type property for variable auto resolution.');
        }

        return variables.substitute(reference, overrides);
    },

    /**
     * Returns all the substitutions (variables) that are needed (or referenced) in this property (recursively).
     *
     * @returns {String[]}
     *
     * @example
     * // returns ['host', 'path1']
     * prop.findSubstitutions({request: 'https://{{host}}/{{path1}}-action/'});
     *
     * @see {Property.findSubstitutions}
     */
    findSubstitutions () {
        return Property.findSubstitutions(this.toJSON());
    }
});

_.assign(Property, /** @lends Property */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Property',

    /**
     * This function accepts a string followed by a number of variable sources as arguments. One or more variable
     * sources can be provided and it will use the one that has the value in left-to-right order.
     *
     * @param {String} str -
     * @param {VariableList|Object|Array.<VariableList|Object>} variables -
     * @returns {String}
     */
    // @todo: improve algorithm via variable replacement caching
    replaceSubstitutions: function (str, variables) {
        // if there is nothing to replace, we move on
        if (!(str && _.isString(str))) { return str; }

        // if variables object is not an instance of substitutor then ensure that it is an array so that it becomes
        // compatible with the constructor arguments for a substitutor
        !Substitutor.isInstance(variables) && !_.isArray(variables) && (variables = _.tail(arguments));

        return Substitutor.box(variables, Substitutor.DEFAULT_VARS).parse(str).toString();
    },

    /**
     * This function accepts an object followed by a number of variable sources as arguments. One or more variable
     * sources can be provided and it will use the one that has the value in left-to-right order.
     *
     * @param {Object} obj -
     * @param {Array.<VariableList|Object>} variables -
     * @returns {Object}
     */
    replaceSubstitutionsIn: function (obj, variables) {
        // if there is nothing to replace, we move on
        if (!(obj && _.isObject(obj))) {
            return obj;
        }

        // convert the variables to a substitutor object (will not reconvert if already substitutor)
        variables = Substitutor.box(variables, Substitutor.DEFAULT_VARS);

        var customizer = function (objectValue, sourceValue) {
            objectValue = objectValue || {};
            if (!_.isString(sourceValue)) {
                _.forOwn(sourceValue, function (value, key) {
                    sourceValue[key] = customizer(objectValue[key], value);
                });

                return sourceValue;
            }

            return this.replaceSubstitutions(sourceValue, variables);
        }.bind(this);

        return _.mergeWith({}, obj, customizer);
    },

    /**
     * This function recursively traverses a variable and detects all instances of variable replacements
     * within the string of the object
     *
     * @param {*} obj Any JS variable within which we are trying to discover {{variables}}
     * @returns {String[]}
     *
     * @example
     * // returns ['host', 'path1']
     * Property.findSubstitutions({request: 'https://{{host}}/{{path1}}-action/'});
     *
     * @todo
     * - tonne of scope for performance optimizations
     * - accept a reference variable scope so that substitutions can be applied to find recursive
     *   replacements (e.g. {{hello-{{hi}}-var}})
     */
    findSubstitutions: function (obj) {
        return Array.from(_findSubstitutions(obj));
    }
});

module.exports = {
    Property
};
