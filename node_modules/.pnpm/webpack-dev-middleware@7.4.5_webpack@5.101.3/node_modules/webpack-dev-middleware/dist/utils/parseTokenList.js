"use strict";

/**
 * Parse a HTTP token list.
 * @param {string} str str
 * @returns {string[]} tokens
 */
function parseTokenList(str) {
  let end = 0;
  let start = 0;
  const list = [];

  // gather tokens
  for (let i = 0, len = str.length; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          end = i + 1;
          start = end;
        }
        break;
      case 0x2c /* , */:
        if (start !== end) {
          list.push(str.slice(start, end));
        }
        end = i + 1;
        start = end;
        break;
      default:
        end = i + 1;
        break;
    }
  }

  // final token
  if (start !== end) {
    list.push(str.slice(start, end));
  }
  return list;
}
module.exports = parseTokenList;