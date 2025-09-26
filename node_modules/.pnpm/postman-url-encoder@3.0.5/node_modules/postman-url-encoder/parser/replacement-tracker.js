
/**
 * Tracks replacements done on a string and expose utility to patch replacements.
 *
 * @note due to performance reasons, it doesn't store the original string or
 * perform ops on the string.
 *
 * @private
 * @constructor
 */
class ReplacementTracker {
    constructor () {
        this.replacements = [];
        this._offset = 0;
        this._length = 0;
    }

    /**
     * Add new replacement to track.
     *
     * @param {String} value -
     * @param {Number} index -
     */
    add (value, index) {
        this.replacements.push({
            value: value,
            index: index - this._offset
        });

        this._offset += value.length - 1; // - 1 replaced character
        this._length++;
    }

    /**
     * Returns the total number of replacements.
     *
     * @returns {Number}
     */
    count () {
        return this._length;
    }

    /**
     * Finds the lower index of replacement position for a given value using inexact
     * binary search.
     *
     * @private
     * @param {Number} index -
     * @returns {Number}
     */
    _findLowerIndex (index) {
        let length = this.count(),
            start = 0,
            end = length - 1,
            mid;

        while (start <= end) {
            mid = (start + end) >> 1; // divide by 2

            if (this.replacements[mid].index >= index) {
                end = mid - 1;
            }
            else {
                start = mid + 1;
            }
        }

        return start >= length ? -1 : start;
    }

    /**
     * Patches a given string by apply all the applicable replacements done in the
     * given range.
     *
     * @private
     * @param {String} input -
     * @param {Number} beginIndex -
     * @param {Number} endIndex -
     * @returns {String}
     */
    _applyInString (input, beginIndex, endIndex) {
        let index,
            replacement,
            replacementIndex,
            replacementValue,
            offset = 0,
            length = this.count();

        // bail out if no replacements are done in the given range OR empty string
        if (!input || (index = this._findLowerIndex(beginIndex)) === -1) {
            return input;
        }

        do {
            replacement = this.replacements[index];
            replacementIndex = replacement.index;
            replacementValue = replacement.value;

            // bail out if all the replacements are done in the given range
            if (replacementIndex >= endIndex) {
                break;
            }

            replacementIndex = offset + replacementIndex - beginIndex;
            input = input.slice(0, replacementIndex) + replacementValue + input.slice(replacementIndex + 1);
            offset += replacementValue.length - 1;
        } while (++index < length);

        return input;
    }

    /**
     * Patches a given string or array of strings by apply all the applicable
     * replacements done in the given range.
     *
     * @param {String|String[]} input -
     * @param {Number} beginIndex -
     * @param {Number} endIndex -
     * @returns {String|String[]}
     */
    apply (input, beginIndex, endIndex) {
        let i,
            ii,
            length,
            _endIndex,
            _beginIndex,
            value = input;

        // apply replacements in string
        if (typeof input === 'string') {
            return this._applyInString(input, beginIndex, endIndex);
        }

        // apply replacements in the splitted string (Array)
        _beginIndex = beginIndex;

        // traverse all the segments until all the replacements are patched
        for (i = 0, ii = input.length; i < ii; ++i) {
            value = input[i];
            _endIndex = _beginIndex + (length = value.length);

            // apply replacements applicable for individual segment
            input[i] = this._applyInString(value, _beginIndex, _endIndex);
            _beginIndex += length + 1; // + 1 separator
        }

        return input;
    }
}

module.exports = ReplacementTracker;
