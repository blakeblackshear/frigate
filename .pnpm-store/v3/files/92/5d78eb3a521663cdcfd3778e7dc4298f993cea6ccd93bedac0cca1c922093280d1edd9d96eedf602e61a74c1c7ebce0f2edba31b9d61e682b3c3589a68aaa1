/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import type { TOCItem } from "@docusaurus/mdx-loader";
import type { VersionBanner } from "@docusaurus/plugin-content-docs";
import type { FrontMatter as DocsFrontMatter } from "@docusaurus/types";
import type { Props as DocsProps } from "@docusaurus/types";

declare module "docusaurus-plugin-openapi-docs" {
  import type { PropSidebars } from "@docusaurus/plugin-content-docs-types";

  export type Options = Partial<import("./types").APIOptions>;

  export type PropApiMetadata = {
    // TODO: adjust this to our needs
    pluginId: string;
    version: string;
    label: string;
    banner: VersionBanner | null;
    badge: boolean;
    className: string;
    isLast: boolean;
    apiSidebars: PropSidebars;
  };
}

declare module "@theme/ApiPage" {
  import type { ApiRoute } from "@theme/ApiItem";
  import type { PropApiMetadata } from "docusaurus-plugin-openapi";

  export interface Props {
    readonly location: { readonly pathname: string };
    readonly apiMetadata: PropApiMetadata;
    readonly route: {
      readonly path: string;
      readonly component: () => JSX.Element;
      readonly routes: ApiRoute[];
    };
  }

  const ApiPage: (props: Props) => JSX.Element;
  export default ApiPage;
}

declare module "@theme/ApiItem" {
  import type { Request } from "postman-collection";

  import type { ApiItem } from "./types";

  export type ApiRoute = {
    readonly component: () => JSX.Element;
    readonly exact: boolean;
    readonly path: string;
    readonly sidebar?: string;
  };

  export interface FrontMatter extends DocsFrontMatter {
    readonly api?: object;
  }

  export type Metadata = {
    readonly description?: string;
    readonly title?: string;
    readonly permalink?: string;
    readonly previous?: { readonly permalink: string; readonly title: string };
    readonly next?: { readonly permalink: string; readonly title: string };
    readonly api?: ApiItem & { postman: Request }; // TODO
    readonly type?: string;
  };

  export interface Props extends DocsProps {
    readonly route: ApiRoute;
    readonly content: {
      readonly frontMatter: FrontMatter;
      readonly metadata: Metadata;
      readonly contentTitle: string | undefined;
      readonly toc: readonly TOCItem[] | undefined;
      (): JSX.Element;
    };
  }

  const ApiItem: (props: Props) => JSX.Element;
  export default ApiItem;
}
