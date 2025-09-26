/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { FacetFilters } from 'algoliasearch/lite';
export declare function mergeFacetFilters(f1: FacetFilters, f2: FacetFilters): FacetFilters;
export declare function mergeFacetFilters(f1: FacetFilters | undefined, f2: FacetFilters | undefined): FacetFilters | undefined;
