/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

declare module "@docusaurus/plugin-content-docs-types" {
  // Makes all properties visible when hovering over the type
  type Expand<T extends Record<string, unknown>> = { [P in keyof T]: T[P] };

  export type SidebarItemBase = {
    className?: string;
    customProps?: Record<string, unknown>;
  };

  export type SidebarItemLink = SidebarItemBase & {
    type: "link";
    href: string;
    label: string;
    docId: string;
  };

  type SidebarItemCategoryBase = SidebarItemBase & {
    type: "category";
    label: string;
    collapsed: boolean;
    collapsible: boolean;
  };

  export type PropSidebarItemCategory = Expand<
    SidebarItemCategoryBase & {
      items: PropSidebarItem[];
    }
  >;

  export type PropSidebarItem = SidebarItemLink | PropSidebarItemCategory;
  export type PropSidebar = PropSidebarItem[];
  export type PropSidebars = {
    [sidebarId: string]: PropSidebar;
  };
}
