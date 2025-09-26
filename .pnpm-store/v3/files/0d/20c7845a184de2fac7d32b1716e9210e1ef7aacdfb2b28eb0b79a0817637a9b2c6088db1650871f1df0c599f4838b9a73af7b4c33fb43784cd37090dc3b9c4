import * as React from 'react';
import { AriaLabels, NodeExpandingEvent } from '.';
export interface StyleProps {
    container: string;
    basicChildStyle: string;
    label: string;
    clickableLabel: string;
    nullValue: string;
    undefinedValue: string;
    numberValue: string;
    stringValue: string;
    booleanValue: string;
    otherValue: string;
    punctuation: string;
    expandIcon: string;
    collapseIcon: string;
    collapsedContent: string;
    childFieldsContainer: string;
    noQuotesForStringValues?: boolean;
    quotesForFieldNames?: boolean;
    ariaLables: AriaLabels;
    stringifyStringValues: boolean;
}
interface CommonRenderProps {
    lastElement: boolean;
    /** There should only be one node with `level==0`. */
    level: number;
    style: StyleProps;
    shouldExpandNode: (level: number, value: any, field?: string) => boolean;
    clickToExpandNode: boolean;
    outerRef: React.RefObject<HTMLDivElement>;
    beforeExpandChange?: (event: NodeExpandingEvent) => boolean;
}
export interface JsonRenderProps<T> extends CommonRenderProps {
    field?: string;
    value: T;
}
export interface ExpandableRenderProps extends CommonRenderProps {
    field: string | undefined;
    value: Array<any> | object;
    data: Array<[string | undefined, any]>;
    openBracket: string;
    closeBracket: string;
}
export interface EmptyRenderProps {
    field: string | undefined;
    openBracket: string;
    closeBracket: string;
    lastElement: boolean;
    style: StyleProps;
}
export default function DataRender(props: JsonRenderProps<any>): React.JSX.Element;
export {};
