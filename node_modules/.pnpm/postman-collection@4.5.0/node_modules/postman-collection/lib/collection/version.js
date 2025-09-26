var _ = require('../util').lodash,
    semver = require('semver'),
    PropertyBase = require('./property-base').PropertyBase,

    Version;

/**
 * @typedef {Object|String} Version.definition
 */
_.inherit((

    /**
     * Defines a Version.
     *
     * @constructor
     * @extends {PropertyBase}
     * @param {Version.definition} definition -
     */
    Version = function PostmanPropertyVersion (definition) {
        // in case definition object is missing, there is no point moving forward
        if (!definition) { return; }

        // call the setter to process the version string and assign it to this object
        this.set(definition);
    }), PropertyBase);

_.assign(Version.prototype, /** @lends Version.prototype */ {
    /**
     * Set the version value as string or object with separate components of version
     *
     * @draft
     * @param {object|string} value -
     */
    set (value) {
        // extract the version logic and in case it failes and value passed is an object, we use that assuming parsed
        // value has been sent.
        var ver = semver.parse(value) || value || {};

        _.assign(this, /** @lends Version.prototype */ {
            /**
             * The raw URL string. If {@link Version#set} is called with a string parameter, the string is saved here
             * before parsing various Version components.
             *
             * @type {String}
             */
            raw: ver.raw,

            /**
             * @type {String}
             */
            major: ver.major,

            /**
             * @type {String}
             */
            minor: ver.minor,

            /**
             * @type {String}
             */
            patch: ver.patch,

            /**
             * @type {String}
             */
            prerelease: ver.prerelease && ver.prerelease.join && ver.prerelease.join() || ver.prerelease,

            /**
             * @type {String}
             */
            build: ver.build && ver.build.join && ver.build.join() || ver.build,

            /**
             * @type {String}
             */
            string: ver.version
        });
    },

    toString () {
        // TODO: is this enough? should we build the semver back up?
        return this.string || this.raw;
    }
});

_.assign(Version, /** @lends Version */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'Version'
});

module.exports = {
    Version
};
