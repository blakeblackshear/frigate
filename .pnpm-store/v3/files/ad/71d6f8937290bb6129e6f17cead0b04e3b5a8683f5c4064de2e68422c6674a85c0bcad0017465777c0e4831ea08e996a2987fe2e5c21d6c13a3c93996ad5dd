/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
type Env = 'production' | 'development';
/**
 * A draft content will not be included in the production build
 */
export declare function isDraft({ frontMatter, env, }: {
    frontMatter: {
        draft?: boolean;
    };
    env?: Env;
}): boolean;
/**
 * An unlisted content will be included in the production build, but hidden.
 * It is excluded from sitemap, has noIndex, does not appear in lists etc...
 * Only users having the link can find it.
 */
export declare function isUnlisted({ frontMatter, env, }: {
    frontMatter: {
        unlisted?: boolean;
    };
    env?: Env;
}): boolean;
export {};
//# sourceMappingURL=contentVisibilityUtils.d.ts.map