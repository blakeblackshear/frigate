/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

/// <reference types="docusaurus-plugin-openapi-docs" />

/* eslint-disable @typescript-eslint/no-use-before-define */

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

declare module "docusaurus-theme-openapi-docs" {
  export type ThemeConfig = Partial<import("./types").ThemeConfig>;
}

declare module "@theme/ApiItem/hooks" {
  export { useTypedDispatch, useTypedSelector };
}

declare module "@theme/ApiItem/Layout" {
  export interface Props {
    readonly children: JSX.Element;
  }

  export default function Layout(props: any): JSX.Element;
}

declare module "@theme/ApiItem/store" {
  export { AppDispatch, RootState };
}

declare module "@theme/SchemaTabs" {
  export default function SchemaTabs(props: any): JSX.Element;
}

declare module "@theme/Markdown" {
  export default function Markdown(props: any): JSX.Element;
}

declare module "@theme/ApiExplorer/Accept" {
  export default function Accept(): JSX.Element;
}

declare module "@theme/ApiExplorer/Accept/slice" {
  export { setAccept };
  export default accept as Reducer<State, AnyAction>;
}

declare module "@theme/ApiExplorer/Authorization" {
  export default function Authorization(): JSX.Element;
}

declare module "@theme/ApiExplorer/Authorization/slice" {
  export { AuthState, Scheme, setAuthData, setSelectedAuth, createAuth };
  export default auth as Reducer<State, AnyAction>;
}

declare module "@theme/ApiExplorer/Body" {
  import { Props as BodyProps } from "@theme/ApiExplorer/Body";

  export default function Body(props: BodyProps): JSX.Element;
}

declare module "@theme/ApiExplorer/Body/json2xml" {
  export default function json2xml(any, any?): any;
}

declare module "@theme/ApiExplorer/Body/slice" {
  import { Body, Content, State } from "@theme/ApiExplorer/Body/slice";

  export { Body, Content, State };
  export function setStringRawBody(any, any?): any;
  export default body as Reducer<State, AnyAction>;
}

declare module "@theme/ApiExplorer/buildPostmanRequest" {
  export default function buildPostmanRequest(any, any?): any;
}

declare module "@theme/ApiExplorer/CodeTabs" {
  import { Props as CodeTabsProps } from "@theme/ApiExplorer/CodeTabs";

  export default function CodeTabs(props: CodeTabsProps): JSX.Element;
}

declare module "@theme/ApiExplorer/ContentType" {
  export default function ContentType(): JSX.Element;
}

declare module "@theme/ApiExplorer/ContentType/slice" {
  export { setContentType };
  export default contentType as Reducer<State, AnyAction>;
}

declare module "@theme/ApiExplorer/CodeSnippets" {
  import { Props as CurlProps } from "@theme/ApiExplorer/CodeSnippets";

  export { languageSet, Language } from "@theme/ApiExplorer/CodeSnippets";
  export default function Curl(props: CurlProps): JSX.Element;
}

declare module "@theme/ApiExplorer/FloatingButton" {
  import { Props as FloatingButtonProps } from "@theme/ApiExplorer/FloatingButton";

  export default function FloatingButton(
    props: FloatingButtonProps
  ): JSX.Element;
}

declare module "@theme/ApiExplorer/FormItem" {
  import { Props as FormItemProps } from "@theme/ApiExplorer/FormItem";

  export default function FormItem(props: FormItemProps): JSX.Element;
}

declare module "@theme/ApiExplorer/FormSelect" {
  import { Props as FormSelectProps } from "@theme/ApiExplorer/FormSelect";

  export default function FormSelect(props: FormSelectProps): JSX.Element;
}

declare module "@theme/ApiExplorer/FormTextInput" {
  import { Props as FormTextInputProps } from "@theme/ApiExplorer/FormTextInput";

  export default function FormTextInput(props: FormTextInputProps): JSX.Element;
}

declare module "@theme/ApiExplorer/FormFileUpload" {
  import { Props as FormFileUploadProps } from "@theme/ApiExplorer/FormFileUpload";

  export default function FormFileUpload(
    props: FormFileUploadProps
  ): JSX.Element;
}

declare module "@theme/ApiExplorer/FormMultiSelect" {
  import { Props as FormMultiSelectProps } from "@theme/ApiExplorer/FormMultiSelect";

  export default function FormMultiSelect(
    props: FormMultiSelectProps
  ): JSX.Element;
}

declare module "@theme/ApiExplorer/Execute" {
  import { Props as ExecuteProps } from "@theme/ApiExplorer/Execute";

  export default function Execute(props: ExecuteProps): JSX.Element;
}

declare module "@theme/ApiExplorer/LiveEditor" {
  export default function LiveEditor(props: any): JSX.Element;
}

declare module "@theme/ApiExplorer/MethodEndpoint" {
  import { Props as MethodEndpointProps } from "@theme/ApiExplorer/MethodEndpoint";

  export default function MethodEndpoint(
    props: MethodEndpointProps
  ): JSX.Element;
}

declare module "@theme/ApiExplorer/ParamOptions" {
  import { ParamProps } from "@theme/ApiExplorer/ParamOptions";

  export default function ParamOptions(props: ParamProps): JSX.Element;
}

declare module "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamMultiSelectFormItem" {
  import { ParamProps } from "@theme/ApiExplorer/ParamOptions";

  export default function ParamMultiSelectFormItem(
    props: ParamProps
  ): JSX.Element;
}

declare module "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamArrayFormItem" {
  import { ParamProps } from "@theme/ApiExplorer/ParamOptions";

  export default function ParamArrayFormItem(props: ParamProps): JSX.Element;
}

declare module "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamSelectFormItem" {
  import { ParamProps } from "@theme/ApiExplorer/ParamOptions";

  export default function ParamSelectFormItem(props: ParamProps): JSX.Element;
}

declare module "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamBooleanFormItem" {
  import { ParamProps } from "@theme/ApiExplorer/ParamOptions";

  export default function ParamBooleanFormItem(props: ParamProps): JSX.Element;
}

declare module "@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamTextFormItem" {
  import { ParamProps } from "@theme/ApiExplorer/ParamOptions";

  export default function ParamTextFormItem(props: ParamProps): JSX.Element;
}

declare module "@theme/ApiExplorer/ParamOptions/slice" {
  export type { Param };
  export const setParam;
  export default params as Reducer<State, AnyAction>;
}

declare module "@theme/ApiExplorer/persistanceMiddleware" {
  export { createPersistanceMiddleware };
}

declare module "@theme/ApiExplorer/Request" {
  import { ApiItem } from "docusaurus-plugin-openapi-docs/src/types";

  export interface RequestProps {
    item: NonNullable<ApiItem>;
  }
  export default function Request(props: RequestProps): JSX.Element;
}

declare module "@theme/ApiExplorer/Response" {
  import { ApiItem } from "docusaurus-plugin-openapi-docs/src/types";

  export interface ResponseProps {
    item: NonNullable<ApiItem>;
  }

  export default function Response(props: ResponseProps): JSX.Element;
}

declare module "@theme/ApiExplorer/Response/slice" {
  export { setResponse, setCode, setHeaders, clearCode, clearHeaders };
  export default response as Reducer<State, AnyAction>;
}

declare module "@theme/ApiExplorer/SecuritySchemes" {
  export default function SecuritySchemes(props: any): JSX.Element;
}

declare module "@theme/ApiExplorer/Server" {
  export default function Server(): JSX.Element;
}

declare module "@theme/ApiExplorer/ApiCodeBlock" {
  export default function ApiCodeBlock(): JSX.Element;
}

declare module "@theme/ApiExplorer/Server/slice" {
  export default server as Reducer<State, AnyAction>;
}

declare module "@theme/ApiExplorer/storage-utils" {
  export { createStorage, hashArray };
}
