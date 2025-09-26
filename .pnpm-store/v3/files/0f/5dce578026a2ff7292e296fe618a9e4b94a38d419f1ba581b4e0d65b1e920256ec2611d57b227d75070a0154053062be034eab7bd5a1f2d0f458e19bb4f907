import React from "react";
import { type TabProps } from "@docusaurus/theme-common/internal";
import { Language } from "@theme/ApiExplorer/CodeSnippets";
export interface Props {
    action: {
        [key: string]: React.Dispatch<any>;
    };
    currentLanguage: Language;
    languageSet: Language[];
    includeVariant: boolean;
}
export interface CodeTabsProps extends Props, TabProps {
    includeSample?: boolean;
}
export default function CodeTabs(props: CodeTabsProps & Props): React.JSX.Element;
