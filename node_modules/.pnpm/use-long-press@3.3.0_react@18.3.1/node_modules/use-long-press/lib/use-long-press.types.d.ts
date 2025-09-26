import { MouseEvent as ReactMouseEvent, MouseEventHandler, PointerEvent as ReactPointerEvent, PointerEventHandler, TouchEvent as ReactTouchEvent, TouchEventHandler } from 'react';
/**
 * Which event listeners should be returned from the hook
 */
export declare enum LongPressEventType {
    Mouse = "mouse",
    Touch = "touch",
    Pointer = "pointer"
}
/**
 * What was the reason behind calling specific callback
 * For now it applies only to 'onCancel' which receives cancellation reason
 *
 * @see LongPressCallbackMeta
 */
export declare enum LongPressCallbackReason {
    /**
     * Returned when mouse / touch / pointer was moved outside initial press area when `cancelOnMovement` is active
     */
    CancelledByMovement = "cancelled-by-movement",
    /**
     * Returned when click / tap / point was released before long press detection time threshold
     */
    CancelledByRelease = "cancelled-by-release",
    /**
     * Returned when mouse / touch / pointer was moved outside element and _cancelOutsideElement_ option was set to `true`
     */
    CancelledOutsideElement = "cancelled-outside-element"
}
/**
 * Function to call when long press event is detected
 *
 * @callback useLongPress~callback
 * @param {Object} event React mouse, touch or pointer event (depends on *detect* param)
 * @param {Object} meta Object containing *context* and / or *reason* (if applicable)
 */
export type LongPressCallback<Target extends Element = Element, Context = unknown> = (event: LongPressReactEvents<Target>, meta: LongPressCallbackMeta<Context>) => void;
export type LongPressDomEvents = MouseEvent | TouchEvent | PointerEvent;
export type LongPressReactEvents<Target extends Element = Element> = ReactMouseEvent<Target> | ReactTouchEvent<Target> | ReactPointerEvent<Target>;
export type LongPressCallbackMeta<Context = unknown> = {
    context?: Context;
    reason?: LongPressCallbackReason;
};
export interface LongPressOptions<Target extends Element = Element, Context = unknown, EventType extends LongPressEventType = LongPressEventType> {
    /**
     * Period of time that must elapse after detecting click or tap in order to trigger _callback_
     * @default 400
     */
    threshold?: number;
    /**
     * If `event.persist()` should be called on react event
     * @default false
     */
    captureEvent?: boolean;
    /**
     * Which type of events should be detected ('mouse' | 'touch' | 'pointer'). For TS use *LongPressEventType* enum.
     * @see LongPressEventType
     * @default LongPressEventType.Pointer
     */
    detect?: EventType;
    /**
     * Function to filter incoming events. Function should return `false` for events that will be ignored (e.g. right mouse clicks)
     * @param {Object} event React event coming from handlers
     * @see LongPressReactEvents
     */
    filterEvents?: (event: LongPressReactEvents<Target>) => boolean;
    /**
     * If long press should be canceled on mouse / touch / pointer move. Possible values:
     * - `false`: [default] Disable cancelling on movement
     * - `true`: Enable cancelling on movement and use default 25px threshold
     * - `number`: Set a specific tolerance value in pixels (square side size inside which movement won't cancel long press)
     * @default false
     */
    cancelOnMovement?: boolean | number;
    /**
     * If long press should be canceled when moving mouse / touch / pointer outside the element to which it was bound.
     *
     * Works for mouse and pointer events, touch events will be supported in the future.
     * @default true
     */
    cancelOutsideElement?: boolean;
    /**
     * Called after detecting initial click / tap / point event. Allows to change event position before registering it for the purpose of `cancelOnMovement`.
     */
    onStart?: LongPressCallback<Target, Context>;
    /**
     * Called on every move event. Allows to change event position before calculating distance for the purpose of `cancelOnMovement`.
     */
    onMove?: LongPressCallback<Target, Context>;
    /**
     * Called when releasing click / tap / point if long press **was** triggered.
     */
    onFinish?: LongPressCallback<Target, Context>;
    /**
     * Called when releasing click / tap / point if long press **was not** triggered
     */
    onCancel?: LongPressCallback<Target, Context>;
}
export type LongPressResult<T extends LongPressHandlers<Target> | LongPressEmptyHandlers, Context = unknown, Target extends Element = Element> = (context?: Context) => T;
export type LongPressEmptyHandlers = Record<never, never>;
export interface LongPressMouseHandlers<Target extends Element = Element> {
    onMouseDown: MouseEventHandler<Target>;
    onMouseMove: MouseEventHandler<Target>;
    onMouseUp: MouseEventHandler<Target>;
    onMouseLeave?: MouseEventHandler<Target>;
}
export interface LongPressTouchHandlers<Target extends Element = Element> {
    onTouchStart: TouchEventHandler<Target>;
    onTouchMove: TouchEventHandler<Target>;
    onTouchEnd: TouchEventHandler<Target>;
}
export interface LongPressPointerHandlers<Target extends Element = Element> {
    onPointerDown: PointerEventHandler<Target>;
    onPointerMove: PointerEventHandler<Target>;
    onPointerUp: PointerEventHandler<Target>;
    onPointerLeave?: PointerEventHandler<Target>;
}
export type LongPressHandlers<Target extends Element = Element> = LongPressMouseHandlers<Target> | LongPressTouchHandlers<Target> | LongPressPointerHandlers<Target> | LongPressEmptyHandlers;
export type LongPressWindowListener = (event: LongPressDomEvents) => void;
