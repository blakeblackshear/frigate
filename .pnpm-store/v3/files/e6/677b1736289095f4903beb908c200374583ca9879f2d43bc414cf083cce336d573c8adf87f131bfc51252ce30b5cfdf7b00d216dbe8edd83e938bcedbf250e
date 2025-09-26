/**!
 * Originally written by:
 * https://github.com/sindresorhus/parse-json
 */
var fallback = require('../vendor/parse'),
    bomb = require('./bomb'),
    FALLBACK_MODE = 'json',
    ERROR_NAME = 'JSONError',

    parse; // fn

/**
 * Accept a string as JSON and return an object.
 * @private
 *
 * @param {String} str The input stringified JSON object to be parsed.
 * @param {Function=} [reviver] A customizer function to be used within the fallback (BOM friendly) JSON parser.
 * @param {Boolean=} [strict] Set to true to treat the occurrence of BOM as a fatal error.
 *
 * @returns {Object} The parsed JSON object constructed from str
 * @throws {SyntaxError} If `str` is not a valid JSON
 * @throws {SyntaxError} In `strict` mode if `str` contains BOM
 */
parse = function (str, reviver, strict) {
    var bomMarkerIndex = bomb.indexOfBOM(str);

    if (bomMarkerIndex) {
        if (strict) {
            throw SyntaxError('Unexpected byte order mark found in first ' + bomMarkerIndex + ' character(s)');
        }
        // clean up BOM if not strict
        str = str.slice(bomMarkerIndex);
    }

    try { // first try and use normal JSON.parse as this is faster
        return JSON.parse(str, reviver);
    }
    catch (err) { // if JSON.parse fails, we try using a more verbose parser
        fallback.parse(str, {
            mode: FALLBACK_MODE,
            reviver: reviver
        });

        // if there was an error in this catch block, `fallback.parse` should raise same error. hence this `throw`
        // will never get executed. if it does not, we still throw original error.
        throw err;
    }
};

module.exports = {
    parse: function (str, reviver, relaxed) {
        if ((typeof reviver === 'boolean') && (relaxed === null)) {
            relaxed = reviver;
            reviver = null;
        }

        try {
            return parse(str, reviver, relaxed);
        }
        // we do this simply to set the error name and as such making it more identifiable
        catch (err) {
            err.name = ERROR_NAME;
            throw err;
        }
    },

    stringify: function () {
        try {
            // eslint-disable-next-line prefer-spread
            return JSON.stringify.apply(JSON, arguments);
        }
        // we do this simply to set the error name and as such making it more identifiable
        catch (err) {
            err.name = ERROR_NAME;
            throw err;
        }
    }
};
