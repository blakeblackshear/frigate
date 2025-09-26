import React, { Component, ReactNode } from "react";
export interface ScrollFollowRenderProps {
    onScroll: (args: {
        scrollTop: number;
        scrollHeight: number;
        clientHeight: number;
    }) => void;
    follow: boolean;
    startFollowing: () => void;
    stopFollowing: () => void;
}
export interface ScrollFollowProps {
    /**
     * Render a component based on the function's arguments
     *
     *   - `follow: bool` This value is `true` or `false`
     *   based on whether the component should be auto-following.
     *   This value can be passed directly to the Lazy component's
     *   `follow` prop.
     *
     *   - `onScroll: func`: This function is used to listen for scrolling
     *   events and turn off auto-following (`follow`).
     *   This value can be passed directly to the Lazy component's
     *   `onScroll` prop.
     *
     *   - `startFollowing: func`: A helper function for manually re-starting
     *   `follow`ing. Is not used by a Lazy component;
     *   rather this can be invoked whenever you need to turn back on
     *   auto-following, but cannot reliably do this from the `startFollowing`
     *   prop. e.g `startFollowing();`
     *
     *   - `stopFollowing: func`: A helper function for manually stopping
     *   `follow`ing. Is not used by a Lazy component;
     *   rather this can be invoked whenever you need to turn off
     *   auto-following, but cannot reliably do this from the `startFollowing`
     *   prop. e.g `stopFollowing();`
     */
    render: (props: ScrollFollowRenderProps) => ReactNode;
    /**
     * The initial follow action; defaults to `false`.
     * The value provided here will inform the initial `follow`
     * property passed to the child function.
     */
    startFollowing?: boolean | undefined;
}
type ScrollFollowState = {
    follow: boolean;
};
export default class ScrollFollow extends Component<ScrollFollowProps, ScrollFollowState> {
    static defaultProps: {
        startFollowing: boolean;
    };
    state: ScrollFollowState;
    handleScroll: ({ scrollTop, scrollHeight, clientHeight }: any) => void;
    startFollowing: () => void;
    stopFollowing: () => void;
    render(): React.JSX.Element;
}
export {};
