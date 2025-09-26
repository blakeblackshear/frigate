/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export function hasProtocol(url) {
    return /^(?:\w*:|\/\/)/.test(url);
}
export default function isInternalUrl(url) {
    return typeof url !== 'undefined' && !hasProtocol(url);
}
