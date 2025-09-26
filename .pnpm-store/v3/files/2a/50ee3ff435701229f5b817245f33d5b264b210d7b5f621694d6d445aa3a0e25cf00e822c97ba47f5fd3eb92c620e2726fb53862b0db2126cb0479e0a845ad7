var _ = require('../util').lodash,
    Property = require('./property').Property,
    VariableList = require('./variable-list').VariableList,

    RequestAuth;

/**
 * This defines the definition of the authentication method to be used.
 *
 * @typedef RequestAuth.definition
 * @property {String=} type The Auth type to use. Check the names in {@link AuthTypes}
 *
 * @example <caption>Sample auth definition for Basic Auth</caption>
 * {
 *   "type": "basic",
 *   "basic": [
 *     { "key": "username", "value": "postman" },
 *     { "key": "password", "value": "secrets" }
 *   ]
 * }
 */
_.inherit((

    /**
     * A Postman Auth definition that comprehensively represents different types of auth mechanisms available.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {RequestAuth.definition} options Pass the initial definition of the Auth.
     * @param {Property|PropertyList=} [parent] optionally pass the parent of this auth. aides variable resolution.
     *
     * @example <caption>Creating a request with two auth data and one selected</caption>
     * var auth = new RequestAuth({
     *   type: 'digest',
     *
     *   basic: [
     *     { key: "username", value: "postman" },
     *     { key: "password", value: "secrets" }
     *   ],
     *   digest: [
     *     { key: "nonce", value: "aef54cde" },
     *     { key: "realm", value: "items.x" }
     *   ]
     * });
     *
     * // change the selected auth
     * auth.use('basic');
     */
    RequestAuth = function PostmanRequestAuth (options, parent) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        RequestAuth.super_.call(this, options);

        // set the parent
        parent && this.setParent(parent);

        // set the type, if passed via options
        if (_.has(options, 'type')) {
            this.use(options.type);
        }

        // load all possible auth parameters from options
        _.forEach(_.omit(options, 'type'), this.update.bind(this));
    }), Property);

_.assign(RequestAuth.prototype, /** @lends RequestAuth.prototype */ {
    /**
     * Update the parameters of a specific authentication type. If none is provided then it uses the one marked as to be
     * used.
     *
     * @param {VariableList|Array|Object} options -
     * @param {String=} [type=this.type] -
     */
    update (options, type) {
        // update must have options
        if (!_.isObject(options)) { return; }
        // choose default from existing type if not provided
        if (!type) { type = this.type; }
        // validate type parameter and return in case type is not valid.
        if (!RequestAuth.isValidType(type)) { return; }

        var parameters = this[type];

        // in case the type holder is not created, we create one and send the population variables
        if (!VariableList.isVariableList(parameters)) {
            // @todo optimise the handling of legacy object type auth parameters
            parameters = this[type] = new VariableList(this);
            parameters._postman_requestAuthType = type;
        }

        // we simply assimilate the new options either it is an array or an object
        if (_.isArray(options) || VariableList.isVariableList(options)) {
            parameters.assimilate(options);
        }
        else {
            parameters.syncFromObject(options, false, false); // params: no need to track and no need to prune
        }
    },

    /**
     * Sets the authentication type to be used by this item.
     *
     * @param {String} type -
     * @param {VariableList|Array|Object} options - note that options set here would replace all existing
     * options for the particular auth
     */
    use (type, options) {
        if (!RequestAuth.isValidType(type)) { return; }

        this.type = type; // set the type

        var parameters = this[type];

        if (!VariableList.isVariableList(parameters)) {
            parameters = this[type] = new VariableList(this);
        }

        // we simply assimilate the new options either it is an array or an object
        if (_.isArray(options) || VariableList.isVariableList(options)) {
            parameters.assimilate(options);
        }
        else {
            parameters.syncFromObject(options, false, false); // params: no need to track and no need to prune
        }
    },

    /**
     * @private
     * @deprecated discontinued in v4.0
     */
    current () {
        throw new Error('`Request#current` has been discontinued, use `Request#parameters` instead.');
    },

    /**
     * Returns the parameters of the selected auth type
     *
     * @returns {VariableList}
     */
    parameters () {
        return this[this.type];
    },

    /**
     * Clears the definition of an auth type.
     *
     * @param {String} type -
     */
    clear (type) {
        if (!(RequestAuth.isValidType(type) && VariableList.isVariableList(this[type]))) {
            return;
        }

        // clear the variable list
        this[type].clear();

        // if it is not a currently selected auth type, do not delete the variable list, but simply delete it
        if (type !== this.type) {
            delete this[type];
        }
    }
});

_.assign(RequestAuth, /** @lends RequestAuth */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'RequestAuth',

    /**
     * Determines whether an authentication type name is valid or not
     *
     * @param {String} type -
     * @returns {Boolean}
     */
    isValidType: function (type) {
        // no auth name can be "type", else will have namespace collision with type selector
        return _.isString(type) && (type !== 'type');
    }
});

module.exports = {
    RequestAuth
};
