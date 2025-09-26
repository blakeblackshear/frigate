/**
 * react-loadable-ssr-addon
 * @author Marcos Gonçalves <contact@themgoncalves.com>
 * @version 1.0.1
 */

import { unique } from './utils';

/**
 * getBundles
 * @param {object} manifest - The assets manifest content generate by ReactLoadableSSRAddon
 * @param {array} chunks - Chunks list to be loaded
 * @returns {array} - Assets list group by file type
 */
/* eslint-disable no-param-reassign */
function getBundles(manifest, chunks) {
  if (!manifest || !chunks) { return {}; }

  const assetsKey = chunks.reduce((key, chunk) => {
    if (manifest.origins[chunk]) {
      key = unique([...key, ...manifest.origins[chunk]]);
    }
    return key;
  }, []);

  return assetsKey.reduce((bundle, asset) => {
    Object.keys(manifest.assets[asset] || {}).forEach((key) => {
      const content = manifest.assets[asset][key];
      if (!bundle[key]) { bundle[key] = []; }
      bundle[key] = unique([...bundle[key], ...content]);
    });
    return bundle;
  }, {});
}
/* eslint-enabled */

export default getBundles;
