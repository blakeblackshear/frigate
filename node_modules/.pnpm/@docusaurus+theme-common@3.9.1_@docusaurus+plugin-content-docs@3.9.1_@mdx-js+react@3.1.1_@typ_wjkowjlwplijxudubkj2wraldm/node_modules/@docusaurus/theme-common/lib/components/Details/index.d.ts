/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
export type DetailsProps = {
    /**
     * Summary is provided as props, optionally including the wrapping
     * `<summary>` tag
     */
    summary?: ReactElement | string;
} & ComponentProps<'details'>;
/**
 * A mostly un-styled `<details>` element with smooth collapsing. Provides some
 * very lightweight styles, but you should bring your UI.
 */
export declare function Details({ summary, children, ...props }: DetailsProps): ReactNode;
//# sourceMappingURL=index.d.ts.map