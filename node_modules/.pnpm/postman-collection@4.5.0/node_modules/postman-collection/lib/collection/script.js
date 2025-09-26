var _ = require('../util').lodash,
    Property = require('./property').Property,
    Url = require('./url').Url,

    Script,

    SCRIPT_NEWLINE_PATTERN = /\r?\n/g;

/**
 * A map of package names to the IDs of the packages
 *
 * @typedef {Object.<string, { id: string }>} Packages
 */

_.inherit((

    /**
     * Postman scripts that are executed upon events on a collection  / request such as test and pre request.
     *
     * @constructor
     * @extends {Property}
     *
     * @param {Object} options -
     */
    Script = function PostmanScript (options) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        Script.super_.apply(this, arguments);

        options && this.update(options);
    }), Property);

_.assign(Script.prototype, /** @lends Script.prototype */ {
    /**
     * Defines whether this property instances requires an id
     *
     * @private
     * @readOnly
     * @type {Boolean}
     */
    _postman_propertyRequiresId: true,

    /**
     * Converts the script lines array to a single source string.
     *
     * @returns {String}
     */
    toSource: function () {
        return this.exec ? this.exec.join('\n') : undefined;
    },

    /**
     * Updates the properties of a Script.
     *
     * @param {Object} [options] -
     * @param {String} [options.type] Script type
     * @param {String} [options.src] Script source url
     * @param {String[]|String} [options.exec] Script to execute
     * @param {Packages} [options.packages] Packages required by the script
     */
    update: function (options) {
        // no splitting is being done here, as string scripts are split right before assignment below anyway
        (_.isString(options) || _.isArray(options)) && (options = { exec: options });

        if (!options) { return; } // in case definition object is missing, there is no point moving forward

        // create the request property
        /**
         * @augments {Script.prototype}
         * @type {string}
         */
        this.type = options.type || 'text/javascript';

        /**
         * The packages required by the script
         *
         * @type {Packages}
         */
        this.packages = options.packages;

        _.has(options, 'src') && (

            /**
             * @augments {Script.prototype}
             * @type {Url}
             */
            this.src = new Url(options.src)
        );

        if (!this.src && _.has(options, 'exec')) {
            /**
             * @augments {Script.prototype}
             * @type {Array<string>}
             */
            this.exec = _.isString(options.exec) ? options.exec.split(SCRIPT_NEWLINE_PATTERN) :
                _.isArray(options.exec) ? options.exec : undefined;
        }
    },

    /**
     * Checks if the script is empty i.e does not have any code to execute.
     *
     * @returns {Boolean}
     */
    isEmpty: function () {
        return _.isEmpty(_.trim(this.toSource()));
    }
});

_.assign(Script, /** @lends Script */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Script',

    /**
     * Check whether an object is an instance of {@link ItemGroup}.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isScript: function (obj) {
        return Boolean(obj) && ((obj instanceof Script) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', Script._postman_propertyName));
    }
});

module.exports = {
    Script
};
