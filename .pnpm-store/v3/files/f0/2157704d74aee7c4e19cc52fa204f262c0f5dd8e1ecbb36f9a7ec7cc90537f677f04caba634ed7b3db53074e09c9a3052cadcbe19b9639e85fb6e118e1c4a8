'use strict';
const { unit } = require('postcss-value-parser');

/**
 * @param {import('postcss-value-parser').Node} node
 * @return {import('postcss-value-parser').Dimension | false}
 */
module.exports = function isNum(node) {
  return unit(node.value);
};
