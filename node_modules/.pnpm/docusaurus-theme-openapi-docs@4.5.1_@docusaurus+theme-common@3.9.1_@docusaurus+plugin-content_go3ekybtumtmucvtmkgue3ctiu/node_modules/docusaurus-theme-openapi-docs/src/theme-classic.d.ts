/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

/// <reference types="@docusaurus/theme-classic" />

declare module "@docusaurus/theme-common/internal" {
  import { CSSProperties, ReactNode, RefObject } from "react";

  import type { PropDocContent } from "@docusaurus/plugin-content-docs";
  import { MagicCommentConfig } from "@docusaurus/theme-common/lib/utils/codeBlockUtils";
  import {
    TabsProps as ITabsProps,
    TabValue,
  } from "@docusaurus/theme-common/lib/utils/tabsUtils";
  import { Props as ICodeBlockProps } from "@theme/CodeBlock";
  import { Props as ICopyButtonProps } from "@theme/CodeBlock/CopyButton";
  import { Props as ILineProps } from "@theme/CodeBlock/Line";
  import { PrismTheme } from "prism-react-renderer";

  export interface TabProps extends ITabsProps {
    length?: number;
  }

  export interface CopyButtonProps extends ICopyButtonProps {}
  export interface LineProps extends ILineProps {}
  export interface CodeBlockProps extends ICodeBlockProps {}

  export function usePrismTheme(): PrismTheme;

  export function sanitizeTabsChildren(children: TabProps["children"]);

  export function getPrismCssVariables(prismTheme: PrismTheme): CSSProperties;

  export function parseCodeBlockTitle(metastring?: string): string;

  export function parseLanguage(className: string): string | undefined;

  export function containsLineNumbers(metastring?: string): boolean;

  export function useScrollPositionBlocker(): {
    blockElementScrollPositionUntilNextRender: (el: HTMLElement) => void;
  };

  export function DocProvider({
    children,
    content,
  }: {
    children: ReactNode;
    content: PropDocContent;
  });

  export function useTabs(props: TabProps): {
    selectedValue: string;
    selectValue: (value: string) => void;
    tabValues: readonly TabValue[];
  };

  export function parseLines(
    content: string,
    options: {
      metastring: string | undefined;
      language: string | undefined;
      magicComments: MagicCommentConfig[];
    }
  ): {
    lineClassNames: { [lineIndex: number]: string[] };
    code: string;
  };

  export function useCodeWordWrap(): {
    readonly codeBlockRef: RefObject<HTMLPreElement>;
    readonly isEnabled: boolean;
    readonly isCodeScrollable: boolean;
    readonly toggle: () => void;
  };
}
