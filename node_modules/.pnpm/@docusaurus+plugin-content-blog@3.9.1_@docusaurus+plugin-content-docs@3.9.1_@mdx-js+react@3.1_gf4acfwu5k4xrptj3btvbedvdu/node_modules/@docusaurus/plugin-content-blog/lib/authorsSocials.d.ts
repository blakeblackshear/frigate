/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Joi } from '@docusaurus/utils-validation';
import type { AuthorSocials } from '@docusaurus/plugin-content-blog';
export declare const AuthorSocialsSchema: Joi.ObjectSchema<AuthorSocials>;
export declare const normalizeSocials: (socials: AuthorSocials) => AuthorSocials;
