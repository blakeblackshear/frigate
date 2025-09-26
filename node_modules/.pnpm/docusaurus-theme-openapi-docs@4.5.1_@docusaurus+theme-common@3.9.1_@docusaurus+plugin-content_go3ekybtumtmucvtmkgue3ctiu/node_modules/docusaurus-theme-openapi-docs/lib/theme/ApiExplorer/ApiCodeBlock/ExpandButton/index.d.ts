import React from "react";
import { Language } from "prism-react-renderer";
export interface Props {
    readonly code: string;
    readonly className: string;
    readonly language: Language;
    readonly showLineNumbers: boolean;
    readonly blockClassName: string;
    readonly title: string | undefined;
    readonly lineClassNames: {
        [lineIndex: number]: string[];
    };
}
export default function ExpandButton({ code, className, language, showLineNumbers, blockClassName, title, lineClassNames, }: Props): React.JSX.Element;
