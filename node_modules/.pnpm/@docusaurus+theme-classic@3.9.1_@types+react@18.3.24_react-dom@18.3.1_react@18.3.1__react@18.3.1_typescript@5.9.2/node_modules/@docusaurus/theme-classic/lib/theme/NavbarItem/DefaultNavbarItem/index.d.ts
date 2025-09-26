/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import type { Props } from '@theme/NavbarItem/DefaultNavbarItem';
export default function DefaultNavbarItem({ mobile, position, // Need to destructure position from props so that it doesn't get passed on.
...props }: Props): ReactNode;
