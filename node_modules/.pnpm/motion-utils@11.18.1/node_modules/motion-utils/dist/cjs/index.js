'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*#__NO_SIDE_EFFECTS__*/
const noop = (any) => any;

exports.warning = noop;
exports.invariant = noop;
if (process.env.NODE_ENV !== "production") {
    exports.warning = (check, message) => {
        if (!check && typeof console !== "undefined") {
            console.warn(message);
        }
    };
    exports.invariant = (check, message) => {
        if (!check) {
            throw new Error(message);
        }
    };
}

/*#__NO_SIDE_EFFECTS__*/
function memo(callback) {
    let result;
    return () => {
        if (result === undefined)
            result = callback();
        return result;
    };
}

/*
  Progress within given range

  Given a lower limit and an upper limit, we return the progress
  (expressed as a number 0-1) represented by the given value, and
  limit that progress to within 0-1.

  @param [number]: Lower limit
  @param [number]: Upper limit
  @param [number]: Value to find progress within given range
  @return [number]: Progress of value within range as expressed 0-1
*/
/*#__NO_SIDE_EFFECTS__*/
const progress = (from, to, value) => {
    const toFromDifference = to - from;
    return toFromDifference === 0 ? 1 : (value - from) / toFromDifference;
};

/**
 * Converts seconds to milliseconds
 *
 * @param seconds - Time in seconds.
 * @return milliseconds - Converted time in milliseconds.
 */
/*#__NO_SIDE_EFFECTS__*/
const secondsToMilliseconds = (seconds) => seconds * 1000;
/*#__NO_SIDE_EFFECTS__*/
const millisecondsToSeconds = (milliseconds) => milliseconds / 1000;

exports.memo = memo;
exports.millisecondsToSeconds = millisecondsToSeconds;
exports.noop = noop;
exports.progress = progress;
exports.secondsToMilliseconds = secondsToMilliseconds;
