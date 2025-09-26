module.exports = {
  /**
   * Resolve the scenario if the item is in second level
   * @param {array} trace The keyInComponents
   * @param {number} index the current index
   * @return {undefined}
   */

  resolveSecondLevelChild: function (trace, index, definitions) {
    const item = definitions[trace[index + 2]];
    if (item) {
      trace[index + 1] = item;
    }
  },

  /**
 * If the provided item is included in any defined container it returns the container name
 * else it return the same item
 * @param {string} item The current item in the iteration
 * @returns {string} the name of container where item is included or the item if it's not included
 *                    in any container
 */

  resolveFirstLevelChild: function(item, containers) {
    for (let [key, containerItems] of Object.entries(containers)) {
      if (containerItems.includes(item)) {
        return key;
      }
    }

    return item;
  }
};
