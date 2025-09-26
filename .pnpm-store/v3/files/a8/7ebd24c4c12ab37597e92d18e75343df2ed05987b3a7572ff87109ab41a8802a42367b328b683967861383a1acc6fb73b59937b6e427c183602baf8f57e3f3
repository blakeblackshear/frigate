/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ValidationOptions } from 'joi';
import type Joi from './Joi';
/** Print warnings returned from Joi validation. */
export declare function printWarning(warning?: Joi.ValidationError): void;
/**
 * The callback that should be used to validate plugin options. Handles plugin
 * IDs on a generic level: no matter what the schema declares, this callback
 * would require a string ID or default to "default".
 */
export declare function normalizePluginOptions<T extends {
    id?: string;
}>(schema: Joi.ObjectSchema<T>, options?: Partial<T>): T;
/**
 * The callback that should be used to validate theme config. No matter what the
 * schema declares, this callback would allow unknown attributes.
 */
export declare function normalizeThemeConfig<T>(schema: Joi.ObjectSchema<T>, themeConfig: Partial<T>): T;
/**
 * Validate front matter with better error message
 */
export declare function validateFrontMatter<T>(frontMatter: unknown, schema: Joi.ObjectSchema<T>, options?: ValidationOptions): T;
//# sourceMappingURL=validationUtils.d.ts.map