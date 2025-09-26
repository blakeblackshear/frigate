"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeFreqList = exports.LastModOptionList = void 0;
exports.LastModOptionList = ['date', 'datetime'];
// types are according to the sitemap spec:
// see also https://www.sitemaps.org/protocol.html
exports.ChangeFreqList = [
    'hourly',
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'always',
    'never',
];
