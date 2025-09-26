/**
 * react-loadable-ssr-addon
 * @author Marcos Gonçalves <contact@themgoncalves.com>
 * @version 1.0.1
 */

/**
 * Checks if object array already contains given value
 * @method hasEntry
 * @function
 * @param {array} target - Object array to be inspected
 * @param {string} targetKey - Object key to look for
 * @param {string} searchFor - Value to search existence
 * @returns {boolean}
 */
export default function hasEntry(target, targetKey, searchFor) {
  if (!target) { return false; }

  for (let i = 0; i < target.length; i += 1) {
    const file = target[i][targetKey];
    if (file === searchFor) { return true; }
  }

  return false;
}
