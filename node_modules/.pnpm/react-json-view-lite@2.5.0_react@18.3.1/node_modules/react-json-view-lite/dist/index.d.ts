import * as React from 'react';
import { StyleProps } from './DataRenderer';
export interface NodeExpandingEvent {
    level: number;
    value: any;
    field?: string;
    newExpandValue: boolean;
}
export interface AriaLabels {
    collapseJson: string;
    expandJson: string;
}
export interface Props extends React.AriaAttributes {
    data: Object | Array<any>;
    style?: Partial<StyleProps>;
    shouldExpandNode?: (level: number, value: any, field?: string) => boolean;
    clickToExpandNode?: boolean;
    beforeExpandChange?: (event: NodeExpandingEvent) => boolean;
    compactTopLevel?: boolean;
}
export declare const defaultStyles: StyleProps;
export declare const darkStyles: StyleProps;
export declare const allExpanded: () => boolean;
export declare const collapseAllNested: (level: number) => boolean;
export declare const JsonView: ({ data, style, shouldExpandNode, clickToExpandNode, beforeExpandChange, compactTopLevel, ...ariaAttrs }: Props) => React.JSX.Element;
