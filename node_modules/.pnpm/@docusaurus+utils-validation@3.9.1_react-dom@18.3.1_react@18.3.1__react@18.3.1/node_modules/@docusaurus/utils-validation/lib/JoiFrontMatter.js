"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoiFrontMatter = void 0;
const tslib_1 = require("tslib");
const Joi_1 = tslib_1.__importDefault(require("./Joi"));
const JoiFrontMatterString = {
    type: 'string',
    base: Joi_1.default.string(),
    // Fix Yaml that tries to auto-convert many things to string out of the box
    prepare: (value) => {
        if (typeof value === 'number' || value instanceof Date) {
            return { value: value.toString() };
        }
        return { value };
    },
};
/**
 * Enhance the default `Joi.string()` type so that it can convert number to
 * strings. If user use front matter "tag: 2021", we shouldn't need to ask her
 * to write "tag: '2021'". Also yaml tries to convert patterns like "2019-01-01"
 * to dates automatically.
 *
 * @see https://github.com/facebook/docusaurus/issues/4642
 * @see https://github.com/sideway/joi/issues/1442#issuecomment-823997884
 */
exports.JoiFrontMatter = Joi_1.default.extend(JoiFrontMatterString);
//# sourceMappingURL=JoiFrontMatter.js.map