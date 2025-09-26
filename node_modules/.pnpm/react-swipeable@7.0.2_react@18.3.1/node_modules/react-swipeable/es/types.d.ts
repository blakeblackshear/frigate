import * as React from "react";
export declare const LEFT = "Left";
export declare const RIGHT = "Right";
export declare const UP = "Up";
export declare const DOWN = "Down";
export declare type HandledEvents = React.MouseEvent | TouchEvent | MouseEvent;
export declare type Vector2 = [number, number];
export declare type SwipeDirections = typeof LEFT | typeof RIGHT | typeof UP | typeof DOWN;
export interface SwipeEventData {
    /**
     * Absolute displacement of swipe in x. Math.abs(deltaX);
     */
    absX: number;
    /**
     * Absolute displacement of swipe in y. Math.abs(deltaY);
     */
    absY: number;
    /**
     * Displacement of swipe in x. (current.x - initial.x)
     */
    deltaX: number;
    /**
     * Displacement of swipe in y. (current.y - initial.y)
     */
    deltaY: number;
    /**
     * Direction of swipe - Left | Right | Up | Down
     */
    dir: SwipeDirections;
    /**
     * Source event.
     */
    event: HandledEvents;
    /**
     * True for the first event of a tracked swipe.
     */
    first: boolean;
    /**
     * Location where swipe started - [x, y].
     */
    initial: Vector2;
    /**
     * "Absolute velocity" (speed) - √(absX^2 + absY^2) / time
     */
    velocity: number;
    /**
     * Velocity per axis - [ deltaX/time, deltaY/time ]
     */
    vxvy: Vector2;
}
export declare type SwipeCallback = (eventData: SwipeEventData) => void;
export declare type TapCallback = ({ event }: {
    event: HandledEvents;
}) => void;
export declare type SwipeableDirectionCallbacks = {
    /**
     * Called after a DOWN swipe
     */
    onSwipedDown: SwipeCallback;
    /**
     * Called after a LEFT swipe
     */
    onSwipedLeft: SwipeCallback;
    /**
     * Called after a RIGHT swipe
     */
    onSwipedRight: SwipeCallback;
    /**
     * Called after a UP swipe
     */
    onSwipedUp: SwipeCallback;
};
export declare type SwipeableCallbacks = SwipeableDirectionCallbacks & {
    /**
     * Called at start of a tracked swipe.
     */
    onSwipeStart: SwipeCallback;
    /**
     * Called after any swipe.
     */
    onSwiped: SwipeCallback;
    /**
     * Called for each move event during a tracked swipe.
     */
    onSwiping: SwipeCallback;
    /**
     * Called after a tap. A touch under the min distance, `delta`.
     */
    onTap: TapCallback;
    /**
     * Called for `touchstart` and `mousedown`.
     */
    onTouchStartOrOnMouseDown: TapCallback;
    /**
     * Called for `touchend` and `mouseup`.
     */
    onTouchEndOrOnMouseUp: TapCallback;
};
export declare type ConfigurationOptionDelta = number | {
    [key in Lowercase<SwipeDirections>]?: number;
};
export interface ConfigurationOptions {
    /**
     * Min distance(px) before a swipe starts. **Default**: `10`
     */
    delta: ConfigurationOptionDelta;
    /**
     * Prevents scroll during swipe in most cases. **Default**: `false`
     */
    preventScrollOnSwipe: boolean;
    /**
     * Set a rotation angle. **Default**: `0`
     */
    rotationAngle: number;
    /**
     * Track mouse input. **Default**: `false`
     */
    trackMouse: boolean;
    /**
     * Track touch input. **Default**: `true`
     */
    trackTouch: boolean;
    /**
     * Allowable duration of a swipe (ms). **Default**: `Infinity`
     */
    swipeDuration: number;
    /**
     * Options for touch event listeners
     */
    touchEventOptions: {
        passive: boolean;
    };
}
export declare type SwipeableProps = Partial<SwipeableCallbacks & ConfigurationOptions>;
export declare type SwipeablePropsWithDefaultOptions = Partial<SwipeableCallbacks> & ConfigurationOptions;
export interface SwipeableHandlers {
    ref(element: HTMLElement | null): void;
    onMouseDown?(event: React.MouseEvent): void;
}
export declare type SwipeableState = {
    cleanUpTouch?: () => void;
    el?: HTMLElement;
    eventData?: SwipeEventData;
    first: boolean;
    initial: Vector2;
    start: number;
    swiping: boolean;
    xy: Vector2;
};
export declare type StateSetter = (state: SwipeableState, props: SwipeablePropsWithDefaultOptions) => SwipeableState;
export declare type Setter = (stateSetter: StateSetter) => void;
export declare type AttachTouch = (el: HTMLElement, props: SwipeablePropsWithDefaultOptions) => () => void;
