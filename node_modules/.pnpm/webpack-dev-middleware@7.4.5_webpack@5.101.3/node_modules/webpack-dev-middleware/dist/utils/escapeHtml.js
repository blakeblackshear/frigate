"use strict";

const matchHtmlRegExp = /["'&<>]/;

/**
 * @param {string} string raw HTML
 * @returns {string} escaped HTML
 */
function escapeHtml(string) {
  const str = `${string}`;
  const match = matchHtmlRegExp.exec(str);
  if (!match) {
    return str;
  }
  let escape;
  let html = "";
  let index = 0;
  let lastIndex = 0;
  for ({
    index
  } = match; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      // "
      case 34:
        escape = "&quot;";
        break;
      // &
      case 38:
        escape = "&amp;";
        break;
      // '
      case 39:
        escape = "&#39;";
        break;
      // <
      case 60:
        escape = "&lt;";
        break;
      // >
      case 62:
        escape = "&gt;";
        break;
      default:
        continue;
    }
    if (lastIndex !== index) {
      // eslint-disable-next-line unicorn/prefer-string-slice
      html += str.substring(lastIndex, index);
    }
    lastIndex = index + 1;
    html += escape;
  }

  // eslint-disable-next-line unicorn/prefer-string-slice
  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}
module.exports = escapeHtml;