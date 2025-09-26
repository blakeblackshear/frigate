import React, { Component } from "react";
export interface LineGutterProps {
    /**
     * The gutter object
     */
    gutter: React.ReactNode;
}
/**
 * The gutter is an element between the line number and content.
 */
export default class LineGutter extends Component<LineGutterProps> {
    static defaultProps: {
        gutter: null;
    };
    render(): React.JSX.Element;
}
