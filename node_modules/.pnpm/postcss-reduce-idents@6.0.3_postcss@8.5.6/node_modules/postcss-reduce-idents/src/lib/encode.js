'use strict';
/**
 * @param {string} val
 * @param {number} num
 * @return {string}
 */
module.exports = function encode(val, num) {
  let base = 52;
  let characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let character = num % base;
  let result = characters[character];
  let remainder = Math.floor(num / base);

  if (remainder) {
    base = 64;
    characters = characters + '0123456789-_';

    while (remainder) {
      remainder--;
      character = remainder % base;
      remainder = Math.floor(remainder / base);
      result = result + characters[character];
    }
  }

  return result;
};
