'use strict';
/** @constructor */
function LayerCache() {
  this._values = new Map();
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function ascending(a, b) {
  return a - b;
}

/**
 * @param {number} startIndex
 * @return {void}
 */
LayerCache.prototype.optimizeValues = function (startIndex) {
  const sortedValues = Array.from(this._values.keys()).sort(ascending);
  for (let i = 0; i < sortedValues.length; i++) {
    this._values.set(sortedValues[i], i + startIndex);
  }
};

/**
 * @param {string} value
 * @return {void}
 */
LayerCache.prototype.addValue = function (value) {
  let parsedValue = parseInt(value, 10);

  // pass only valid values
  if (!parsedValue || parsedValue < 0) {
    return;
  }

  this._values.set(parsedValue, parsedValue);
};

/**
 * @param {string} value
 * @return {string}
 */
LayerCache.prototype.getValue = function (value) {
  let parsedValue = parseInt(value, 10);

  return this._values.get(parsedValue) || value;
};

module.exports = LayerCache;
