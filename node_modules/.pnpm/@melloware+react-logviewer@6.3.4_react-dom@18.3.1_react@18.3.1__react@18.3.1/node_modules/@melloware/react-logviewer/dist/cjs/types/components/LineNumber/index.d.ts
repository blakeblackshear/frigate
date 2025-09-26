import React, { CSSProperties, Component, MouseEventHandler } from "react";
export interface LineNumberProps {
    /**
     * The line number to display in the anchor.
     */
    number: string | number | undefined;
    /**
     * Specify whether this line is highlighted.
     */
    highlight?: boolean | undefined;
    /**
     * Execute a function when the line number is clicked.
     */
    onClick?: MouseEventHandler<HTMLAnchorElement> | undefined;
    /**
     * CSS style for the Line Number.
     */
    style?: CSSProperties | undefined;
    /**
     * Wrap overflowing lines. Default is false
     */
    wrapLines?: boolean | undefined;
}
/**
 * The line number of a single line.
 * The anchor contained within is interactive, and will highlight the
 * entire line upon selection.
 */
export default class LineNumber extends Component<LineNumberProps, any> {
    static defaultProps: {
        style: null;
        highlight: boolean;
        onClick: null;
        wrapLines: boolean;
    };
    render(): React.JSX.Element;
}
