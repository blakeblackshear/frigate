var _ = require('lodash').noConflict(),
    iconvlite = require('iconv-lite'),
    util,

    ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,
    EMPTY = '';

/**
 * @module util
 * @private
 */
_.mixin(/** @lends util */ {

    /**
     * Creates an inheritance relation between the child and the parent, adding a 'super_' attribute to the
     * child, and setting up the child prototype.
     *
     * @param {Function} child - The target object to create parent references for,.
     * @param {Function} base - The parent association to assign to the provided child definition.
     * @returns {*}
     */
    inherit (child, base) {
        Object.defineProperty(child, 'super_', {
            value: _.isFunction(base) ? base : _.noop,
            configurable: false,
            enumerable: false,
            writable: false
        });

        child.prototype = Object.create((_.isFunction(base) ? base.prototype : base), {
            constructor: {
                value: child,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });

        return child;
    },

    /**
     * Creates an array from a Javascript "arguments" object.
     * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/arguments
     *
     * @param {Array} args -
     * @returns {Array.<T>}
     */
    args (args) {
        return Array.prototype.slice.call(args);
    },

    /**
     * Makes sure the given string is encoded only once.
     *
     * @param {String} string -
     * @returns {String}
     */
    ensureEncoded (string) {
        // Takes care of the case where the string is already encoded.
        try {
            string = decodeURIComponent(string);
        }
        catch (e) {} // eslint-disable-line no-empty

        try {
            return encodeURIComponent(string);
        }
        // handle malformed URI sequence
        // refer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Malformed_URI
        catch (error) {
            return string;
        }
    },

    /**
     * Creates a locked property on an object, which is not writable or enumerable.
     *
     * @param {Object} obj -
     * @param {String} name -
     * @param {*} prop -
     * @returns {*}
     */
    assignLocked (obj, name, prop) {
        Object.defineProperty(obj, name, {
            value: prop,
            configurable: false,
            enumerable: false,
            writable: false
        });

        return obj;
    },

    /**
     * Creates a hidden property on an object, which can be changed, but is not enumerable.
     *
     * @param {Object} obj -
     * @param {String} name -
     * @param {*} prop -
     * @returns {*}
     */
    assignHidden (obj, name, prop) {
        Object.defineProperty(obj, name, {
            value: prop,
            configurable: true,
            enumerable: false,
            writable: true
        });

        return obj;
    },

    /**
     * Creates a property on an object, with the given type.
     *
     * @param {Object} obj -
     * @param {String} name -
     * @param {Property} Prop -
     * @param {*} [fallback] -
     * @returns {Prop|undefined}
     */
    createDefined (obj, name, Prop, fallback) {
        return _.has(obj, name) ? (new Prop(obj[name])) : fallback;
    },

    /**
     * Merges defined keys from the target object onto the source object.
     *
     * @param {Object} target -
     * @param {Object} source -
     * @returns {Object}
     */
    mergeDefined (target, source) {
        var key;

        for (key in source) {
            if (_.has(source, key) && !_.isUndefined(source[key])) {
                target[key] = source[key];
            }
        }

        return target;
    },

    /**
     * Returns the value of a property if defined in object, else the default
     *
     * @param {Object} obj -
     * @param {String} prop -
     * @param {*=} def -
     *
     * @returns {*}
     */
    getOwn (obj, prop, def) {
        return _.has(obj, prop) ? obj[prop] : def;
    },

    /**
     * Creates a clone of an object, but uses the toJSON method if available.
     *
     * @param {Object} obj -
     * @returns {*}
     */
    cloneElement (obj) {
        return _.cloneDeepWith(obj, function (value) {
            // falls back to default deepclone if object does not have explicit toJSON().
            if (value && _.isFunction(value.toJSON)) {
                return value.toJSON();
            }
        });
    },

    /**
     * Returns the match of a value of a property by traversing the prototype
     *
     * @param {Object} obj -
     * @param {String} key -
     * @param {*} value -
     *
     * @returns {Boolean}
     */
    inSuperChain (obj, key, value) {
        return obj ? ((obj[key] === value) || _.inSuperChain(obj.super_, key, value)) : false;
    },

    /**
     * Generates a random string of given length (useful for nonce generation, etc).
     *
     * @param {Number} length -
     */
    randomString (length) {
        length = length || 6;

        var result = [],
            i;

        for (i = 0; i < length; i++) {
            result[i] = ASCII_SOURCE[(Math.random() * ASCII_SOURCE_LENGTH) | 0];
        }

        return result.join(EMPTY);
    },

    choose () {
        for (var i = 0, ii = arguments.length; i < ii; i++) {
            if (!_.isEmpty(arguments[i])) {
                return arguments[i];
            }
        }
    }
});

util = {
    lodash: _,

    /**
     *
     * @param {String} data -
     * @returns {String} [description]
     */
    btoa: (/* istanbul ignore next */
        (typeof btoa !== 'function' && typeof Buffer === 'function') ? function (data) {
            return Buffer.from(data).toString('base64');
        } : function (data) {
            return btoa(data);
        }
    ), // @todo use browserify to normalise this

    /**
     * ArrayBuffer to String
     *
     * @param {ArrayBuffer} buffer -
     * @returns {String}
     */
    arrayBufferToString: function (buffer) {
        var str = '',
            uArrayVal = new Uint8Array(buffer),

            i,
            ii;

        for (i = 0, ii = uArrayVal.length; i < ii; i++) {
            str += String.fromCharCode(uArrayVal[i]);
        }

        return str;
    },

    bufferOrArrayBufferToString: function (buffer, charset) {
        if (!buffer || _.isString(buffer)) {
            return buffer || '';
        }

        if (Buffer.isBuffer(buffer)) {
            if (iconvlite.encodingExists(charset)) {
                return iconvlite.decode(buffer, charset);
            }

            return buffer.toString(); // Default to utf8 if iconvlite also not supporting the charset
        }

        return util.arrayBufferToString(buffer);
    },

    bufferOrArrayBufferToBase64: function (buffer) {
        if (!buffer) {
            return '';
        }

        // handle when buffer is pure string
        if (_.isString(buffer)) {
            return util.btoa(buffer);
        }

        // check if tostring works
        var base64 = buffer.toString('base64') || '';

        if (base64 === '[object ArrayBuffer]') {
            return util.btoa(util.arrayBufferToString(buffer));
        }

        return base64;
    },

    /**
     * Check whether a value is number-like
     * https://github.com/lodash/lodash/issues/1148#issuecomment-141139153
     *
     * @param {*} n - The candidate to be checked for numeric compliance.
     * @returns {Boolean}
     */
    isNumeric: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
};

module.exports = util;
