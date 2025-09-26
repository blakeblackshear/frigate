(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.swipeable = {}, global.React));
})(this, (function (exports, React) { 'use strict';

    const LEFT = "Left";
    const RIGHT = "Right";
    const UP = "Up";
    const DOWN = "Down";

    /* global document */
    const defaultProps = {
        delta: 10,
        preventScrollOnSwipe: false,
        rotationAngle: 0,
        trackMouse: false,
        trackTouch: true,
        swipeDuration: Infinity,
        touchEventOptions: { passive: true },
    };
    const initialState = {
        first: true,
        initial: [0, 0],
        start: 0,
        swiping: false,
        xy: [0, 0],
    };
    const mouseMove = "mousemove";
    const mouseUp = "mouseup";
    const touchEnd = "touchend";
    const touchMove = "touchmove";
    const touchStart = "touchstart";
    function getDirection(absX, absY, deltaX, deltaY) {
        if (absX > absY) {
            if (deltaX > 0) {
                return RIGHT;
            }
            return LEFT;
        }
        else if (deltaY > 0) {
            return DOWN;
        }
        return UP;
    }
    function rotateXYByAngle(pos, angle) {
        if (angle === 0)
            return pos;
        const angleInRadians = (Math.PI / 180) * angle;
        const x = pos[0] * Math.cos(angleInRadians) + pos[1] * Math.sin(angleInRadians);
        const y = pos[1] * Math.cos(angleInRadians) - pos[0] * Math.sin(angleInRadians);
        return [x, y];
    }
    function getHandlers(set, handlerProps) {
        const onStart = (event) => {
            const isTouch = "touches" in event;
            // if more than a single touch don't track, for now...
            if (isTouch && event.touches.length > 1)
                return;
            set((state, props) => {
                // setup mouse listeners on document to track swipe since swipe can leave container
                if (props.trackMouse && !isTouch) {
                    document.addEventListener(mouseMove, onMove);
                    document.addEventListener(mouseUp, onUp);
                }
                const { clientX, clientY } = isTouch ? event.touches[0] : event;
                const xy = rotateXYByAngle([clientX, clientY], props.rotationAngle);
                props.onTouchStartOrOnMouseDown &&
                    props.onTouchStartOrOnMouseDown({ event });
                return Object.assign(Object.assign(Object.assign({}, state), initialState), { initial: xy.slice(), xy, start: event.timeStamp || 0 });
            });
        };
        const onMove = (event) => {
            set((state, props) => {
                const isTouch = "touches" in event;
                // Discount a swipe if additional touches are present after
                // a swipe has started.
                if (isTouch && event.touches.length > 1) {
                    return state;
                }
                // if swipe has exceeded duration stop tracking
                if (event.timeStamp - state.start > props.swipeDuration) {
                    return state.swiping ? Object.assign(Object.assign({}, state), { swiping: false }) : state;
                }
                const { clientX, clientY } = isTouch ? event.touches[0] : event;
                const [x, y] = rotateXYByAngle([clientX, clientY], props.rotationAngle);
                const deltaX = x - state.xy[0];
                const deltaY = y - state.xy[1];
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);
                const time = (event.timeStamp || 0) - state.start;
                const velocity = Math.sqrt(absX * absX + absY * absY) / (time || 1);
                const vxvy = [deltaX / (time || 1), deltaY / (time || 1)];
                const dir = getDirection(absX, absY, deltaX, deltaY);
                // if swipe is under delta and we have not started to track a swipe: skip update
                const delta = typeof props.delta === "number"
                    ? props.delta
                    : props.delta[dir.toLowerCase()] ||
                        defaultProps.delta;
                if (absX < delta && absY < delta && !state.swiping)
                    return state;
                const eventData = {
                    absX,
                    absY,
                    deltaX,
                    deltaY,
                    dir,
                    event,
                    first: state.first,
                    initial: state.initial,
                    velocity,
                    vxvy,
                };
                // call onSwipeStart if present and is first swipe event
                eventData.first && props.onSwipeStart && props.onSwipeStart(eventData);
                // call onSwiping if present
                props.onSwiping && props.onSwiping(eventData);
                // track if a swipe is cancelable (handler for swiping or swiped(dir) exists)
                // so we can call preventDefault if needed
                let cancelablePageSwipe = false;
                if (props.onSwiping ||
                    props.onSwiped ||
                    props[`onSwiped${dir}`]) {
                    cancelablePageSwipe = true;
                }
                if (cancelablePageSwipe &&
                    props.preventScrollOnSwipe &&
                    props.trackTouch &&
                    event.cancelable) {
                    event.preventDefault();
                }
                return Object.assign(Object.assign({}, state), { 
                    // first is now always false
                    first: false, eventData, swiping: true });
            });
        };
        const onEnd = (event) => {
            set((state, props) => {
                let eventData;
                if (state.swiping && state.eventData) {
                    // if swipe is less than duration fire swiped callbacks
                    if (event.timeStamp - state.start < props.swipeDuration) {
                        eventData = Object.assign(Object.assign({}, state.eventData), { event });
                        props.onSwiped && props.onSwiped(eventData);
                        const onSwipedDir = props[`onSwiped${eventData.dir}`];
                        onSwipedDir && onSwipedDir(eventData);
                    }
                }
                else {
                    props.onTap && props.onTap({ event });
                }
                props.onTouchEndOrOnMouseUp && props.onTouchEndOrOnMouseUp({ event });
                return Object.assign(Object.assign(Object.assign({}, state), initialState), { eventData });
            });
        };
        const cleanUpMouse = () => {
            // safe to just call removeEventListener
            document.removeEventListener(mouseMove, onMove);
            document.removeEventListener(mouseUp, onUp);
        };
        const onUp = (e) => {
            cleanUpMouse();
            onEnd(e);
        };
        /**
         * The value of passive on touchMove depends on `preventScrollOnSwipe`:
         * - true => { passive: false }
         * - false => { passive: true } // Default
         *
         * NOTE: When preventScrollOnSwipe is true, we attempt to call preventDefault to prevent scroll.
         *
         * props.touchEventOptions can also be set for all touch event listeners,
         * but for `touchmove` specifically when `preventScrollOnSwipe` it will
         * supersede and force passive to false.
         *
         */
        const attachTouch = (el, props) => {
            let cleanup = () => { };
            if (el && el.addEventListener) {
                const baseOptions = Object.assign(Object.assign({}, defaultProps.touchEventOptions), props.touchEventOptions);
                // attach touch event listeners and handlers
                const tls = [
                    [touchStart, onStart, baseOptions],
                    // preventScrollOnSwipe option supersedes touchEventOptions.passive
                    [
                        touchMove,
                        onMove,
                        Object.assign(Object.assign({}, baseOptions), (props.preventScrollOnSwipe ? { passive: false } : {})),
                    ],
                    [touchEnd, onEnd, baseOptions],
                ];
                tls.forEach(([e, h, o]) => el.addEventListener(e, h, o));
                // return properly scoped cleanup method for removing listeners, options not required
                cleanup = () => tls.forEach(([e, h]) => el.removeEventListener(e, h));
            }
            return cleanup;
        };
        const onRef = (el) => {
            // "inline" ref functions are called twice on render, once with null then again with DOM element
            // ignore null here
            if (el === null)
                return;
            set((state, props) => {
                // if the same DOM el as previous just return state
                if (state.el === el)
                    return state;
                const addState = {};
                // if new DOM el clean up old DOM and reset cleanUpTouch
                if (state.el && state.el !== el && state.cleanUpTouch) {
                    state.cleanUpTouch();
                    addState.cleanUpTouch = void 0;
                }
                // only attach if we want to track touch
                if (props.trackTouch && el) {
                    addState.cleanUpTouch = attachTouch(el, props);
                }
                // store event attached DOM el for comparison, clean up, and re-attachment
                return Object.assign(Object.assign(Object.assign({}, state), { el }), addState);
            });
        };
        // set ref callback to attach touch event listeners
        const output = {
            ref: onRef,
        };
        // if track mouse attach mouse down listener
        if (handlerProps.trackMouse) {
            output.onMouseDown = onStart;
        }
        return [output, attachTouch];
    }
    function updateTransientState(state, props, previousProps, attachTouch) {
        // if trackTouch is off or there is no el, then remove handlers if necessary and exit
        if (!props.trackTouch || !state.el) {
            if (state.cleanUpTouch) {
                state.cleanUpTouch();
            }
            return Object.assign(Object.assign({}, state), { cleanUpTouch: undefined });
        }
        // trackTouch is on, so if there are no handlers attached, attach them and exit
        if (!state.cleanUpTouch) {
            return Object.assign(Object.assign({}, state), { cleanUpTouch: attachTouch(state.el, props) });
        }
        // trackTouch is on and handlers are already attached, so if preventScrollOnSwipe changes value,
        // remove and reattach handlers (this is required to update the passive option when attaching
        // the handlers)
        if (props.preventScrollOnSwipe !== previousProps.preventScrollOnSwipe ||
            props.touchEventOptions.passive !== previousProps.touchEventOptions.passive) {
            state.cleanUpTouch();
            return Object.assign(Object.assign({}, state), { cleanUpTouch: attachTouch(state.el, props) });
        }
        return state;
    }
    function useSwipeable(options) {
        const { trackMouse } = options;
        const transientState = React.useRef(Object.assign({}, initialState));
        const transientProps = React.useRef(Object.assign({}, defaultProps));
        // track previous rendered props
        const previousProps = React.useRef(Object.assign({}, transientProps.current));
        previousProps.current = Object.assign({}, transientProps.current);
        // update current render props & defaults
        transientProps.current = Object.assign(Object.assign({}, defaultProps), options);
        // Force defaults for config properties
        let defaultKey;
        for (defaultKey in defaultProps) {
            if (transientProps.current[defaultKey] === void 0) {
                transientProps.current[defaultKey] = defaultProps[defaultKey];
            }
        }
        const [handlers, attachTouch] = React.useMemo(() => getHandlers((stateSetter) => (transientState.current = stateSetter(transientState.current, transientProps.current)), { trackMouse }), [trackMouse]);
        transientState.current = updateTransientState(transientState.current, transientProps.current, previousProps.current, attachTouch);
        return handlers;
    }

    exports.DOWN = DOWN;
    exports.LEFT = LEFT;
    exports.RIGHT = RIGHT;
    exports.UP = UP;
    exports.useSwipeable = useSwipeable;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=react-swipeable.js.map
