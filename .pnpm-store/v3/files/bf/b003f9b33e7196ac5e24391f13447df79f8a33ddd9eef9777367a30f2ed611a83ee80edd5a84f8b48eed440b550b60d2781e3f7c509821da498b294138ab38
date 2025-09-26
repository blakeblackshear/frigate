/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import DropdownNavbarItemMobile from '@theme/NavbarItem/DropdownNavbarItem/Mobile';
import DropdownNavbarItemDesktop from '@theme/NavbarItem/DropdownNavbarItem/Desktop';
export default function DropdownNavbarItem({mobile = false, ...props}) {
  const Comp = mobile ? DropdownNavbarItemMobile : DropdownNavbarItemDesktop;
  return <Comp {...props} />;
}
