/**
 * react-loadable-ssr-addon
 * @author Marcos Gonçalves <contact@themgoncalves.com>
 * @version 1.0.1
 */

/**
 * Get file extension
 * @method getFileExtension
 * @static
 * @param {string} filename - File name
 * @returns {string} - File extension
 */
function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') { return ''; }

  const fileExtRegex = /\.\w{2,4}\.(?:map|gz)$|\.\w+$/i;

  const name = filename.split(/[?#]/)[0]; // eslint-disable-line prefer-destructuring
  const ext = name.match(fileExtRegex);

  return ext && ext.length ? ext[0] : '';
}

export default getFileExtension;
