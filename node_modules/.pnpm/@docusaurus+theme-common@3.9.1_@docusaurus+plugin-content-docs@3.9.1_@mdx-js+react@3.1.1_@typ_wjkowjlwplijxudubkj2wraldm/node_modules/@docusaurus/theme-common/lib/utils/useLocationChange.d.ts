/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Location } from 'history';
/**
 * Fires an effect when the location changes (which includes hash, query, etc.).
 * Importantly, doesn't fire when there's no previous location: see
 * https://github.com/facebook/docusaurus/pull/6696
 */
export declare function useLocationChange(onLocationChange: (locationChangeEvent: {
    location: Location;
    previousLocation: Location | undefined;
}) => void): void;
//# sourceMappingURL=useLocationChange.d.ts.map