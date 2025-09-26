/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { BlogContent, BlogPost } from '@docusaurus/plugin-content-blog';
export declare function createContentHelpers(): {
    updateContent: (content: BlogContent) => void;
    sourceToBlogPost: Map<string, BlogPost>;
    sourceToPermalink: Map<string, string>;
};
