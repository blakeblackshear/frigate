"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDraft = isDraft;
exports.isUnlisted = isUnlisted;
/**
 * To easily work on draft/unlisted in dev mode, use this env variable!
 * SIMULATE_PRODUCTION_VISIBILITY=true yarn start:website
 */
const simulateProductionVisibility = process.env.SIMULATE_PRODUCTION_VISIBILITY === 'true';
/**
 * draft/unlisted is a production-only concept
 * In dev it is ignored and all content files are included
 */
function isProduction(env) {
    return (simulateProductionVisibility ||
        (env ?? process.env.NODE_ENV) === 'production');
}
/**
 * A draft content will not be included in the production build
 */
function isDraft({ frontMatter, env, }) {
    return (isProduction(env) && frontMatter.draft) ?? false;
}
/**
 * An unlisted content will be included in the production build, but hidden.
 * It is excluded from sitemap, has noIndex, does not appear in lists etc...
 * Only users having the link can find it.
 */
function isUnlisted({ frontMatter, env, }) {
    return (isProduction(env) && frontMatter.unlisted) ?? false;
}
//# sourceMappingURL=contentVisibilityUtils.js.map