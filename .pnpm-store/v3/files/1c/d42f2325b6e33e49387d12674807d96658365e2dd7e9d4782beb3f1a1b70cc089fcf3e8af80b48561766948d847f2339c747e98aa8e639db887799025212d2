/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const isTree = (x) => typeof x === 'object' && !!x && Object.keys(x).length > 0;
/**
 * Takes a tree, and flattens it into a map of keyPath -> value.
 *
 * ```js
 * flat({ a: { b: 1 } }) === { "a.b": 1 };
 * flat({ a: [1, 2] }) === { "a.0": 1, "a.1": 2 };
 * ```
 */
export default function flat(target) {
    const delimiter = '.';
    const output = {};
    function dfs(object, prefix) {
        Object.entries(object).forEach(([key, value]) => {
            const newKey = prefix ? `${prefix}${delimiter}${key}` : key;
            if (isTree(value)) {
                dfs(value, newKey);
            }
            else {
                output[newKey] = value;
            }
        });
    }
    dfs(target);
    return output;
}
