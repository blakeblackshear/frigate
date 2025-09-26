'use strict';
const encode = require('./lib/encode');
const counterReducer = require('./lib/counter');
const counterStyleReducer = require('./lib/counter-style');
const keyframesReducer = require('./lib/keyframes');
const gridTemplateReducer = require('./lib/grid-template');

/** @typedef {{
    counter?: boolean, counterStyle?: boolean, 
    keyframes?: boolean, gridTemplate?: boolean, 
    encoder?: (value: string, index: number) => string}} Options
*/
/** @typedef {{
 *    collect: (node: import('postcss').AnyNode, encoder: (value: string, num: number) => string) => void,
 *    transform: () => void
 *  }} Reducer
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} arg
 * @return {import('postcss').Plugin}
 */
function pluginCreator({
  counter = true,
  counterStyle = true,
  keyframes = true,
  gridTemplate = true,
  encoder = encode,
} = {}) {
  /** @type {Reducer[]} */
  const reducers = [];

  counter && reducers.push(counterReducer());
  counterStyle && reducers.push(counterStyleReducer());
  keyframes && reducers.push(keyframesReducer());
  gridTemplate && reducers.push(gridTemplateReducer());

  return {
    postcssPlugin: 'postcss-reduce-idents',

    OnceExit(css) {
      css.walk((node) => {
        reducers.forEach((reducer) => reducer.collect(node, encoder));
      });

      reducers.forEach((reducer) => reducer.transform());
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
