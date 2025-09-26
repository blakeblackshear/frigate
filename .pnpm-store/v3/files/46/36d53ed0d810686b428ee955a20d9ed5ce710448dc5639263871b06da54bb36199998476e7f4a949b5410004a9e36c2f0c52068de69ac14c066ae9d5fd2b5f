/**
 * react-loadable-ssr-addon
 * @author Marcos Gonçalves <contact@themgoncalves.com>
 * @version 1.0.1
 */

import crypto from 'crypto';

/**
 * Compute SRI Integrity
 * @func computeIntegrity
 * See {@link https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity Subresource Integrity} at MDN
 * @param  {array} algorithms - The algorithms you want to use when hashing `content`
 * @param  {string} source - File contents you want to hash
 * @return {string} SRI hash
 */
function computeIntegrity(algorithms, source) {
  return Array.isArray(algorithms)
    ? algorithms.map((algorithm) => {
      const hash = crypto
        .createHash(algorithm)
        .update(source, 'utf8')
        .digest('base64');
      return `${algorithm}-${hash}`;
    }).join(' ')
    : '';
}

export default computeIntegrity;
