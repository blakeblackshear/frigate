"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const tslib_1 = require("tslib");
const cssnano_preset_advanced_1 = tslib_1.__importDefault(require("cssnano-preset-advanced"));
const postcss_sort_media_queries_1 = tslib_1.__importDefault(require("postcss-sort-media-queries"));
const remove_overridden_custom_properties_1 = tslib_1.__importDefault(require("./remove-overridden-custom-properties"));
const preset = function preset(opts) {
    const advancedPreset = (0, cssnano_preset_advanced_1.default)({
        autoprefixer: { add: false },
        discardComments: { removeAll: true },
        /* cSpell:ignore zindex */
        zindex: false,
        ...opts,
    });
    advancedPreset.plugins.unshift([postcss_sort_media_queries_1.default, undefined], [remove_overridden_custom_properties_1.default, undefined]);
    return advancedPreset;
};
module.exports = preset;
