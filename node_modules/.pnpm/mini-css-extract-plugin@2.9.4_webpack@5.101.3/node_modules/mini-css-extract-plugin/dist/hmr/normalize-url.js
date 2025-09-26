"use strict";

/**
 * @param {string[]} pathComponents path components
 * @returns {string} normalized url
 */
function normalizeUrlInner(pathComponents) {
  return pathComponents.reduce(function (accumulator, item) {
    switch (item) {
      case "..":
        accumulator.pop();
        break;
      case ".":
        break;
      default:
        accumulator.push(item);
    }
    return accumulator;
  }, /** @type {string[]} */[]).join("/");
}

/**
 * @param {string} urlString url string
 * @returns {string} normalized url string
 */
module.exports = function normalizeUrl(urlString) {
  urlString = urlString.trim();
  if (/^data:/i.test(urlString)) {
    return urlString;
  }
  var protocol =
  // eslint-disable-next-line unicorn/prefer-includes
  urlString.indexOf("//") !== -1 ? "".concat(urlString.split("//")[0], "//") : "";
  var components = urlString.replace(new RegExp(protocol, "i"), "").split("/");
  var host = components[0].toLowerCase().replace(/\.$/, "");
  components[0] = "";
  var path = normalizeUrlInner(components);
  return protocol + host + path;
};