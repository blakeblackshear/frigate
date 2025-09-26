/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { BlogContentPaths } from './types';
import type { AuthorAttributes, AuthorPage, AuthorsMap } from '@docusaurus/plugin-content-blog';
type AuthorInput = AuthorAttributes & {
    page?: boolean | AuthorPage;
};
export type AuthorsMapInput = {
    [authorKey: string]: AuthorInput;
};
export declare function checkAuthorsMapPermalinkCollisions(authorsMap: AuthorsMap | undefined): void;
export declare function validateAuthorsMapInput(content: unknown): AuthorsMapInput;
export declare function getAuthorsMap(params: {
    authorsMapPath: string;
    authorsBaseRoutePath: string;
    contentPaths: BlogContentPaths;
    baseUrl: string;
}): Promise<AuthorsMap | undefined>;
export declare function validateAuthorsMap(content: unknown): AuthorsMapInput;
export {};
