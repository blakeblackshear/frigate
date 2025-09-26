/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export function mergeFacetFilters(f1, f2) {
    if (f1 === undefined) {
        return f2;
    }
    if (f2 === undefined) {
        return f1;
    }
    const normalize = (f) => typeof f === 'string' ? [f] : f;
    // Historical behavior: we flatten everything
    // TODO I'm pretty sure this is incorrect
    //  see https://www.algolia.com/doc/api-reference/api-parameters/facetFilters/?client=javascript
    //  Note: Algolia is working to provide a reliable facet merging strategy
    //  see https://github.com/facebook/docusaurus/pull/11327#issuecomment-3284742923
    return [...normalize(f1), ...normalize(f2)];
}
