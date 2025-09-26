'use strict';
const valueParser = require('postcss-value-parser');
const keywords = require('./keywords');
const minifyFamily = require('./minify-family');
const minifyWeight = require('./minify-weight');

/**
 * Adds missing spaces before strings.
 *
 * @param toBeSpliced {Set<number>}
 * @param {import('postcss-value-parser').Node[]} nodes
 * @return {void}
 */
function normalizeNodes(nodes, toBeSpliced) {
  for (const index of toBeSpliced) {
    nodes.splice(
      index,
      0,
      /** @type {import('postcss-value-parser').SpaceNode} */ ({
        type: 'space',
        value: ' ',
      })
    );
  }
}

/**
 * @param {string} unminified
 * @param {import('../index').Options} opts
 * @return {string}
 */
module.exports = function (unminified, opts) {
  const tree = valueParser(unminified);
  const nodes = tree.nodes;

  let familyStart = NaN;
  let hasSize = false;
  const toBeSpliced = new Set();

  for (const [i, node] of nodes.entries()) {
    if (node.type === 'string' && i > 0 && nodes[i - 1].type !== 'space') {
      toBeSpliced.add(i);
    }

    if (node.type === 'word') {
      if (hasSize) {
        continue;
      }

      const value = node.value.toLowerCase();
      if (
        value === 'normal' ||
        value === 'inherit' ||
        value === 'initial' ||
        value === 'unset'
      ) {
        familyStart = i;
      } else if (keywords.style.has(value) || valueParser.unit(value)) {
        familyStart = i;
      } else if (keywords.variant.has(value)) {
        familyStart = i;
      } else if (keywords.weight.has(value)) {
        node.value = minifyWeight(value);
        familyStart = i;
      } else if (keywords.stretch.has(value)) {
        familyStart = i;
      } else if (keywords.size.has(value) || valueParser.unit(value)) {
        familyStart = i;
        hasSize = true;
      }
    } else if (
      node.type === 'function' &&
      nodes[i + 1] &&
      nodes[i + 1].type === 'space'
    ) {
      familyStart = i;
    } else if (node.type === 'div' && node.value === '/') {
      familyStart = i + 1;
      break;
    }
  }

  normalizeNodes(nodes, toBeSpliced);
  familyStart += 2;

  const family = minifyFamily(nodes.slice(familyStart), opts);

  tree.nodes = nodes.slice(0, familyStart).concat(family);
  return tree.toString();
};
