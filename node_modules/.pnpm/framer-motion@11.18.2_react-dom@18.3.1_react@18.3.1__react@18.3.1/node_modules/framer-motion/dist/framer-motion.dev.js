(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Motion = {}, global.React));
})(this, (function (exports, React$1) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var React__namespace = /*#__PURE__*/_interopNamespaceDefault(React$1);

    // source: react/cjs/react-jsx-runtime.production.min.js
    /**
     * @license React
     * react-jsx-runtime.production.min.js
     *
     * Copyright (c) Facebook, Inc. and its affiliates.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */
    var f = React,
        k = Symbol.for("react.element"),
        l = Symbol.for("react.fragment"),
        m$1 = Object.prototype.hasOwnProperty,
        n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
        p = { key: !0, ref: !0, __self: !0, __source: !0 };
    function q(c, a, g) {
        var b,
            d = {},
            e = null,
            h = null;
        void 0 !== g && (e = "" + g);
        void 0 !== a.key && (e = "" + a.key);
        void 0 !== a.ref && (h = a.ref);
        for (b in a) m$1.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
        if (c && c.defaultProps)
            for (b in ((a = c.defaultProps), a)) void 0 === d[b] && (d[b] = a[b]);
        return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current }
    }
    const Fragment = l;
    const jsx = q;
    const jsxs = q;

    const LayoutGroupContext = React$1.createContext({});

    function isAnimationControls(v) {
        return (v !== null &&
            typeof v === "object" &&
            typeof v.start === "function");
    }

    const isKeyframesTarget = (v) => {
        return Array.isArray(v);
    };

    function shallowCompare(next, prev) {
        if (!Array.isArray(prev))
            return false;
        const prevLength = prev.length;
        if (prevLength !== next.length)
            return false;
        for (let i = 0; i < prevLength; i++) {
            if (prev[i] !== next[i])
                return false;
        }
        return true;
    }

    /**
     * Decides if the supplied variable is variant label
     */
    function isVariantLabel(v) {
        return typeof v === "string" || Array.isArray(v);
    }

    function getValueState(visualElement) {
        const state = [{}, {}];
        visualElement === null || visualElement === void 0 ? void 0 : visualElement.values.forEach((value, key) => {
            state[0][key] = value.get();
            state[1][key] = value.getVelocity();
        });
        return state;
    }
    function resolveVariantFromProps(props, definition, custom, visualElement) {
        /**
         * If the variant definition is a function, resolve.
         */
        if (typeof definition === "function") {
            const [current, velocity] = getValueState(visualElement);
            definition = definition(custom !== undefined ? custom : props.custom, current, velocity);
        }
        /**
         * If the variant definition is a variant label, or
         * the function returned a variant label, resolve.
         */
        if (typeof definition === "string") {
            definition = props.variants && props.variants[definition];
        }
        /**
         * At this point we've resolved both functions and variant labels,
         * but the resolved variant label might itself have been a function.
         * If so, resolve. This can only have returned a valid target object.
         */
        if (typeof definition === "function") {
            const [current, velocity] = getValueState(visualElement);
            definition = definition(custom !== undefined ? custom : props.custom, current, velocity);
        }
        return definition;
    }

    function resolveVariant(visualElement, definition, custom) {
        const props = visualElement.getProps();
        return resolveVariantFromProps(props, definition, custom !== undefined ? custom : props.custom, visualElement);
    }

    const variantPriorityOrder = [
        "animate",
        "whileInView",
        "whileFocus",
        "whileHover",
        "whileTap",
        "whileDrag",
        "exit",
    ];
    const variantProps = ["initial", ...variantPriorityOrder];

    /*#__NO_SIDE_EFFECTS__*/
    const noop = (any) => any;

    let warning = noop;
    exports.invariant = noop;
    {
        warning = (check, message) => {
            if (!check && typeof console !== "undefined") {
                console.warn(message);
            }
        };
        exports.invariant = (check, message) => {
            if (!check) {
                throw new Error(message);
            }
        };
    }

    /*#__NO_SIDE_EFFECTS__*/
    function memo(callback) {
        let result;
        return () => {
            if (result === undefined)
                result = callback();
            return result;
        };
    }

    /*
      Progress within given range

      Given a lower limit and an upper limit, we return the progress
      (expressed as a number 0-1) represented by the given value, and
      limit that progress to within 0-1.

      @param [number]: Lower limit
      @param [number]: Upper limit
      @param [number]: Value to find progress within given range
      @return [number]: Progress of value within range as expressed 0-1
    */
    /*#__NO_SIDE_EFFECTS__*/
    const progress = (from, to, value) => {
        const toFromDifference = to - from;
        return toFromDifference === 0 ? 1 : (value - from) / toFromDifference;
    };

    /**
     * Converts seconds to milliseconds
     *
     * @param seconds - Time in seconds.
     * @return milliseconds - Converted time in milliseconds.
     */
    /*#__NO_SIDE_EFFECTS__*/
    const secondsToMilliseconds = (seconds) => seconds * 1000;
    /*#__NO_SIDE_EFFECTS__*/
    const millisecondsToSeconds = (milliseconds) => milliseconds / 1000;

    const supportsScrollTimeline = memo(() => window.ScrollTimeline !== undefined);

    class BaseGroupPlaybackControls {
        constructor(animations) {
            // Bound to accomodate common `return animation.stop` pattern
            this.stop = () => this.runAll("stop");
            this.animations = animations.filter(Boolean);
        }
        get finished() {
            // Support for new finished Promise and legacy thennable API
            return Promise.all(this.animations.map((animation) => "finished" in animation ? animation.finished : animation));
        }
        /**
         * TODO: Filter out cancelled or stopped animations before returning
         */
        getAll(propName) {
            return this.animations[0][propName];
        }
        setAll(propName, newValue) {
            for (let i = 0; i < this.animations.length; i++) {
                this.animations[i][propName] = newValue;
            }
        }
        attachTimeline(timeline, fallback) {
            const subscriptions = this.animations.map((animation) => {
                if (supportsScrollTimeline() && animation.attachTimeline) {
                    return animation.attachTimeline(timeline);
                }
                else if (typeof fallback === "function") {
                    return fallback(animation);
                }
            });
            return () => {
                subscriptions.forEach((cancel, i) => {
                    cancel && cancel();
                    this.animations[i].stop();
                });
            };
        }
        get time() {
            return this.getAll("time");
        }
        set time(time) {
            this.setAll("time", time);
        }
        get speed() {
            return this.getAll("speed");
        }
        set speed(speed) {
            this.setAll("speed", speed);
        }
        get startTime() {
            return this.getAll("startTime");
        }
        get duration() {
            let max = 0;
            for (let i = 0; i < this.animations.length; i++) {
                max = Math.max(max, this.animations[i].duration);
            }
            return max;
        }
        runAll(methodName) {
            this.animations.forEach((controls) => controls[methodName]());
        }
        flatten() {
            this.runAll("flatten");
        }
        play() {
            this.runAll("play");
        }
        pause() {
            this.runAll("pause");
        }
        cancel() {
            this.runAll("cancel");
        }
        complete() {
            this.runAll("complete");
        }
    }

    /**
     * TODO: This is a temporary class to support the legacy
     * thennable API
     */
    class GroupPlaybackControls extends BaseGroupPlaybackControls {
        then(onResolve, onReject) {
            return Promise.all(this.animations).then(onResolve).catch(onReject);
        }
    }

    function getValueTransition$1(transition, key) {
        return transition
            ? transition[key] ||
                transition["default"] ||
                transition
            : undefined;
    }

    /**
     * Implement a practical max duration for keyframe generation
     * to prevent infinite loops
     */
    const maxGeneratorDuration = 20000;
    function calcGeneratorDuration(generator) {
        let duration = 0;
        const timeStep = 50;
        let state = generator.next(duration);
        while (!state.done && duration < maxGeneratorDuration) {
            duration += timeStep;
            state = generator.next(duration);
        }
        return duration >= maxGeneratorDuration ? Infinity : duration;
    }

    /**
     * Create a progress => progress easing function from a generator.
     */
    function createGeneratorEasing(options, scale = 100, createGenerator) {
        const generator = createGenerator({ ...options, keyframes: [0, scale] });
        const duration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
        return {
            type: "keyframes",
            ease: (progress) => {
                return generator.next(duration * progress).value / scale;
            },
            duration: millisecondsToSeconds(duration),
        };
    }

    function isGenerator(type) {
        return typeof type === "function";
    }

    function attachTimeline(animation, timeline) {
        animation.timeline = timeline;
        animation.onfinish = null;
    }

    class NativeAnimationControls {
        constructor(animation) {
            this.animation = animation;
        }
        get duration() {
            var _a, _b, _c;
            const durationInMs = ((_b = (_a = this.animation) === null || _a === void 0 ? void 0 : _a.effect) === null || _b === void 0 ? void 0 : _b.getComputedTiming().duration) ||
                ((_c = this.options) === null || _c === void 0 ? void 0 : _c.duration) ||
                300;
            return millisecondsToSeconds(Number(durationInMs));
        }
        get time() {
            var _a;
            if (this.animation) {
                return millisecondsToSeconds(((_a = this.animation) === null || _a === void 0 ? void 0 : _a.currentTime) || 0);
            }
            return 0;
        }
        set time(newTime) {
            if (this.animation) {
                this.animation.currentTime = secondsToMilliseconds(newTime);
            }
        }
        get speed() {
            return this.animation ? this.animation.playbackRate : 1;
        }
        set speed(newSpeed) {
            if (this.animation) {
                this.animation.playbackRate = newSpeed;
            }
        }
        get state() {
            return this.animation ? this.animation.playState : "finished";
        }
        get startTime() {
            return this.animation ? this.animation.startTime : null;
        }
        get finished() {
            return this.animation ? this.animation.finished : Promise.resolve();
        }
        play() {
            this.animation && this.animation.play();
        }
        pause() {
            this.animation && this.animation.pause();
        }
        stop() {
            if (!this.animation ||
                this.state === "idle" ||
                this.state === "finished") {
                return;
            }
            if (this.animation.commitStyles) {
                this.animation.commitStyles();
            }
            this.cancel();
        }
        flatten() {
            var _a;
            if (!this.animation)
                return;
            (_a = this.animation.effect) === null || _a === void 0 ? void 0 : _a.updateTiming({ easing: "linear" });
        }
        attachTimeline(timeline) {
            if (this.animation)
                attachTimeline(this.animation, timeline);
            return noop;
        }
        complete() {
            this.animation && this.animation.finish();
        }
        cancel() {
            try {
                this.animation && this.animation.cancel();
            }
            catch (e) { }
        }
    }

    const isBezierDefinition = (easing) => Array.isArray(easing) && typeof easing[0] === "number";

    /**
     * Add the ability for test suites to manually set support flags
     * to better test more environments.
     */
    const supportsFlags = {
        linearEasing: undefined,
    };

    function memoSupports(callback, supportsFlag) {
        const memoized = memo(callback);
        return () => { var _a; return (_a = supportsFlags[supportsFlag]) !== null && _a !== void 0 ? _a : memoized(); };
    }

    const supportsLinearEasing = /*@__PURE__*/ memoSupports(() => {
        try {
            document
                .createElement("div")
                .animate({ opacity: 0 }, { easing: "linear(0, 1)" });
        }
        catch (e) {
            return false;
        }
        return true;
    }, "linearEasing");

    const generateLinearEasing = (easing, duration, // as milliseconds
    resolution = 10 // as milliseconds
    ) => {
        let points = "";
        const numPoints = Math.max(Math.round(duration / resolution), 2);
        for (let i = 0; i < numPoints; i++) {
            points += easing(progress(0, numPoints - 1, i)) + ", ";
        }
        return `linear(${points.substring(0, points.length - 2)})`;
    };

    function isWaapiSupportedEasing(easing) {
        return Boolean((typeof easing === "function" && supportsLinearEasing()) ||
            !easing ||
            (typeof easing === "string" &&
                (easing in supportedWaapiEasing || supportsLinearEasing())) ||
            isBezierDefinition(easing) ||
            (Array.isArray(easing) && easing.every(isWaapiSupportedEasing)));
    }
    const cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
    const supportedWaapiEasing = {
        linear: "linear",
        ease: "ease",
        easeIn: "ease-in",
        easeOut: "ease-out",
        easeInOut: "ease-in-out",
        circIn: /*@__PURE__*/ cubicBezierAsString([0, 0.65, 0.55, 1]),
        circOut: /*@__PURE__*/ cubicBezierAsString([0.55, 0, 1, 0.45]),
        backIn: /*@__PURE__*/ cubicBezierAsString([0.31, 0.01, 0.66, -0.59]),
        backOut: /*@__PURE__*/ cubicBezierAsString([0.33, 1.53, 0.69, 0.99]),
    };
    function mapEasingToNativeEasing(easing, duration) {
        if (!easing) {
            return undefined;
        }
        else if (typeof easing === "function" && supportsLinearEasing()) {
            return generateLinearEasing(easing, duration);
        }
        else if (isBezierDefinition(easing)) {
            return cubicBezierAsString(easing);
        }
        else if (Array.isArray(easing)) {
            return easing.map((segmentEasing) => mapEasingToNativeEasing(segmentEasing, duration) ||
                supportedWaapiEasing.easeOut);
        }
        else {
            return supportedWaapiEasing[easing];
        }
    }

    const isDragging = {
        x: false,
        y: false,
    };
    function isDragActive() {
        return isDragging.x || isDragging.y;
    }

    function resolveElements(elementOrSelector, scope, selectorCache) {
        var _a;
        if (elementOrSelector instanceof Element) {
            return [elementOrSelector];
        }
        else if (typeof elementOrSelector === "string") {
            let root = document;
            if (scope) {
                // TODO: Refactor to utils package
                // invariant(
                //     Boolean(scope.current),
                //     "Scope provided, but no element detected."
                // )
                root = scope.current;
            }
            const elements = (_a = selectorCache === null || selectorCache === void 0 ? void 0 : selectorCache[elementOrSelector]) !== null && _a !== void 0 ? _a : root.querySelectorAll(elementOrSelector);
            return elements ? Array.from(elements) : [];
        }
        return Array.from(elementOrSelector);
    }

    function setupGesture(elementOrSelector, options) {
        const elements = resolveElements(elementOrSelector);
        const gestureAbortController = new AbortController();
        const eventOptions = {
            passive: true,
            ...options,
            signal: gestureAbortController.signal,
        };
        const cancel = () => gestureAbortController.abort();
        return [elements, eventOptions, cancel];
    }

    /**
     * Filter out events that are not pointer events, or are triggering
     * while a Motion gesture is active.
     */
    function filterEvents$1(callback) {
        return (event) => {
            if (event.pointerType === "touch" || isDragActive())
                return;
            callback(event);
        };
    }
    /**
     * Create a hover gesture. hover() is different to .addEventListener("pointerenter")
     * in that it has an easier syntax, filters out polyfilled touch events, interoperates
     * with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
     *
     * @public
     */
    function hover(elementOrSelector, onHoverStart, options = {}) {
        const [elements, eventOptions, cancel] = setupGesture(elementOrSelector, options);
        const onPointerEnter = filterEvents$1((enterEvent) => {
            const { target } = enterEvent;
            const onHoverEnd = onHoverStart(enterEvent);
            if (typeof onHoverEnd !== "function" || !target)
                return;
            const onPointerLeave = filterEvents$1((leaveEvent) => {
                onHoverEnd(leaveEvent);
                target.removeEventListener("pointerleave", onPointerLeave);
            });
            target.addEventListener("pointerleave", onPointerLeave, eventOptions);
        });
        elements.forEach((element) => {
            element.addEventListener("pointerenter", onPointerEnter, eventOptions);
        });
        return cancel;
    }

    /**
     * Recursively traverse up the tree to check whether the provided child node
     * is the parent or a descendant of it.
     *
     * @param parent - Element to find
     * @param child - Element to test against parent
     */
    const isNodeOrChild = (parent, child) => {
        if (!child) {
            return false;
        }
        else if (parent === child) {
            return true;
        }
        else {
            return isNodeOrChild(parent, child.parentElement);
        }
    };

    const isPrimaryPointer = (event) => {
        if (event.pointerType === "mouse") {
            return typeof event.button !== "number" || event.button <= 0;
        }
        else {
            /**
             * isPrimary is true for all mice buttons, whereas every touch point
             * is regarded as its own input. So subsequent concurrent touch points
             * will be false.
             *
             * Specifically match against false here as incomplete versions of
             * PointerEvents in very old browser might have it set as undefined.
             */
            return event.isPrimary !== false;
        }
    };

    const focusableElements = new Set([
        "BUTTON",
        "INPUT",
        "SELECT",
        "TEXTAREA",
        "A",
    ]);
    function isElementKeyboardAccessible(element) {
        return (focusableElements.has(element.tagName) ||
            element.tabIndex !== -1);
    }

    const isPressing = new WeakSet();

    /**
     * Filter out events that are not "Enter" keys.
     */
    function filterEvents(callback) {
        return (event) => {
            if (event.key !== "Enter")
                return;
            callback(event);
        };
    }
    function firePointerEvent(target, type) {
        target.dispatchEvent(new PointerEvent("pointer" + type, { isPrimary: true, bubbles: true }));
    }
    const enableKeyboardPress = (focusEvent, eventOptions) => {
        const element = focusEvent.currentTarget;
        if (!element)
            return;
        const handleKeydown = filterEvents(() => {
            if (isPressing.has(element))
                return;
            firePointerEvent(element, "down");
            const handleKeyup = filterEvents(() => {
                firePointerEvent(element, "up");
            });
            const handleBlur = () => firePointerEvent(element, "cancel");
            element.addEventListener("keyup", handleKeyup, eventOptions);
            element.addEventListener("blur", handleBlur, eventOptions);
        });
        element.addEventListener("keydown", handleKeydown, eventOptions);
        /**
         * Add an event listener that fires on blur to remove the keydown events.
         */
        element.addEventListener("blur", () => element.removeEventListener("keydown", handleKeydown), eventOptions);
    };

    /**
     * Filter out events that are not primary pointer events, or are triggering
     * while a Motion gesture is active.
     */
    function isValidPressEvent(event) {
        return isPrimaryPointer(event) && !isDragActive();
    }
    /**
     * Create a press gesture.
     *
     * Press is different to `"pointerdown"`, `"pointerup"` in that it
     * automatically filters out secondary pointer events like right
     * click and multitouch.
     *
     * It also adds accessibility support for keyboards, where
     * an element with a press gesture will receive focus and
     *  trigger on Enter `"keydown"` and `"keyup"` events.
     *
     * This is different to a browser's `"click"` event, which does
     * respond to keyboards but only for the `"click"` itself, rather
     * than the press start and end/cancel. The element also needs
     * to be focusable for this to work, whereas a press gesture will
     * make an element focusable by default.
     *
     * @public
     */
    function press(elementOrSelector, onPressStart, options = {}) {
        const [elements, eventOptions, cancelEvents] = setupGesture(elementOrSelector, options);
        const startPress = (startEvent) => {
            const element = startEvent.currentTarget;
            if (!isValidPressEvent(startEvent) || isPressing.has(element))
                return;
            isPressing.add(element);
            const onPressEnd = onPressStart(startEvent);
            const onPointerEnd = (endEvent, success) => {
                window.removeEventListener("pointerup", onPointerUp);
                window.removeEventListener("pointercancel", onPointerCancel);
                if (!isValidPressEvent(endEvent) || !isPressing.has(element)) {
                    return;
                }
                isPressing.delete(element);
                if (typeof onPressEnd === "function") {
                    onPressEnd(endEvent, { success });
                }
            };
            const onPointerUp = (upEvent) => {
                onPointerEnd(upEvent, options.useGlobalTarget ||
                    isNodeOrChild(element, upEvent.target));
            };
            const onPointerCancel = (cancelEvent) => {
                onPointerEnd(cancelEvent, false);
            };
            window.addEventListener("pointerup", onPointerUp, eventOptions);
            window.addEventListener("pointercancel", onPointerCancel, eventOptions);
        };
        elements.forEach((element) => {
            if (!isElementKeyboardAccessible(element) &&
                element.getAttribute("tabindex") === null) {
                element.tabIndex = 0;
            }
            const target = options.useGlobalTarget ? window : element;
            target.addEventListener("pointerdown", startPress, eventOptions);
            element.addEventListener("focus", (event) => enableKeyboardPress(event, eventOptions), eventOptions);
        });
        return cancelEvents;
    }

    function setDragLock(axis) {
        if (axis === "x" || axis === "y") {
            if (isDragging[axis]) {
                return null;
            }
            else {
                isDragging[axis] = true;
                return () => {
                    isDragging[axis] = false;
                };
            }
        }
        else {
            if (isDragging.x || isDragging.y) {
                return null;
            }
            else {
                isDragging.x = isDragging.y = true;
                return () => {
                    isDragging.x = isDragging.y = false;
                };
            }
        }
    }

    const MotionGlobalConfig = {
        skipAnimations: false,
        useManualTiming: false,
    };

    function createRenderStep(runNextFrame) {
        /**
         * We create and reuse two queues, one to queue jobs for the current frame
         * and one for the next. We reuse to avoid triggering GC after x frames.
         */
        let thisFrame = new Set();
        let nextFrame = new Set();
        /**
         * Track whether we're currently processing jobs in this step. This way
         * we can decide whether to schedule new jobs for this frame or next.
         */
        let isProcessing = false;
        let flushNextFrame = false;
        /**
         * A set of processes which were marked keepAlive when scheduled.
         */
        const toKeepAlive = new WeakSet();
        let latestFrameData = {
            delta: 0.0,
            timestamp: 0.0,
            isProcessing: false,
        };
        function triggerCallback(callback) {
            if (toKeepAlive.has(callback)) {
                step.schedule(callback);
                runNextFrame();
            }
            callback(latestFrameData);
        }
        const step = {
            /**
             * Schedule a process to run on the next frame.
             */
            schedule: (callback, keepAlive = false, immediate = false) => {
                const addToCurrentFrame = immediate && isProcessing;
                const queue = addToCurrentFrame ? thisFrame : nextFrame;
                if (keepAlive)
                    toKeepAlive.add(callback);
                if (!queue.has(callback))
                    queue.add(callback);
                return callback;
            },
            /**
             * Cancel the provided callback from running on the next frame.
             */
            cancel: (callback) => {
                nextFrame.delete(callback);
                toKeepAlive.delete(callback);
            },
            /**
             * Execute all schedule callbacks.
             */
            process: (frameData) => {
                latestFrameData = frameData;
                /**
                 * If we're already processing we've probably been triggered by a flushSync
                 * inside an existing process. Instead of executing, mark flushNextFrame
                 * as true and ensure we flush the following frame at the end of this one.
                 */
                if (isProcessing) {
                    flushNextFrame = true;
                    return;
                }
                isProcessing = true;
                [thisFrame, nextFrame] = [nextFrame, thisFrame];
                // Execute this frame
                thisFrame.forEach(triggerCallback);
                // Clear the frame so no callbacks remain. This is to avoid
                // memory leaks should this render step not run for a while.
                thisFrame.clear();
                isProcessing = false;
                if (flushNextFrame) {
                    flushNextFrame = false;
                    step.process(frameData);
                }
            },
        };
        return step;
    }

    const stepsOrder = [
        "read", // Read
        "resolveKeyframes", // Write/Read/Write/Read
        "update", // Compute
        "preRender", // Compute
        "render", // Write
        "postRender", // Compute
    ];
    const maxElapsed$1 = 40;
    function createRenderBatcher(scheduleNextBatch, allowKeepAlive) {
        let runNextFrame = false;
        let useDefaultElapsed = true;
        const state = {
            delta: 0.0,
            timestamp: 0.0,
            isProcessing: false,
        };
        const flagRunNextFrame = () => (runNextFrame = true);
        const steps = stepsOrder.reduce((acc, key) => {
            acc[key] = createRenderStep(flagRunNextFrame);
            return acc;
        }, {});
        const { read, resolveKeyframes, update, preRender, render, postRender } = steps;
        const processBatch = () => {
            const timestamp = MotionGlobalConfig.useManualTiming
                ? state.timestamp
                : performance.now();
            runNextFrame = false;
            state.delta = useDefaultElapsed
                ? 1000 / 60
                : Math.max(Math.min(timestamp - state.timestamp, maxElapsed$1), 1);
            state.timestamp = timestamp;
            state.isProcessing = true;
            // Unrolled render loop for better per-frame performance
            read.process(state);
            resolveKeyframes.process(state);
            update.process(state);
            preRender.process(state);
            render.process(state);
            postRender.process(state);
            state.isProcessing = false;
            if (runNextFrame && allowKeepAlive) {
                useDefaultElapsed = false;
                scheduleNextBatch(processBatch);
            }
        };
        const wake = () => {
            runNextFrame = true;
            useDefaultElapsed = true;
            if (!state.isProcessing) {
                scheduleNextBatch(processBatch);
            }
        };
        const schedule = stepsOrder.reduce((acc, key) => {
            const step = steps[key];
            acc[key] = (process, keepAlive = false, immediate = false) => {
                if (!runNextFrame)
                    wake();
                return step.schedule(process, keepAlive, immediate);
            };
            return acc;
        }, {});
        const cancel = (process) => {
            for (let i = 0; i < stepsOrder.length; i++) {
                steps[stepsOrder[i]].cancel(process);
            }
        };
        return { schedule, cancel, state, steps };
    }

    const { schedule: frame, cancel: cancelFrame, state: frameData, steps: frameSteps, } = createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : noop, true);

    /**
     * Generate a list of every possible transform key.
     */
    const transformPropOrder = [
        "transformPerspective",
        "x",
        "y",
        "z",
        "translateX",
        "translateY",
        "translateZ",
        "scale",
        "scaleX",
        "scaleY",
        "rotate",
        "rotateX",
        "rotateY",
        "rotateZ",
        "skew",
        "skewX",
        "skewY",
    ];
    /**
     * A quick lookup for transform props.
     */
    const transformProps = new Set(transformPropOrder);

    const positionalKeys = new Set([
        "width",
        "height",
        "top",
        "left",
        "right",
        "bottom",
        ...transformPropOrder,
    ]);

    const isCustomValue = (v) => {
        return Boolean(v && typeof v === "object" && v.mix && v.toValue);
    };
    const resolveFinalValueInKeyframes = (v) => {
        // TODO maybe throw if v.length - 1 is placeholder token?
        return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
    };

    let now;
    function clearTime() {
        now = undefined;
    }
    /**
     * An eventloop-synchronous alternative to performance.now().
     *
     * Ensures that time measurements remain consistent within a synchronous context.
     * Usually calling performance.now() twice within the same synchronous context
     * will return different values which isn't useful for animations when we're usually
     * trying to sync animations to the same frame.
     */
    const time = {
        now: () => {
            if (now === undefined) {
                time.set(frameData.isProcessing || MotionGlobalConfig.useManualTiming
                    ? frameData.timestamp
                    : performance.now());
            }
            return now;
        },
        set: (newTime) => {
            now = newTime;
            queueMicrotask(clearTime);
        },
    };

    function addUniqueItem(arr, item) {
        if (arr.indexOf(item) === -1)
            arr.push(item);
    }
    function removeItem(arr, item) {
        const index = arr.indexOf(item);
        if (index > -1)
            arr.splice(index, 1);
    }
    // Adapted from array-move
    function moveItem([...arr], fromIndex, toIndex) {
        const startIndex = fromIndex < 0 ? arr.length + fromIndex : fromIndex;
        if (startIndex >= 0 && startIndex < arr.length) {
            const endIndex = toIndex < 0 ? arr.length + toIndex : toIndex;
            const [item] = arr.splice(fromIndex, 1);
            arr.splice(endIndex, 0, item);
        }
        return arr;
    }

    class SubscriptionManager {
        constructor() {
            this.subscriptions = [];
        }
        add(handler) {
            addUniqueItem(this.subscriptions, handler);
            return () => removeItem(this.subscriptions, handler);
        }
        notify(a, b, c) {
            const numSubscriptions = this.subscriptions.length;
            if (!numSubscriptions)
                return;
            if (numSubscriptions === 1) {
                /**
                 * If there's only a single handler we can just call it without invoking a loop.
                 */
                this.subscriptions[0](a, b, c);
            }
            else {
                for (let i = 0; i < numSubscriptions; i++) {
                    /**
                     * Check whether the handler exists before firing as it's possible
                     * the subscriptions were modified during this loop running.
                     */
                    const handler = this.subscriptions[i];
                    handler && handler(a, b, c);
                }
            }
        }
        getSize() {
            return this.subscriptions.length;
        }
        clear() {
            this.subscriptions.length = 0;
        }
    }

    /*
      Convert velocity into velocity per second

      @param [number]: Unit per frame
      @param [number]: Frame duration in ms
    */
    function velocityPerSecond(velocity, frameDuration) {
        return frameDuration ? velocity * (1000 / frameDuration) : 0;
    }

    const warned = new Set();
    function warnOnce(condition, message, element) {
        if (condition || warned.has(message))
            return;
        console.warn(message);
        if (element)
            console.warn(element);
        warned.add(message);
    }

    /**
     * Maximum time between the value of two frames, beyond which we
     * assume the velocity has since been 0.
     */
    const MAX_VELOCITY_DELTA = 30;
    const isFloat = (value) => {
        return !isNaN(parseFloat(value));
    };
    const collectMotionValues = {
        current: undefined,
    };
    /**
     * `MotionValue` is used to track the state and velocity of motion values.
     *
     * @public
     */
    class MotionValue {
        /**
         * @param init - The initiating value
         * @param config - Optional configuration options
         *
         * -  `transformer`: A function to transform incoming values with.
         *
         * @internal
         */
        constructor(init, options = {}) {
            /**
             * This will be replaced by the build step with the latest version number.
             * When MotionValues are provided to motion components, warn if versions are mixed.
             */
            this.version = "11.18.2";
            /**
             * Tracks whether this value can output a velocity. Currently this is only true
             * if the value is numerical, but we might be able to widen the scope here and support
             * other value types.
             *
             * @internal
             */
            this.canTrackVelocity = null;
            /**
             * An object containing a SubscriptionManager for each active event.
             */
            this.events = {};
            this.updateAndNotify = (v, render = true) => {
                const currentTime = time.now();
                /**
                 * If we're updating the value during another frame or eventloop
                 * than the previous frame, then the we set the previous frame value
                 * to current.
                 */
                if (this.updatedAt !== currentTime) {
                    this.setPrevFrameValue();
                }
                this.prev = this.current;
                this.setCurrent(v);
                // Update update subscribers
                if (this.current !== this.prev && this.events.change) {
                    this.events.change.notify(this.current);
                }
                // Update render subscribers
                if (render && this.events.renderRequest) {
                    this.events.renderRequest.notify(this.current);
                }
            };
            this.hasAnimated = false;
            this.setCurrent(init);
            this.owner = options.owner;
        }
        setCurrent(current) {
            this.current = current;
            this.updatedAt = time.now();
            if (this.canTrackVelocity === null && current !== undefined) {
                this.canTrackVelocity = isFloat(this.current);
            }
        }
        setPrevFrameValue(prevFrameValue = this.current) {
            this.prevFrameValue = prevFrameValue;
            this.prevUpdatedAt = this.updatedAt;
        }
        /**
         * Adds a function that will be notified when the `MotionValue` is updated.
         *
         * It returns a function that, when called, will cancel the subscription.
         *
         * When calling `onChange` inside a React component, it should be wrapped with the
         * `useEffect` hook. As it returns an unsubscribe function, this should be returned
         * from the `useEffect` function to ensure you don't add duplicate subscribers..
         *
         * ```jsx
         * export const MyComponent = () => {
         *   const x = useMotionValue(0)
         *   const y = useMotionValue(0)
         *   const opacity = useMotionValue(1)
         *
         *   useEffect(() => {
         *     function updateOpacity() {
         *       const maxXY = Math.max(x.get(), y.get())
         *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
         *       opacity.set(newOpacity)
         *     }
         *
         *     const unsubscribeX = x.on("change", updateOpacity)
         *     const unsubscribeY = y.on("change", updateOpacity)
         *
         *     return () => {
         *       unsubscribeX()
         *       unsubscribeY()
         *     }
         *   }, [])
         *
         *   return <motion.div style={{ x }} />
         * }
         * ```
         *
         * @param subscriber - A function that receives the latest value.
         * @returns A function that, when called, will cancel this subscription.
         *
         * @deprecated
         */
        onChange(subscription) {
            {
                warnOnce(false, `value.onChange(callback) is deprecated. Switch to value.on("change", callback).`);
            }
            return this.on("change", subscription);
        }
        on(eventName, callback) {
            if (!this.events[eventName]) {
                this.events[eventName] = new SubscriptionManager();
            }
            const unsubscribe = this.events[eventName].add(callback);
            if (eventName === "change") {
                return () => {
                    unsubscribe();
                    /**
                     * If we have no more change listeners by the start
                     * of the next frame, stop active animations.
                     */
                    frame.read(() => {
                        if (!this.events.change.getSize()) {
                            this.stop();
                        }
                    });
                };
            }
            return unsubscribe;
        }
        clearListeners() {
            for (const eventManagers in this.events) {
                this.events[eventManagers].clear();
            }
        }
        /**
         * Attaches a passive effect to the `MotionValue`.
         *
         * @internal
         */
        attach(passiveEffect, stopPassiveEffect) {
            this.passiveEffect = passiveEffect;
            this.stopPassiveEffect = stopPassiveEffect;
        }
        /**
         * Sets the state of the `MotionValue`.
         *
         * @remarks
         *
         * ```jsx
         * const x = useMotionValue(0)
         * x.set(10)
         * ```
         *
         * @param latest - Latest value to set.
         * @param render - Whether to notify render subscribers. Defaults to `true`
         *
         * @public
         */
        set(v, render = true) {
            if (!render || !this.passiveEffect) {
                this.updateAndNotify(v, render);
            }
            else {
                this.passiveEffect(v, this.updateAndNotify);
            }
        }
        setWithVelocity(prev, current, delta) {
            this.set(current);
            this.prev = undefined;
            this.prevFrameValue = prev;
            this.prevUpdatedAt = this.updatedAt - delta;
        }
        /**
         * Set the state of the `MotionValue`, stopping any active animations,
         * effects, and resets velocity to `0`.
         */
        jump(v, endAnimation = true) {
            this.updateAndNotify(v);
            this.prev = v;
            this.prevUpdatedAt = this.prevFrameValue = undefined;
            endAnimation && this.stop();
            if (this.stopPassiveEffect)
                this.stopPassiveEffect();
        }
        /**
         * Returns the latest state of `MotionValue`
         *
         * @returns - The latest state of `MotionValue`
         *
         * @public
         */
        get() {
            if (collectMotionValues.current) {
                collectMotionValues.current.push(this);
            }
            return this.current;
        }
        /**
         * @public
         */
        getPrevious() {
            return this.prev;
        }
        /**
         * Returns the latest velocity of `MotionValue`
         *
         * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
         *
         * @public
         */
        getVelocity() {
            const currentTime = time.now();
            if (!this.canTrackVelocity ||
                this.prevFrameValue === undefined ||
                currentTime - this.updatedAt > MAX_VELOCITY_DELTA) {
                return 0;
            }
            const delta = Math.min(this.updatedAt - this.prevUpdatedAt, MAX_VELOCITY_DELTA);
            // Casts because of parseFloat's poor typing
            return velocityPerSecond(parseFloat(this.current) -
                parseFloat(this.prevFrameValue), delta);
        }
        /**
         * Registers a new animation to control this `MotionValue`. Only one
         * animation can drive a `MotionValue` at one time.
         *
         * ```jsx
         * value.start()
         * ```
         *
         * @param animation - A function that starts the provided animation
         *
         * @internal
         */
        start(startAnimation) {
            this.stop();
            return new Promise((resolve) => {
                this.hasAnimated = true;
                this.animation = startAnimation(resolve);
                if (this.events.animationStart) {
                    this.events.animationStart.notify();
                }
            }).then(() => {
                if (this.events.animationComplete) {
                    this.events.animationComplete.notify();
                }
                this.clearAnimation();
            });
        }
        /**
         * Stop the currently active animation.
         *
         * @public
         */
        stop() {
            if (this.animation) {
                this.animation.stop();
                if (this.events.animationCancel) {
                    this.events.animationCancel.notify();
                }
            }
            this.clearAnimation();
        }
        /**
         * Returns `true` if this value is currently animating.
         *
         * @public
         */
        isAnimating() {
            return !!this.animation;
        }
        clearAnimation() {
            delete this.animation;
        }
        /**
         * Destroy and clean up subscribers to this `MotionValue`.
         *
         * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
         * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
         * created a `MotionValue` via the `motionValue` function.
         *
         * @public
         */
        destroy() {
            this.clearListeners();
            this.stop();
            if (this.stopPassiveEffect) {
                this.stopPassiveEffect();
            }
        }
    }
    function motionValue(init, options) {
        return new MotionValue(init, options);
    }

    /**
     * Set VisualElement's MotionValue, creating a new MotionValue for it if
     * it doesn't exist.
     */
    function setMotionValue(visualElement, key, value) {
        if (visualElement.hasValue(key)) {
            visualElement.getValue(key).set(value);
        }
        else {
            visualElement.addValue(key, motionValue(value));
        }
    }
    function setTarget(visualElement, definition) {
        const resolved = resolveVariant(visualElement, definition);
        let { transitionEnd = {}, transition = {}, ...target } = resolved || {};
        target = { ...target, ...transitionEnd };
        for (const key in target) {
            const value = resolveFinalValueInKeyframes(target[key]);
            setMotionValue(visualElement, key, value);
        }
    }

    const isMotionValue = (value) => Boolean(value && value.getVelocity);

    function isWillChangeMotionValue(value) {
        return Boolean(isMotionValue(value) && value.add);
    }

    function addValueToWillChange(visualElement, key) {
        const willChange = visualElement.getValue("willChange");
        /**
         * It could be that a user has set willChange to a regular MotionValue,
         * in which case we can't add the value to it.
         */
        if (isWillChangeMotionValue(willChange)) {
            return willChange.add(key);
        }
    }

    /**
     * Convert camelCase to dash-case properties.
     */
    const camelToDash = (str) => str.replace(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase();

    const optimizedAppearDataId = "framerAppearId";
    const optimizedAppearDataAttribute = "data-" + camelToDash(optimizedAppearDataId);

    function getOptimisedAppearId(visualElement) {
        return visualElement.props[optimizedAppearDataAttribute];
    }

    const instantAnimationState = {
        current: false,
    };

    /*
      Bezier function generator
      This has been modified from Gaëtan Renaudeau's BezierEasing
      https://github.com/gre/bezier-easing/blob/master/src/index.js
      https://github.com/gre/bezier-easing/blob/master/LICENSE
      
      I've removed the newtonRaphsonIterate algo because in benchmarking it
      wasn't noticiably faster than binarySubdivision, indeed removing it
      usually improved times, depending on the curve.
      I also removed the lookup table, as for the added bundle size and loop we're
      only cutting ~4 or so subdivision iterations. I bumped the max iterations up
      to 12 to compensate and this still tended to be faster for no perceivable
      loss in accuracy.
      Usage
        const easeOut = cubicBezier(.17,.67,.83,.67);
        const x = easeOut(0.5); // returns 0.627...
    */
    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    const calcBezier = (t, a1, a2) => (((1.0 - 3.0 * a2 + 3.0 * a1) * t + (3.0 * a2 - 6.0 * a1)) * t + 3.0 * a1) *
        t;
    const subdivisionPrecision = 0.0000001;
    const subdivisionMaxIterations = 12;
    function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
        let currentX;
        let currentT;
        let i = 0;
        do {
            currentT = lowerBound + (upperBound - lowerBound) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - x;
            if (currentX > 0.0) {
                upperBound = currentT;
            }
            else {
                lowerBound = currentT;
            }
        } while (Math.abs(currentX) > subdivisionPrecision &&
            ++i < subdivisionMaxIterations);
        return currentT;
    }
    function cubicBezier(mX1, mY1, mX2, mY2) {
        // If this is a linear gradient, return linear easing
        if (mX1 === mY1 && mX2 === mY2)
            return noop;
        const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
        // If animation is at start/end, return t without easing
        return (t) => t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2);
    }

    // Accepts an easing function and returns a new one that outputs mirrored values for
    // the second half of the animation. Turns easeIn into easeInOut.
    const mirrorEasing = (easing) => (p) => p <= 0.5 ? easing(2 * p) / 2 : (2 - easing(2 * (1 - p))) / 2;

    // Accepts an easing function and returns a new one that outputs reversed values.
    // Turns easeIn into easeOut.
    const reverseEasing = (easing) => (p) => 1 - easing(1 - p);

    const backOut = /*@__PURE__*/ cubicBezier(0.33, 1.53, 0.69, 0.99);
    const backIn = /*@__PURE__*/ reverseEasing(backOut);
    const backInOut = /*@__PURE__*/ mirrorEasing(backIn);

    const anticipate = (p) => (p *= 2) < 1 ? 0.5 * backIn(p) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));

    const circIn = (p) => 1 - Math.sin(Math.acos(p));
    const circOut = reverseEasing(circIn);
    const circInOut = mirrorEasing(circIn);

    /**
     * Check if the value is a zero value string like "0px" or "0%"
     */
    const isZeroValueString = (v) => /^0[^.\s]+$/u.test(v);

    function isNone(value) {
        if (typeof value === "number") {
            return value === 0;
        }
        else if (value !== null) {
            return value === "none" || value === "0" || isZeroValueString(value);
        }
        else {
            return true;
        }
    }

    const clamp = (min, max, v) => {
        if (v > max)
            return max;
        if (v < min)
            return min;
        return v;
    };

    const number = {
        test: (v) => typeof v === "number",
        parse: parseFloat,
        transform: (v) => v,
    };
    const alpha = {
        ...number,
        transform: (v) => clamp(0, 1, v),
    };
    const scale = {
        ...number,
        default: 1,
    };

    // If this number is a decimal, make it just five decimal places
    // to avoid exponents
    const sanitize = (v) => Math.round(v * 100000) / 100000;

    const floatRegex = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;

    function isNullish(v) {
        return v == null;
    }

    const singleColorRegex = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu;

    /**
     * Returns true if the provided string is a color, ie rgba(0,0,0,0) or #000,
     * but false if a number or multiple colors
     */
    const isColorString = (type, testProp) => (v) => {
        return Boolean((typeof v === "string" &&
            singleColorRegex.test(v) &&
            v.startsWith(type)) ||
            (testProp &&
                !isNullish(v) &&
                Object.prototype.hasOwnProperty.call(v, testProp)));
    };
    const splitColor = (aName, bName, cName) => (v) => {
        if (typeof v !== "string")
            return v;
        const [a, b, c, alpha] = v.match(floatRegex);
        return {
            [aName]: parseFloat(a),
            [bName]: parseFloat(b),
            [cName]: parseFloat(c),
            alpha: alpha !== undefined ? parseFloat(alpha) : 1,
        };
    };

    const clampRgbUnit = (v) => clamp(0, 255, v);
    const rgbUnit = {
        ...number,
        transform: (v) => Math.round(clampRgbUnit(v)),
    };
    const rgba = {
        test: /*@__PURE__*/ isColorString("rgb", "red"),
        parse: /*@__PURE__*/ splitColor("red", "green", "blue"),
        transform: ({ red, green, blue, alpha: alpha$1 = 1 }) => "rgba(" +
            rgbUnit.transform(red) +
            ", " +
            rgbUnit.transform(green) +
            ", " +
            rgbUnit.transform(blue) +
            ", " +
            sanitize(alpha.transform(alpha$1)) +
            ")",
    };

    function parseHex(v) {
        let r = "";
        let g = "";
        let b = "";
        let a = "";
        // If we have 6 characters, ie #FF0000
        if (v.length > 5) {
            r = v.substring(1, 3);
            g = v.substring(3, 5);
            b = v.substring(5, 7);
            a = v.substring(7, 9);
            // Or we have 3 characters, ie #F00
        }
        else {
            r = v.substring(1, 2);
            g = v.substring(2, 3);
            b = v.substring(3, 4);
            a = v.substring(4, 5);
            r += r;
            g += g;
            b += b;
            a += a;
        }
        return {
            red: parseInt(r, 16),
            green: parseInt(g, 16),
            blue: parseInt(b, 16),
            alpha: a ? parseInt(a, 16) / 255 : 1,
        };
    }
    const hex = {
        test: /*@__PURE__*/ isColorString("#"),
        parse: parseHex,
        transform: rgba.transform,
    };

    const createUnitType = (unit) => ({
        test: (v) => typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
        parse: parseFloat,
        transform: (v) => `${v}${unit}`,
    });
    const degrees = /*@__PURE__*/ createUnitType("deg");
    const percent = /*@__PURE__*/ createUnitType("%");
    const px = /*@__PURE__*/ createUnitType("px");
    const vh = /*@__PURE__*/ createUnitType("vh");
    const vw = /*@__PURE__*/ createUnitType("vw");
    const progressPercentage = {
        ...percent,
        parse: (v) => percent.parse(v) / 100,
        transform: (v) => percent.transform(v * 100),
    };

    const hsla = {
        test: /*@__PURE__*/ isColorString("hsl", "hue"),
        parse: /*@__PURE__*/ splitColor("hue", "saturation", "lightness"),
        transform: ({ hue, saturation, lightness, alpha: alpha$1 = 1 }) => {
            return ("hsla(" +
                Math.round(hue) +
                ", " +
                percent.transform(sanitize(saturation)) +
                ", " +
                percent.transform(sanitize(lightness)) +
                ", " +
                sanitize(alpha.transform(alpha$1)) +
                ")");
        },
    };

    const color = {
        test: (v) => rgba.test(v) || hex.test(v) || hsla.test(v),
        parse: (v) => {
            if (rgba.test(v)) {
                return rgba.parse(v);
            }
            else if (hsla.test(v)) {
                return hsla.parse(v);
            }
            else {
                return hex.parse(v);
            }
        },
        transform: (v) => {
            return typeof v === "string"
                ? v
                : v.hasOwnProperty("red")
                    ? rgba.transform(v)
                    : hsla.transform(v);
        },
    };

    const colorRegex = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;

    function test(v) {
        var _a, _b;
        return (isNaN(v) &&
            typeof v === "string" &&
            (((_a = v.match(floatRegex)) === null || _a === void 0 ? void 0 : _a.length) || 0) +
                (((_b = v.match(colorRegex)) === null || _b === void 0 ? void 0 : _b.length) || 0) >
                0);
    }
    const NUMBER_TOKEN = "number";
    const COLOR_TOKEN = "color";
    const VAR_TOKEN = "var";
    const VAR_FUNCTION_TOKEN = "var(";
    const SPLIT_TOKEN = "${}";
    // this regex consists of the `singleCssVariableRegex|rgbHSLValueRegex|digitRegex`
    const complexRegex = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
    function analyseComplexValue(value) {
        const originalValue = value.toString();
        const values = [];
        const indexes = {
            color: [],
            number: [],
            var: [],
        };
        const types = [];
        let i = 0;
        const tokenised = originalValue.replace(complexRegex, (parsedValue) => {
            if (color.test(parsedValue)) {
                indexes.color.push(i);
                types.push(COLOR_TOKEN);
                values.push(color.parse(parsedValue));
            }
            else if (parsedValue.startsWith(VAR_FUNCTION_TOKEN)) {
                indexes.var.push(i);
                types.push(VAR_TOKEN);
                values.push(parsedValue);
            }
            else {
                indexes.number.push(i);
                types.push(NUMBER_TOKEN);
                values.push(parseFloat(parsedValue));
            }
            ++i;
            return SPLIT_TOKEN;
        });
        const split = tokenised.split(SPLIT_TOKEN);
        return { values, split, indexes, types };
    }
    function parseComplexValue(v) {
        return analyseComplexValue(v).values;
    }
    function createTransformer(source) {
        const { split, types } = analyseComplexValue(source);
        const numSections = split.length;
        return (v) => {
            let output = "";
            for (let i = 0; i < numSections; i++) {
                output += split[i];
                if (v[i] !== undefined) {
                    const type = types[i];
                    if (type === NUMBER_TOKEN) {
                        output += sanitize(v[i]);
                    }
                    else if (type === COLOR_TOKEN) {
                        output += color.transform(v[i]);
                    }
                    else {
                        output += v[i];
                    }
                }
            }
            return output;
        };
    }
    const convertNumbersToZero = (v) => typeof v === "number" ? 0 : v;
    function getAnimatableNone$1(v) {
        const parsed = parseComplexValue(v);
        const transformer = createTransformer(v);
        return transformer(parsed.map(convertNumbersToZero));
    }
    const complex = {
        test,
        parse: parseComplexValue,
        createTransformer,
        getAnimatableNone: getAnimatableNone$1,
    };

    /**
     * Properties that should default to 1 or 100%
     */
    const maxDefaults = new Set(["brightness", "contrast", "saturate", "opacity"]);
    function applyDefaultFilter(v) {
        const [name, value] = v.slice(0, -1).split("(");
        if (name === "drop-shadow")
            return v;
        const [number] = value.match(floatRegex) || [];
        if (!number)
            return v;
        const unit = value.replace(number, "");
        let defaultValue = maxDefaults.has(name) ? 1 : 0;
        if (number !== value)
            defaultValue *= 100;
        return name + "(" + defaultValue + unit + ")";
    }
    const functionRegex = /\b([a-z-]*)\(.*?\)/gu;
    const filter = {
        ...complex,
        getAnimatableNone: (v) => {
            const functions = v.match(functionRegex);
            return functions ? functions.map(applyDefaultFilter).join(" ") : v;
        },
    };

    const browserNumberValueTypes = {
        // Border props
        borderWidth: px,
        borderTopWidth: px,
        borderRightWidth: px,
        borderBottomWidth: px,
        borderLeftWidth: px,
        borderRadius: px,
        radius: px,
        borderTopLeftRadius: px,
        borderTopRightRadius: px,
        borderBottomRightRadius: px,
        borderBottomLeftRadius: px,
        // Positioning props
        width: px,
        maxWidth: px,
        height: px,
        maxHeight: px,
        top: px,
        right: px,
        bottom: px,
        left: px,
        // Spacing props
        padding: px,
        paddingTop: px,
        paddingRight: px,
        paddingBottom: px,
        paddingLeft: px,
        margin: px,
        marginTop: px,
        marginRight: px,
        marginBottom: px,
        marginLeft: px,
        // Misc
        backgroundPositionX: px,
        backgroundPositionY: px,
    };

    const transformValueTypes = {
        rotate: degrees,
        rotateX: degrees,
        rotateY: degrees,
        rotateZ: degrees,
        scale,
        scaleX: scale,
        scaleY: scale,
        scaleZ: scale,
        skew: degrees,
        skewX: degrees,
        skewY: degrees,
        distance: px,
        translateX: px,
        translateY: px,
        translateZ: px,
        x: px,
        y: px,
        z: px,
        perspective: px,
        transformPerspective: px,
        opacity: alpha,
        originX: progressPercentage,
        originY: progressPercentage,
        originZ: px,
    };

    const int = {
        ...number,
        transform: Math.round,
    };

    const numberValueTypes = {
        ...browserNumberValueTypes,
        ...transformValueTypes,
        zIndex: int,
        size: px,
        // SVG
        fillOpacity: alpha,
        strokeOpacity: alpha,
        numOctaves: int,
    };

    /**
     * A map of default value types for common values
     */
    const defaultValueTypes = {
        ...numberValueTypes,
        // Color props
        color,
        backgroundColor: color,
        outlineColor: color,
        fill: color,
        stroke: color,
        // Border props
        borderColor: color,
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: color,
        borderLeftColor: color,
        filter,
        WebkitFilter: filter,
    };
    /**
     * Gets the default ValueType for the provided value key
     */
    const getDefaultValueType = (key) => defaultValueTypes[key];

    function getAnimatableNone(key, value) {
        let defaultValueType = getDefaultValueType(key);
        if (defaultValueType !== filter)
            defaultValueType = complex;
        // If value is not recognised as animatable, ie "none", create an animatable version origin based on the target
        return defaultValueType.getAnimatableNone
            ? defaultValueType.getAnimatableNone(value)
            : undefined;
    }

    /**
     * If we encounter keyframes like "none" or "0" and we also have keyframes like
     * "#fff" or "200px 200px" we want to find a keyframe to serve as a template for
     * the "none" keyframes. In this case "#fff" or "200px 200px" - then these get turned into
     * zero equivalents, i.e. "#fff0" or "0px 0px".
     */
    const invalidTemplates = new Set(["auto", "none", "0"]);
    function makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name) {
        let i = 0;
        let animatableTemplate = undefined;
        while (i < unresolvedKeyframes.length && !animatableTemplate) {
            const keyframe = unresolvedKeyframes[i];
            if (typeof keyframe === "string" &&
                !invalidTemplates.has(keyframe) &&
                analyseComplexValue(keyframe).values.length) {
                animatableTemplate = unresolvedKeyframes[i];
            }
            i++;
        }
        if (animatableTemplate && name) {
            for (const noneIndex of noneKeyframeIndexes) {
                unresolvedKeyframes[noneIndex] = getAnimatableNone(name, animatableTemplate);
            }
        }
    }

    const isNumOrPxType = (v) => v === number || v === px;
    const getPosFromMatrix = (matrix, pos) => parseFloat(matrix.split(", ")[pos]);
    const getTranslateFromMatrix = (pos2, pos3) => (_bbox, { transform }) => {
        if (transform === "none" || !transform)
            return 0;
        const matrix3d = transform.match(/^matrix3d\((.+)\)$/u);
        if (matrix3d) {
            return getPosFromMatrix(matrix3d[1], pos3);
        }
        else {
            const matrix = transform.match(/^matrix\((.+)\)$/u);
            if (matrix) {
                return getPosFromMatrix(matrix[1], pos2);
            }
            else {
                return 0;
            }
        }
    };
    const transformKeys = new Set(["x", "y", "z"]);
    const nonTranslationalTransformKeys = transformPropOrder.filter((key) => !transformKeys.has(key));
    function removeNonTranslationalTransform(visualElement) {
        const removedTransforms = [];
        nonTranslationalTransformKeys.forEach((key) => {
            const value = visualElement.getValue(key);
            if (value !== undefined) {
                removedTransforms.push([key, value.get()]);
                value.set(key.startsWith("scale") ? 1 : 0);
            }
        });
        return removedTransforms;
    }
    const positionalValues = {
        // Dimensions
        width: ({ x }, { paddingLeft = "0", paddingRight = "0" }) => x.max - x.min - parseFloat(paddingLeft) - parseFloat(paddingRight),
        height: ({ y }, { paddingTop = "0", paddingBottom = "0" }) => y.max - y.min - parseFloat(paddingTop) - parseFloat(paddingBottom),
        top: (_bbox, { top }) => parseFloat(top),
        left: (_bbox, { left }) => parseFloat(left),
        bottom: ({ y }, { top }) => parseFloat(top) + (y.max - y.min),
        right: ({ x }, { left }) => parseFloat(left) + (x.max - x.min),
        // Transform
        x: getTranslateFromMatrix(4, 13),
        y: getTranslateFromMatrix(5, 14),
    };
    // Alias translate longform names
    positionalValues.translateX = positionalValues.x;
    positionalValues.translateY = positionalValues.y;

    const toResolve = new Set();
    let isScheduled = false;
    let anyNeedsMeasurement = false;
    function measureAllKeyframes() {
        if (anyNeedsMeasurement) {
            const resolversToMeasure = Array.from(toResolve).filter((resolver) => resolver.needsMeasurement);
            const elementsToMeasure = new Set(resolversToMeasure.map((resolver) => resolver.element));
            const transformsToRestore = new Map();
            /**
             * Write pass
             * If we're measuring elements we want to remove bounding box-changing transforms.
             */
            elementsToMeasure.forEach((element) => {
                const removedTransforms = removeNonTranslationalTransform(element);
                if (!removedTransforms.length)
                    return;
                transformsToRestore.set(element, removedTransforms);
                element.render();
            });
            // Read
            resolversToMeasure.forEach((resolver) => resolver.measureInitialState());
            // Write
            elementsToMeasure.forEach((element) => {
                element.render();
                const restore = transformsToRestore.get(element);
                if (restore) {
                    restore.forEach(([key, value]) => {
                        var _a;
                        (_a = element.getValue(key)) === null || _a === void 0 ? void 0 : _a.set(value);
                    });
                }
            });
            // Read
            resolversToMeasure.forEach((resolver) => resolver.measureEndState());
            // Write
            resolversToMeasure.forEach((resolver) => {
                if (resolver.suspendedScrollY !== undefined) {
                    window.scrollTo(0, resolver.suspendedScrollY);
                }
            });
        }
        anyNeedsMeasurement = false;
        isScheduled = false;
        toResolve.forEach((resolver) => resolver.complete());
        toResolve.clear();
    }
    function readAllKeyframes() {
        toResolve.forEach((resolver) => {
            resolver.readKeyframes();
            if (resolver.needsMeasurement) {
                anyNeedsMeasurement = true;
            }
        });
    }
    function flushKeyframeResolvers() {
        readAllKeyframes();
        measureAllKeyframes();
    }
    class KeyframeResolver {
        constructor(unresolvedKeyframes, onComplete, name, motionValue, element, isAsync = false) {
            /**
             * Track whether this resolver has completed. Once complete, it never
             * needs to attempt keyframe resolution again.
             */
            this.isComplete = false;
            /**
             * Track whether this resolver is async. If it is, it'll be added to the
             * resolver queue and flushed in the next frame. Resolvers that aren't going
             * to trigger read/write thrashing don't need to be async.
             */
            this.isAsync = false;
            /**
             * Track whether this resolver needs to perform a measurement
             * to resolve its keyframes.
             */
            this.needsMeasurement = false;
            /**
             * Track whether this resolver is currently scheduled to resolve
             * to allow it to be cancelled and resumed externally.
             */
            this.isScheduled = false;
            this.unresolvedKeyframes = [...unresolvedKeyframes];
            this.onComplete = onComplete;
            this.name = name;
            this.motionValue = motionValue;
            this.element = element;
            this.isAsync = isAsync;
        }
        scheduleResolve() {
            this.isScheduled = true;
            if (this.isAsync) {
                toResolve.add(this);
                if (!isScheduled) {
                    isScheduled = true;
                    frame.read(readAllKeyframes);
                    frame.resolveKeyframes(measureAllKeyframes);
                }
            }
            else {
                this.readKeyframes();
                this.complete();
            }
        }
        readKeyframes() {
            const { unresolvedKeyframes, name, element, motionValue } = this;
            /**
             * If a keyframe is null, we hydrate it either by reading it from
             * the instance, or propagating from previous keyframes.
             */
            for (let i = 0; i < unresolvedKeyframes.length; i++) {
                if (unresolvedKeyframes[i] === null) {
                    /**
                     * If the first keyframe is null, we need to find its value by sampling the element
                     */
                    if (i === 0) {
                        const currentValue = motionValue === null || motionValue === void 0 ? void 0 : motionValue.get();
                        const finalKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
                        if (currentValue !== undefined) {
                            unresolvedKeyframes[0] = currentValue;
                        }
                        else if (element && name) {
                            const valueAsRead = element.readValue(name, finalKeyframe);
                            if (valueAsRead !== undefined && valueAsRead !== null) {
                                unresolvedKeyframes[0] = valueAsRead;
                            }
                        }
                        if (unresolvedKeyframes[0] === undefined) {
                            unresolvedKeyframes[0] = finalKeyframe;
                        }
                        if (motionValue && currentValue === undefined) {
                            motionValue.set(unresolvedKeyframes[0]);
                        }
                    }
                    else {
                        unresolvedKeyframes[i] = unresolvedKeyframes[i - 1];
                    }
                }
            }
        }
        setFinalKeyframe() { }
        measureInitialState() { }
        renderEndStyles() { }
        measureEndState() { }
        complete() {
            this.isComplete = true;
            this.onComplete(this.unresolvedKeyframes, this.finalKeyframe);
            toResolve.delete(this);
        }
        cancel() {
            if (!this.isComplete) {
                this.isScheduled = false;
                toResolve.delete(this);
            }
        }
        resume() {
            if (!this.isComplete)
                this.scheduleResolve();
        }
    }

    /**
     * Check if value is a numerical string, ie a string that is purely a number eg "100" or "-100.1"
     */
    const isNumericalString = (v) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(v);

    const checkStringStartsWith = (token) => (key) => typeof key === "string" && key.startsWith(token);
    const isCSSVariableName = 
    /*@__PURE__*/ checkStringStartsWith("--");
    const startsAsVariableToken = 
    /*@__PURE__*/ checkStringStartsWith("var(--");
    const isCSSVariableToken = (value) => {
        const startsWithToken = startsAsVariableToken(value);
        if (!startsWithToken)
            return false;
        // Ensure any comments are stripped from the value as this can harm performance of the regex.
        return singleCssVariableRegex.test(value.split("/*")[0].trim());
    };
    const singleCssVariableRegex = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;

    /**
     * Parse Framer's special CSS variable format into a CSS token and a fallback.
     *
     * ```
     * `var(--foo, #fff)` => [`--foo`, '#fff']
     * ```
     *
     * @param current
     */
    const splitCSSVariableRegex = 
    // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
    /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;
    function parseCSSVariable(current) {
        const match = splitCSSVariableRegex.exec(current);
        if (!match)
            return [,];
        const [, token1, token2, fallback] = match;
        return [`--${token1 !== null && token1 !== void 0 ? token1 : token2}`, fallback];
    }
    const maxDepth = 4;
    function getVariableValue(current, element, depth = 1) {
        exports.invariant(depth <= maxDepth, `Max CSS variable fallback depth detected in property "${current}". This may indicate a circular fallback dependency.`);
        const [token, fallback] = parseCSSVariable(current);
        // No CSS variable detected
        if (!token)
            return;
        // Attempt to read this CSS variable off the element
        const resolved = window.getComputedStyle(element).getPropertyValue(token);
        if (resolved) {
            const trimmed = resolved.trim();
            return isNumericalString(trimmed) ? parseFloat(trimmed) : trimmed;
        }
        return isCSSVariableToken(fallback)
            ? getVariableValue(fallback, element, depth + 1)
            : fallback;
    }

    /**
     * Tests a provided value against a ValueType
     */
    const testValueType = (v) => (type) => type.test(v);

    /**
     * ValueType for "auto"
     */
    const auto = {
        test: (v) => v === "auto",
        parse: (v) => v,
    };

    /**
     * A list of value types commonly used for dimensions
     */
    const dimensionValueTypes = [number, px, percent, degrees, vw, vh, auto];
    /**
     * Tests a dimensional value against the list of dimension ValueTypes
     */
    const findDimensionValueType = (v) => dimensionValueTypes.find(testValueType(v));

    class DOMKeyframesResolver extends KeyframeResolver {
        constructor(unresolvedKeyframes, onComplete, name, motionValue, element) {
            super(unresolvedKeyframes, onComplete, name, motionValue, element, true);
        }
        readKeyframes() {
            const { unresolvedKeyframes, element, name } = this;
            if (!element || !element.current)
                return;
            super.readKeyframes();
            /**
             * If any keyframe is a CSS variable, we need to find its value by sampling the element
             */
            for (let i = 0; i < unresolvedKeyframes.length; i++) {
                let keyframe = unresolvedKeyframes[i];
                if (typeof keyframe === "string") {
                    keyframe = keyframe.trim();
                    if (isCSSVariableToken(keyframe)) {
                        const resolved = getVariableValue(keyframe, element.current);
                        if (resolved !== undefined) {
                            unresolvedKeyframes[i] = resolved;
                        }
                        if (i === unresolvedKeyframes.length - 1) {
                            this.finalKeyframe = keyframe;
                        }
                    }
                }
            }
            /**
             * Resolve "none" values. We do this potentially twice - once before and once after measuring keyframes.
             * This could be seen as inefficient but it's a trade-off to avoid measurements in more situations, which
             * have a far bigger performance impact.
             */
            this.resolveNoneKeyframes();
            /**
             * Check to see if unit type has changed. If so schedule jobs that will
             * temporarily set styles to the destination keyframes.
             * Skip if we have more than two keyframes or this isn't a positional value.
             * TODO: We can throw if there are multiple keyframes and the value type changes.
             */
            if (!positionalKeys.has(name) || unresolvedKeyframes.length !== 2) {
                return;
            }
            const [origin, target] = unresolvedKeyframes;
            const originType = findDimensionValueType(origin);
            const targetType = findDimensionValueType(target);
            /**
             * Either we don't recognise these value types or we can animate between them.
             */
            if (originType === targetType)
                return;
            /**
             * If both values are numbers or pixels, we can animate between them by
             * converting them to numbers.
             */
            if (isNumOrPxType(originType) && isNumOrPxType(targetType)) {
                for (let i = 0; i < unresolvedKeyframes.length; i++) {
                    const value = unresolvedKeyframes[i];
                    if (typeof value === "string") {
                        unresolvedKeyframes[i] = parseFloat(value);
                    }
                }
            }
            else {
                /**
                 * Else, the only way to resolve this is by measuring the element.
                 */
                this.needsMeasurement = true;
            }
        }
        resolveNoneKeyframes() {
            const { unresolvedKeyframes, name } = this;
            const noneKeyframeIndexes = [];
            for (let i = 0; i < unresolvedKeyframes.length; i++) {
                if (isNone(unresolvedKeyframes[i])) {
                    noneKeyframeIndexes.push(i);
                }
            }
            if (noneKeyframeIndexes.length) {
                makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name);
            }
        }
        measureInitialState() {
            const { element, unresolvedKeyframes, name } = this;
            if (!element || !element.current)
                return;
            if (name === "height") {
                this.suspendedScrollY = window.pageYOffset;
            }
            this.measuredOrigin = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
            unresolvedKeyframes[0] = this.measuredOrigin;
            // Set final key frame to measure after next render
            const measureKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
            if (measureKeyframe !== undefined) {
                element.getValue(name, measureKeyframe).jump(measureKeyframe, false);
            }
        }
        measureEndState() {
            var _a;
            const { element, name, unresolvedKeyframes } = this;
            if (!element || !element.current)
                return;
            const value = element.getValue(name);
            value && value.jump(this.measuredOrigin, false);
            const finalKeyframeIndex = unresolvedKeyframes.length - 1;
            const finalKeyframe = unresolvedKeyframes[finalKeyframeIndex];
            unresolvedKeyframes[finalKeyframeIndex] = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
            if (finalKeyframe !== null && this.finalKeyframe === undefined) {
                this.finalKeyframe = finalKeyframe;
            }
            // If we removed transform values, reapply them before the next render
            if ((_a = this.removedTransforms) === null || _a === void 0 ? void 0 : _a.length) {
                this.removedTransforms.forEach(([unsetTransformName, unsetTransformValue]) => {
                    element
                        .getValue(unsetTransformName)
                        .set(unsetTransformValue);
                });
            }
            this.resolveNoneKeyframes();
        }
    }

    /**
     * Check if a value is animatable. Examples:
     *
     * ✅: 100, "100px", "#fff"
     * ❌: "block", "url(2.jpg)"
     * @param value
     *
     * @internal
     */
    const isAnimatable = (value, name) => {
        // If the list of keys tat might be non-animatable grows, replace with Set
        if (name === "zIndex")
            return false;
        // If it's a number or a keyframes array, we can animate it. We might at some point
        // need to do a deep isAnimatable check of keyframes, or let Popmotion handle this,
        // but for now lets leave it like this for performance reasons
        if (typeof value === "number" || Array.isArray(value))
            return true;
        if (typeof value === "string" && // It's animatable if we have a string
            (complex.test(value) || value === "0") && // And it contains numbers and/or colors
            !value.startsWith("url(") // Unless it starts with "url("
        ) {
            return true;
        }
        return false;
    };

    function hasKeyframesChanged(keyframes) {
        const current = keyframes[0];
        if (keyframes.length === 1)
            return true;
        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i] !== current)
                return true;
        }
    }
    function canAnimate(keyframes, name, type, velocity) {
        /**
         * Check if we're able to animate between the start and end keyframes,
         * and throw a warning if we're attempting to animate between one that's
         * animatable and another that isn't.
         */
        const originKeyframe = keyframes[0];
        if (originKeyframe === null)
            return false;
        /**
         * These aren't traditionally animatable but we do support them.
         * In future we could look into making this more generic or replacing
         * this function with mix() === mixImmediate
         */
        if (name === "display" || name === "visibility")
            return true;
        const targetKeyframe = keyframes[keyframes.length - 1];
        const isOriginAnimatable = isAnimatable(originKeyframe, name);
        const isTargetAnimatable = isAnimatable(targetKeyframe, name);
        warning(isOriginAnimatable === isTargetAnimatable, `You are trying to animate ${name} from "${originKeyframe}" to "${targetKeyframe}". ${originKeyframe} is not an animatable value - to enable this animation set ${originKeyframe} to a value animatable to ${targetKeyframe} via the \`style\` property.`);
        // Always skip if any of these are true
        if (!isOriginAnimatable || !isTargetAnimatable) {
            return false;
        }
        return (hasKeyframesChanged(keyframes) ||
            ((type === "spring" || isGenerator(type)) && velocity));
    }

    const isNotNull = (value) => value !== null;
    function getFinalKeyframe(keyframes, { repeat, repeatType = "loop" }, finalKeyframe) {
        const resolvedKeyframes = keyframes.filter(isNotNull);
        const index = repeat && repeatType !== "loop" && repeat % 2 === 1
            ? 0
            : resolvedKeyframes.length - 1;
        return !index || finalKeyframe === undefined
            ? resolvedKeyframes[index]
            : finalKeyframe;
    }

    /**
     * Maximum time allowed between an animation being created and it being
     * resolved for us to use the latter as the start time.
     *
     * This is to ensure that while we prefer to "start" an animation as soon
     * as it's triggered, we also want to avoid a visual jump if there's a big delay
     * between these two moments.
     */
    const MAX_RESOLVE_DELAY = 40;
    class BaseAnimation {
        constructor({ autoplay = true, delay = 0, type = "keyframes", repeat = 0, repeatDelay = 0, repeatType = "loop", ...options }) {
            // Track whether the animation has been stopped. Stopped animations won't restart.
            this.isStopped = false;
            this.hasAttemptedResolve = false;
            this.createdAt = time.now();
            this.options = {
                autoplay,
                delay,
                type,
                repeat,
                repeatDelay,
                repeatType,
                ...options,
            };
            this.updateFinishedPromise();
        }
        /**
         * This method uses the createdAt and resolvedAt to calculate the
         * animation startTime. *Ideally*, we would use the createdAt time as t=0
         * as the following frame would then be the first frame of the animation in
         * progress, which would feel snappier.
         *
         * However, if there's a delay (main thread work) between the creation of
         * the animation and the first commited frame, we prefer to use resolvedAt
         * to avoid a sudden jump into the animation.
         */
        calcStartTime() {
            if (!this.resolvedAt)
                return this.createdAt;
            return this.resolvedAt - this.createdAt > MAX_RESOLVE_DELAY
                ? this.resolvedAt
                : this.createdAt;
        }
        /**
         * A getter for resolved data. If keyframes are not yet resolved, accessing
         * this.resolved will synchronously flush all pending keyframe resolvers.
         * This is a deoptimisation, but at its worst still batches read/writes.
         */
        get resolved() {
            if (!this._resolved && !this.hasAttemptedResolve) {
                flushKeyframeResolvers();
            }
            return this._resolved;
        }
        /**
         * A method to be called when the keyframes resolver completes. This method
         * will check if its possible to run the animation and, if not, skip it.
         * Otherwise, it will call initPlayback on the implementing class.
         */
        onKeyframesResolved(keyframes, finalKeyframe) {
            this.resolvedAt = time.now();
            this.hasAttemptedResolve = true;
            const { name, type, velocity, delay, onComplete, onUpdate, isGenerator, } = this.options;
            /**
             * If we can't animate this value with the resolved keyframes
             * then we should complete it immediately.
             */
            if (!isGenerator && !canAnimate(keyframes, name, type, velocity)) {
                // Finish immediately
                if (instantAnimationState.current || !delay) {
                    onUpdate &&
                        onUpdate(getFinalKeyframe(keyframes, this.options, finalKeyframe));
                    onComplete && onComplete();
                    this.resolveFinishedPromise();
                    return;
                }
                // Finish after a delay
                else {
                    this.options.duration = 0;
                }
            }
            const resolvedAnimation = this.initPlayback(keyframes, finalKeyframe);
            if (resolvedAnimation === false)
                return;
            this._resolved = {
                keyframes,
                finalKeyframe,
                ...resolvedAnimation,
            };
            this.onPostResolved();
        }
        onPostResolved() { }
        /**
         * Allows the returned animation to be awaited or promise-chained. Currently
         * resolves when the animation finishes at all but in a future update could/should
         * reject if its cancels.
         */
        then(resolve, reject) {
            return this.currentFinishedPromise.then(resolve, reject);
        }
        flatten() {
            this.options.type = "keyframes";
            this.options.ease = "linear";
        }
        updateFinishedPromise() {
            this.currentFinishedPromise = new Promise((resolve) => {
                this.resolveFinishedPromise = resolve;
            });
        }
    }

    /*
      Value in range from progress

      Given a lower limit and an upper limit, we return the value within
      that range as expressed by progress (usually a number from 0 to 1)

      So progress = 0.5 would change

      from -------- to

      to

      from ---- to

      E.g. from = 10, to = 20, progress = 0.5 => 15

      @param [number]: Lower limit of range
      @param [number]: Upper limit of range
      @param [number]: The progress between lower and upper limits expressed 0-1
      @return [number]: Value as calculated from progress within range (not limited within range)
    */
    const mixNumber$1 = (from, to, progress) => {
        return from + (to - from) * progress;
    };

    // Adapted from https://gist.github.com/mjackson/5311256
    function hueToRgb(p, q, t) {
        if (t < 0)
            t += 1;
        if (t > 1)
            t -= 1;
        if (t < 1 / 6)
            return p + (q - p) * 6 * t;
        if (t < 1 / 2)
            return q;
        if (t < 2 / 3)
            return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    function hslaToRgba({ hue, saturation, lightness, alpha }) {
        hue /= 360;
        saturation /= 100;
        lightness /= 100;
        let red = 0;
        let green = 0;
        let blue = 0;
        if (!saturation) {
            red = green = blue = lightness;
        }
        else {
            const q = lightness < 0.5
                ? lightness * (1 + saturation)
                : lightness + saturation - lightness * saturation;
            const p = 2 * lightness - q;
            red = hueToRgb(p, q, hue + 1 / 3);
            green = hueToRgb(p, q, hue);
            blue = hueToRgb(p, q, hue - 1 / 3);
        }
        return {
            red: Math.round(red * 255),
            green: Math.round(green * 255),
            blue: Math.round(blue * 255),
            alpha,
        };
    }

    function mixImmediate(a, b) {
        return (p) => (p > 0 ? b : a);
    }

    // Linear color space blending
    // Explained https://www.youtube.com/watch?v=LKnqECcg6Gw
    // Demonstrated http://codepen.io/osublake/pen/xGVVaN
    const mixLinearColor = (from, to, v) => {
        const fromExpo = from * from;
        const expo = v * (to * to - fromExpo) + fromExpo;
        return expo < 0 ? 0 : Math.sqrt(expo);
    };
    const colorTypes = [hex, rgba, hsla];
    const getColorType = (v) => colorTypes.find((type) => type.test(v));
    function asRGBA(color) {
        const type = getColorType(color);
        warning(Boolean(type), `'${color}' is not an animatable color. Use the equivalent color code instead.`);
        if (!Boolean(type))
            return false;
        let model = type.parse(color);
        if (type === hsla) {
            // TODO Remove this cast - needed since Motion's stricter typing
            model = hslaToRgba(model);
        }
        return model;
    }
    const mixColor = (from, to) => {
        const fromRGBA = asRGBA(from);
        const toRGBA = asRGBA(to);
        if (!fromRGBA || !toRGBA) {
            return mixImmediate(from, to);
        }
        const blended = { ...fromRGBA };
        return (v) => {
            blended.red = mixLinearColor(fromRGBA.red, toRGBA.red, v);
            blended.green = mixLinearColor(fromRGBA.green, toRGBA.green, v);
            blended.blue = mixLinearColor(fromRGBA.blue, toRGBA.blue, v);
            blended.alpha = mixNumber$1(fromRGBA.alpha, toRGBA.alpha, v);
            return rgba.transform(blended);
        };
    };

    /**
     * Pipe
     * Compose other transformers to run linearily
     * pipe(min(20), max(40))
     * @param  {...functions} transformers
     * @return {function}
     */
    const combineFunctions = (a, b) => (v) => b(a(v));
    const pipe = (...transformers) => transformers.reduce(combineFunctions);

    const invisibleValues = new Set(["none", "hidden"]);
    /**
     * Returns a function that, when provided a progress value between 0 and 1,
     * will return the "none" or "hidden" string only when the progress is that of
     * the origin or target.
     */
    function mixVisibility(origin, target) {
        if (invisibleValues.has(origin)) {
            return (p) => (p <= 0 ? origin : target);
        }
        else {
            return (p) => (p >= 1 ? target : origin);
        }
    }

    function mixNumber(a, b) {
        return (p) => mixNumber$1(a, b, p);
    }
    function getMixer$1(a) {
        if (typeof a === "number") {
            return mixNumber;
        }
        else if (typeof a === "string") {
            return isCSSVariableToken(a)
                ? mixImmediate
                : color.test(a)
                    ? mixColor
                    : mixComplex;
        }
        else if (Array.isArray(a)) {
            return mixArray;
        }
        else if (typeof a === "object") {
            return color.test(a) ? mixColor : mixObject;
        }
        return mixImmediate;
    }
    function mixArray(a, b) {
        const output = [...a];
        const numValues = output.length;
        const blendValue = a.map((v, i) => getMixer$1(v)(v, b[i]));
        return (p) => {
            for (let i = 0; i < numValues; i++) {
                output[i] = blendValue[i](p);
            }
            return output;
        };
    }
    function mixObject(a, b) {
        const output = { ...a, ...b };
        const blendValue = {};
        for (const key in output) {
            if (a[key] !== undefined && b[key] !== undefined) {
                blendValue[key] = getMixer$1(a[key])(a[key], b[key]);
            }
        }
        return (v) => {
            for (const key in blendValue) {
                output[key] = blendValue[key](v);
            }
            return output;
        };
    }
    function matchOrder(origin, target) {
        var _a;
        const orderedOrigin = [];
        const pointers = { color: 0, var: 0, number: 0 };
        for (let i = 0; i < target.values.length; i++) {
            const type = target.types[i];
            const originIndex = origin.indexes[type][pointers[type]];
            const originValue = (_a = origin.values[originIndex]) !== null && _a !== void 0 ? _a : 0;
            orderedOrigin[i] = originValue;
            pointers[type]++;
        }
        return orderedOrigin;
    }
    const mixComplex = (origin, target) => {
        const template = complex.createTransformer(target);
        const originStats = analyseComplexValue(origin);
        const targetStats = analyseComplexValue(target);
        const canInterpolate = originStats.indexes.var.length === targetStats.indexes.var.length &&
            originStats.indexes.color.length === targetStats.indexes.color.length &&
            originStats.indexes.number.length >= targetStats.indexes.number.length;
        if (canInterpolate) {
            if ((invisibleValues.has(origin) &&
                !targetStats.values.length) ||
                (invisibleValues.has(target) &&
                    !originStats.values.length)) {
                return mixVisibility(origin, target);
            }
            return pipe(mixArray(matchOrder(originStats, targetStats), targetStats.values), template);
        }
        else {
            warning(true, `Complex values '${origin}' and '${target}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`);
            return mixImmediate(origin, target);
        }
    };

    function mix(from, to, p) {
        if (typeof from === "number" &&
            typeof to === "number" &&
            typeof p === "number") {
            return mixNumber$1(from, to, p);
        }
        const mixer = getMixer$1(from);
        return mixer(from, to);
    }

    const velocitySampleDuration = 5; // ms
    function calcGeneratorVelocity(resolveValue, t, current) {
        const prevT = Math.max(t - velocitySampleDuration, 0);
        return velocityPerSecond(current - resolveValue(prevT), t - prevT);
    }

    const springDefaults = {
        // Default spring physics
        stiffness: 100,
        damping: 10,
        mass: 1.0,
        velocity: 0.0,
        // Default duration/bounce-based options
        duration: 800, // in ms
        bounce: 0.3,
        visualDuration: 0.3, // in seconds
        // Rest thresholds
        restSpeed: {
            granular: 0.01,
            default: 2,
        },
        restDelta: {
            granular: 0.005,
            default: 0.5,
        },
        // Limits
        minDuration: 0.01, // in seconds
        maxDuration: 10.0, // in seconds
        minDamping: 0.05,
        maxDamping: 1,
    };

    const safeMin = 0.001;
    function findSpring({ duration = springDefaults.duration, bounce = springDefaults.bounce, velocity = springDefaults.velocity, mass = springDefaults.mass, }) {
        let envelope;
        let derivative;
        warning(duration <= secondsToMilliseconds(springDefaults.maxDuration), "Spring duration must be 10 seconds or less");
        let dampingRatio = 1 - bounce;
        /**
         * Restrict dampingRatio and duration to within acceptable ranges.
         */
        dampingRatio = clamp(springDefaults.minDamping, springDefaults.maxDamping, dampingRatio);
        duration = clamp(springDefaults.minDuration, springDefaults.maxDuration, millisecondsToSeconds(duration));
        if (dampingRatio < 1) {
            /**
             * Underdamped spring
             */
            envelope = (undampedFreq) => {
                const exponentialDecay = undampedFreq * dampingRatio;
                const delta = exponentialDecay * duration;
                const a = exponentialDecay - velocity;
                const b = calcAngularFreq(undampedFreq, dampingRatio);
                const c = Math.exp(-delta);
                return safeMin - (a / b) * c;
            };
            derivative = (undampedFreq) => {
                const exponentialDecay = undampedFreq * dampingRatio;
                const delta = exponentialDecay * duration;
                const d = delta * velocity + velocity;
                const e = Math.pow(dampingRatio, 2) * Math.pow(undampedFreq, 2) * duration;
                const f = Math.exp(-delta);
                const g = calcAngularFreq(Math.pow(undampedFreq, 2), dampingRatio);
                const factor = -envelope(undampedFreq) + safeMin > 0 ? -1 : 1;
                return (factor * ((d - e) * f)) / g;
            };
        }
        else {
            /**
             * Critically-damped spring
             */
            envelope = (undampedFreq) => {
                const a = Math.exp(-undampedFreq * duration);
                const b = (undampedFreq - velocity) * duration + 1;
                return -safeMin + a * b;
            };
            derivative = (undampedFreq) => {
                const a = Math.exp(-undampedFreq * duration);
                const b = (velocity - undampedFreq) * (duration * duration);
                return a * b;
            };
        }
        const initialGuess = 5 / duration;
        const undampedFreq = approximateRoot(envelope, derivative, initialGuess);
        duration = secondsToMilliseconds(duration);
        if (isNaN(undampedFreq)) {
            return {
                stiffness: springDefaults.stiffness,
                damping: springDefaults.damping,
                duration,
            };
        }
        else {
            const stiffness = Math.pow(undampedFreq, 2) * mass;
            return {
                stiffness,
                damping: dampingRatio * 2 * Math.sqrt(mass * stiffness),
                duration,
            };
        }
    }
    const rootIterations = 12;
    function approximateRoot(envelope, derivative, initialGuess) {
        let result = initialGuess;
        for (let i = 1; i < rootIterations; i++) {
            result = result - envelope(result) / derivative(result);
        }
        return result;
    }
    function calcAngularFreq(undampedFreq, dampingRatio) {
        return undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
    }

    const durationKeys = ["duration", "bounce"];
    const physicsKeys = ["stiffness", "damping", "mass"];
    function isSpringType(options, keys) {
        return keys.some((key) => options[key] !== undefined);
    }
    function getSpringOptions(options) {
        let springOptions = {
            velocity: springDefaults.velocity,
            stiffness: springDefaults.stiffness,
            damping: springDefaults.damping,
            mass: springDefaults.mass,
            isResolvedFromDuration: false,
            ...options,
        };
        // stiffness/damping/mass overrides duration/bounce
        if (!isSpringType(options, physicsKeys) &&
            isSpringType(options, durationKeys)) {
            if (options.visualDuration) {
                const visualDuration = options.visualDuration;
                const root = (2 * Math.PI) / (visualDuration * 1.2);
                const stiffness = root * root;
                const damping = 2 *
                    clamp(0.05, 1, 1 - (options.bounce || 0)) *
                    Math.sqrt(stiffness);
                springOptions = {
                    ...springOptions,
                    mass: springDefaults.mass,
                    stiffness,
                    damping,
                };
            }
            else {
                const derived = findSpring(options);
                springOptions = {
                    ...springOptions,
                    ...derived,
                    mass: springDefaults.mass,
                };
                springOptions.isResolvedFromDuration = true;
            }
        }
        return springOptions;
    }
    function spring(optionsOrVisualDuration = springDefaults.visualDuration, bounce = springDefaults.bounce) {
        const options = typeof optionsOrVisualDuration !== "object"
            ? {
                visualDuration: optionsOrVisualDuration,
                keyframes: [0, 1],
                bounce,
            }
            : optionsOrVisualDuration;
        let { restSpeed, restDelta } = options;
        const origin = options.keyframes[0];
        const target = options.keyframes[options.keyframes.length - 1];
        /**
         * This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
         * to reduce GC during animation.
         */
        const state = { done: false, value: origin };
        const { stiffness, damping, mass, duration, velocity, isResolvedFromDuration, } = getSpringOptions({
            ...options,
            velocity: -millisecondsToSeconds(options.velocity || 0),
        });
        const initialVelocity = velocity || 0.0;
        const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
        const initialDelta = target - origin;
        const undampedAngularFreq = millisecondsToSeconds(Math.sqrt(stiffness / mass));
        /**
         * If we're working on a granular scale, use smaller defaults for determining
         * when the spring is finished.
         *
         * These defaults have been selected emprically based on what strikes a good
         * ratio between feeling good and finishing as soon as changes are imperceptible.
         */
        const isGranularScale = Math.abs(initialDelta) < 5;
        restSpeed || (restSpeed = isGranularScale
            ? springDefaults.restSpeed.granular
            : springDefaults.restSpeed.default);
        restDelta || (restDelta = isGranularScale
            ? springDefaults.restDelta.granular
            : springDefaults.restDelta.default);
        let resolveSpring;
        if (dampingRatio < 1) {
            const angularFreq = calcAngularFreq(undampedAngularFreq, dampingRatio);
            // Underdamped spring
            resolveSpring = (t) => {
                const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
                return (target -
                    envelope *
                        (((initialVelocity +
                            dampingRatio * undampedAngularFreq * initialDelta) /
                            angularFreq) *
                            Math.sin(angularFreq * t) +
                            initialDelta * Math.cos(angularFreq * t)));
            };
        }
        else if (dampingRatio === 1) {
            // Critically damped spring
            resolveSpring = (t) => target -
                Math.exp(-undampedAngularFreq * t) *
                    (initialDelta +
                        (initialVelocity + undampedAngularFreq * initialDelta) * t);
        }
        else {
            // Overdamped spring
            const dampedAngularFreq = undampedAngularFreq * Math.sqrt(dampingRatio * dampingRatio - 1);
            resolveSpring = (t) => {
                const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
                // When performing sinh or cosh values can hit Infinity so we cap them here
                const freqForT = Math.min(dampedAngularFreq * t, 300);
                return (target -
                    (envelope *
                        ((initialVelocity +
                            dampingRatio * undampedAngularFreq * initialDelta) *
                            Math.sinh(freqForT) +
                            dampedAngularFreq *
                                initialDelta *
                                Math.cosh(freqForT))) /
                        dampedAngularFreq);
            };
        }
        const generator = {
            calculatedDuration: isResolvedFromDuration ? duration || null : null,
            next: (t) => {
                const current = resolveSpring(t);
                if (!isResolvedFromDuration) {
                    let currentVelocity = 0.0;
                    /**
                     * We only need to calculate velocity for under-damped springs
                     * as over- and critically-damped springs can't overshoot, so
                     * checking only for displacement is enough.
                     */
                    if (dampingRatio < 1) {
                        currentVelocity =
                            t === 0
                                ? secondsToMilliseconds(initialVelocity)
                                : calcGeneratorVelocity(resolveSpring, t, current);
                    }
                    const isBelowVelocityThreshold = Math.abs(currentVelocity) <= restSpeed;
                    const isBelowDisplacementThreshold = Math.abs(target - current) <= restDelta;
                    state.done =
                        isBelowVelocityThreshold && isBelowDisplacementThreshold;
                }
                else {
                    state.done = t >= duration;
                }
                state.value = state.done ? target : current;
                return state;
            },
            toString: () => {
                const calculatedDuration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
                const easing = generateLinearEasing((progress) => generator.next(calculatedDuration * progress).value, calculatedDuration, 30);
                return calculatedDuration + "ms " + easing;
            },
        };
        return generator;
    }

    function inertia({ keyframes, velocity = 0.0, power = 0.8, timeConstant = 325, bounceDamping = 10, bounceStiffness = 500, modifyTarget, min, max, restDelta = 0.5, restSpeed, }) {
        const origin = keyframes[0];
        const state = {
            done: false,
            value: origin,
        };
        const isOutOfBounds = (v) => (min !== undefined && v < min) || (max !== undefined && v > max);
        const nearestBoundary = (v) => {
            if (min === undefined)
                return max;
            if (max === undefined)
                return min;
            return Math.abs(min - v) < Math.abs(max - v) ? min : max;
        };
        let amplitude = power * velocity;
        const ideal = origin + amplitude;
        const target = modifyTarget === undefined ? ideal : modifyTarget(ideal);
        /**
         * If the target has changed we need to re-calculate the amplitude, otherwise
         * the animation will start from the wrong position.
         */
        if (target !== ideal)
            amplitude = target - origin;
        const calcDelta = (t) => -amplitude * Math.exp(-t / timeConstant);
        const calcLatest = (t) => target + calcDelta(t);
        const applyFriction = (t) => {
            const delta = calcDelta(t);
            const latest = calcLatest(t);
            state.done = Math.abs(delta) <= restDelta;
            state.value = state.done ? target : latest;
        };
        /**
         * Ideally this would resolve for t in a stateless way, we could
         * do that by always precalculating the animation but as we know
         * this will be done anyway we can assume that spring will
         * be discovered during that.
         */
        let timeReachedBoundary;
        let spring$1;
        const checkCatchBoundary = (t) => {
            if (!isOutOfBounds(state.value))
                return;
            timeReachedBoundary = t;
            spring$1 = spring({
                keyframes: [state.value, nearestBoundary(state.value)],
                velocity: calcGeneratorVelocity(calcLatest, t, state.value), // TODO: This should be passing * 1000
                damping: bounceDamping,
                stiffness: bounceStiffness,
                restDelta,
                restSpeed,
            });
        };
        checkCatchBoundary(0);
        return {
            calculatedDuration: null,
            next: (t) => {
                /**
                 * We need to resolve the friction to figure out if we need a
                 * spring but we don't want to do this twice per frame. So here
                 * we flag if we updated for this frame and later if we did
                 * we can skip doing it again.
                 */
                let hasUpdatedFrame = false;
                if (!spring$1 && timeReachedBoundary === undefined) {
                    hasUpdatedFrame = true;
                    applyFriction(t);
                    checkCatchBoundary(t);
                }
                /**
                 * If we have a spring and the provided t is beyond the moment the friction
                 * animation crossed the min/max boundary, use the spring.
                 */
                if (timeReachedBoundary !== undefined && t >= timeReachedBoundary) {
                    return spring$1.next(t - timeReachedBoundary);
                }
                else {
                    !hasUpdatedFrame && applyFriction(t);
                    return state;
                }
            },
        };
    }

    const easeIn = /*@__PURE__*/ cubicBezier(0.42, 0, 1, 1);
    const easeOut = /*@__PURE__*/ cubicBezier(0, 0, 0.58, 1);
    const easeInOut = /*@__PURE__*/ cubicBezier(0.42, 0, 0.58, 1);

    const isEasingArray = (ease) => {
        return Array.isArray(ease) && typeof ease[0] !== "number";
    };

    const easingLookup = {
        linear: noop,
        easeIn,
        easeInOut,
        easeOut,
        circIn,
        circInOut,
        circOut,
        backIn,
        backInOut,
        backOut,
        anticipate,
    };
    const easingDefinitionToFunction = (definition) => {
        if (isBezierDefinition(definition)) {
            // If cubic bezier definition, create bezier curve
            exports.invariant(definition.length === 4, `Cubic bezier arrays must contain four numerical values.`);
            const [x1, y1, x2, y2] = definition;
            return cubicBezier(x1, y1, x2, y2);
        }
        else if (typeof definition === "string") {
            // Else lookup from table
            exports.invariant(easingLookup[definition] !== undefined, `Invalid easing type '${definition}'`);
            return easingLookup[definition];
        }
        return definition;
    };

    function createMixers(output, ease, customMixer) {
        const mixers = [];
        const mixerFactory = customMixer || mix;
        const numMixers = output.length - 1;
        for (let i = 0; i < numMixers; i++) {
            let mixer = mixerFactory(output[i], output[i + 1]);
            if (ease) {
                const easingFunction = Array.isArray(ease) ? ease[i] || noop : ease;
                mixer = pipe(easingFunction, mixer);
            }
            mixers.push(mixer);
        }
        return mixers;
    }
    /**
     * Create a function that maps from a numerical input array to a generic output array.
     *
     * Accepts:
     *   - Numbers
     *   - Colors (hex, hsl, hsla, rgb, rgba)
     *   - Complex (combinations of one or more numbers or strings)
     *
     * ```jsx
     * const mixColor = interpolate([0, 1], ['#fff', '#000'])
     *
     * mixColor(0.5) // 'rgba(128, 128, 128, 1)'
     * ```
     *
     * TODO Revist this approach once we've moved to data models for values,
     * probably not needed to pregenerate mixer functions.
     *
     * @public
     */
    function interpolate(input, output, { clamp: isClamp = true, ease, mixer } = {}) {
        const inputLength = input.length;
        exports.invariant(inputLength === output.length, "Both input and output ranges must be the same length");
        /**
         * If we're only provided a single input, we can just make a function
         * that returns the output.
         */
        if (inputLength === 1)
            return () => output[0];
        if (inputLength === 2 && output[0] === output[1])
            return () => output[1];
        const isZeroDeltaRange = input[0] === input[1];
        // If input runs highest -> lowest, reverse both arrays
        if (input[0] > input[inputLength - 1]) {
            input = [...input].reverse();
            output = [...output].reverse();
        }
        const mixers = createMixers(output, ease, mixer);
        const numMixers = mixers.length;
        const interpolator = (v) => {
            if (isZeroDeltaRange && v < input[0])
                return output[0];
            let i = 0;
            if (numMixers > 1) {
                for (; i < input.length - 2; i++) {
                    if (v < input[i + 1])
                        break;
                }
            }
            const progressInRange = progress(input[i], input[i + 1], v);
            return mixers[i](progressInRange);
        };
        return isClamp
            ? (v) => interpolator(clamp(input[0], input[inputLength - 1], v))
            : interpolator;
    }

    function fillOffset(offset, remaining) {
        const min = offset[offset.length - 1];
        for (let i = 1; i <= remaining; i++) {
            const offsetProgress = progress(0, remaining, i);
            offset.push(mixNumber$1(min, 1, offsetProgress));
        }
    }

    function defaultOffset$1(arr) {
        const offset = [0];
        fillOffset(offset, arr.length - 1);
        return offset;
    }

    function convertOffsetToTimes(offset, duration) {
        return offset.map((o) => o * duration);
    }

    function defaultEasing$1(values, easing) {
        return values.map(() => easing || easeInOut).splice(0, values.length - 1);
    }
    function keyframes({ duration = 300, keyframes: keyframeValues, times, ease = "easeInOut", }) {
        /**
         * Easing functions can be externally defined as strings. Here we convert them
         * into actual functions.
         */
        const easingFunctions = isEasingArray(ease)
            ? ease.map(easingDefinitionToFunction)
            : easingDefinitionToFunction(ease);
        /**
         * This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
         * to reduce GC during animation.
         */
        const state = {
            done: false,
            value: keyframeValues[0],
        };
        /**
         * Create a times array based on the provided 0-1 offsets
         */
        const absoluteTimes = convertOffsetToTimes(
        // Only use the provided offsets if they're the correct length
        // TODO Maybe we should warn here if there's a length mismatch
        times && times.length === keyframeValues.length
            ? times
            : defaultOffset$1(keyframeValues), duration);
        const mapTimeToKeyframe = interpolate(absoluteTimes, keyframeValues, {
            ease: Array.isArray(easingFunctions)
                ? easingFunctions
                : defaultEasing$1(keyframeValues, easingFunctions),
        });
        return {
            calculatedDuration: duration,
            next: (t) => {
                state.value = mapTimeToKeyframe(t);
                state.done = t >= duration;
                return state;
            },
        };
    }

    const frameloopDriver = (update) => {
        const passTimestamp = ({ timestamp }) => update(timestamp);
        return {
            start: () => frame.update(passTimestamp, true),
            stop: () => cancelFrame(passTimestamp),
            /**
             * If we're processing this frame we can use the
             * framelocked timestamp to keep things in sync.
             */
            now: () => (frameData.isProcessing ? frameData.timestamp : time.now()),
        };
    };

    const generators = {
        decay: inertia,
        inertia,
        tween: keyframes,
        keyframes: keyframes,
        spring,
    };
    const percentToProgress = (percent) => percent / 100;
    /**
     * Animation that runs on the main thread. Designed to be WAAPI-spec in the subset of
     * features we expose publically. Mostly the compatibility is to ensure visual identity
     * between both WAAPI and main thread animations.
     */
    class MainThreadAnimation extends BaseAnimation {
        constructor(options) {
            super(options);
            /**
             * The time at which the animation was paused.
             */
            this.holdTime = null;
            /**
             * The time at which the animation was cancelled.
             */
            this.cancelTime = null;
            /**
             * The current time of the animation.
             */
            this.currentTime = 0;
            /**
             * Playback speed as a factor. 0 would be stopped, -1 reverse and 2 double speed.
             */
            this.playbackSpeed = 1;
            /**
             * The state of the animation to apply when the animation is resolved. This
             * allows calls to the public API to control the animation before it is resolved,
             * without us having to resolve it first.
             */
            this.pendingPlayState = "running";
            /**
             * The time at which the animation was started.
             */
            this.startTime = null;
            this.state = "idle";
            /**
             * This method is bound to the instance to fix a pattern where
             * animation.stop is returned as a reference from a useEffect.
             */
            this.stop = () => {
                this.resolver.cancel();
                this.isStopped = true;
                if (this.state === "idle")
                    return;
                this.teardown();
                const { onStop } = this.options;
                onStop && onStop();
            };
            const { name, motionValue, element, keyframes } = this.options;
            const KeyframeResolver$1 = (element === null || element === void 0 ? void 0 : element.KeyframeResolver) || KeyframeResolver;
            const onResolved = (resolvedKeyframes, finalKeyframe) => this.onKeyframesResolved(resolvedKeyframes, finalKeyframe);
            this.resolver = new KeyframeResolver$1(keyframes, onResolved, name, motionValue, element);
            this.resolver.scheduleResolve();
        }
        flatten() {
            super.flatten();
            // If we've already resolved the animation, re-initialise it
            if (this._resolved) {
                Object.assign(this._resolved, this.initPlayback(this._resolved.keyframes));
            }
        }
        initPlayback(keyframes$1) {
            const { type = "keyframes", repeat = 0, repeatDelay = 0, repeatType, velocity = 0, } = this.options;
            const generatorFactory = isGenerator(type)
                ? type
                : generators[type] || keyframes;
            /**
             * If our generator doesn't support mixing numbers, we need to replace keyframes with
             * [0, 100] and then make a function that maps that to the actual keyframes.
             *
             * 100 is chosen instead of 1 as it works nicer with spring animations.
             */
            let mapPercentToKeyframes;
            let mirroredGenerator;
            if (generatorFactory !== keyframes &&
                typeof keyframes$1[0] !== "number") {
                {
                    exports.invariant(keyframes$1.length === 2, `Only two keyframes currently supported with spring and inertia animations. Trying to animate ${keyframes$1}`);
                }
                mapPercentToKeyframes = pipe(percentToProgress, mix(keyframes$1[0], keyframes$1[1]));
                keyframes$1 = [0, 100];
            }
            const generator = generatorFactory({ ...this.options, keyframes: keyframes$1 });
            /**
             * If we have a mirror repeat type we need to create a second generator that outputs the
             * mirrored (not reversed) animation and later ping pong between the two generators.
             */
            if (repeatType === "mirror") {
                mirroredGenerator = generatorFactory({
                    ...this.options,
                    keyframes: [...keyframes$1].reverse(),
                    velocity: -velocity,
                });
            }
            /**
             * If duration is undefined and we have repeat options,
             * we need to calculate a duration from the generator.
             *
             * We set it to the generator itself to cache the duration.
             * Any timeline resolver will need to have already precalculated
             * the duration by this step.
             */
            if (generator.calculatedDuration === null) {
                generator.calculatedDuration = calcGeneratorDuration(generator);
            }
            const { calculatedDuration } = generator;
            const resolvedDuration = calculatedDuration + repeatDelay;
            const totalDuration = resolvedDuration * (repeat + 1) - repeatDelay;
            return {
                generator,
                mirroredGenerator,
                mapPercentToKeyframes,
                calculatedDuration,
                resolvedDuration,
                totalDuration,
            };
        }
        onPostResolved() {
            const { autoplay = true } = this.options;
            this.play();
            if (this.pendingPlayState === "paused" || !autoplay) {
                this.pause();
            }
            else {
                this.state = this.pendingPlayState;
            }
        }
        tick(timestamp, sample = false) {
            const { resolved } = this;
            // If the animations has failed to resolve, return the final keyframe.
            if (!resolved) {
                const { keyframes } = this.options;
                return { done: true, value: keyframes[keyframes.length - 1] };
            }
            const { finalKeyframe, generator, mirroredGenerator, mapPercentToKeyframes, keyframes, calculatedDuration, totalDuration, resolvedDuration, } = resolved;
            if (this.startTime === null)
                return generator.next(0);
            const { delay, repeat, repeatType, repeatDelay, onUpdate } = this.options;
            /**
             * requestAnimationFrame timestamps can come through as lower than
             * the startTime as set by performance.now(). Here we prevent this,
             * though in the future it could be possible to make setting startTime
             * a pending operation that gets resolved here.
             */
            if (this.speed > 0) {
                this.startTime = Math.min(this.startTime, timestamp);
            }
            else if (this.speed < 0) {
                this.startTime = Math.min(timestamp - totalDuration / this.speed, this.startTime);
            }
            // Update currentTime
            if (sample) {
                this.currentTime = timestamp;
            }
            else if (this.holdTime !== null) {
                this.currentTime = this.holdTime;
            }
            else {
                // Rounding the time because floating point arithmetic is not always accurate, e.g. 3000.367 - 1000.367 =
                // 2000.0000000000002. This is a problem when we are comparing the currentTime with the duration, for
                // example.
                this.currentTime =
                    Math.round(timestamp - this.startTime) * this.speed;
            }
            // Rebase on delay
            const timeWithoutDelay = this.currentTime - delay * (this.speed >= 0 ? 1 : -1);
            const isInDelayPhase = this.speed >= 0
                ? timeWithoutDelay < 0
                : timeWithoutDelay > totalDuration;
            this.currentTime = Math.max(timeWithoutDelay, 0);
            // If this animation has finished, set the current time  to the total duration.
            if (this.state === "finished" && this.holdTime === null) {
                this.currentTime = totalDuration;
            }
            let elapsed = this.currentTime;
            let frameGenerator = generator;
            if (repeat) {
                /**
                 * Get the current progress (0-1) of the animation. If t is >
                 * than duration we'll get values like 2.5 (midway through the
                 * third iteration)
                 */
                const progress = Math.min(this.currentTime, totalDuration) / resolvedDuration;
                /**
                 * Get the current iteration (0 indexed). For instance the floor of
                 * 2.5 is 2.
                 */
                let currentIteration = Math.floor(progress);
                /**
                 * Get the current progress of the iteration by taking the remainder
                 * so 2.5 is 0.5 through iteration 2
                 */
                let iterationProgress = progress % 1.0;
                /**
                 * If iteration progress is 1 we count that as the end
                 * of the previous iteration.
                 */
                if (!iterationProgress && progress >= 1) {
                    iterationProgress = 1;
                }
                iterationProgress === 1 && currentIteration--;
                currentIteration = Math.min(currentIteration, repeat + 1);
                /**
                 * Reverse progress if we're not running in "normal" direction
                 */
                const isOddIteration = Boolean(currentIteration % 2);
                if (isOddIteration) {
                    if (repeatType === "reverse") {
                        iterationProgress = 1 - iterationProgress;
                        if (repeatDelay) {
                            iterationProgress -= repeatDelay / resolvedDuration;
                        }
                    }
                    else if (repeatType === "mirror") {
                        frameGenerator = mirroredGenerator;
                    }
                }
                elapsed = clamp(0, 1, iterationProgress) * resolvedDuration;
            }
            /**
             * If we're in negative time, set state as the initial keyframe.
             * This prevents delay: x, duration: 0 animations from finishing
             * instantly.
             */
            const state = isInDelayPhase
                ? { done: false, value: keyframes[0] }
                : frameGenerator.next(elapsed);
            if (mapPercentToKeyframes) {
                state.value = mapPercentToKeyframes(state.value);
            }
            let { done } = state;
            if (!isInDelayPhase && calculatedDuration !== null) {
                done =
                    this.speed >= 0
                        ? this.currentTime >= totalDuration
                        : this.currentTime <= 0;
            }
            const isAnimationFinished = this.holdTime === null &&
                (this.state === "finished" || (this.state === "running" && done));
            if (isAnimationFinished && finalKeyframe !== undefined) {
                state.value = getFinalKeyframe(keyframes, this.options, finalKeyframe);
            }
            if (onUpdate) {
                onUpdate(state.value);
            }
            if (isAnimationFinished) {
                this.finish();
            }
            return state;
        }
        get duration() {
            const { resolved } = this;
            return resolved ? millisecondsToSeconds(resolved.calculatedDuration) : 0;
        }
        get time() {
            return millisecondsToSeconds(this.currentTime);
        }
        set time(newTime) {
            newTime = secondsToMilliseconds(newTime);
            this.currentTime = newTime;
            if (this.holdTime !== null || this.speed === 0) {
                this.holdTime = newTime;
            }
            else if (this.driver) {
                this.startTime = this.driver.now() - newTime / this.speed;
            }
        }
        get speed() {
            return this.playbackSpeed;
        }
        set speed(newSpeed) {
            const hasChanged = this.playbackSpeed !== newSpeed;
            this.playbackSpeed = newSpeed;
            if (hasChanged) {
                this.time = millisecondsToSeconds(this.currentTime);
            }
        }
        play() {
            if (!this.resolver.isScheduled) {
                this.resolver.resume();
            }
            if (!this._resolved) {
                this.pendingPlayState = "running";
                return;
            }
            if (this.isStopped)
                return;
            const { driver = frameloopDriver, onPlay, startTime } = this.options;
            if (!this.driver) {
                this.driver = driver((timestamp) => this.tick(timestamp));
            }
            onPlay && onPlay();
            const now = this.driver.now();
            if (this.holdTime !== null) {
                this.startTime = now - this.holdTime;
            }
            else if (!this.startTime) {
                this.startTime = startTime !== null && startTime !== void 0 ? startTime : this.calcStartTime();
            }
            else if (this.state === "finished") {
                this.startTime = now;
            }
            if (this.state === "finished") {
                this.updateFinishedPromise();
            }
            this.cancelTime = this.startTime;
            this.holdTime = null;
            /**
             * Set playState to running only after we've used it in
             * the previous logic.
             */
            this.state = "running";
            this.driver.start();
        }
        pause() {
            var _a;
            if (!this._resolved) {
                this.pendingPlayState = "paused";
                return;
            }
            this.state = "paused";
            this.holdTime = (_a = this.currentTime) !== null && _a !== void 0 ? _a : 0;
        }
        complete() {
            if (this.state !== "running") {
                this.play();
            }
            this.pendingPlayState = this.state = "finished";
            this.holdTime = null;
        }
        finish() {
            this.teardown();
            this.state = "finished";
            const { onComplete } = this.options;
            onComplete && onComplete();
        }
        cancel() {
            if (this.cancelTime !== null) {
                this.tick(this.cancelTime);
            }
            this.teardown();
            this.updateFinishedPromise();
        }
        teardown() {
            this.state = "idle";
            this.stopDriver();
            this.resolveFinishedPromise();
            this.updateFinishedPromise();
            this.startTime = this.cancelTime = null;
            this.resolver.cancel();
        }
        stopDriver() {
            if (!this.driver)
                return;
            this.driver.stop();
            this.driver = undefined;
        }
        sample(time) {
            this.startTime = 0;
            return this.tick(time, true);
        }
    }
    // Legacy interface
    function animateValue(options) {
        return new MainThreadAnimation(options);
    }

    /**
     * A list of values that can be hardware-accelerated.
     */
    const acceleratedValues = new Set([
        "opacity",
        "clipPath",
        "filter",
        "transform",
        // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
        // or until we implement support for linear() easing.
        // "background-color"
    ]);

    function startWaapiAnimation(element, valueName, keyframes, { delay = 0, duration = 300, repeat = 0, repeatType = "loop", ease = "easeInOut", times, } = {}) {
        const keyframeOptions = { [valueName]: keyframes };
        if (times)
            keyframeOptions.offset = times;
        const easing = mapEasingToNativeEasing(ease, duration);
        /**
         * If this is an easing array, apply to keyframes, not animation as a whole
         */
        if (Array.isArray(easing))
            keyframeOptions.easing = easing;
        return element.animate(keyframeOptions, {
            delay,
            duration,
            easing: !Array.isArray(easing) ? easing : "linear",
            fill: "both",
            iterations: repeat + 1,
            direction: repeatType === "reverse" ? "alternate" : "normal",
        });
    }

    const supportsWaapi = /*@__PURE__*/ memo(() => Object.hasOwnProperty.call(Element.prototype, "animate"));

    /**
     * 10ms is chosen here as it strikes a balance between smooth
     * results (more than one keyframe per frame at 60fps) and
     * keyframe quantity.
     */
    const sampleDelta = 10; //ms
    /**
     * Implement a practical max duration for keyframe generation
     * to prevent infinite loops
     */
    const maxDuration = 20000;
    /**
     * Check if an animation can run natively via WAAPI or requires pregenerated keyframes.
     * WAAPI doesn't support spring or function easings so we run these as JS animation before
     * handing off.
     */
    function requiresPregeneratedKeyframes(options) {
        return (isGenerator(options.type) ||
            options.type === "spring" ||
            !isWaapiSupportedEasing(options.ease));
    }
    function pregenerateKeyframes(keyframes, options) {
        /**
         * Create a main-thread animation to pregenerate keyframes.
         * We sample this at regular intervals to generate keyframes that we then
         * linearly interpolate between.
         */
        const sampleAnimation = new MainThreadAnimation({
            ...options,
            keyframes,
            repeat: 0,
            delay: 0,
            isGenerator: true,
        });
        let state = { done: false, value: keyframes[0] };
        const pregeneratedKeyframes = [];
        /**
         * Bail after 20 seconds of pre-generated keyframes as it's likely
         * we're heading for an infinite loop.
         */
        let t = 0;
        while (!state.done && t < maxDuration) {
            state = sampleAnimation.sample(t);
            pregeneratedKeyframes.push(state.value);
            t += sampleDelta;
        }
        return {
            times: undefined,
            keyframes: pregeneratedKeyframes,
            duration: t - sampleDelta,
            ease: "linear",
        };
    }
    const unsupportedEasingFunctions = {
        anticipate,
        backInOut,
        circInOut,
    };
    function isUnsupportedEase(key) {
        return key in unsupportedEasingFunctions;
    }
    class AcceleratedAnimation extends BaseAnimation {
        constructor(options) {
            super(options);
            const { name, motionValue, element, keyframes } = this.options;
            this.resolver = new DOMKeyframesResolver(keyframes, (resolvedKeyframes, finalKeyframe) => this.onKeyframesResolved(resolvedKeyframes, finalKeyframe), name, motionValue, element);
            this.resolver.scheduleResolve();
        }
        initPlayback(keyframes, finalKeyframe) {
            let { duration = 300, times, ease, type, motionValue, name, startTime, } = this.options;
            /**
             * If element has since been unmounted, return false to indicate
             * the animation failed to initialised.
             */
            if (!motionValue.owner || !motionValue.owner.current) {
                return false;
            }
            /**
             * If the user has provided an easing function name that isn't supported
             * by WAAPI (like "anticipate"), we need to provide the corressponding
             * function. This will later get converted to a linear() easing function.
             */
            if (typeof ease === "string" &&
                supportsLinearEasing() &&
                isUnsupportedEase(ease)) {
                ease = unsupportedEasingFunctions[ease];
            }
            /**
             * If this animation needs pre-generated keyframes then generate.
             */
            if (requiresPregeneratedKeyframes(this.options)) {
                const { onComplete, onUpdate, motionValue, element, ...options } = this.options;
                const pregeneratedAnimation = pregenerateKeyframes(keyframes, options);
                keyframes = pregeneratedAnimation.keyframes;
                // If this is a very short animation, ensure we have
                // at least two keyframes to animate between as older browsers
                // can't animate between a single keyframe.
                if (keyframes.length === 1) {
                    keyframes[1] = keyframes[0];
                }
                duration = pregeneratedAnimation.duration;
                times = pregeneratedAnimation.times;
                ease = pregeneratedAnimation.ease;
                type = "keyframes";
            }
            const animation = startWaapiAnimation(motionValue.owner.current, name, keyframes, { ...this.options, duration, times, ease });
            // Override the browser calculated startTime with one synchronised to other JS
            // and WAAPI animations starting this event loop.
            animation.startTime = startTime !== null && startTime !== void 0 ? startTime : this.calcStartTime();
            if (this.pendingTimeline) {
                attachTimeline(animation, this.pendingTimeline);
                this.pendingTimeline = undefined;
            }
            else {
                /**
                 * Prefer the `onfinish` prop as it's more widely supported than
                 * the `finished` promise.
                 *
                 * Here, we synchronously set the provided MotionValue to the end
                 * keyframe. If we didn't, when the WAAPI animation is finished it would
                 * be removed from the element which would then revert to its old styles.
                 */
                animation.onfinish = () => {
                    const { onComplete } = this.options;
                    motionValue.set(getFinalKeyframe(keyframes, this.options, finalKeyframe));
                    onComplete && onComplete();
                    this.cancel();
                    this.resolveFinishedPromise();
                };
            }
            return {
                animation,
                duration,
                times,
                type,
                ease,
                keyframes: keyframes,
            };
        }
        get duration() {
            const { resolved } = this;
            if (!resolved)
                return 0;
            const { duration } = resolved;
            return millisecondsToSeconds(duration);
        }
        get time() {
            const { resolved } = this;
            if (!resolved)
                return 0;
            const { animation } = resolved;
            return millisecondsToSeconds(animation.currentTime || 0);
        }
        set time(newTime) {
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            animation.currentTime = secondsToMilliseconds(newTime);
        }
        get speed() {
            const { resolved } = this;
            if (!resolved)
                return 1;
            const { animation } = resolved;
            return animation.playbackRate;
        }
        set speed(newSpeed) {
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            animation.playbackRate = newSpeed;
        }
        get state() {
            const { resolved } = this;
            if (!resolved)
                return "idle";
            const { animation } = resolved;
            return animation.playState;
        }
        get startTime() {
            const { resolved } = this;
            if (!resolved)
                return null;
            const { animation } = resolved;
            // Coerce to number as TypeScript incorrectly types this
            // as CSSNumberish
            return animation.startTime;
        }
        /**
         * Replace the default DocumentTimeline with another AnimationTimeline.
         * Currently used for scroll animations.
         */
        attachTimeline(timeline) {
            if (!this._resolved) {
                this.pendingTimeline = timeline;
            }
            else {
                const { resolved } = this;
                if (!resolved)
                    return noop;
                const { animation } = resolved;
                attachTimeline(animation, timeline);
            }
            return noop;
        }
        play() {
            if (this.isStopped)
                return;
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            if (animation.playState === "finished") {
                this.updateFinishedPromise();
            }
            animation.play();
        }
        pause() {
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            animation.pause();
        }
        stop() {
            this.resolver.cancel();
            this.isStopped = true;
            if (this.state === "idle")
                return;
            this.resolveFinishedPromise();
            this.updateFinishedPromise();
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation, keyframes, duration, type, ease, times } = resolved;
            if (animation.playState === "idle" ||
                animation.playState === "finished") {
                return;
            }
            /**
             * WAAPI doesn't natively have any interruption capabilities.
             *
             * Rather than read commited styles back out of the DOM, we can
             * create a renderless JS animation and sample it twice to calculate
             * its current value, "previous" value, and therefore allow
             * Motion to calculate velocity for any subsequent animation.
             */
            if (this.time) {
                const { motionValue, onUpdate, onComplete, element, ...options } = this.options;
                const sampleAnimation = new MainThreadAnimation({
                    ...options,
                    keyframes,
                    duration,
                    type,
                    ease,
                    times,
                    isGenerator: true,
                });
                const sampleTime = secondsToMilliseconds(this.time);
                motionValue.setWithVelocity(sampleAnimation.sample(sampleTime - sampleDelta).value, sampleAnimation.sample(sampleTime).value, sampleDelta);
            }
            const { onStop } = this.options;
            onStop && onStop();
            this.cancel();
        }
        complete() {
            const { resolved } = this;
            if (!resolved)
                return;
            resolved.animation.finish();
        }
        cancel() {
            const { resolved } = this;
            if (!resolved)
                return;
            resolved.animation.cancel();
        }
        static supports(options) {
            const { motionValue, name, repeatDelay, repeatType, damping, type } = options;
            if (!motionValue ||
                !motionValue.owner ||
                !(motionValue.owner.current instanceof HTMLElement)) {
                return false;
            }
            const { onUpdate, transformTemplate } = motionValue.owner.getProps();
            return (supportsWaapi() &&
                name &&
                acceleratedValues.has(name) &&
                /**
                 * If we're outputting values to onUpdate then we can't use WAAPI as there's
                 * no way to read the value from WAAPI every frame.
                 */
                !onUpdate &&
                !transformTemplate &&
                !repeatDelay &&
                repeatType !== "mirror" &&
                damping !== 0 &&
                type !== "inertia");
        }
    }

    const underDampedSpring = {
        type: "spring",
        stiffness: 500,
        damping: 25,
        restSpeed: 10,
    };
    const criticallyDampedSpring = (target) => ({
        type: "spring",
        stiffness: 550,
        damping: target === 0 ? 2 * Math.sqrt(550) : 30,
        restSpeed: 10,
    });
    const keyframesTransition = {
        type: "keyframes",
        duration: 0.8,
    };
    /**
     * Default easing curve is a slightly shallower version of
     * the default browser easing curve.
     */
    const ease = {
        type: "keyframes",
        ease: [0.25, 0.1, 0.35, 1],
        duration: 0.3,
    };
    const getDefaultTransition = (valueKey, { keyframes }) => {
        if (keyframes.length > 2) {
            return keyframesTransition;
        }
        else if (transformProps.has(valueKey)) {
            return valueKey.startsWith("scale")
                ? criticallyDampedSpring(keyframes[1])
                : underDampedSpring;
        }
        return ease;
    };

    /**
     * Decide whether a transition is defined on a given Transition.
     * This filters out orchestration options and returns true
     * if any options are left.
     */
    function isTransitionDefined({ when, delay: _delay, delayChildren, staggerChildren, staggerDirection, repeat, repeatType, repeatDelay, from, elapsed, ...transition }) {
        return !!Object.keys(transition).length;
    }

    const animateMotionValue = (name, value, target, transition = {}, element, isHandoff) => (onComplete) => {
        const valueTransition = getValueTransition$1(transition, name) || {};
        /**
         * Most transition values are currently completely overwritten by value-specific
         * transitions. In the future it'd be nicer to blend these transitions. But for now
         * delay actually does inherit from the root transition if not value-specific.
         */
        const delay = valueTransition.delay || transition.delay || 0;
        /**
         * Elapsed isn't a public transition option but can be passed through from
         * optimized appear effects in milliseconds.
         */
        let { elapsed = 0 } = transition;
        elapsed = elapsed - secondsToMilliseconds(delay);
        let options = {
            keyframes: Array.isArray(target) ? target : [null, target],
            ease: "easeOut",
            velocity: value.getVelocity(),
            ...valueTransition,
            delay: -elapsed,
            onUpdate: (v) => {
                value.set(v);
                valueTransition.onUpdate && valueTransition.onUpdate(v);
            },
            onComplete: () => {
                onComplete();
                valueTransition.onComplete && valueTransition.onComplete();
            },
            name,
            motionValue: value,
            element: isHandoff ? undefined : element,
        };
        /**
         * If there's no transition defined for this value, we can generate
         * unqiue transition settings for this value.
         */
        if (!isTransitionDefined(valueTransition)) {
            options = {
                ...options,
                ...getDefaultTransition(name, options),
            };
        }
        /**
         * Both WAAPI and our internal animation functions use durations
         * as defined by milliseconds, while our external API defines them
         * as seconds.
         */
        if (options.duration) {
            options.duration = secondsToMilliseconds(options.duration);
        }
        if (options.repeatDelay) {
            options.repeatDelay = secondsToMilliseconds(options.repeatDelay);
        }
        if (options.from !== undefined) {
            options.keyframes[0] = options.from;
        }
        let shouldSkip = false;
        if (options.type === false ||
            (options.duration === 0 && !options.repeatDelay)) {
            options.duration = 0;
            if (options.delay === 0) {
                shouldSkip = true;
            }
        }
        if (instantAnimationState.current ||
            MotionGlobalConfig.skipAnimations) {
            shouldSkip = true;
            options.duration = 0;
            options.delay = 0;
        }
        /**
         * If we can or must skip creating the animation, and apply only
         * the final keyframe, do so. We also check once keyframes are resolved but
         * this early check prevents the need to create an animation at all.
         */
        if (shouldSkip && !isHandoff && value.get() !== undefined) {
            const finalKeyframe = getFinalKeyframe(options.keyframes, valueTransition);
            if (finalKeyframe !== undefined) {
                frame.update(() => {
                    options.onUpdate(finalKeyframe);
                    options.onComplete();
                });
                // We still want to return some animation controls here rather
                // than returning undefined
                return new GroupPlaybackControls([]);
            }
        }
        /**
         * Animate via WAAPI if possible. If this is a handoff animation, the optimised animation will be running via
         * WAAPI. Therefore, this animation must be JS to ensure it runs "under" the
         * optimised animation.
         */
        if (!isHandoff && AcceleratedAnimation.supports(options)) {
            return new AcceleratedAnimation(options);
        }
        else {
            return new MainThreadAnimation(options);
        }
    };

    /**
     * Decide whether we should block this animation. Previously, we achieved this
     * just by checking whether the key was listed in protectedKeys, but this
     * posed problems if an animation was triggered by afterChildren and protectedKeys
     * had been set to true in the meantime.
     */
    function shouldBlockAnimation({ protectedKeys, needsAnimating }, key) {
        const shouldBlock = protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true;
        needsAnimating[key] = false;
        return shouldBlock;
    }
    function animateTarget(visualElement, targetAndTransition, { delay = 0, transitionOverride, type } = {}) {
        var _a;
        let { transition = visualElement.getDefaultTransition(), transitionEnd, ...target } = targetAndTransition;
        if (transitionOverride)
            transition = transitionOverride;
        const animations = [];
        const animationTypeState = type &&
            visualElement.animationState &&
            visualElement.animationState.getState()[type];
        for (const key in target) {
            const value = visualElement.getValue(key, (_a = visualElement.latestValues[key]) !== null && _a !== void 0 ? _a : null);
            const valueTarget = target[key];
            if (valueTarget === undefined ||
                (animationTypeState &&
                    shouldBlockAnimation(animationTypeState, key))) {
                continue;
            }
            const valueTransition = {
                delay,
                ...getValueTransition$1(transition || {}, key),
            };
            /**
             * If this is the first time a value is being animated, check
             * to see if we're handling off from an existing animation.
             */
            let isHandoff = false;
            if (window.MotionHandoffAnimation) {
                const appearId = getOptimisedAppearId(visualElement);
                if (appearId) {
                    const startTime = window.MotionHandoffAnimation(appearId, key, frame);
                    if (startTime !== null) {
                        valueTransition.startTime = startTime;
                        isHandoff = true;
                    }
                }
            }
            addValueToWillChange(visualElement, key);
            value.start(animateMotionValue(key, value, valueTarget, visualElement.shouldReduceMotion && positionalKeys.has(key)
                ? { type: false }
                : valueTransition, visualElement, isHandoff));
            const animation = value.animation;
            if (animation) {
                animations.push(animation);
            }
        }
        if (transitionEnd) {
            Promise.all(animations).then(() => {
                frame.update(() => {
                    transitionEnd && setTarget(visualElement, transitionEnd);
                });
            });
        }
        return animations;
    }

    function animateVariant(visualElement, variant, options = {}) {
        var _a;
        const resolved = resolveVariant(visualElement, variant, options.type === "exit"
            ? (_a = visualElement.presenceContext) === null || _a === void 0 ? void 0 : _a.custom
            : undefined);
        let { transition = visualElement.getDefaultTransition() || {} } = resolved || {};
        if (options.transitionOverride) {
            transition = options.transitionOverride;
        }
        /**
         * If we have a variant, create a callback that runs it as an animation.
         * Otherwise, we resolve a Promise immediately for a composable no-op.
         */
        const getAnimation = resolved
            ? () => Promise.all(animateTarget(visualElement, resolved, options))
            : () => Promise.resolve();
        /**
         * If we have children, create a callback that runs all their animations.
         * Otherwise, we resolve a Promise immediately for a composable no-op.
         */
        const getChildAnimations = visualElement.variantChildren && visualElement.variantChildren.size
            ? (forwardDelay = 0) => {
                const { delayChildren = 0, staggerChildren, staggerDirection, } = transition;
                return animateChildren(visualElement, variant, delayChildren + forwardDelay, staggerChildren, staggerDirection, options);
            }
            : () => Promise.resolve();
        /**
         * If the transition explicitly defines a "when" option, we need to resolve either
         * this animation or all children animations before playing the other.
         */
        const { when } = transition;
        if (when) {
            const [first, last] = when === "beforeChildren"
                ? [getAnimation, getChildAnimations]
                : [getChildAnimations, getAnimation];
            return first().then(() => last());
        }
        else {
            return Promise.all([getAnimation(), getChildAnimations(options.delay)]);
        }
    }
    function animateChildren(visualElement, variant, delayChildren = 0, staggerChildren = 0, staggerDirection = 1, options) {
        const animations = [];
        const maxStaggerDuration = (visualElement.variantChildren.size - 1) * staggerChildren;
        const generateStaggerDuration = staggerDirection === 1
            ? (i = 0) => i * staggerChildren
            : (i = 0) => maxStaggerDuration - i * staggerChildren;
        Array.from(visualElement.variantChildren)
            .sort(sortByTreeOrder)
            .forEach((child, i) => {
            child.notify("AnimationStart", variant);
            animations.push(animateVariant(child, variant, {
                ...options,
                delay: delayChildren + generateStaggerDuration(i),
            }).then(() => child.notify("AnimationComplete", variant)));
        });
        return Promise.all(animations);
    }
    function sortByTreeOrder(a, b) {
        return a.sortNodePosition(b);
    }

    function animateVisualElement(visualElement, definition, options = {}) {
        visualElement.notify("AnimationStart", definition);
        let animation;
        if (Array.isArray(definition)) {
            const animations = definition.map((variant) => animateVariant(visualElement, variant, options));
            animation = Promise.all(animations);
        }
        else if (typeof definition === "string") {
            animation = animateVariant(visualElement, definition, options);
        }
        else {
            const resolvedDefinition = typeof definition === "function"
                ? resolveVariant(visualElement, definition, options.custom)
                : definition;
            animation = Promise.all(animateTarget(visualElement, resolvedDefinition, options));
        }
        return animation.then(() => {
            visualElement.notify("AnimationComplete", definition);
        });
    }

    const numVariantProps = variantProps.length;
    function getVariantContext(visualElement) {
        if (!visualElement)
            return undefined;
        if (!visualElement.isControllingVariants) {
            const context = visualElement.parent
                ? getVariantContext(visualElement.parent) || {}
                : {};
            if (visualElement.props.initial !== undefined) {
                context.initial = visualElement.props.initial;
            }
            return context;
        }
        const context = {};
        for (let i = 0; i < numVariantProps; i++) {
            const name = variantProps[i];
            const prop = visualElement.props[name];
            if (isVariantLabel(prop) || prop === false) {
                context[name] = prop;
            }
        }
        return context;
    }

    const reversePriorityOrder = [...variantPriorityOrder].reverse();
    const numAnimationTypes = variantPriorityOrder.length;
    function animateList(visualElement) {
        return (animations) => Promise.all(animations.map(({ animation, options }) => animateVisualElement(visualElement, animation, options)));
    }
    function createAnimationState(visualElement) {
        let animate = animateList(visualElement);
        let state = createState();
        let isInitialRender = true;
        /**
         * This function will be used to reduce the animation definitions for
         * each active animation type into an object of resolved values for it.
         */
        const buildResolvedTypeValues = (type) => (acc, definition) => {
            var _a;
            const resolved = resolveVariant(visualElement, definition, type === "exit"
                ? (_a = visualElement.presenceContext) === null || _a === void 0 ? void 0 : _a.custom
                : undefined);
            if (resolved) {
                const { transition, transitionEnd, ...target } = resolved;
                acc = { ...acc, ...target, ...transitionEnd };
            }
            return acc;
        };
        /**
         * This just allows us to inject mocked animation functions
         * @internal
         */
        function setAnimateFunction(makeAnimator) {
            animate = makeAnimator(visualElement);
        }
        /**
         * When we receive new props, we need to:
         * 1. Create a list of protected keys for each type. This is a directory of
         *    value keys that are currently being "handled" by types of a higher priority
         *    so that whenever an animation is played of a given type, these values are
         *    protected from being animated.
         * 2. Determine if an animation type needs animating.
         * 3. Determine if any values have been removed from a type and figure out
         *    what to animate those to.
         */
        function animateChanges(changedActiveType) {
            const { props } = visualElement;
            const context = getVariantContext(visualElement.parent) || {};
            /**
             * A list of animations that we'll build into as we iterate through the animation
             * types. This will get executed at the end of the function.
             */
            const animations = [];
            /**
             * Keep track of which values have been removed. Then, as we hit lower priority
             * animation types, we can check if they contain removed values and animate to that.
             */
            const removedKeys = new Set();
            /**
             * A dictionary of all encountered keys. This is an object to let us build into and
             * copy it without iteration. Each time we hit an animation type we set its protected
             * keys - the keys its not allowed to animate - to the latest version of this object.
             */
            let encounteredKeys = {};
            /**
             * If a variant has been removed at a given index, and this component is controlling
             * variant animations, we want to ensure lower-priority variants are forced to animate.
             */
            let removedVariantIndex = Infinity;
            /**
             * Iterate through all animation types in reverse priority order. For each, we want to
             * detect which values it's handling and whether or not they've changed (and therefore
             * need to be animated). If any values have been removed, we want to detect those in
             * lower priority props and flag for animation.
             */
            for (let i = 0; i < numAnimationTypes; i++) {
                const type = reversePriorityOrder[i];
                const typeState = state[type];
                const prop = props[type] !== undefined
                    ? props[type]
                    : context[type];
                const propIsVariant = isVariantLabel(prop);
                /**
                 * If this type has *just* changed isActive status, set activeDelta
                 * to that status. Otherwise set to null.
                 */
                const activeDelta = type === changedActiveType ? typeState.isActive : null;
                if (activeDelta === false)
                    removedVariantIndex = i;
                /**
                 * If this prop is an inherited variant, rather than been set directly on the
                 * component itself, we want to make sure we allow the parent to trigger animations.
                 *
                 * TODO: Can probably change this to a !isControllingVariants check
                 */
                let isInherited = prop === context[type] &&
                    prop !== props[type] &&
                    propIsVariant;
                /**
                 *
                 */
                if (isInherited &&
                    isInitialRender &&
                    visualElement.manuallyAnimateOnMount) {
                    isInherited = false;
                }
                /**
                 * Set all encountered keys so far as the protected keys for this type. This will
                 * be any key that has been animated or otherwise handled by active, higher-priortiy types.
                 */
                typeState.protectedKeys = { ...encounteredKeys };
                // Check if we can skip analysing this prop early
                if (
                // If it isn't active and hasn't *just* been set as inactive
                (!typeState.isActive && activeDelta === null) ||
                    // If we didn't and don't have any defined prop for this animation type
                    (!prop && !typeState.prevProp) ||
                    // Or if the prop doesn't define an animation
                    isAnimationControls(prop) ||
                    typeof prop === "boolean") {
                    continue;
                }
                /**
                 * As we go look through the values defined on this type, if we detect
                 * a changed value or a value that was removed in a higher priority, we set
                 * this to true and add this prop to the animation list.
                 */
                const variantDidChange = checkVariantsDidChange(typeState.prevProp, prop);
                let shouldAnimateType = variantDidChange ||
                    // If we're making this variant active, we want to always make it active
                    (type === changedActiveType &&
                        typeState.isActive &&
                        !isInherited &&
                        propIsVariant) ||
                    // If we removed a higher-priority variant (i is in reverse order)
                    (i > removedVariantIndex && propIsVariant);
                let handledRemovedValues = false;
                /**
                 * As animations can be set as variant lists, variants or target objects, we
                 * coerce everything to an array if it isn't one already
                 */
                const definitionList = Array.isArray(prop) ? prop : [prop];
                /**
                 * Build an object of all the resolved values. We'll use this in the subsequent
                 * animateChanges calls to determine whether a value has changed.
                 */
                let resolvedValues = definitionList.reduce(buildResolvedTypeValues(type), {});
                if (activeDelta === false)
                    resolvedValues = {};
                /**
                 * Now we need to loop through all the keys in the prev prop and this prop,
                 * and decide:
                 * 1. If the value has changed, and needs animating
                 * 2. If it has been removed, and needs adding to the removedKeys set
                 * 3. If it has been removed in a higher priority type and needs animating
                 * 4. If it hasn't been removed in a higher priority but hasn't changed, and
                 *    needs adding to the type's protectedKeys list.
                 */
                const { prevResolvedValues = {} } = typeState;
                const allKeys = {
                    ...prevResolvedValues,
                    ...resolvedValues,
                };
                const markToAnimate = (key) => {
                    shouldAnimateType = true;
                    if (removedKeys.has(key)) {
                        handledRemovedValues = true;
                        removedKeys.delete(key);
                    }
                    typeState.needsAnimating[key] = true;
                    const motionValue = visualElement.getValue(key);
                    if (motionValue)
                        motionValue.liveStyle = false;
                };
                for (const key in allKeys) {
                    const next = resolvedValues[key];
                    const prev = prevResolvedValues[key];
                    // If we've already handled this we can just skip ahead
                    if (encounteredKeys.hasOwnProperty(key))
                        continue;
                    /**
                     * If the value has changed, we probably want to animate it.
                     */
                    let valueHasChanged = false;
                    if (isKeyframesTarget(next) && isKeyframesTarget(prev)) {
                        valueHasChanged = !shallowCompare(next, prev);
                    }
                    else {
                        valueHasChanged = next !== prev;
                    }
                    if (valueHasChanged) {
                        if (next !== undefined && next !== null) {
                            // If next is defined and doesn't equal prev, it needs animating
                            markToAnimate(key);
                        }
                        else {
                            // If it's undefined, it's been removed.
                            removedKeys.add(key);
                        }
                    }
                    else if (next !== undefined && removedKeys.has(key)) {
                        /**
                         * If next hasn't changed and it isn't undefined, we want to check if it's
                         * been removed by a higher priority
                         */
                        markToAnimate(key);
                    }
                    else {
                        /**
                         * If it hasn't changed, we add it to the list of protected values
                         * to ensure it doesn't get animated.
                         */
                        typeState.protectedKeys[key] = true;
                    }
                }
                /**
                 * Update the typeState so next time animateChanges is called we can compare the
                 * latest prop and resolvedValues to these.
                 */
                typeState.prevProp = prop;
                typeState.prevResolvedValues = resolvedValues;
                /**
                 *
                 */
                if (typeState.isActive) {
                    encounteredKeys = { ...encounteredKeys, ...resolvedValues };
                }
                if (isInitialRender && visualElement.blockInitialAnimation) {
                    shouldAnimateType = false;
                }
                /**
                 * If this is an inherited prop we want to skip this animation
                 * unless the inherited variants haven't changed on this render.
                 */
                const willAnimateViaParent = isInherited && variantDidChange;
                const needsAnimating = !willAnimateViaParent || handledRemovedValues;
                if (shouldAnimateType && needsAnimating) {
                    animations.push(...definitionList.map((animation) => ({
                        animation: animation,
                        options: { type },
                    })));
                }
            }
            /**
             * If there are some removed value that haven't been dealt with,
             * we need to create a new animation that falls back either to the value
             * defined in the style prop, or the last read value.
             */
            if (removedKeys.size) {
                const fallbackAnimation = {};
                removedKeys.forEach((key) => {
                    const fallbackTarget = visualElement.getBaseTarget(key);
                    const motionValue = visualElement.getValue(key);
                    if (motionValue)
                        motionValue.liveStyle = true;
                    // @ts-expect-error - @mattgperry to figure if we should do something here
                    fallbackAnimation[key] = fallbackTarget !== null && fallbackTarget !== void 0 ? fallbackTarget : null;
                });
                animations.push({ animation: fallbackAnimation });
            }
            let shouldAnimate = Boolean(animations.length);
            if (isInitialRender &&
                (props.initial === false || props.initial === props.animate) &&
                !visualElement.manuallyAnimateOnMount) {
                shouldAnimate = false;
            }
            isInitialRender = false;
            return shouldAnimate ? animate(animations) : Promise.resolve();
        }
        /**
         * Change whether a certain animation type is active.
         */
        function setActive(type, isActive) {
            var _a;
            // If the active state hasn't changed, we can safely do nothing here
            if (state[type].isActive === isActive)
                return Promise.resolve();
            // Propagate active change to children
            (_a = visualElement.variantChildren) === null || _a === void 0 ? void 0 : _a.forEach((child) => { var _a; return (_a = child.animationState) === null || _a === void 0 ? void 0 : _a.setActive(type, isActive); });
            state[type].isActive = isActive;
            const animations = animateChanges(type);
            for (const key in state) {
                state[key].protectedKeys = {};
            }
            return animations;
        }
        return {
            animateChanges,
            setActive,
            setAnimateFunction,
            getState: () => state,
            reset: () => {
                state = createState();
                isInitialRender = true;
            },
        };
    }
    function checkVariantsDidChange(prev, next) {
        if (typeof next === "string") {
            return next !== prev;
        }
        else if (Array.isArray(next)) {
            return !shallowCompare(next, prev);
        }
        return false;
    }
    function createTypeState(isActive = false) {
        return {
            isActive,
            protectedKeys: {},
            needsAnimating: {},
            prevResolvedValues: {},
        };
    }
    function createState() {
        return {
            animate: createTypeState(true),
            whileInView: createTypeState(),
            whileHover: createTypeState(),
            whileTap: createTypeState(),
            whileDrag: createTypeState(),
            whileFocus: createTypeState(),
            exit: createTypeState(),
        };
    }

    class Feature {
        constructor(node) {
            this.isMounted = false;
            this.node = node;
        }
        update() { }
    }

    class AnimationFeature extends Feature {
        /**
         * We dynamically generate the AnimationState manager as it contains a reference
         * to the underlying animation library. We only want to load that if we load this,
         * so people can optionally code split it out using the `m` component.
         */
        constructor(node) {
            super(node);
            node.animationState || (node.animationState = createAnimationState(node));
        }
        updateAnimationControlsSubscription() {
            const { animate } = this.node.getProps();
            if (isAnimationControls(animate)) {
                this.unmountControls = animate.subscribe(this.node);
            }
        }
        /**
         * Subscribe any provided AnimationControls to the component's VisualElement
         */
        mount() {
            this.updateAnimationControlsSubscription();
        }
        update() {
            const { animate } = this.node.getProps();
            const { animate: prevAnimate } = this.node.prevProps || {};
            if (animate !== prevAnimate) {
                this.updateAnimationControlsSubscription();
            }
        }
        unmount() {
            var _a;
            this.node.animationState.reset();
            (_a = this.unmountControls) === null || _a === void 0 ? void 0 : _a.call(this);
        }
    }

    let id$2 = 0;
    class ExitAnimationFeature extends Feature {
        constructor() {
            super(...arguments);
            this.id = id$2++;
        }
        update() {
            if (!this.node.presenceContext)
                return;
            const { isPresent, onExitComplete } = this.node.presenceContext;
            const { isPresent: prevIsPresent } = this.node.prevPresenceContext || {};
            if (!this.node.animationState || isPresent === prevIsPresent) {
                return;
            }
            const exitAnimation = this.node.animationState.setActive("exit", !isPresent);
            if (onExitComplete && !isPresent) {
                exitAnimation.then(() => onExitComplete(this.id));
            }
        }
        mount() {
            const { register } = this.node.presenceContext || {};
            if (register) {
                this.unmount = register(this.id);
            }
        }
        unmount() { }
    }

    const animations = {
        animation: {
            Feature: AnimationFeature,
        },
        exit: {
            Feature: ExitAnimationFeature,
        },
    };

    const MotionContext = React$1.createContext({});

    const createAxisDelta = () => ({
        translate: 0,
        scale: 1,
        origin: 0,
        originPoint: 0,
    });
    const createDelta = () => ({
        x: createAxisDelta(),
        y: createAxisDelta(),
    });
    const createAxis = () => ({ min: 0, max: 0 });
    const createBox = () => ({
        x: createAxis(),
        y: createAxis(),
    });

    const SCALE_PRECISION = 0.0001;
    const SCALE_MIN = 1 - SCALE_PRECISION;
    const SCALE_MAX = 1 + SCALE_PRECISION;
    const TRANSLATE_PRECISION = 0.01;
    const TRANSLATE_MIN = 0 - TRANSLATE_PRECISION;
    const TRANSLATE_MAX = 0 + TRANSLATE_PRECISION;
    function calcLength(axis) {
        return axis.max - axis.min;
    }
    function isNear(value, target, maxDistance) {
        return Math.abs(value - target) <= maxDistance;
    }
    function calcAxisDelta(delta, source, target, origin = 0.5) {
        delta.origin = origin;
        delta.originPoint = mixNumber$1(source.min, source.max, delta.origin);
        delta.scale = calcLength(target) / calcLength(source);
        delta.translate =
            mixNumber$1(target.min, target.max, delta.origin) - delta.originPoint;
        if ((delta.scale >= SCALE_MIN && delta.scale <= SCALE_MAX) ||
            isNaN(delta.scale)) {
            delta.scale = 1.0;
        }
        if ((delta.translate >= TRANSLATE_MIN &&
            delta.translate <= TRANSLATE_MAX) ||
            isNaN(delta.translate)) {
            delta.translate = 0.0;
        }
    }
    function calcBoxDelta(delta, source, target, origin) {
        calcAxisDelta(delta.x, source.x, target.x, origin ? origin.originX : undefined);
        calcAxisDelta(delta.y, source.y, target.y, origin ? origin.originY : undefined);
    }
    function calcRelativeAxis(target, relative, parent) {
        target.min = parent.min + relative.min;
        target.max = target.min + calcLength(relative);
    }
    function calcRelativeBox(target, relative, parent) {
        calcRelativeAxis(target.x, relative.x, parent.x);
        calcRelativeAxis(target.y, relative.y, parent.y);
    }
    function calcRelativeAxisPosition(target, layout, parent) {
        target.min = layout.min - parent.min;
        target.max = target.min + calcLength(layout);
    }
    function calcRelativePosition(target, layout, parent) {
        calcRelativeAxisPosition(target.x, layout.x, parent.x);
        calcRelativeAxisPosition(target.y, layout.y, parent.y);
    }

    /**
     * A list of all valid MotionProps.
     *
     * @privateRemarks
     * This doesn't throw if a `MotionProp` name is missing - it should.
     */
    const validMotionProps = new Set([
        "animate",
        "exit",
        "variants",
        "initial",
        "style",
        "values",
        "variants",
        "transition",
        "transformTemplate",
        "custom",
        "inherit",
        "onBeforeLayoutMeasure",
        "onAnimationStart",
        "onAnimationComplete",
        "onUpdate",
        "onDragStart",
        "onDrag",
        "onDragEnd",
        "onMeasureDragConstraints",
        "onDirectionLock",
        "onDragTransitionEnd",
        "_dragX",
        "_dragY",
        "onHoverStart",
        "onHoverEnd",
        "onViewportEnter",
        "onViewportLeave",
        "globalTapTarget",
        "ignoreStrict",
        "viewport",
    ]);
    /**
     * Check whether a prop name is a valid `MotionProp` key.
     *
     * @param key - Name of the property to check
     * @returns `true` is key is a valid `MotionProp`.
     *
     * @public
     */
    function isValidMotionProp(key) {
        return (key.startsWith("while") ||
            (key.startsWith("drag") && key !== "draggable") ||
            key.startsWith("layout") ||
            key.startsWith("onTap") ||
            key.startsWith("onPan") ||
            key.startsWith("onLayout") ||
            validMotionProps.has(key));
    }

    let shouldForward = (key) => !isValidMotionProp(key);
    function loadExternalIsValidProp(isValidProp) {
        if (!isValidProp)
            return;
        // Explicitly filter our events
        shouldForward = (key) => key.startsWith("on") ? !isValidMotionProp(key) : isValidProp(key);
    }
    /**
     * Emotion and Styled Components both allow users to pass through arbitrary props to their components
     * to dynamically generate CSS. They both use the `@emotion/is-prop-valid` package to determine which
     * of these should be passed to the underlying DOM node.
     *
     * However, when styling a Motion component `styled(motion.div)`, both packages pass through *all* props
     * as it's seen as an arbitrary component rather than a DOM node. Motion only allows arbitrary props
     * passed through the `custom` prop so it doesn't *need* the payload or computational overhead of
     * `@emotion/is-prop-valid`, however to fix this problem we need to use it.
     *
     * By making it an optionalDependency we can offer this functionality only in the situations where it's
     * actually required.
     */
    try {
        /**
         * We attempt to import this package but require won't be defined in esm environments, in that case
         * isPropValid will have to be provided via `MotionContext`. In a 6.0.0 this should probably be removed
         * in favour of explicit injection.
         */
        loadExternalIsValidProp(require("@emotion/is-prop-valid").default);
    }
    catch (_a) {
        // We don't need to actually do anything here - the fallback is the existing `isPropValid`.
    }
    function filterProps(props, isDom, forwardMotionProps) {
        const filteredProps = {};
        for (const key in props) {
            /**
             * values is considered a valid prop by Emotion, so if it's present
             * this will be rendered out to the DOM unless explicitly filtered.
             *
             * We check the type as it could be used with the `feColorMatrix`
             * element, which we support.
             */
            if (key === "values" && typeof props.values === "object")
                continue;
            if (shouldForward(key) ||
                (forwardMotionProps === true && isValidMotionProp(key)) ||
                (!isDom && !isValidMotionProp(key)) ||
                // If trying to use native HTML drag events, forward drag listeners
                (props["draggable"] &&
                    key.startsWith("onDrag"))) {
                filteredProps[key] =
                    props[key];
            }
        }
        return filteredProps;
    }

    /**
     * @public
     */
    const PresenceContext = React$1.createContext(null);

    function isControllingVariants(props) {
        return (isAnimationControls(props.animate) ||
            variantProps.some((name) => isVariantLabel(props[name])));
    }
    function isVariantNode(props) {
        return Boolean(isControllingVariants(props) || props.variants);
    }

    /**
     * Creates a constant value over the lifecycle of a component.
     *
     * Even if `useMemo` is provided an empty array as its final argument, it doesn't offer
     * a guarantee that it won't re-run for performance reasons later on. By using `useConstant`
     * you can ensure that initialisers don't execute twice or more.
     */
    function useConstant(init) {
        const ref = React$1.useRef(null);
        if (ref.current === null) {
            ref.current = init();
        }
        return ref.current;
    }

    /**
     * If the provided value is a MotionValue, this returns the actual value, otherwise just the value itself
     *
     * TODO: Remove and move to library
     */
    function resolveMotionValue(value) {
        const unwrappedValue = isMotionValue(value) ? value.get() : value;
        return isCustomValue(unwrappedValue)
            ? unwrappedValue.toValue()
            : unwrappedValue;
    }

    function makeState({ scrapeMotionValuesFromProps, createRenderState, onUpdate, }, props, context, presenceContext) {
        const state = {
            latestValues: makeLatestValues(props, context, presenceContext, scrapeMotionValuesFromProps),
            renderState: createRenderState(),
        };
        if (onUpdate) {
            /**
             * onMount works without the VisualElement because it could be
             * called before the VisualElement payload has been hydrated.
             * (e.g. if someone is using m components <m.circle />)
             */
            state.onMount = (instance) => onUpdate({ props, current: instance, ...state });
            state.onUpdate = (visualElement) => onUpdate(visualElement);
        }
        return state;
    }
    const makeUseVisualState = (config) => (props, isStatic) => {
        const context = React$1.useContext(MotionContext);
        const presenceContext = React$1.useContext(PresenceContext);
        const make = () => makeState(config, props, context, presenceContext);
        return isStatic ? make() : useConstant(make);
    };
    function makeLatestValues(props, context, presenceContext, scrapeMotionValues) {
        const values = {};
        const motionValues = scrapeMotionValues(props, {});
        for (const key in motionValues) {
            values[key] = resolveMotionValue(motionValues[key]);
        }
        let { initial, animate } = props;
        const isControllingVariants$1 = isControllingVariants(props);
        const isVariantNode$1 = isVariantNode(props);
        if (context &&
            isVariantNode$1 &&
            !isControllingVariants$1 &&
            props.inherit !== false) {
            if (initial === undefined)
                initial = context.initial;
            if (animate === undefined)
                animate = context.animate;
        }
        let isInitialAnimationBlocked = presenceContext
            ? presenceContext.initial === false
            : false;
        isInitialAnimationBlocked = isInitialAnimationBlocked || initial === false;
        const variantToSet = isInitialAnimationBlocked ? animate : initial;
        if (variantToSet &&
            typeof variantToSet !== "boolean" &&
            !isAnimationControls(variantToSet)) {
            const list = Array.isArray(variantToSet) ? variantToSet : [variantToSet];
            for (let i = 0; i < list.length; i++) {
                const resolved = resolveVariantFromProps(props, list[i]);
                if (resolved) {
                    const { transitionEnd, transition, ...target } = resolved;
                    for (const key in target) {
                        let valueTarget = target[key];
                        if (Array.isArray(valueTarget)) {
                            /**
                             * Take final keyframe if the initial animation is blocked because
                             * we want to initialise at the end of that blocked animation.
                             */
                            const index = isInitialAnimationBlocked
                                ? valueTarget.length - 1
                                : 0;
                            valueTarget = valueTarget[index];
                        }
                        if (valueTarget !== null) {
                            values[key] = valueTarget;
                        }
                    }
                    for (const key in transitionEnd) {
                        values[key] = transitionEnd[key];
                    }
                }
            }
        }
        return values;
    }

    function addDomEvent(target, eventName, handler, options = { passive: true }) {
        target.addEventListener(eventName, handler, options);
        return () => target.removeEventListener(eventName, handler);
    }

    function extractEventInfo(event) {
        return {
            point: {
                x: event.pageX,
                y: event.pageY,
            },
        };
    }
    const addPointerInfo = (handler) => {
        return (event) => isPrimaryPointer(event) && handler(event, extractEventInfo(event));
    };

    function addPointerEvent(target, eventName, handler, options) {
        return addDomEvent(target, eventName, addPointerInfo(handler), options);
    }

    const isBrowser = typeof window !== "undefined";

    function useUnmountEffect(callback) {
        return React$1.useEffect(() => () => callback(), []);
    }

    const useIsomorphicLayoutEffect = isBrowser ? React$1.useLayoutEffect : React$1.useEffect;

    function useIsMounted() {
        const isMounted = React$1.useRef(false);
        useIsomorphicLayoutEffect(() => {
            isMounted.current = true;
            return () => {
                isMounted.current = false;
            };
        }, []);
        return isMounted;
    }

    function useForceUpdate() {
        const isMounted = useIsMounted();
        const [forcedRenderCount, setForcedRenderCount] = React$1.useState(0);
        const forceRender = React$1.useCallback(() => {
            isMounted.current && setForcedRenderCount(forcedRenderCount + 1);
        }, [forcedRenderCount]);
        /**
         * Defer this to the end of the next animation frame in case there are multiple
         * synchronous calls.
         */
        const deferredForceRender = React$1.useCallback(() => frame.postRender(forceRender), [forceRender]);
        return [deferredForceRender, forcedRenderCount];
    }

    /**
     * @public
     */
    const MotionConfigContext = React$1.createContext({
        transformPagePoint: (p) => p,
        isStatic: false,
        reducedMotion: "never",
    });

    /**
     * Measurement functionality has to be within a separate component
     * to leverage snapshot lifecycle.
     */
    class PopChildMeasure extends React__namespace.Component {
        getSnapshotBeforeUpdate(prevProps) {
            const element = this.props.childRef.current;
            if (element && prevProps.isPresent && !this.props.isPresent) {
                const size = this.props.sizeRef.current;
                size.height = element.offsetHeight || 0;
                size.width = element.offsetWidth || 0;
                size.top = element.offsetTop;
                size.left = element.offsetLeft;
            }
            return null;
        }
        /**
         * Required with getSnapshotBeforeUpdate to stop React complaining.
         */
        componentDidUpdate() { }
        render() {
            return this.props.children;
        }
    }
    function PopChild({ children, isPresent }) {
        const id = React$1.useId();
        const ref = React$1.useRef(null);
        const size = React$1.useRef({
            width: 0,
            height: 0,
            top: 0,
            left: 0,
        });
        const { nonce } = React$1.useContext(MotionConfigContext);
        /**
         * We create and inject a style block so we can apply this explicit
         * sizing in a non-destructive manner by just deleting the style block.
         *
         * We can't apply size via render as the measurement happens
         * in getSnapshotBeforeUpdate (post-render), likewise if we apply the
         * styles directly on the DOM node, we might be overwriting
         * styles set via the style prop.
         */
        React$1.useInsertionEffect(() => {
            const { width, height, top, left } = size.current;
            if (isPresent || !ref.current || !width || !height)
                return;
            ref.current.dataset.motionPopId = id;
            const style = document.createElement("style");
            if (nonce)
                style.nonce = nonce;
            document.head.appendChild(style);
            if (style.sheet) {
                style.sheet.insertRule(`
          [data-motion-pop-id="${id}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            top: ${top}px !important;
            left: ${left}px !important;
          }
        `);
            }
            return () => {
                document.head.removeChild(style);
            };
        }, [isPresent]);
        return (jsx(PopChildMeasure, { isPresent: isPresent, childRef: ref, sizeRef: size, children: React__namespace.cloneElement(children, { ref }) }));
    }

    const PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode, }) => {
        const presenceChildren = useConstant(newChildrenMap);
        const id = React$1.useId();
        const memoizedOnExitComplete = React$1.useCallback((childId) => {
            presenceChildren.set(childId, true);
            for (const isComplete of presenceChildren.values()) {
                if (!isComplete)
                    return; // can stop searching when any is incomplete
            }
            onExitComplete && onExitComplete();
        }, [presenceChildren, onExitComplete]);
        const context = React$1.useMemo(() => ({
            id,
            initial,
            isPresent,
            custom,
            onExitComplete: memoizedOnExitComplete,
            register: (childId) => {
                presenceChildren.set(childId, false);
                return () => presenceChildren.delete(childId);
            },
        }), 
        /**
         * If the presence of a child affects the layout of the components around it,
         * we want to make a new context value to ensure they get re-rendered
         * so they can detect that layout change.
         */
        presenceAffectsLayout
            ? [Math.random(), memoizedOnExitComplete]
            : [isPresent, memoizedOnExitComplete]);
        React$1.useMemo(() => {
            presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
        }, [isPresent]);
        /**
         * If there's no `motion` components to fire exit animations, we want to remove this
         * component immediately.
         */
        React__namespace.useEffect(() => {
            !isPresent &&
                !presenceChildren.size &&
                onExitComplete &&
                onExitComplete();
        }, [isPresent]);
        if (mode === "popLayout") {
            children = jsx(PopChild, { isPresent: isPresent, children: children });
        }
        return (jsx(PresenceContext.Provider, { value: context, children: children }));
    };
    function newChildrenMap() {
        return new Map();
    }

    /**
     * When a component is the child of `AnimatePresence`, it can use `usePresence`
     * to access information about whether it's still present in the React tree.
     *
     * ```jsx
     * import { usePresence } from "framer-motion"
     *
     * export const Component = () => {
     *   const [isPresent, safeToRemove] = usePresence()
     *
     *   useEffect(() => {
     *     !isPresent && setTimeout(safeToRemove, 1000)
     *   }, [isPresent])
     *
     *   return <div />
     * }
     * ```
     *
     * If `isPresent` is `false`, it means that a component has been removed the tree, but
     * `AnimatePresence` won't really remove it until `safeToRemove` has been called.
     *
     * @public
     */
    function usePresence(subscribe = true) {
        const context = React$1.useContext(PresenceContext);
        if (context === null)
            return [true, null];
        const { isPresent, onExitComplete, register } = context;
        // It's safe to call the following hooks conditionally (after an early return) because the context will always
        // either be null or non-null for the lifespan of the component.
        const id = React$1.useId();
        React$1.useEffect(() => {
            if (subscribe)
                register(id);
        }, [subscribe]);
        const safeToRemove = React$1.useCallback(() => subscribe && onExitComplete && onExitComplete(id), [id, onExitComplete, subscribe]);
        return !isPresent && onExitComplete ? [false, safeToRemove] : [true];
    }
    /**
     * Similar to `usePresence`, except `useIsPresent` simply returns whether or not the component is present.
     * There is no `safeToRemove` function.
     *
     * ```jsx
     * import { useIsPresent } from "framer-motion"
     *
     * export const Component = () => {
     *   const isPresent = useIsPresent()
     *
     *   useEffect(() => {
     *     !isPresent && console.log("I've been removed!")
     *   }, [isPresent])
     *
     *   return <div />
     * }
     * ```
     *
     * @public
     */
    function useIsPresent() {
        return isPresent(React$1.useContext(PresenceContext));
    }
    function isPresent(context) {
        return context === null ? true : context.isPresent;
    }

    const getChildKey = (child) => child.key || "";
    function onlyElements(children) {
        const filtered = [];
        // We use forEach here instead of map as map mutates the component key by preprending `.$`
        React$1.Children.forEach(children, (child) => {
            if (React$1.isValidElement(child))
                filtered.push(child);
        });
        return filtered;
    }

    /**
     * `AnimatePresence` enables the animation of components that have been removed from the tree.
     *
     * When adding/removing more than a single child, every child **must** be given a unique `key` prop.
     *
     * Any `motion` components that have an `exit` property defined will animate out when removed from
     * the tree.
     *
     * ```jsx
     * import { motion, AnimatePresence } from 'framer-motion'
     *
     * export const Items = ({ items }) => (
     *   <AnimatePresence>
     *     {items.map(item => (
     *       <motion.div
     *         key={item.id}
     *         initial={{ opacity: 0 }}
     *         animate={{ opacity: 1 }}
     *         exit={{ opacity: 0 }}
     *       />
     *     ))}
     *   </AnimatePresence>
     * )
     * ```
     *
     * You can sequence exit animations throughout a tree using variants.
     *
     * If a child contains multiple `motion` components with `exit` props, it will only unmount the child
     * once all `motion` components have finished animating out. Likewise, any components using
     * `usePresence` all need to call `safeToRemove`.
     *
     * @public
     */
    const AnimatePresence = ({ children, custom, initial = true, onExitComplete, presenceAffectsLayout = true, mode = "sync", propagate = false, }) => {
        const [isParentPresent, safeToRemove] = usePresence(propagate);
        /**
         * Filter any children that aren't ReactElements. We can only track components
         * between renders with a props.key.
         */
        const presentChildren = React$1.useMemo(() => onlyElements(children), [children]);
        /**
         * Track the keys of the currently rendered children. This is used to
         * determine which children are exiting.
         */
        const presentKeys = propagate && !isParentPresent ? [] : presentChildren.map(getChildKey);
        /**
         * If `initial={false}` we only want to pass this to components in the first render.
         */
        const isInitialRender = React$1.useRef(true);
        /**
         * A ref containing the currently present children. When all exit animations
         * are complete, we use this to re-render the component with the latest children
         * *committed* rather than the latest children *rendered*.
         */
        const pendingPresentChildren = React$1.useRef(presentChildren);
        /**
         * Track which exiting children have finished animating out.
         */
        const exitComplete = useConstant(() => new Map());
        /**
         * Save children to render as React state. To ensure this component is concurrent-safe,
         * we check for exiting children via an effect.
         */
        const [diffedChildren, setDiffedChildren] = React$1.useState(presentChildren);
        const [renderedChildren, setRenderedChildren] = React$1.useState(presentChildren);
        useIsomorphicLayoutEffect(() => {
            isInitialRender.current = false;
            pendingPresentChildren.current = presentChildren;
            /**
             * Update complete status of exiting children.
             */
            for (let i = 0; i < renderedChildren.length; i++) {
                const key = getChildKey(renderedChildren[i]);
                if (!presentKeys.includes(key)) {
                    if (exitComplete.get(key) !== true) {
                        exitComplete.set(key, false);
                    }
                }
                else {
                    exitComplete.delete(key);
                }
            }
        }, [renderedChildren, presentKeys.length, presentKeys.join("-")]);
        const exitingChildren = [];
        if (presentChildren !== diffedChildren) {
            let nextChildren = [...presentChildren];
            /**
             * Loop through all the currently rendered components and decide which
             * are exiting.
             */
            for (let i = 0; i < renderedChildren.length; i++) {
                const child = renderedChildren[i];
                const key = getChildKey(child);
                if (!presentKeys.includes(key)) {
                    nextChildren.splice(i, 0, child);
                    exitingChildren.push(child);
                }
            }
            /**
             * If we're in "wait" mode, and we have exiting children, we want to
             * only render these until they've all exited.
             */
            if (mode === "wait" && exitingChildren.length) {
                nextChildren = exitingChildren;
            }
            setRenderedChildren(onlyElements(nextChildren));
            setDiffedChildren(presentChildren);
            /**
             * Early return to ensure once we've set state with the latest diffed
             * children, we can immediately re-render.
             */
            return;
        }
        if (mode === "wait" &&
            renderedChildren.length > 1) {
            console.warn(`You're attempting to animate multiple children within AnimatePresence, but its mode is set to "wait". This will lead to odd visual behaviour.`);
        }
        /**
         * If we've been provided a forceRender function by the LayoutGroupContext,
         * we can use it to force a re-render amongst all surrounding components once
         * all components have finished animating out.
         */
        const { forceRender } = React$1.useContext(LayoutGroupContext);
        return (jsx(Fragment, { children: renderedChildren.map((child) => {
                const key = getChildKey(child);
                const isPresent = propagate && !isParentPresent
                    ? false
                    : presentChildren === renderedChildren ||
                        presentKeys.includes(key);
                const onExit = () => {
                    if (exitComplete.has(key)) {
                        exitComplete.set(key, true);
                    }
                    else {
                        return;
                    }
                    let isEveryExitComplete = true;
                    exitComplete.forEach((isExitComplete) => {
                        if (!isExitComplete)
                            isEveryExitComplete = false;
                    });
                    if (isEveryExitComplete) {
                        forceRender === null || forceRender === void 0 ? void 0 : forceRender();
                        setRenderedChildren(pendingPresentChildren.current);
                        propagate && (safeToRemove === null || safeToRemove === void 0 ? void 0 : safeToRemove());
                        onExitComplete && onExitComplete();
                    }
                };
                return (jsx(PresenceChild, { isPresent: isPresent, initial: !isInitialRender.current || initial
                        ? undefined
                        : false, custom: isPresent ? undefined : custom, presenceAffectsLayout: presenceAffectsLayout, mode: mode, onExitComplete: isPresent ? undefined : onExit, children: child }, key));
            }) }));
    };

    /**
     * Note: Still used by components generated by old versions of Framer
     *
     * @deprecated
     */
    const DeprecatedLayoutGroupContext = React$1.createContext(null);

    function animateSingleValue(value, keyframes, options) {
        const motionValue$1 = isMotionValue(value) ? value : motionValue(value);
        motionValue$1.start(animateMotionValue("", motionValue$1, keyframes, options));
        return motionValue$1.animation;
    }

    const wrap = (min, max, v) => {
        const rangeSize = max - min;
        return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
    };

    function getEasingForSegment(easing, i) {
        return isEasingArray(easing) ? easing[wrap(0, easing.length, i)] : easing;
    }

    function isDOMKeyframes(keyframes) {
        return typeof keyframes === "object" && !Array.isArray(keyframes);
    }

    function resolveSubjects(subject, keyframes, scope, selectorCache) {
        if (typeof subject === "string" && isDOMKeyframes(keyframes)) {
            return resolveElements(subject, scope, selectorCache);
        }
        else if (subject instanceof NodeList) {
            return Array.from(subject);
        }
        else if (Array.isArray(subject)) {
            return subject;
        }
        else {
            return [subject];
        }
    }

    function calculateRepeatDuration(duration, repeat, _repeatDelay) {
        return duration * (repeat + 1);
    }

    /**
     * Given a absolute or relative time definition and current/prev time state of the sequence,
     * calculate an absolute time for the next keyframes.
     */
    function calcNextTime(current, next, prev, labels) {
        var _a;
        if (typeof next === "number") {
            return next;
        }
        else if (next.startsWith("-") || next.startsWith("+")) {
            return Math.max(0, current + parseFloat(next));
        }
        else if (next === "<") {
            return prev;
        }
        else {
            return (_a = labels.get(next)) !== null && _a !== void 0 ? _a : current;
        }
    }

    function eraseKeyframes(sequence, startTime, endTime) {
        for (let i = 0; i < sequence.length; i++) {
            const keyframe = sequence[i];
            if (keyframe.at > startTime && keyframe.at < endTime) {
                removeItem(sequence, keyframe);
                // If we remove this item we have to push the pointer back one
                i--;
            }
        }
    }
    function addKeyframes(sequence, keyframes, easing, offset, startTime, endTime) {
        /**
         * Erase every existing value between currentTime and targetTime,
         * this will essentially splice this timeline into any currently
         * defined ones.
         */
        eraseKeyframes(sequence, startTime, endTime);
        for (let i = 0; i < keyframes.length; i++) {
            sequence.push({
                value: keyframes[i],
                at: mixNumber$1(startTime, endTime, offset[i]),
                easing: getEasingForSegment(easing, i),
            });
        }
    }

    /**
     * Take an array of times that represent repeated keyframes. For instance
     * if we have original times of [0, 0.5, 1] then our repeated times will
     * be [0, 0.5, 1, 1, 1.5, 2]. Loop over the times and scale them back
     * down to a 0-1 scale.
     */
    function normalizeTimes(times, repeat) {
        for (let i = 0; i < times.length; i++) {
            times[i] = times[i] / (repeat + 1);
        }
    }

    function compareByTime(a, b) {
        if (a.at === b.at) {
            if (a.value === null)
                return 1;
            if (b.value === null)
                return -1;
            return 0;
        }
        else {
            return a.at - b.at;
        }
    }

    const defaultSegmentEasing = "easeInOut";
    const MAX_REPEAT = 20;
    function createAnimationsFromSequence(sequence, { defaultTransition = {}, ...sequenceTransition } = {}, scope, generators) {
        const defaultDuration = defaultTransition.duration || 0.3;
        const animationDefinitions = new Map();
        const sequences = new Map();
        const elementCache = {};
        const timeLabels = new Map();
        let prevTime = 0;
        let currentTime = 0;
        let totalDuration = 0;
        /**
         * Build the timeline by mapping over the sequence array and converting
         * the definitions into keyframes and offsets with absolute time values.
         * These will later get converted into relative offsets in a second pass.
         */
        for (let i = 0; i < sequence.length; i++) {
            const segment = sequence[i];
            /**
             * If this is a timeline label, mark it and skip the rest of this iteration.
             */
            if (typeof segment === "string") {
                timeLabels.set(segment, currentTime);
                continue;
            }
            else if (!Array.isArray(segment)) {
                timeLabels.set(segment.name, calcNextTime(currentTime, segment.at, prevTime, timeLabels));
                continue;
            }
            let [subject, keyframes, transition = {}] = segment;
            /**
             * If a relative or absolute time value has been specified we need to resolve
             * it in relation to the currentTime.
             */
            if (transition.at !== undefined) {
                currentTime = calcNextTime(currentTime, transition.at, prevTime, timeLabels);
            }
            /**
             * Keep track of the maximum duration in this definition. This will be
             * applied to currentTime once the definition has been parsed.
             */
            let maxDuration = 0;
            const resolveValueSequence = (valueKeyframes, valueTransition, valueSequence, elementIndex = 0, numSubjects = 0) => {
                const valueKeyframesAsList = keyframesAsList(valueKeyframes);
                const { delay = 0, times = defaultOffset$1(valueKeyframesAsList), type = "keyframes", repeat, repeatType, repeatDelay = 0, ...remainingTransition } = valueTransition;
                let { ease = defaultTransition.ease || "easeOut", duration } = valueTransition;
                /**
                 * Resolve stagger() if defined.
                 */
                const calculatedDelay = typeof delay === "function"
                    ? delay(elementIndex, numSubjects)
                    : delay;
                /**
                 * If this animation should and can use a spring, generate a spring easing function.
                 */
                const numKeyframes = valueKeyframesAsList.length;
                const createGenerator = isGenerator(type)
                    ? type
                    : generators === null || generators === void 0 ? void 0 : generators[type];
                if (numKeyframes <= 2 && createGenerator) {
                    /**
                     * As we're creating an easing function from a spring,
                     * ideally we want to generate it using the real distance
                     * between the two keyframes. However this isn't always
                     * possible - in these situations we use 0-100.
                     */
                    let absoluteDelta = 100;
                    if (numKeyframes === 2 &&
                        isNumberKeyframesArray(valueKeyframesAsList)) {
                        const delta = valueKeyframesAsList[1] - valueKeyframesAsList[0];
                        absoluteDelta = Math.abs(delta);
                    }
                    const springTransition = { ...remainingTransition };
                    if (duration !== undefined) {
                        springTransition.duration = secondsToMilliseconds(duration);
                    }
                    const springEasing = createGeneratorEasing(springTransition, absoluteDelta, createGenerator);
                    ease = springEasing.ease;
                    duration = springEasing.duration;
                }
                duration !== null && duration !== void 0 ? duration : (duration = defaultDuration);
                const startTime = currentTime + calculatedDelay;
                /**
                 * If there's only one time offset of 0, fill in a second with length 1
                 */
                if (times.length === 1 && times[0] === 0) {
                    times[1] = 1;
                }
                /**
                 * Fill out if offset if fewer offsets than keyframes
                 */
                const remainder = times.length - valueKeyframesAsList.length;
                remainder > 0 && fillOffset(times, remainder);
                /**
                 * If only one value has been set, ie [1], push a null to the start of
                 * the keyframe array. This will let us mark a keyframe at this point
                 * that will later be hydrated with the previous value.
                 */
                valueKeyframesAsList.length === 1 &&
                    valueKeyframesAsList.unshift(null);
                /**
                 * Handle repeat options
                 */
                if (repeat) {
                    exports.invariant(repeat < MAX_REPEAT, "Repeat count too high, must be less than 20");
                    duration = calculateRepeatDuration(duration, repeat);
                    const originalKeyframes = [...valueKeyframesAsList];
                    const originalTimes = [...times];
                    ease = Array.isArray(ease) ? [...ease] : [ease];
                    const originalEase = [...ease];
                    for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex++) {
                        valueKeyframesAsList.push(...originalKeyframes);
                        for (let keyframeIndex = 0; keyframeIndex < originalKeyframes.length; keyframeIndex++) {
                            times.push(originalTimes[keyframeIndex] + (repeatIndex + 1));
                            ease.push(keyframeIndex === 0
                                ? "linear"
                                : getEasingForSegment(originalEase, keyframeIndex - 1));
                        }
                    }
                    normalizeTimes(times, repeat);
                }
                const targetTime = startTime + duration;
                /**
                 * Add keyframes, mapping offsets to absolute time.
                 */
                addKeyframes(valueSequence, valueKeyframesAsList, ease, times, startTime, targetTime);
                maxDuration = Math.max(calculatedDelay + duration, maxDuration);
                totalDuration = Math.max(targetTime, totalDuration);
            };
            if (isMotionValue(subject)) {
                const subjectSequence = getSubjectSequence(subject, sequences);
                resolveValueSequence(keyframes, transition, getValueSequence("default", subjectSequence));
            }
            else {
                const subjects = resolveSubjects(subject, keyframes, scope, elementCache);
                const numSubjects = subjects.length;
                /**
                 * For every element in this segment, process the defined values.
                 */
                for (let subjectIndex = 0; subjectIndex < numSubjects; subjectIndex++) {
                    /**
                     * Cast necessary, but we know these are of this type
                     */
                    keyframes = keyframes;
                    transition = transition;
                    const thisSubject = subjects[subjectIndex];
                    const subjectSequence = getSubjectSequence(thisSubject, sequences);
                    for (const key in keyframes) {
                        resolveValueSequence(keyframes[key], getValueTransition(transition, key), getValueSequence(key, subjectSequence), subjectIndex, numSubjects);
                    }
                }
            }
            prevTime = currentTime;
            currentTime += maxDuration;
        }
        /**
         * For every element and value combination create a new animation.
         */
        sequences.forEach((valueSequences, element) => {
            for (const key in valueSequences) {
                const valueSequence = valueSequences[key];
                /**
                 * Arrange all the keyframes in ascending time order.
                 */
                valueSequence.sort(compareByTime);
                const keyframes = [];
                const valueOffset = [];
                const valueEasing = [];
                /**
                 * For each keyframe, translate absolute times into
                 * relative offsets based on the total duration of the timeline.
                 */
                for (let i = 0; i < valueSequence.length; i++) {
                    const { at, value, easing } = valueSequence[i];
                    keyframes.push(value);
                    valueOffset.push(progress(0, totalDuration, at));
                    valueEasing.push(easing || "easeOut");
                }
                /**
                 * If the first keyframe doesn't land on offset: 0
                 * provide one by duplicating the initial keyframe. This ensures
                 * it snaps to the first keyframe when the animation starts.
                 */
                if (valueOffset[0] !== 0) {
                    valueOffset.unshift(0);
                    keyframes.unshift(keyframes[0]);
                    valueEasing.unshift(defaultSegmentEasing);
                }
                /**
                 * If the last keyframe doesn't land on offset: 1
                 * provide one with a null wildcard value. This will ensure it
                 * stays static until the end of the animation.
                 */
                if (valueOffset[valueOffset.length - 1] !== 1) {
                    valueOffset.push(1);
                    keyframes.push(null);
                }
                if (!animationDefinitions.has(element)) {
                    animationDefinitions.set(element, {
                        keyframes: {},
                        transition: {},
                    });
                }
                const definition = animationDefinitions.get(element);
                definition.keyframes[key] = keyframes;
                definition.transition[key] = {
                    ...defaultTransition,
                    duration: totalDuration,
                    ease: valueEasing,
                    times: valueOffset,
                    ...sequenceTransition,
                };
            }
        });
        return animationDefinitions;
    }
    function getSubjectSequence(subject, sequences) {
        !sequences.has(subject) && sequences.set(subject, {});
        return sequences.get(subject);
    }
    function getValueSequence(name, sequences) {
        if (!sequences[name])
            sequences[name] = [];
        return sequences[name];
    }
    function keyframesAsList(keyframes) {
        return Array.isArray(keyframes) ? keyframes : [keyframes];
    }
    function getValueTransition(transition, key) {
        return transition && transition[key]
            ? {
                ...transition,
                ...transition[key],
            }
            : { ...transition };
    }
    const isNumber = (keyframe) => typeof keyframe === "number";
    const isNumberKeyframesArray = (keyframes) => keyframes.every(isNumber);

    const visualElementStore = new WeakMap();

    function isSVGElement(element) {
        return element instanceof SVGElement && element.tagName !== "svg";
    }

    const featureProps = {
        animation: [
            "animate",
            "variants",
            "whileHover",
            "whileTap",
            "exit",
            "whileInView",
            "whileFocus",
            "whileDrag",
        ],
        exit: ["exit"],
        drag: ["drag", "dragControls"],
        focus: ["whileFocus"],
        hover: ["whileHover", "onHoverStart", "onHoverEnd"],
        tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
        pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
        inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
        layout: ["layout", "layoutId"],
    };
    const featureDefinitions = {};
    for (const key in featureProps) {
        featureDefinitions[key] = {
            isEnabled: (props) => featureProps[key].some((name) => !!props[name]),
        };
    }

    // Does this device prefer reduced motion? Returns `null` server-side.
    const prefersReducedMotion = { current: null };
    const hasReducedMotionListener = { current: false };

    function initPrefersReducedMotion() {
        hasReducedMotionListener.current = true;
        if (!isBrowser)
            return;
        if (window.matchMedia) {
            const motionMediaQuery = window.matchMedia("(prefers-reduced-motion)");
            const setReducedMotionPreferences = () => (prefersReducedMotion.current = motionMediaQuery.matches);
            motionMediaQuery.addListener(setReducedMotionPreferences);
            setReducedMotionPreferences();
        }
        else {
            prefersReducedMotion.current = false;
        }
    }

    /**
     * A list of all ValueTypes
     */
    const valueTypes = [...dimensionValueTypes, color, complex];
    /**
     * Tests a value against the list of ValueTypes
     */
    const findValueType = (v) => valueTypes.find(testValueType(v));

    function updateMotionValuesFromProps(element, next, prev) {
        for (const key in next) {
            const nextValue = next[key];
            const prevValue = prev[key];
            if (isMotionValue(nextValue)) {
                /**
                 * If this is a motion value found in props or style, we want to add it
                 * to our visual element's motion value map.
                 */
                element.addValue(key, nextValue);
                /**
                 * Check the version of the incoming motion value with this version
                 * and warn against mismatches.
                 */
                {
                    warnOnce(nextValue.version === "11.18.2", `Attempting to mix Motion versions ${nextValue.version} with 11.18.2 may not work as expected.`);
                }
            }
            else if (isMotionValue(prevValue)) {
                /**
                 * If we're swapping from a motion value to a static value,
                 * create a new motion value from that
                 */
                element.addValue(key, motionValue(nextValue, { owner: element }));
            }
            else if (prevValue !== nextValue) {
                /**
                 * If this is a flat value that has changed, update the motion value
                 * or create one if it doesn't exist. We only want to do this if we're
                 * not handling the value with our animation state.
                 */
                if (element.hasValue(key)) {
                    const existingValue = element.getValue(key);
                    if (existingValue.liveStyle === true) {
                        existingValue.jump(nextValue);
                    }
                    else if (!existingValue.hasAnimated) {
                        existingValue.set(nextValue);
                    }
                }
                else {
                    const latestValue = element.getStaticValue(key);
                    element.addValue(key, motionValue(latestValue !== undefined ? latestValue : nextValue, { owner: element }));
                }
            }
        }
        // Handle removed values
        for (const key in prev) {
            if (next[key] === undefined)
                element.removeValue(key);
        }
        return next;
    }

    const propEventHandlers = [
        "AnimationStart",
        "AnimationComplete",
        "Update",
        "BeforeLayoutMeasure",
        "LayoutMeasure",
        "LayoutAnimationStart",
        "LayoutAnimationComplete",
    ];
    /**
     * A VisualElement is an imperative abstraction around UI elements such as
     * HTMLElement, SVGElement, Three.Object3D etc.
     */
    class VisualElement {
        /**
         * This method takes React props and returns found MotionValues. For example, HTML
         * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
         *
         * This isn't an abstract method as it needs calling in the constructor, but it is
         * intended to be one.
         */
        scrapeMotionValuesFromProps(_props, _prevProps, _visualElement) {
            return {};
        }
        constructor({ parent, props, presenceContext, reducedMotionConfig, blockInitialAnimation, visualState, }, options = {}) {
            /**
             * A reference to the current underlying Instance, e.g. a HTMLElement
             * or Three.Mesh etc.
             */
            this.current = null;
            /**
             * A set containing references to this VisualElement's children.
             */
            this.children = new Set();
            /**
             * Determine what role this visual element should take in the variant tree.
             */
            this.isVariantNode = false;
            this.isControllingVariants = false;
            /**
             * Decides whether this VisualElement should animate in reduced motion
             * mode.
             *
             * TODO: This is currently set on every individual VisualElement but feels
             * like it could be set globally.
             */
            this.shouldReduceMotion = null;
            /**
             * A map of all motion values attached to this visual element. Motion
             * values are source of truth for any given animated value. A motion
             * value might be provided externally by the component via props.
             */
            this.values = new Map();
            this.KeyframeResolver = KeyframeResolver;
            /**
             * Cleanup functions for active features (hover/tap/exit etc)
             */
            this.features = {};
            /**
             * A map of every subscription that binds the provided or generated
             * motion values onChange listeners to this visual element.
             */
            this.valueSubscriptions = new Map();
            /**
             * A reference to the previously-provided motion values as returned
             * from scrapeMotionValuesFromProps. We use the keys in here to determine
             * if any motion values need to be removed after props are updated.
             */
            this.prevMotionValues = {};
            /**
             * An object containing a SubscriptionManager for each active event.
             */
            this.events = {};
            /**
             * An object containing an unsubscribe function for each prop event subscription.
             * For example, every "Update" event can have multiple subscribers via
             * VisualElement.on(), but only one of those can be defined via the onUpdate prop.
             */
            this.propEventSubscriptions = {};
            this.notifyUpdate = () => this.notify("Update", this.latestValues);
            this.render = () => {
                if (!this.current)
                    return;
                this.triggerBuild();
                this.renderInstance(this.current, this.renderState, this.props.style, this.projection);
            };
            this.renderScheduledAt = 0.0;
            this.scheduleRender = () => {
                const now = time.now();
                if (this.renderScheduledAt < now) {
                    this.renderScheduledAt = now;
                    frame.render(this.render, false, true);
                }
            };
            const { latestValues, renderState, onUpdate } = visualState;
            this.onUpdate = onUpdate;
            this.latestValues = latestValues;
            this.baseTarget = { ...latestValues };
            this.initialValues = props.initial ? { ...latestValues } : {};
            this.renderState = renderState;
            this.parent = parent;
            this.props = props;
            this.presenceContext = presenceContext;
            this.depth = parent ? parent.depth + 1 : 0;
            this.reducedMotionConfig = reducedMotionConfig;
            this.options = options;
            this.blockInitialAnimation = Boolean(blockInitialAnimation);
            this.isControllingVariants = isControllingVariants(props);
            this.isVariantNode = isVariantNode(props);
            if (this.isVariantNode) {
                this.variantChildren = new Set();
            }
            this.manuallyAnimateOnMount = Boolean(parent && parent.current);
            /**
             * Any motion values that are provided to the element when created
             * aren't yet bound to the element, as this would technically be impure.
             * However, we iterate through the motion values and set them to the
             * initial values for this component.
             *
             * TODO: This is impure and we should look at changing this to run on mount.
             * Doing so will break some tests but this isn't necessarily a breaking change,
             * more a reflection of the test.
             */
            const { willChange, ...initialMotionValues } = this.scrapeMotionValuesFromProps(props, {}, this);
            for (const key in initialMotionValues) {
                const value = initialMotionValues[key];
                if (latestValues[key] !== undefined && isMotionValue(value)) {
                    value.set(latestValues[key], false);
                }
            }
        }
        mount(instance) {
            this.current = instance;
            visualElementStore.set(instance, this);
            if (this.projection && !this.projection.instance) {
                this.projection.mount(instance);
            }
            if (this.parent && this.isVariantNode && !this.isControllingVariants) {
                this.removeFromVariantTree = this.parent.addVariantChild(this);
            }
            this.values.forEach((value, key) => this.bindToMotionValue(key, value));
            if (!hasReducedMotionListener.current) {
                initPrefersReducedMotion();
            }
            this.shouldReduceMotion =
                this.reducedMotionConfig === "never"
                    ? false
                    : this.reducedMotionConfig === "always"
                        ? true
                        : prefersReducedMotion.current;
            {
                warnOnce(this.shouldReduceMotion !== true, "You have Reduced Motion enabled on your device. Animations may not appear as expected.");
            }
            if (this.parent)
                this.parent.children.add(this);
            this.update(this.props, this.presenceContext);
        }
        unmount() {
            visualElementStore.delete(this.current);
            this.projection && this.projection.unmount();
            cancelFrame(this.notifyUpdate);
            cancelFrame(this.render);
            this.valueSubscriptions.forEach((remove) => remove());
            this.valueSubscriptions.clear();
            this.removeFromVariantTree && this.removeFromVariantTree();
            this.parent && this.parent.children.delete(this);
            for (const key in this.events) {
                this.events[key].clear();
            }
            for (const key in this.features) {
                const feature = this.features[key];
                if (feature) {
                    feature.unmount();
                    feature.isMounted = false;
                }
            }
            this.current = null;
        }
        bindToMotionValue(key, value) {
            if (this.valueSubscriptions.has(key)) {
                this.valueSubscriptions.get(key)();
            }
            const valueIsTransform = transformProps.has(key);
            const removeOnChange = value.on("change", (latestValue) => {
                this.latestValues[key] = latestValue;
                this.props.onUpdate && frame.preRender(this.notifyUpdate);
                if (valueIsTransform && this.projection) {
                    this.projection.isTransformDirty = true;
                }
            });
            const removeOnRenderRequest = value.on("renderRequest", this.scheduleRender);
            let removeSyncCheck;
            if (window.MotionCheckAppearSync) {
                removeSyncCheck = window.MotionCheckAppearSync(this, key, value);
            }
            this.valueSubscriptions.set(key, () => {
                removeOnChange();
                removeOnRenderRequest();
                if (removeSyncCheck)
                    removeSyncCheck();
                if (value.owner)
                    value.stop();
            });
        }
        sortNodePosition(other) {
            /**
             * If these nodes aren't even of the same type we can't compare their depth.
             */
            if (!this.current ||
                !this.sortInstanceNodePosition ||
                this.type !== other.type) {
                return 0;
            }
            return this.sortInstanceNodePosition(this.current, other.current);
        }
        updateFeatures() {
            let key = "animation";
            for (key in featureDefinitions) {
                const featureDefinition = featureDefinitions[key];
                if (!featureDefinition)
                    continue;
                const { isEnabled, Feature: FeatureConstructor } = featureDefinition;
                /**
                 * If this feature is enabled but not active, make a new instance.
                 */
                if (!this.features[key] &&
                    FeatureConstructor &&
                    isEnabled(this.props)) {
                    this.features[key] = new FeatureConstructor(this);
                }
                /**
                 * If we have a feature, mount or update it.
                 */
                if (this.features[key]) {
                    const feature = this.features[key];
                    if (feature.isMounted) {
                        feature.update();
                    }
                    else {
                        feature.mount();
                        feature.isMounted = true;
                    }
                }
            }
        }
        triggerBuild() {
            this.build(this.renderState, this.latestValues, this.props);
        }
        /**
         * Measure the current viewport box with or without transforms.
         * Only measures axis-aligned boxes, rotate and skew must be manually
         * removed with a re-render to work.
         */
        measureViewportBox() {
            return this.current
                ? this.measureInstanceViewportBox(this.current, this.props)
                : createBox();
        }
        getStaticValue(key) {
            return this.latestValues[key];
        }
        setStaticValue(key, value) {
            this.latestValues[key] = value;
        }
        /**
         * Update the provided props. Ensure any newly-added motion values are
         * added to our map, old ones removed, and listeners updated.
         */
        update(props, presenceContext) {
            if (props.transformTemplate || this.props.transformTemplate) {
                this.scheduleRender();
            }
            this.prevProps = this.props;
            this.props = props;
            this.prevPresenceContext = this.presenceContext;
            this.presenceContext = presenceContext;
            /**
             * Update prop event handlers ie onAnimationStart, onAnimationComplete
             */
            for (let i = 0; i < propEventHandlers.length; i++) {
                const key = propEventHandlers[i];
                if (this.propEventSubscriptions[key]) {
                    this.propEventSubscriptions[key]();
                    delete this.propEventSubscriptions[key];
                }
                const listenerName = ("on" + key);
                const listener = props[listenerName];
                if (listener) {
                    this.propEventSubscriptions[key] = this.on(key, listener);
                }
            }
            this.prevMotionValues = updateMotionValuesFromProps(this, this.scrapeMotionValuesFromProps(props, this.prevProps, this), this.prevMotionValues);
            if (this.handleChildMotionValue) {
                this.handleChildMotionValue();
            }
            this.onUpdate && this.onUpdate(this);
        }
        getProps() {
            return this.props;
        }
        /**
         * Returns the variant definition with a given name.
         */
        getVariant(name) {
            return this.props.variants ? this.props.variants[name] : undefined;
        }
        /**
         * Returns the defined default transition on this component.
         */
        getDefaultTransition() {
            return this.props.transition;
        }
        getTransformPagePoint() {
            return this.props.transformPagePoint;
        }
        getClosestVariantNode() {
            return this.isVariantNode
                ? this
                : this.parent
                    ? this.parent.getClosestVariantNode()
                    : undefined;
        }
        /**
         * Add a child visual element to our set of children.
         */
        addVariantChild(child) {
            const closestVariantNode = this.getClosestVariantNode();
            if (closestVariantNode) {
                closestVariantNode.variantChildren &&
                    closestVariantNode.variantChildren.add(child);
                return () => closestVariantNode.variantChildren.delete(child);
            }
        }
        /**
         * Add a motion value and bind it to this visual element.
         */
        addValue(key, value) {
            // Remove existing value if it exists
            const existingValue = this.values.get(key);
            if (value !== existingValue) {
                if (existingValue)
                    this.removeValue(key);
                this.bindToMotionValue(key, value);
                this.values.set(key, value);
                this.latestValues[key] = value.get();
            }
        }
        /**
         * Remove a motion value and unbind any active subscriptions.
         */
        removeValue(key) {
            this.values.delete(key);
            const unsubscribe = this.valueSubscriptions.get(key);
            if (unsubscribe) {
                unsubscribe();
                this.valueSubscriptions.delete(key);
            }
            delete this.latestValues[key];
            this.removeValueFromRenderState(key, this.renderState);
        }
        /**
         * Check whether we have a motion value for this key
         */
        hasValue(key) {
            return this.values.has(key);
        }
        getValue(key, defaultValue) {
            if (this.props.values && this.props.values[key]) {
                return this.props.values[key];
            }
            let value = this.values.get(key);
            if (value === undefined && defaultValue !== undefined) {
                value = motionValue(defaultValue === null ? undefined : defaultValue, { owner: this });
                this.addValue(key, value);
            }
            return value;
        }
        /**
         * If we're trying to animate to a previously unencountered value,
         * we need to check for it in our state and as a last resort read it
         * directly from the instance (which might have performance implications).
         */
        readValue(key, target) {
            var _a;
            let value = this.latestValues[key] !== undefined || !this.current
                ? this.latestValues[key]
                : (_a = this.getBaseTargetFromProps(this.props, key)) !== null && _a !== void 0 ? _a : this.readValueFromInstance(this.current, key, this.options);
            if (value !== undefined && value !== null) {
                if (typeof value === "string" &&
                    (isNumericalString(value) || isZeroValueString(value))) {
                    // If this is a number read as a string, ie "0" or "200", convert it to a number
                    value = parseFloat(value);
                }
                else if (!findValueType(value) && complex.test(target)) {
                    value = getAnimatableNone(key, target);
                }
                this.setBaseTarget(key, isMotionValue(value) ? value.get() : value);
            }
            return isMotionValue(value) ? value.get() : value;
        }
        /**
         * Set the base target to later animate back to. This is currently
         * only hydrated on creation and when we first read a value.
         */
        setBaseTarget(key, value) {
            this.baseTarget[key] = value;
        }
        /**
         * Find the base target for a value thats been removed from all animation
         * props.
         */
        getBaseTarget(key) {
            var _a;
            const { initial } = this.props;
            let valueFromInitial;
            if (typeof initial === "string" || typeof initial === "object") {
                const variant = resolveVariantFromProps(this.props, initial, (_a = this.presenceContext) === null || _a === void 0 ? void 0 : _a.custom);
                if (variant) {
                    valueFromInitial = variant[key];
                }
            }
            /**
             * If this value still exists in the current initial variant, read that.
             */
            if (initial && valueFromInitial !== undefined) {
                return valueFromInitial;
            }
            /**
             * Alternatively, if this VisualElement config has defined a getBaseTarget
             * so we can read the value from an alternative source, try that.
             */
            const target = this.getBaseTargetFromProps(this.props, key);
            if (target !== undefined && !isMotionValue(target))
                return target;
            /**
             * If the value was initially defined on initial, but it doesn't any more,
             * return undefined. Otherwise return the value as initially read from the DOM.
             */
            return this.initialValues[key] !== undefined &&
                valueFromInitial === undefined
                ? undefined
                : this.baseTarget[key];
        }
        on(eventName, callback) {
            if (!this.events[eventName]) {
                this.events[eventName] = new SubscriptionManager();
            }
            return this.events[eventName].add(callback);
        }
        notify(eventName, ...args) {
            if (this.events[eventName]) {
                this.events[eventName].notify(...args);
            }
        }
    }

    class DOMVisualElement extends VisualElement {
        constructor() {
            super(...arguments);
            this.KeyframeResolver = DOMKeyframesResolver;
        }
        sortInstanceNodePosition(a, b) {
            /**
             * compareDocumentPosition returns a bitmask, by using the bitwise &
             * we're returning true if 2 in that bitmask is set to true. 2 is set
             * to true if b preceeds a.
             */
            return a.compareDocumentPosition(b) & 2 ? 1 : -1;
        }
        getBaseTargetFromProps(props, key) {
            return props.style
                ? props.style[key]
                : undefined;
        }
        removeValueFromRenderState(key, { vars, style }) {
            delete vars[key];
            delete style[key];
        }
        handleChildMotionValue() {
            if (this.childSubscription) {
                this.childSubscription();
                delete this.childSubscription;
            }
            const { children } = this.props;
            if (isMotionValue(children)) {
                this.childSubscription = children.on("change", (latest) => {
                    if (this.current) {
                        this.current.textContent = `${latest}`;
                    }
                });
            }
        }
    }

    /**
     * Provided a value and a ValueType, returns the value as that value type.
     */
    const getValueAsType = (value, type) => {
        return type && typeof value === "number"
            ? type.transform(value)
            : value;
    };

    const translateAlias = {
        x: "translateX",
        y: "translateY",
        z: "translateZ",
        transformPerspective: "perspective",
    };
    const numTransforms = transformPropOrder.length;
    /**
     * Build a CSS transform style from individual x/y/scale etc properties.
     *
     * This outputs with a default order of transforms/scales/rotations, this can be customised by
     * providing a transformTemplate function.
     */
    function buildTransform(latestValues, transform, transformTemplate) {
        // The transform string we're going to build into.
        let transformString = "";
        let transformIsDefault = true;
        /**
         * Loop over all possible transforms in order, adding the ones that
         * are present to the transform string.
         */
        for (let i = 0; i < numTransforms; i++) {
            const key = transformPropOrder[i];
            const value = latestValues[key];
            if (value === undefined)
                continue;
            let valueIsDefault = true;
            if (typeof value === "number") {
                valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
            }
            else {
                valueIsDefault = parseFloat(value) === 0;
            }
            if (!valueIsDefault || transformTemplate) {
                const valueAsType = getValueAsType(value, numberValueTypes[key]);
                if (!valueIsDefault) {
                    transformIsDefault = false;
                    const transformName = translateAlias[key] || key;
                    transformString += `${transformName}(${valueAsType}) `;
                }
                if (transformTemplate) {
                    transform[key] = valueAsType;
                }
            }
        }
        transformString = transformString.trim();
        // If we have a custom `transform` template, pass our transform values and
        // generated transformString to that before returning
        if (transformTemplate) {
            transformString = transformTemplate(transform, transformIsDefault ? "" : transformString);
        }
        else if (transformIsDefault) {
            transformString = "none";
        }
        return transformString;
    }

    function buildHTMLStyles(state, latestValues, transformTemplate) {
        const { style, vars, transformOrigin } = state;
        // Track whether we encounter any transform or transformOrigin values.
        let hasTransform = false;
        let hasTransformOrigin = false;
        /**
         * Loop over all our latest animated values and decide whether to handle them
         * as a style or CSS variable.
         *
         * Transforms and transform origins are kept separately for further processing.
         */
        for (const key in latestValues) {
            const value = latestValues[key];
            if (transformProps.has(key)) {
                // If this is a transform, flag to enable further transform processing
                hasTransform = true;
                continue;
            }
            else if (isCSSVariableName(key)) {
                vars[key] = value;
                continue;
            }
            else {
                // Convert the value to its default value type, ie 0 -> "0px"
                const valueAsType = getValueAsType(value, numberValueTypes[key]);
                if (key.startsWith("origin")) {
                    // If this is a transform origin, flag and enable further transform-origin processing
                    hasTransformOrigin = true;
                    transformOrigin[key] =
                        valueAsType;
                }
                else {
                    style[key] = valueAsType;
                }
            }
        }
        if (!latestValues.transform) {
            if (hasTransform || transformTemplate) {
                style.transform = buildTransform(latestValues, state.transform, transformTemplate);
            }
            else if (style.transform) {
                /**
                 * If we have previously created a transform but currently don't have any,
                 * reset transform style to none.
                 */
                style.transform = "none";
            }
        }
        /**
         * Build a transformOrigin style. Uses the same defaults as the browser for
         * undefined origins.
         */
        if (hasTransformOrigin) {
            const { originX = "50%", originY = "50%", originZ = 0, } = transformOrigin;
            style.transformOrigin = `${originX} ${originY} ${originZ}`;
        }
    }

    const dashKeys = {
        offset: "stroke-dashoffset",
        array: "stroke-dasharray",
    };
    const camelKeys = {
        offset: "strokeDashoffset",
        array: "strokeDasharray",
    };
    /**
     * Build SVG path properties. Uses the path's measured length to convert
     * our custom pathLength, pathSpacing and pathOffset into stroke-dashoffset
     * and stroke-dasharray attributes.
     *
     * This function is mutative to reduce per-frame GC.
     */
    function buildSVGPath(attrs, length, spacing = 1, offset = 0, useDashCase = true) {
        // Normalise path length by setting SVG attribute pathLength to 1
        attrs.pathLength = 1;
        // We use dash case when setting attributes directly to the DOM node and camel case
        // when defining props on a React component.
        const keys = useDashCase ? dashKeys : camelKeys;
        // Build the dash offset
        attrs[keys.offset] = px.transform(-offset);
        // Build the dash array
        const pathLength = px.transform(length);
        const pathSpacing = px.transform(spacing);
        attrs[keys.array] = `${pathLength} ${pathSpacing}`;
    }

    function calcOrigin$1(origin, offset, size) {
        return typeof origin === "string"
            ? origin
            : px.transform(offset + size * origin);
    }
    /**
     * The SVG transform origin defaults are different to CSS and is less intuitive,
     * so we use the measured dimensions of the SVG to reconcile these.
     */
    function calcSVGTransformOrigin(dimensions, originX, originY) {
        const pxOriginX = calcOrigin$1(originX, dimensions.x, dimensions.width);
        const pxOriginY = calcOrigin$1(originY, dimensions.y, dimensions.height);
        return `${pxOriginX} ${pxOriginY}`;
    }

    /**
     * Build SVG visual attrbutes, like cx and style.transform
     */
    function buildSVGAttrs(state, { attrX, attrY, attrScale, originX, originY, pathLength, pathSpacing = 1, pathOffset = 0, 
    // This is object creation, which we try to avoid per-frame.
    ...latest }, isSVGTag, transformTemplate) {
        buildHTMLStyles(state, latest, transformTemplate);
        /**
         * For svg tags we just want to make sure viewBox is animatable and treat all the styles
         * as normal HTML tags.
         */
        if (isSVGTag) {
            if (state.style.viewBox) {
                state.attrs.viewBox = state.style.viewBox;
            }
            return;
        }
        state.attrs = state.style;
        state.style = {};
        const { attrs, style, dimensions } = state;
        /**
         * However, we apply transforms as CSS transforms. So if we detect a transform we take it from attrs
         * and copy it into style.
         */
        if (attrs.transform) {
            if (dimensions)
                style.transform = attrs.transform;
            delete attrs.transform;
        }
        // Parse transformOrigin
        if (dimensions &&
            (originX !== undefined || originY !== undefined || style.transform)) {
            style.transformOrigin = calcSVGTransformOrigin(dimensions, originX !== undefined ? originX : 0.5, originY !== undefined ? originY : 0.5);
        }
        // Render attrX/attrY/attrScale as attributes
        if (attrX !== undefined)
            attrs.x = attrX;
        if (attrY !== undefined)
            attrs.y = attrY;
        if (attrScale !== undefined)
            attrs.scale = attrScale;
        // Build SVG path if one has been defined
        if (pathLength !== undefined) {
            buildSVGPath(attrs, pathLength, pathSpacing, pathOffset, false);
        }
    }

    /**
     * A set of attribute names that are always read/written as camel case.
     */
    const camelCaseAttributes = new Set([
        "baseFrequency",
        "diffuseConstant",
        "kernelMatrix",
        "kernelUnitLength",
        "keySplines",
        "keyTimes",
        "limitingConeAngle",
        "markerHeight",
        "markerWidth",
        "numOctaves",
        "targetX",
        "targetY",
        "surfaceScale",
        "specularConstant",
        "specularExponent",
        "stdDeviation",
        "tableValues",
        "viewBox",
        "gradientTransform",
        "pathLength",
        "startOffset",
        "textLength",
        "lengthAdjust",
    ]);

    const isSVGTag = (tag) => typeof tag === "string" && tag.toLowerCase() === "svg";

    function renderHTML(element, { style, vars }, styleProp, projection) {
        Object.assign(element.style, style, projection && projection.getProjectionStyles(styleProp));
        // Loop over any CSS variables and assign those.
        for (const key in vars) {
            element.style.setProperty(key, vars[key]);
        }
    }

    function renderSVG(element, renderState, _styleProp, projection) {
        renderHTML(element, renderState, undefined, projection);
        for (const key in renderState.attrs) {
            element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
        }
    }

    const scaleCorrectors = {};
    function addScaleCorrector(correctors) {
        Object.assign(scaleCorrectors, correctors);
    }

    function isForcedMotionValue(key, { layout, layoutId }) {
        return (transformProps.has(key) ||
            key.startsWith("origin") ||
            ((layout || layoutId !== undefined) &&
                (!!scaleCorrectors[key] || key === "opacity")));
    }

    function scrapeMotionValuesFromProps$1(props, prevProps, visualElement) {
        var _a;
        const { style } = props;
        const newValues = {};
        for (const key in style) {
            if (isMotionValue(style[key]) ||
                (prevProps.style &&
                    isMotionValue(prevProps.style[key])) ||
                isForcedMotionValue(key, props) ||
                ((_a = visualElement === null || visualElement === void 0 ? void 0 : visualElement.getValue(key)) === null || _a === void 0 ? void 0 : _a.liveStyle) !== undefined) {
                newValues[key] = style[key];
            }
        }
        return newValues;
    }

    function scrapeMotionValuesFromProps(props, prevProps, visualElement) {
        const newValues = scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
        for (const key in props) {
            if (isMotionValue(props[key]) ||
                isMotionValue(prevProps[key])) {
                const targetKey = transformPropOrder.indexOf(key) !== -1
                    ? "attr" + key.charAt(0).toUpperCase() + key.substring(1)
                    : key;
                newValues[targetKey] = props[key];
            }
        }
        return newValues;
    }

    class SVGVisualElement extends DOMVisualElement {
        constructor() {
            super(...arguments);
            this.type = "svg";
            this.isSVGTag = false;
            this.measureInstanceViewportBox = createBox;
        }
        getBaseTargetFromProps(props, key) {
            return props[key];
        }
        readValueFromInstance(instance, key) {
            if (transformProps.has(key)) {
                const defaultType = getDefaultValueType(key);
                return defaultType ? defaultType.default || 0 : 0;
            }
            key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
            return instance.getAttribute(key);
        }
        scrapeMotionValuesFromProps(props, prevProps, visualElement) {
            return scrapeMotionValuesFromProps(props, prevProps, visualElement);
        }
        build(renderState, latestValues, props) {
            buildSVGAttrs(renderState, latestValues, this.isSVGTag, props.transformTemplate);
        }
        renderInstance(instance, renderState, styleProp, projection) {
            renderSVG(instance, renderState, styleProp, projection);
        }
        mount(instance) {
            this.isSVGTag = isSVGTag(instance.tagName);
            super.mount(instance);
        }
    }

    /**
     * Bounding boxes tend to be defined as top, left, right, bottom. For various operations
     * it's easier to consider each axis individually. This function returns a bounding box
     * as a map of single-axis min/max values.
     */
    function convertBoundingBoxToBox({ top, left, right, bottom, }) {
        return {
            x: { min: left, max: right },
            y: { min: top, max: bottom },
        };
    }
    function convertBoxToBoundingBox({ x, y }) {
        return { top: y.min, right: x.max, bottom: y.max, left: x.min };
    }
    /**
     * Applies a TransformPoint function to a bounding box. TransformPoint is usually a function
     * provided by Framer to allow measured points to be corrected for device scaling. This is used
     * when measuring DOM elements and DOM event points.
     */
    function transformBoxPoints(point, transformPoint) {
        if (!transformPoint)
            return point;
        const topLeft = transformPoint({ x: point.left, y: point.top });
        const bottomRight = transformPoint({ x: point.right, y: point.bottom });
        return {
            top: topLeft.y,
            left: topLeft.x,
            bottom: bottomRight.y,
            right: bottomRight.x,
        };
    }

    function isIdentityScale(scale) {
        return scale === undefined || scale === 1;
    }
    function hasScale({ scale, scaleX, scaleY }) {
        return (!isIdentityScale(scale) ||
            !isIdentityScale(scaleX) ||
            !isIdentityScale(scaleY));
    }
    function hasTransform(values) {
        return (hasScale(values) ||
            has2DTranslate(values) ||
            values.z ||
            values.rotate ||
            values.rotateX ||
            values.rotateY ||
            values.skewX ||
            values.skewY);
    }
    function has2DTranslate(values) {
        return is2DTranslate(values.x) || is2DTranslate(values.y);
    }
    function is2DTranslate(value) {
        return value && value !== "0%";
    }

    /**
     * Scales a point based on a factor and an originPoint
     */
    function scalePoint(point, scale, originPoint) {
        const distanceFromOrigin = point - originPoint;
        const scaled = scale * distanceFromOrigin;
        return originPoint + scaled;
    }
    /**
     * Applies a translate/scale delta to a point
     */
    function applyPointDelta(point, translate, scale, originPoint, boxScale) {
        if (boxScale !== undefined) {
            point = scalePoint(point, boxScale, originPoint);
        }
        return scalePoint(point, scale, originPoint) + translate;
    }
    /**
     * Applies a translate/scale delta to an axis
     */
    function applyAxisDelta(axis, translate = 0, scale = 1, originPoint, boxScale) {
        axis.min = applyPointDelta(axis.min, translate, scale, originPoint, boxScale);
        axis.max = applyPointDelta(axis.max, translate, scale, originPoint, boxScale);
    }
    /**
     * Applies a translate/scale delta to a box
     */
    function applyBoxDelta(box, { x, y }) {
        applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
        applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
    }
    const TREE_SCALE_SNAP_MIN = 0.999999999999;
    const TREE_SCALE_SNAP_MAX = 1.0000000000001;
    /**
     * Apply a tree of deltas to a box. We do this to calculate the effect of all the transforms
     * in a tree upon our box before then calculating how to project it into our desired viewport-relative box
     *
     * This is the final nested loop within updateLayoutDelta for future refactoring
     */
    function applyTreeDeltas(box, treeScale, treePath, isSharedTransition = false) {
        const treeLength = treePath.length;
        if (!treeLength)
            return;
        // Reset the treeScale
        treeScale.x = treeScale.y = 1;
        let node;
        let delta;
        for (let i = 0; i < treeLength; i++) {
            node = treePath[i];
            delta = node.projectionDelta;
            /**
             * TODO: Prefer to remove this, but currently we have motion components with
             * display: contents in Framer.
             */
            const { visualElement } = node.options;
            if (visualElement &&
                visualElement.props.style &&
                visualElement.props.style.display === "contents") {
                continue;
            }
            if (isSharedTransition &&
                node.options.layoutScroll &&
                node.scroll &&
                node !== node.root) {
                transformBox(box, {
                    x: -node.scroll.offset.x,
                    y: -node.scroll.offset.y,
                });
            }
            if (delta) {
                // Incoporate each ancestor's scale into a culmulative treeScale for this component
                treeScale.x *= delta.x.scale;
                treeScale.y *= delta.y.scale;
                // Apply each ancestor's calculated delta into this component's recorded layout box
                applyBoxDelta(box, delta);
            }
            if (isSharedTransition && hasTransform(node.latestValues)) {
                transformBox(box, node.latestValues);
            }
        }
        /**
         * Snap tree scale back to 1 if it's within a non-perceivable threshold.
         * This will help reduce useless scales getting rendered.
         */
        if (treeScale.x < TREE_SCALE_SNAP_MAX &&
            treeScale.x > TREE_SCALE_SNAP_MIN) {
            treeScale.x = 1.0;
        }
        if (treeScale.y < TREE_SCALE_SNAP_MAX &&
            treeScale.y > TREE_SCALE_SNAP_MIN) {
            treeScale.y = 1.0;
        }
    }
    function translateAxis(axis, distance) {
        axis.min = axis.min + distance;
        axis.max = axis.max + distance;
    }
    /**
     * Apply a transform to an axis from the latest resolved motion values.
     * This function basically acts as a bridge between a flat motion value map
     * and applyAxisDelta
     */
    function transformAxis(axis, axisTranslate, axisScale, boxScale, axisOrigin = 0.5) {
        const originPoint = mixNumber$1(axis.min, axis.max, axisOrigin);
        // Apply the axis delta to the final axis
        applyAxisDelta(axis, axisTranslate, axisScale, originPoint, boxScale);
    }
    /**
     * Apply a transform to a box from the latest resolved motion values.
     */
    function transformBox(box, transform) {
        transformAxis(box.x, transform.x, transform.scaleX, transform.scale, transform.originX);
        transformAxis(box.y, transform.y, transform.scaleY, transform.scale, transform.originY);
    }

    function measureViewportBox(instance, transformPoint) {
        return convertBoundingBoxToBox(transformBoxPoints(instance.getBoundingClientRect(), transformPoint));
    }
    function measurePageBox(element, rootProjectionNode, transformPagePoint) {
        const viewportBox = measureViewportBox(element, transformPagePoint);
        const { scroll } = rootProjectionNode;
        if (scroll) {
            translateAxis(viewportBox.x, scroll.offset.x);
            translateAxis(viewportBox.y, scroll.offset.y);
        }
        return viewportBox;
    }

    function getComputedStyle$1(element) {
        return window.getComputedStyle(element);
    }
    class HTMLVisualElement extends DOMVisualElement {
        constructor() {
            super(...arguments);
            this.type = "html";
            this.renderInstance = renderHTML;
        }
        readValueFromInstance(instance, key) {
            if (transformProps.has(key)) {
                const defaultType = getDefaultValueType(key);
                return defaultType ? defaultType.default || 0 : 0;
            }
            else {
                const computedStyle = getComputedStyle$1(instance);
                const value = (isCSSVariableName(key)
                    ? computedStyle.getPropertyValue(key)
                    : computedStyle[key]) || 0;
                return typeof value === "string" ? value.trim() : value;
            }
        }
        measureInstanceViewportBox(instance, { transformPagePoint }) {
            return measureViewportBox(instance, transformPagePoint);
        }
        build(renderState, latestValues, props) {
            buildHTMLStyles(renderState, latestValues, props.transformTemplate);
        }
        scrapeMotionValuesFromProps(props, prevProps, visualElement) {
            return scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
        }
    }

    function isObjectKey(key, object) {
        return key in object;
    }
    class ObjectVisualElement extends VisualElement {
        constructor() {
            super(...arguments);
            this.type = "object";
        }
        readValueFromInstance(instance, key) {
            if (isObjectKey(key, instance)) {
                const value = instance[key];
                if (typeof value === "string" || typeof value === "number") {
                    return value;
                }
            }
            return undefined;
        }
        getBaseTargetFromProps() {
            return undefined;
        }
        removeValueFromRenderState(key, renderState) {
            delete renderState.output[key];
        }
        measureInstanceViewportBox() {
            return createBox();
        }
        build(renderState, latestValues) {
            Object.assign(renderState.output, latestValues);
        }
        renderInstance(instance, { output }) {
            Object.assign(instance, output);
        }
        sortInstanceNodePosition() {
            return 0;
        }
    }

    function createDOMVisualElement(element) {
        const options = {
            presenceContext: null,
            props: {},
            visualState: {
                renderState: {
                    transform: {},
                    transformOrigin: {},
                    style: {},
                    vars: {},
                    attrs: {},
                },
                latestValues: {},
            },
        };
        const node = isSVGElement(element)
            ? new SVGVisualElement(options)
            : new HTMLVisualElement(options);
        node.mount(element);
        visualElementStore.set(element, node);
    }
    function createObjectVisualElement(subject) {
        const options = {
            presenceContext: null,
            props: {},
            visualState: {
                renderState: {
                    output: {},
                },
                latestValues: {},
            },
        };
        const node = new ObjectVisualElement(options);
        node.mount(subject);
        visualElementStore.set(subject, node);
    }

    function isSingleValue(subject, keyframes) {
        return (isMotionValue(subject) ||
            typeof subject === "number" ||
            (typeof subject === "string" && !isDOMKeyframes(keyframes)));
    }
    /**
     * Implementation
     */
    function animateSubject(subject, keyframes, options, scope) {
        const animations = [];
        if (isSingleValue(subject, keyframes)) {
            animations.push(animateSingleValue(subject, isDOMKeyframes(keyframes)
                ? keyframes.default || keyframes
                : keyframes, options ? options.default || options : options));
        }
        else {
            const subjects = resolveSubjects(subject, keyframes, scope);
            const numSubjects = subjects.length;
            exports.invariant(Boolean(numSubjects), "No valid elements provided.");
            for (let i = 0; i < numSubjects; i++) {
                const thisSubject = subjects[i];
                const createVisualElement = thisSubject instanceof Element
                    ? createDOMVisualElement
                    : createObjectVisualElement;
                if (!visualElementStore.has(thisSubject)) {
                    createVisualElement(thisSubject);
                }
                const visualElement = visualElementStore.get(thisSubject);
                const transition = { ...options };
                /**
                 * Resolve stagger function if provided.
                 */
                if ("delay" in transition &&
                    typeof transition.delay === "function") {
                    transition.delay = transition.delay(i, numSubjects);
                }
                animations.push(...animateTarget(visualElement, { ...keyframes, transition }, {}));
            }
        }
        return animations;
    }

    function animateSequence(sequence, options, scope) {
        const animations = [];
        const animationDefinitions = createAnimationsFromSequence(sequence, options, scope, { spring });
        animationDefinitions.forEach(({ keyframes, transition }, subject) => {
            animations.push(...animateSubject(subject, keyframes, transition));
        });
        return animations;
    }

    function isSequence(value) {
        return Array.isArray(value) && value.some(Array.isArray);
    }
    /**
     * Creates an animation function that is optionally scoped
     * to a specific element.
     */
    function createScopedAnimate(scope) {
        /**
         * Implementation
         */
        function scopedAnimate(subjectOrSequence, optionsOrKeyframes, options) {
            let animations = [];
            if (isSequence(subjectOrSequence)) {
                animations = animateSequence(subjectOrSequence, optionsOrKeyframes, scope);
            }
            else {
                animations = animateSubject(subjectOrSequence, optionsOrKeyframes, options, scope);
            }
            const animation = new GroupPlaybackControls(animations);
            if (scope) {
                scope.animations.push(animation);
            }
            return animation;
        }
        return scopedAnimate;
    }
    const animate = createScopedAnimate();

    function setCSSVar(element, name, value) {
        element.style.setProperty(`--${name}`, value);
    }
    function setStyle(element, name, value) {
        element.style[name] = value;
    }

    const supportsPartialKeyframes = /*@__PURE__*/ memo(() => {
        try {
            document.createElement("div").animate({ opacity: [1] });
        }
        catch (e) {
            return false;
        }
        return true;
    });

    const state = new WeakMap();
    function hydrateKeyframes(valueName, keyframes, read) {
        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i] === null) {
                keyframes[i] = i === 0 ? read() : keyframes[i - 1];
            }
            if (typeof keyframes[i] === "number" &&
                browserNumberValueTypes[valueName]) {
                keyframes[i] = browserNumberValueTypes[valueName].transform(keyframes[i]);
            }
        }
        if (!supportsPartialKeyframes() && keyframes.length < 2) {
            keyframes.unshift(read());
        }
    }
    const defaultEasing = "easeOut";
    function getElementAnimationState(element) {
        const animationState = state.get(element) || new Map();
        state.set(element, animationState);
        return state.get(element);
    }
    class NativeAnimation extends NativeAnimationControls {
        constructor(element, valueName, valueKeyframes, options) {
            const isCSSVar = valueName.startsWith("--");
            exports.invariant(typeof options.type !== "string", `animateMini doesn't support "type" as a string. Did you mean to import { spring } from "framer-motion"?`);
            const existingAnimation = getElementAnimationState(element).get(valueName);
            existingAnimation && existingAnimation.stop();
            const readInitialKeyframe = () => {
                return valueName.startsWith("--")
                    ? element.style.getPropertyValue(valueName)
                    : window.getComputedStyle(element)[valueName];
            };
            if (!Array.isArray(valueKeyframes)) {
                valueKeyframes = [valueKeyframes];
            }
            hydrateKeyframes(valueName, valueKeyframes, readInitialKeyframe);
            // TODO: Replace this with toString()?
            if (isGenerator(options.type)) {
                const generatorOptions = createGeneratorEasing(options, 100, options.type);
                options.ease = supportsLinearEasing()
                    ? generatorOptions.ease
                    : defaultEasing;
                options.duration = secondsToMilliseconds(generatorOptions.duration);
                options.type = "keyframes";
            }
            else {
                options.ease = options.ease || defaultEasing;
            }
            const onFinish = () => {
                this.setValue(element, valueName, getFinalKeyframe(valueKeyframes, options));
                this.cancel();
                this.resolveFinishedPromise();
            };
            const init = () => {
                this.setValue = isCSSVar ? setCSSVar : setStyle;
                this.options = options;
                this.updateFinishedPromise();
                this.removeAnimation = () => {
                    const elementState = state.get(element);
                    elementState && elementState.delete(valueName);
                };
            };
            if (!supportsWaapi()) {
                super();
                init();
                onFinish();
            }
            else {
                super(startWaapiAnimation(element, valueName, valueKeyframes, options));
                init();
                if (options.autoplay === false) {
                    this.animation.pause();
                }
                this.animation.onfinish = onFinish;
                getElementAnimationState(element).set(valueName, this);
            }
        }
        /**
         * Allows the returned animation to be awaited or promise-chained. Currently
         * resolves when the animation finishes at all but in a future update could/should
         * reject if its cancels.
         */
        then(resolve, reject) {
            return this.currentFinishedPromise.then(resolve, reject);
        }
        updateFinishedPromise() {
            this.currentFinishedPromise = new Promise((resolve) => {
                this.resolveFinishedPromise = resolve;
            });
        }
        play() {
            if (this.state === "finished") {
                this.updateFinishedPromise();
            }
            super.play();
        }
        cancel() {
            this.removeAnimation();
            super.cancel();
        }
    }

    function animateElements(elementOrSelector, keyframes, options, scope) {
        const elements = resolveElements(elementOrSelector, scope);
        const numElements = elements.length;
        exports.invariant(Boolean(numElements), "No valid element provided.");
        const animations = [];
        for (let i = 0; i < numElements; i++) {
            const element = elements[i];
            const elementTransition = { ...options };
            /**
             * Resolve stagger function if provided.
             */
            if (typeof elementTransition.delay === "function") {
                elementTransition.delay = elementTransition.delay(i, numElements);
            }
            for (const valueName in keyframes) {
                const valueKeyframes = keyframes[valueName];
                const valueOptions = {
                    ...getValueTransition$1(elementTransition, valueName),
                };
                valueOptions.duration = valueOptions.duration
                    ? secondsToMilliseconds(valueOptions.duration)
                    : valueOptions.duration;
                valueOptions.delay = secondsToMilliseconds(valueOptions.delay || 0);
                animations.push(new NativeAnimation(element, valueName, valueKeyframes, valueOptions));
            }
        }
        return animations;
    }

    const createScopedWaapiAnimate = (scope) => {
        function scopedAnimate(elementOrSelector, keyframes, options) {
            return new GroupPlaybackControls(animateElements(elementOrSelector, keyframes, options, scope));
        }
        return scopedAnimate;
    };
    const animateMini = /*@__PURE__*/ createScopedWaapiAnimate();

    function observeTimeline(update, timeline) {
        let prevProgress;
        const onFrame = () => {
            const { currentTime } = timeline;
            const percentage = currentTime === null ? 0 : currentTime.value;
            const progress = percentage / 100;
            if (prevProgress !== progress) {
                update(progress);
            }
            prevProgress = progress;
        };
        frame.update(onFrame, true);
        return () => cancelFrame(onFrame);
    }

    const resizeHandlers = new WeakMap();
    let observer;
    function getElementSize(target, borderBoxSize) {
        if (borderBoxSize) {
            const { inlineSize, blockSize } = borderBoxSize[0];
            return { width: inlineSize, height: blockSize };
        }
        else if (target instanceof SVGElement && "getBBox" in target) {
            return target.getBBox();
        }
        else {
            return {
                width: target.offsetWidth,
                height: target.offsetHeight,
            };
        }
    }
    function notifyTarget({ target, contentRect, borderBoxSize, }) {
        var _a;
        (_a = resizeHandlers.get(target)) === null || _a === void 0 ? void 0 : _a.forEach((handler) => {
            handler({
                target,
                contentSize: contentRect,
                get size() {
                    return getElementSize(target, borderBoxSize);
                },
            });
        });
    }
    function notifyAll(entries) {
        entries.forEach(notifyTarget);
    }
    function createResizeObserver() {
        if (typeof ResizeObserver === "undefined")
            return;
        observer = new ResizeObserver(notifyAll);
    }
    function resizeElement(target, handler) {
        if (!observer)
            createResizeObserver();
        const elements = resolveElements(target);
        elements.forEach((element) => {
            let elementHandlers = resizeHandlers.get(element);
            if (!elementHandlers) {
                elementHandlers = new Set();
                resizeHandlers.set(element, elementHandlers);
            }
            elementHandlers.add(handler);
            observer === null || observer === void 0 ? void 0 : observer.observe(element);
        });
        return () => {
            elements.forEach((element) => {
                const elementHandlers = resizeHandlers.get(element);
                elementHandlers === null || elementHandlers === void 0 ? void 0 : elementHandlers.delete(handler);
                if (!(elementHandlers === null || elementHandlers === void 0 ? void 0 : elementHandlers.size)) {
                    observer === null || observer === void 0 ? void 0 : observer.unobserve(element);
                }
            });
        };
    }

    const windowCallbacks = new Set();
    let windowResizeHandler;
    function createWindowResizeHandler() {
        windowResizeHandler = () => {
            const size = {
                width: window.innerWidth,
                height: window.innerHeight,
            };
            const info = {
                target: window,
                size,
                contentSize: size,
            };
            windowCallbacks.forEach((callback) => callback(info));
        };
        window.addEventListener("resize", windowResizeHandler);
    }
    function resizeWindow(callback) {
        windowCallbacks.add(callback);
        if (!windowResizeHandler)
            createWindowResizeHandler();
        return () => {
            windowCallbacks.delete(callback);
            if (!windowCallbacks.size && windowResizeHandler) {
                windowResizeHandler = undefined;
            }
        };
    }

    function resize(a, b) {
        return typeof a === "function" ? resizeWindow(a) : resizeElement(a, b);
    }

    /**
     * A time in milliseconds, beyond which we consider the scroll velocity to be 0.
     */
    const maxElapsed = 50;
    const createAxisInfo = () => ({
        current: 0,
        offset: [],
        progress: 0,
        scrollLength: 0,
        targetOffset: 0,
        targetLength: 0,
        containerLength: 0,
        velocity: 0,
    });
    const createScrollInfo = () => ({
        time: 0,
        x: createAxisInfo(),
        y: createAxisInfo(),
    });
    const keys = {
        x: {
            length: "Width",
            position: "Left",
        },
        y: {
            length: "Height",
            position: "Top",
        },
    };
    function updateAxisInfo(element, axisName, info, time) {
        const axis = info[axisName];
        const { length, position } = keys[axisName];
        const prev = axis.current;
        const prevTime = info.time;
        axis.current = element[`scroll${position}`];
        axis.scrollLength = element[`scroll${length}`] - element[`client${length}`];
        axis.offset.length = 0;
        axis.offset[0] = 0;
        axis.offset[1] = axis.scrollLength;
        axis.progress = progress(0, axis.scrollLength, axis.current);
        const elapsed = time - prevTime;
        axis.velocity =
            elapsed > maxElapsed
                ? 0
                : velocityPerSecond(axis.current - prev, elapsed);
    }
    function updateScrollInfo(element, info, time) {
        updateAxisInfo(element, "x", info, time);
        updateAxisInfo(element, "y", info, time);
        info.time = time;
    }

    function calcInset(element, container) {
        const inset = { x: 0, y: 0 };
        let current = element;
        while (current && current !== container) {
            if (current instanceof HTMLElement) {
                inset.x += current.offsetLeft;
                inset.y += current.offsetTop;
                current = current.offsetParent;
            }
            else if (current.tagName === "svg") {
                /**
                 * This isn't an ideal approach to measuring the offset of <svg /> tags.
                 * It would be preferable, given they behave like HTMLElements in most ways
                 * to use offsetLeft/Top. But these don't exist on <svg />. Likewise we
                 * can't use .getBBox() like most SVG elements as these provide the offset
                 * relative to the SVG itself, which for <svg /> is usually 0x0.
                 */
                const svgBoundingBox = current.getBoundingClientRect();
                current = current.parentElement;
                const parentBoundingBox = current.getBoundingClientRect();
                inset.x += svgBoundingBox.left - parentBoundingBox.left;
                inset.y += svgBoundingBox.top - parentBoundingBox.top;
            }
            else if (current instanceof SVGGraphicsElement) {
                const { x, y } = current.getBBox();
                inset.x += x;
                inset.y += y;
                let svg = null;
                let parent = current.parentNode;
                while (!svg) {
                    if (parent.tagName === "svg") {
                        svg = parent;
                    }
                    parent = current.parentNode;
                }
                current = svg;
            }
            else {
                break;
            }
        }
        return inset;
    }

    const namedEdges = {
        start: 0,
        center: 0.5,
        end: 1,
    };
    function resolveEdge(edge, length, inset = 0) {
        let delta = 0;
        /**
         * If we have this edge defined as a preset, replace the definition
         * with the numerical value.
         */
        if (edge in namedEdges) {
            edge = namedEdges[edge];
        }
        /**
         * Handle unit values
         */
        if (typeof edge === "string") {
            const asNumber = parseFloat(edge);
            if (edge.endsWith("px")) {
                delta = asNumber;
            }
            else if (edge.endsWith("%")) {
                edge = asNumber / 100;
            }
            else if (edge.endsWith("vw")) {
                delta = (asNumber / 100) * document.documentElement.clientWidth;
            }
            else if (edge.endsWith("vh")) {
                delta = (asNumber / 100) * document.documentElement.clientHeight;
            }
            else {
                edge = asNumber;
            }
        }
        /**
         * If the edge is defined as a number, handle as a progress value.
         */
        if (typeof edge === "number") {
            delta = length * edge;
        }
        return inset + delta;
    }

    const defaultOffset = [0, 0];
    function resolveOffset(offset, containerLength, targetLength, targetInset) {
        let offsetDefinition = Array.isArray(offset) ? offset : defaultOffset;
        let targetPoint = 0;
        let containerPoint = 0;
        if (typeof offset === "number") {
            /**
             * If we're provided offset: [0, 0.5, 1] then each number x should become
             * [x, x], so we default to the behaviour of mapping 0 => 0 of both target
             * and container etc.
             */
            offsetDefinition = [offset, offset];
        }
        else if (typeof offset === "string") {
            offset = offset.trim();
            if (offset.includes(" ")) {
                offsetDefinition = offset.split(" ");
            }
            else {
                /**
                 * If we're provided a definition like "100px" then we want to apply
                 * that only to the top of the target point, leaving the container at 0.
                 * Whereas a named offset like "end" should be applied to both.
                 */
                offsetDefinition = [offset, namedEdges[offset] ? offset : `0`];
            }
        }
        targetPoint = resolveEdge(offsetDefinition[0], targetLength, targetInset);
        containerPoint = resolveEdge(offsetDefinition[1], containerLength);
        return targetPoint - containerPoint;
    }

    const ScrollOffset = {
        Enter: [
            [0, 1],
            [1, 1],
        ],
        Exit: [
            [0, 0],
            [1, 0],
        ],
        Any: [
            [1, 0],
            [0, 1],
        ],
        All: [
            [0, 0],
            [1, 1],
        ],
    };

    const point = { x: 0, y: 0 };
    function getTargetSize(target) {
        return "getBBox" in target && target.tagName !== "svg"
            ? target.getBBox()
            : { width: target.clientWidth, height: target.clientHeight };
    }
    function resolveOffsets(container, info, options) {
        const { offset: offsetDefinition = ScrollOffset.All } = options;
        const { target = container, axis = "y" } = options;
        const lengthLabel = axis === "y" ? "height" : "width";
        const inset = target !== container ? calcInset(target, container) : point;
        /**
         * Measure the target and container. If they're the same thing then we
         * use the container's scrollWidth/Height as the target, from there
         * all other calculations can remain the same.
         */
        const targetSize = target === container
            ? { width: container.scrollWidth, height: container.scrollHeight }
            : getTargetSize(target);
        const containerSize = {
            width: container.clientWidth,
            height: container.clientHeight,
        };
        /**
         * Reset the length of the resolved offset array rather than creating a new one.
         * TODO: More reusable data structures for targetSize/containerSize would also be good.
         */
        info[axis].offset.length = 0;
        /**
         * Populate the offset array by resolving the user's offset definition into
         * a list of pixel scroll offets.
         */
        let hasChanged = !info[axis].interpolate;
        const numOffsets = offsetDefinition.length;
        for (let i = 0; i < numOffsets; i++) {
            const offset = resolveOffset(offsetDefinition[i], containerSize[lengthLabel], targetSize[lengthLabel], inset[axis]);
            if (!hasChanged && offset !== info[axis].interpolatorOffsets[i]) {
                hasChanged = true;
            }
            info[axis].offset[i] = offset;
        }
        /**
         * If the pixel scroll offsets have changed, create a new interpolator function
         * to map scroll value into a progress.
         */
        if (hasChanged) {
            info[axis].interpolate = interpolate(info[axis].offset, defaultOffset$1(offsetDefinition), { clamp: false });
            info[axis].interpolatorOffsets = [...info[axis].offset];
        }
        info[axis].progress = clamp(0, 1, info[axis].interpolate(info[axis].current));
    }

    function measure(container, target = container, info) {
        /**
         * Find inset of target within scrollable container
         */
        info.x.targetOffset = 0;
        info.y.targetOffset = 0;
        if (target !== container) {
            let node = target;
            while (node && node !== container) {
                info.x.targetOffset += node.offsetLeft;
                info.y.targetOffset += node.offsetTop;
                node = node.offsetParent;
            }
        }
        info.x.targetLength =
            target === container ? target.scrollWidth : target.clientWidth;
        info.y.targetLength =
            target === container ? target.scrollHeight : target.clientHeight;
        info.x.containerLength = container.clientWidth;
        info.y.containerLength = container.clientHeight;
        /**
         * In development mode ensure scroll containers aren't position: static as this makes
         * it difficult to measure their relative positions.
         */
        {
            if (container && target && target !== container) {
                warnOnce(getComputedStyle(container).position !== "static", "Please ensure that the container has a non-static position, like 'relative', 'fixed', or 'absolute' to ensure scroll offset is calculated correctly.");
            }
        }
    }
    function createOnScrollHandler(element, onScroll, info, options = {}) {
        return {
            measure: () => measure(element, options.target, info),
            update: (time) => {
                updateScrollInfo(element, info, time);
                if (options.offset || options.target) {
                    resolveOffsets(element, info, options);
                }
            },
            notify: () => onScroll(info),
        };
    }

    const scrollListeners = new WeakMap();
    const resizeListeners = new WeakMap();
    const onScrollHandlers = new WeakMap();
    const getEventTarget = (element) => element === document.documentElement ? window : element;
    function scrollInfo(onScroll, { container = document.documentElement, ...options } = {}) {
        let containerHandlers = onScrollHandlers.get(container);
        /**
         * Get the onScroll handlers for this container.
         * If one isn't found, create a new one.
         */
        if (!containerHandlers) {
            containerHandlers = new Set();
            onScrollHandlers.set(container, containerHandlers);
        }
        /**
         * Create a new onScroll handler for the provided callback.
         */
        const info = createScrollInfo();
        const containerHandler = createOnScrollHandler(container, onScroll, info, options);
        containerHandlers.add(containerHandler);
        /**
         * Check if there's a scroll event listener for this container.
         * If not, create one.
         */
        if (!scrollListeners.has(container)) {
            const measureAll = () => {
                for (const handler of containerHandlers)
                    handler.measure();
            };
            const updateAll = () => {
                for (const handler of containerHandlers) {
                    handler.update(frameData.timestamp);
                }
            };
            const notifyAll = () => {
                for (const handler of containerHandlers)
                    handler.notify();
            };
            const listener = () => {
                frame.read(measureAll, false, true);
                frame.read(updateAll, false, true);
                frame.update(notifyAll, false, true);
            };
            scrollListeners.set(container, listener);
            const target = getEventTarget(container);
            window.addEventListener("resize", listener, { passive: true });
            if (container !== document.documentElement) {
                resizeListeners.set(container, resize(container, listener));
            }
            target.addEventListener("scroll", listener, { passive: true });
        }
        const listener = scrollListeners.get(container);
        frame.read(listener, false, true);
        return () => {
            var _a;
            cancelFrame(listener);
            /**
             * Check if we even have any handlers for this container.
             */
            const currentHandlers = onScrollHandlers.get(container);
            if (!currentHandlers)
                return;
            currentHandlers.delete(containerHandler);
            if (currentHandlers.size)
                return;
            /**
             * If no more handlers, remove the scroll listener too.
             */
            const scrollListener = scrollListeners.get(container);
            scrollListeners.delete(container);
            if (scrollListener) {
                getEventTarget(container).removeEventListener("scroll", scrollListener);
                (_a = resizeListeners.get(container)) === null || _a === void 0 ? void 0 : _a();
                window.removeEventListener("resize", scrollListener);
            }
        };
    }

    function scrollTimelineFallback({ source, container, axis = "y", }) {
        // Support legacy source argument. Deprecate later.
        if (source)
            container = source;
        // ScrollTimeline records progress as a percentage CSSUnitValue
        const currentTime = { value: 0 };
        const cancel = scrollInfo((info) => {
            currentTime.value = info[axis].progress * 100;
        }, { container, axis });
        return { currentTime, cancel };
    }
    const timelineCache = new Map();
    function getTimeline({ source, container = document.documentElement, axis = "y", } = {}) {
        // Support legacy source argument. Deprecate later.
        if (source)
            container = source;
        if (!timelineCache.has(container)) {
            timelineCache.set(container, {});
        }
        const elementCache = timelineCache.get(container);
        if (!elementCache[axis]) {
            elementCache[axis] = supportsScrollTimeline()
                ? new ScrollTimeline({ source: container, axis })
                : scrollTimelineFallback({ source: container, axis });
        }
        return elementCache[axis];
    }
    /**
     * If the onScroll function has two arguments, it's expecting
     * more specific information about the scroll from scrollInfo.
     */
    function isOnScrollWithInfo(onScroll) {
        return onScroll.length === 2;
    }
    /**
     * Currently, we only support element tracking with `scrollInfo`, though in
     * the future we can also offer ViewTimeline support.
     */
    function needsElementTracking(options) {
        return options && (options.target || options.offset);
    }
    function scrollFunction(onScroll, options) {
        if (isOnScrollWithInfo(onScroll) || needsElementTracking(options)) {
            return scrollInfo((info) => {
                onScroll(info[options.axis].progress, info);
            }, options);
        }
        else {
            return observeTimeline(onScroll, getTimeline(options));
        }
    }
    function scrollAnimation(animation, options) {
        animation.flatten();
        if (needsElementTracking(options)) {
            animation.pause();
            return scrollInfo((info) => {
                animation.time = animation.duration * info[options.axis].progress;
            }, options);
        }
        else {
            const timeline = getTimeline(options);
            if (animation.attachTimeline) {
                return animation.attachTimeline(timeline, (valueAnimation) => {
                    valueAnimation.pause();
                    return observeTimeline((progress) => {
                        valueAnimation.time = valueAnimation.duration * progress;
                    }, timeline);
                });
            }
            else {
                return noop;
            }
        }
    }
    function scroll(onScroll, { axis = "y", ...options } = {}) {
        const optionsWithDefaults = { axis, ...options };
        return typeof onScroll === "function"
            ? scrollFunction(onScroll, optionsWithDefaults)
            : scrollAnimation(onScroll, optionsWithDefaults);
    }

    const thresholds = {
        some: 0,
        all: 1,
    };
    function inView(elementOrSelector, onStart, { root, margin: rootMargin, amount = "some" } = {}) {
        const elements = resolveElements(elementOrSelector);
        const activeIntersections = new WeakMap();
        const onIntersectionChange = (entries) => {
            entries.forEach((entry) => {
                const onEnd = activeIntersections.get(entry.target);
                /**
                 * If there's no change to the intersection, we don't need to
                 * do anything here.
                 */
                if (entry.isIntersecting === Boolean(onEnd))
                    return;
                if (entry.isIntersecting) {
                    const newOnEnd = onStart(entry);
                    if (typeof newOnEnd === "function") {
                        activeIntersections.set(entry.target, newOnEnd);
                    }
                    else {
                        observer.unobserve(entry.target);
                    }
                }
                else if (typeof onEnd === "function") {
                    onEnd(entry);
                    activeIntersections.delete(entry.target);
                }
            });
        };
        const observer = new IntersectionObserver(onIntersectionChange, {
            root,
            rootMargin,
            threshold: typeof amount === "number" ? amount : thresholds[amount],
        });
        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }

    function steps(numSteps, direction = "end") {
        return (progress) => {
            progress =
                direction === "end"
                    ? Math.min(progress, 0.999)
                    : Math.max(progress, 0.001);
            const expanded = progress * numSteps;
            const rounded = direction === "end" ? Math.floor(expanded) : Math.ceil(expanded);
            return clamp(0, 1, rounded / numSteps);
        };
    }

    function getOriginIndex(from, total) {
        if (from === "first") {
            return 0;
        }
        else {
            const lastIndex = total - 1;
            return from === "last" ? lastIndex : lastIndex / 2;
        }
    }
    function stagger(duration = 0.1, { startDelay = 0, from = 0, ease } = {}) {
        return (i, total) => {
            const fromIndex = typeof from === "number" ? from : getOriginIndex(from, total);
            const distance = Math.abs(fromIndex - i);
            let delay = duration * distance;
            if (ease) {
                const maxDelay = total * duration;
                const easingFunction = easingDefinitionToFunction(ease);
                delay = easingFunction(delay / maxDelay) * maxDelay;
            }
            return startDelay + delay;
        };
    }

    /**
     * Timeout defined in ms
     */
    function delay(callback, timeout) {
        const start = time.now();
        const checkElapsed = ({ timestamp }) => {
            const elapsed = timestamp - start;
            if (elapsed >= timeout) {
                cancelFrame(checkElapsed);
                callback(elapsed - timeout);
            }
        };
        frame.read(checkElapsed, true);
        return () => cancelFrame(checkElapsed);
    }

    const distance = (a, b) => Math.abs(a - b);
    function distance2D(a, b) {
        // Multi-dimensional
        const xDelta = distance(a.x, b.x);
        const yDelta = distance(a.y, b.y);
        return Math.sqrt(xDelta ** 2 + yDelta ** 2);
    }

    const isCustomValueType = (v) => {
        return v && typeof v === "object" && v.mix;
    };
    const getMixer = (v) => (isCustomValueType(v) ? v.mix : undefined);
    function transform(...args) {
        const useImmediate = !Array.isArray(args[0]);
        const argOffset = useImmediate ? 0 : -1;
        const inputValue = args[0 + argOffset];
        const inputRange = args[1 + argOffset];
        const outputRange = args[2 + argOffset];
        const options = args[3 + argOffset];
        const interpolator = interpolate(inputRange, outputRange, {
            mixer: getMixer(outputRange[0]),
            ...options,
        });
        return useImmediate ? interpolator(inputValue) : interpolator;
    }

    /**
     * @deprecated
     *
     * Import as `frame` instead.
     */
    const sync = frame;
    /**
     * @deprecated
     *
     * Use cancelFrame(callback) instead.
     */
    const cancelSync = stepsOrder.reduce((acc, key) => {
        acc[key] = (process) => cancelFrame(process);
        return acc;
    }, {});

    const { schedule: microtask, cancel: cancelMicrotask } = createRenderBatcher(queueMicrotask, false);

    const compareByDepth = (a, b) => a.depth - b.depth;

    class FlatTree {
        constructor() {
            this.children = [];
            this.isDirty = false;
        }
        add(child) {
            addUniqueItem(this.children, child);
            this.isDirty = true;
        }
        remove(child) {
            removeItem(this.children, child);
            this.isDirty = true;
        }
        forEach(callback) {
            this.isDirty && this.children.sort(compareByDepth);
            this.isDirty = false;
            this.children.forEach(callback);
        }
    }

    const borders = ["TopLeft", "TopRight", "BottomLeft", "BottomRight"];
    const numBorders = borders.length;
    const asNumber = (value) => typeof value === "string" ? parseFloat(value) : value;
    const isPx = (value) => typeof value === "number" || px.test(value);
    function mixValues(target, follow, lead, progress, shouldCrossfadeOpacity, isOnlyMember) {
        if (shouldCrossfadeOpacity) {
            target.opacity = mixNumber$1(0, 
            // TODO Reinstate this if only child
            lead.opacity !== undefined ? lead.opacity : 1, easeCrossfadeIn(progress));
            target.opacityExit = mixNumber$1(follow.opacity !== undefined ? follow.opacity : 1, 0, easeCrossfadeOut(progress));
        }
        else if (isOnlyMember) {
            target.opacity = mixNumber$1(follow.opacity !== undefined ? follow.opacity : 1, lead.opacity !== undefined ? lead.opacity : 1, progress);
        }
        /**
         * Mix border radius
         */
        for (let i = 0; i < numBorders; i++) {
            const borderLabel = `border${borders[i]}Radius`;
            let followRadius = getRadius(follow, borderLabel);
            let leadRadius = getRadius(lead, borderLabel);
            if (followRadius === undefined && leadRadius === undefined)
                continue;
            followRadius || (followRadius = 0);
            leadRadius || (leadRadius = 0);
            const canMix = followRadius === 0 ||
                leadRadius === 0 ||
                isPx(followRadius) === isPx(leadRadius);
            if (canMix) {
                target[borderLabel] = Math.max(mixNumber$1(asNumber(followRadius), asNumber(leadRadius), progress), 0);
                if (percent.test(leadRadius) || percent.test(followRadius)) {
                    target[borderLabel] += "%";
                }
            }
            else {
                target[borderLabel] = leadRadius;
            }
        }
        /**
         * Mix rotation
         */
        if (follow.rotate || lead.rotate) {
            target.rotate = mixNumber$1(follow.rotate || 0, lead.rotate || 0, progress);
        }
    }
    function getRadius(values, radiusName) {
        return values[radiusName] !== undefined
            ? values[radiusName]
            : values.borderRadius;
    }
    // /**
    //  * We only want to mix the background color if there's a follow element
    //  * that we're not crossfading opacity between. For instance with switch
    //  * AnimateSharedLayout animations, this helps the illusion of a continuous
    //  * element being animated but also cuts down on the number of paints triggered
    //  * for elements where opacity is doing that work for us.
    //  */
    // if (
    //     !hasFollowElement &&
    //     latestLeadValues.backgroundColor &&
    //     latestFollowValues.backgroundColor
    // ) {
    //     /**
    //      * This isn't ideal performance-wise as mixColor is creating a new function every frame.
    //      * We could probably create a mixer that runs at the start of the animation but
    //      * the idea behind the crossfader is that it runs dynamically between two potentially
    //      * changing targets (ie opacity or borderRadius may be animating independently via variants)
    //      */
    //     leadState.backgroundColor = followState.backgroundColor = mixColor(
    //         latestFollowValues.backgroundColor as string,
    //         latestLeadValues.backgroundColor as string
    //     )(p)
    // }
    const easeCrossfadeIn = /*@__PURE__*/ compress(0, 0.5, circOut);
    const easeCrossfadeOut = /*@__PURE__*/ compress(0.5, 0.95, noop);
    function compress(min, max, easing) {
        return (p) => {
            // Could replace ifs with clamp
            if (p < min)
                return 0;
            if (p > max)
                return 1;
            return easing(progress(min, max, p));
        };
    }

    /**
     * Reset an axis to the provided origin box.
     *
     * This is a mutative operation.
     */
    function copyAxisInto(axis, originAxis) {
        axis.min = originAxis.min;
        axis.max = originAxis.max;
    }
    /**
     * Reset a box to the provided origin box.
     *
     * This is a mutative operation.
     */
    function copyBoxInto(box, originBox) {
        copyAxisInto(box.x, originBox.x);
        copyAxisInto(box.y, originBox.y);
    }
    /**
     * Reset a delta to the provided origin box.
     *
     * This is a mutative operation.
     */
    function copyAxisDeltaInto(delta, originDelta) {
        delta.translate = originDelta.translate;
        delta.scale = originDelta.scale;
        delta.originPoint = originDelta.originPoint;
        delta.origin = originDelta.origin;
    }

    /**
     * Remove a delta from a point. This is essentially the steps of applyPointDelta in reverse
     */
    function removePointDelta(point, translate, scale, originPoint, boxScale) {
        point -= translate;
        point = scalePoint(point, 1 / scale, originPoint);
        if (boxScale !== undefined) {
            point = scalePoint(point, 1 / boxScale, originPoint);
        }
        return point;
    }
    /**
     * Remove a delta from an axis. This is essentially the steps of applyAxisDelta in reverse
     */
    function removeAxisDelta(axis, translate = 0, scale = 1, origin = 0.5, boxScale, originAxis = axis, sourceAxis = axis) {
        if (percent.test(translate)) {
            translate = parseFloat(translate);
            const relativeProgress = mixNumber$1(sourceAxis.min, sourceAxis.max, translate / 100);
            translate = relativeProgress - sourceAxis.min;
        }
        if (typeof translate !== "number")
            return;
        let originPoint = mixNumber$1(originAxis.min, originAxis.max, origin);
        if (axis === originAxis)
            originPoint -= translate;
        axis.min = removePointDelta(axis.min, translate, scale, originPoint, boxScale);
        axis.max = removePointDelta(axis.max, translate, scale, originPoint, boxScale);
    }
    /**
     * Remove a transforms from an axis. This is essentially the steps of applyAxisTransforms in reverse
     * and acts as a bridge between motion values and removeAxisDelta
     */
    function removeAxisTransforms(axis, transforms, [key, scaleKey, originKey], origin, sourceAxis) {
        removeAxisDelta(axis, transforms[key], transforms[scaleKey], transforms[originKey], transforms.scale, origin, sourceAxis);
    }
    /**
     * The names of the motion values we want to apply as translation, scale and origin.
     */
    const xKeys = ["x", "scaleX", "originX"];
    const yKeys = ["y", "scaleY", "originY"];
    /**
     * Remove a transforms from an box. This is essentially the steps of applyAxisBox in reverse
     * and acts as a bridge between motion values and removeAxisDelta
     */
    function removeBoxTransforms(box, transforms, originBox, sourceBox) {
        removeAxisTransforms(box.x, transforms, xKeys, originBox ? originBox.x : undefined, sourceBox ? sourceBox.x : undefined);
        removeAxisTransforms(box.y, transforms, yKeys, originBox ? originBox.y : undefined, sourceBox ? sourceBox.y : undefined);
    }

    function isAxisDeltaZero(delta) {
        return delta.translate === 0 && delta.scale === 1;
    }
    function isDeltaZero(delta) {
        return isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y);
    }
    function axisEquals(a, b) {
        return a.min === b.min && a.max === b.max;
    }
    function boxEquals(a, b) {
        return axisEquals(a.x, b.x) && axisEquals(a.y, b.y);
    }
    function axisEqualsRounded(a, b) {
        return (Math.round(a.min) === Math.round(b.min) &&
            Math.round(a.max) === Math.round(b.max));
    }
    function boxEqualsRounded(a, b) {
        return axisEqualsRounded(a.x, b.x) && axisEqualsRounded(a.y, b.y);
    }
    function aspectRatio(box) {
        return calcLength(box.x) / calcLength(box.y);
    }
    function axisDeltaEquals(a, b) {
        return (a.translate === b.translate &&
            a.scale === b.scale &&
            a.originPoint === b.originPoint);
    }

    class NodeStack {
        constructor() {
            this.members = [];
        }
        add(node) {
            addUniqueItem(this.members, node);
            node.scheduleRender();
        }
        remove(node) {
            removeItem(this.members, node);
            if (node === this.prevLead) {
                this.prevLead = undefined;
            }
            if (node === this.lead) {
                const prevLead = this.members[this.members.length - 1];
                if (prevLead) {
                    this.promote(prevLead);
                }
            }
        }
        relegate(node) {
            const indexOfNode = this.members.findIndex((member) => node === member);
            if (indexOfNode === 0)
                return false;
            /**
             * Find the next projection node that is present
             */
            let prevLead;
            for (let i = indexOfNode; i >= 0; i--) {
                const member = this.members[i];
                if (member.isPresent !== false) {
                    prevLead = member;
                    break;
                }
            }
            if (prevLead) {
                this.promote(prevLead);
                return true;
            }
            else {
                return false;
            }
        }
        promote(node, preserveFollowOpacity) {
            const prevLead = this.lead;
            if (node === prevLead)
                return;
            this.prevLead = prevLead;
            this.lead = node;
            node.show();
            if (prevLead) {
                prevLead.instance && prevLead.scheduleRender();
                node.scheduleRender();
                node.resumeFrom = prevLead;
                if (preserveFollowOpacity) {
                    node.resumeFrom.preserveOpacity = true;
                }
                if (prevLead.snapshot) {
                    node.snapshot = prevLead.snapshot;
                    node.snapshot.latestValues =
                        prevLead.animationValues || prevLead.latestValues;
                }
                if (node.root && node.root.isUpdating) {
                    node.isLayoutDirty = true;
                }
                const { crossfade } = node.options;
                if (crossfade === false) {
                    prevLead.hide();
                }
                /**
                 * TODO:
                 *   - Test border radius when previous node was deleted
                 *   - boxShadow mixing
                 *   - Shared between element A in scrolled container and element B (scroll stays the same or changes)
                 *   - Shared between element A in transformed container and element B (transform stays the same or changes)
                 *   - Shared between element A in scrolled page and element B (scroll stays the same or changes)
                 * ---
                 *   - Crossfade opacity of root nodes
                 *   - layoutId changes after animation
                 *   - layoutId changes mid animation
                 */
            }
        }
        exitAnimationComplete() {
            this.members.forEach((node) => {
                const { options, resumingFrom } = node;
                options.onExitComplete && options.onExitComplete();
                if (resumingFrom) {
                    resumingFrom.options.onExitComplete &&
                        resumingFrom.options.onExitComplete();
                }
            });
        }
        scheduleRender() {
            this.members.forEach((node) => {
                node.instance && node.scheduleRender(false);
            });
        }
        /**
         * Clear any leads that have been removed this render to prevent them from being
         * used in future animations and to prevent memory leaks
         */
        removeLeadSnapshot() {
            if (this.lead && this.lead.snapshot) {
                this.lead.snapshot = undefined;
            }
        }
    }

    function buildProjectionTransform(delta, treeScale, latestTransform) {
        let transform = "";
        /**
         * The translations we use to calculate are always relative to the viewport coordinate space.
         * But when we apply scales, we also scale the coordinate space of an element and its children.
         * For instance if we have a treeScale (the culmination of all parent scales) of 0.5 and we need
         * to move an element 100 pixels, we actually need to move it 200 in within that scaled space.
         */
        const xTranslate = delta.x.translate / treeScale.x;
        const yTranslate = delta.y.translate / treeScale.y;
        const zTranslate = (latestTransform === null || latestTransform === void 0 ? void 0 : latestTransform.z) || 0;
        if (xTranslate || yTranslate || zTranslate) {
            transform = `translate3d(${xTranslate}px, ${yTranslate}px, ${zTranslate}px) `;
        }
        /**
         * Apply scale correction for the tree transform.
         * This will apply scale to the screen-orientated axes.
         */
        if (treeScale.x !== 1 || treeScale.y !== 1) {
            transform += `scale(${1 / treeScale.x}, ${1 / treeScale.y}) `;
        }
        if (latestTransform) {
            const { transformPerspective, rotate, rotateX, rotateY, skewX, skewY } = latestTransform;
            if (transformPerspective)
                transform = `perspective(${transformPerspective}px) ${transform}`;
            if (rotate)
                transform += `rotate(${rotate}deg) `;
            if (rotateX)
                transform += `rotateX(${rotateX}deg) `;
            if (rotateY)
                transform += `rotateY(${rotateY}deg) `;
            if (skewX)
                transform += `skewX(${skewX}deg) `;
            if (skewY)
                transform += `skewY(${skewY}deg) `;
        }
        /**
         * Apply scale to match the size of the element to the size we want it.
         * This will apply scale to the element-orientated axes.
         */
        const elementScaleX = delta.x.scale * treeScale.x;
        const elementScaleY = delta.y.scale * treeScale.y;
        if (elementScaleX !== 1 || elementScaleY !== 1) {
            transform += `scale(${elementScaleX}, ${elementScaleY})`;
        }
        return transform || "none";
    }

    function eachAxis(callback) {
        return [callback("x"), callback("y")];
    }

    /**
     * This should only ever be modified on the client otherwise it'll
     * persist through server requests. If we need instanced states we
     * could lazy-init via root.
     */
    const globalProjectionState = {
        /**
         * Global flag as to whether the tree has animated since the last time
         * we resized the window
         */
        hasAnimatedSinceResize: true,
        /**
         * We set this to true once, on the first update. Any nodes added to the tree beyond that
         * update will be given a `data-projection-id` attribute.
         */
        hasEverUpdated: false,
    };

    const metrics = {
        type: "projectionFrame",
        totalNodes: 0,
        resolvedTargetDeltas: 0,
        recalculatedProjection: 0,
    };
    const isDebug = typeof window !== "undefined" && window.MotionDebug !== undefined;
    const transformAxes = ["", "X", "Y", "Z"];
    const hiddenVisibility = { visibility: "hidden" };
    /**
     * We use 1000 as the animation target as 0-1000 maps better to pixels than 0-1
     * which has a noticeable difference in spring animations
     */
    const animationTarget = 1000;
    let id$1 = 0;
    function resetDistortingTransform(key, visualElement, values, sharedAnimationValues) {
        const { latestValues } = visualElement;
        // Record the distorting transform and then temporarily set it to 0
        if (latestValues[key]) {
            values[key] = latestValues[key];
            visualElement.setStaticValue(key, 0);
            if (sharedAnimationValues) {
                sharedAnimationValues[key] = 0;
            }
        }
    }
    function cancelTreeOptimisedTransformAnimations(projectionNode) {
        projectionNode.hasCheckedOptimisedAppear = true;
        if (projectionNode.root === projectionNode)
            return;
        const { visualElement } = projectionNode.options;
        if (!visualElement)
            return;
        const appearId = getOptimisedAppearId(visualElement);
        if (window.MotionHasOptimisedAnimation(appearId, "transform")) {
            const { layout, layoutId } = projectionNode.options;
            window.MotionCancelOptimisedAnimation(appearId, "transform", frame, !(layout || layoutId));
        }
        const { parent } = projectionNode;
        if (parent && !parent.hasCheckedOptimisedAppear) {
            cancelTreeOptimisedTransformAnimations(parent);
        }
    }
    function createProjectionNode$1({ attachResizeListener, defaultParent, measureScroll, checkIsScrollRoot, resetTransform, }) {
        return class ProjectionNode {
            constructor(latestValues = {}, parent = defaultParent === null || defaultParent === void 0 ? void 0 : defaultParent()) {
                /**
                 * A unique ID generated for every projection node.
                 */
                this.id = id$1++;
                /**
                 * An id that represents a unique session instigated by startUpdate.
                 */
                this.animationId = 0;
                /**
                 * A Set containing all this component's children. This is used to iterate
                 * through the children.
                 *
                 * TODO: This could be faster to iterate as a flat array stored on the root node.
                 */
                this.children = new Set();
                /**
                 * Options for the node. We use this to configure what kind of layout animations
                 * we should perform (if any).
                 */
                this.options = {};
                /**
                 * We use this to detect when its safe to shut down part of a projection tree.
                 * We have to keep projecting children for scale correction and relative projection
                 * until all their parents stop performing layout animations.
                 */
                this.isTreeAnimating = false;
                this.isAnimationBlocked = false;
                /**
                 * Flag to true if we think this layout has been changed. We can't always know this,
                 * currently we set it to true every time a component renders, or if it has a layoutDependency
                 * if that has changed between renders. Additionally, components can be grouped by LayoutGroup
                 * and if one node is dirtied, they all are.
                 */
                this.isLayoutDirty = false;
                /**
                 * Flag to true if we think the projection calculations for this node needs
                 * recalculating as a result of an updated transform or layout animation.
                 */
                this.isProjectionDirty = false;
                /**
                 * Flag to true if the layout *or* transform has changed. This then gets propagated
                 * throughout the projection tree, forcing any element below to recalculate on the next frame.
                 */
                this.isSharedProjectionDirty = false;
                /**
                 * Flag transform dirty. This gets propagated throughout the whole tree but is only
                 * respected by shared nodes.
                 */
                this.isTransformDirty = false;
                /**
                 * Block layout updates for instant layout transitions throughout the tree.
                 */
                this.updateManuallyBlocked = false;
                this.updateBlockedByResize = false;
                /**
                 * Set to true between the start of the first `willUpdate` call and the end of the `didUpdate`
                 * call.
                 */
                this.isUpdating = false;
                /**
                 * If this is an SVG element we currently disable projection transforms
                 */
                this.isSVG = false;
                /**
                 * Flag to true (during promotion) if a node doing an instant layout transition needs to reset
                 * its projection styles.
                 */
                this.needsReset = false;
                /**
                 * Flags whether this node should have its transform reset prior to measuring.
                 */
                this.shouldResetTransform = false;
                /**
                 * Store whether this node has been checked for optimised appear animations. As
                 * effects fire bottom-up, and we want to look up the tree for appear animations,
                 * this makes sure we only check each path once, stopping at nodes that
                 * have already been checked.
                 */
                this.hasCheckedOptimisedAppear = false;
                /**
                 * An object representing the calculated contextual/accumulated/tree scale.
                 * This will be used to scale calculcated projection transforms, as these are
                 * calculated in screen-space but need to be scaled for elements to layoutly
                 * make it to their calculated destinations.
                 *
                 * TODO: Lazy-init
                 */
                this.treeScale = { x: 1, y: 1 };
                /**
                 *
                 */
                this.eventHandlers = new Map();
                this.hasTreeAnimated = false;
                // Note: Currently only running on root node
                this.updateScheduled = false;
                this.scheduleUpdate = () => this.update();
                this.projectionUpdateScheduled = false;
                this.checkUpdateFailed = () => {
                    if (this.isUpdating) {
                        this.isUpdating = false;
                        this.clearAllSnapshots();
                    }
                };
                /**
                 * This is a multi-step process as shared nodes might be of different depths. Nodes
                 * are sorted by depth order, so we need to resolve the entire tree before moving to
                 * the next step.
                 */
                this.updateProjection = () => {
                    this.projectionUpdateScheduled = false;
                    /**
                     * Reset debug counts. Manually resetting rather than creating a new
                     * object each frame.
                     */
                    if (isDebug) {
                        metrics.totalNodes =
                            metrics.resolvedTargetDeltas =
                                metrics.recalculatedProjection =
                                    0;
                    }
                    this.nodes.forEach(propagateDirtyNodes);
                    this.nodes.forEach(resolveTargetDelta);
                    this.nodes.forEach(calcProjection);
                    this.nodes.forEach(cleanDirtyNodes);
                    if (isDebug) {
                        window.MotionDebug.record(metrics);
                    }
                };
                /**
                 * Frame calculations
                 */
                this.resolvedRelativeTargetAt = 0.0;
                this.hasProjected = false;
                this.isVisible = true;
                this.animationProgress = 0;
                /**
                 * Shared layout
                 */
                // TODO Only running on root node
                this.sharedNodes = new Map();
                this.latestValues = latestValues;
                this.root = parent ? parent.root || parent : this;
                this.path = parent ? [...parent.path, parent] : [];
                this.parent = parent;
                this.depth = parent ? parent.depth + 1 : 0;
                for (let i = 0; i < this.path.length; i++) {
                    this.path[i].shouldResetTransform = true;
                }
                if (this.root === this)
                    this.nodes = new FlatTree();
            }
            addEventListener(name, handler) {
                if (!this.eventHandlers.has(name)) {
                    this.eventHandlers.set(name, new SubscriptionManager());
                }
                return this.eventHandlers.get(name).add(handler);
            }
            notifyListeners(name, ...args) {
                const subscriptionManager = this.eventHandlers.get(name);
                subscriptionManager && subscriptionManager.notify(...args);
            }
            hasListeners(name) {
                return this.eventHandlers.has(name);
            }
            /**
             * Lifecycles
             */
            mount(instance, isLayoutDirty = this.root.hasTreeAnimated) {
                if (this.instance)
                    return;
                this.isSVG = isSVGElement(instance);
                this.instance = instance;
                const { layoutId, layout, visualElement } = this.options;
                if (visualElement && !visualElement.current) {
                    visualElement.mount(instance);
                }
                this.root.nodes.add(this);
                this.parent && this.parent.children.add(this);
                if (isLayoutDirty && (layout || layoutId)) {
                    this.isLayoutDirty = true;
                }
                if (attachResizeListener) {
                    let cancelDelay;
                    const resizeUnblockUpdate = () => (this.root.updateBlockedByResize = false);
                    attachResizeListener(instance, () => {
                        this.root.updateBlockedByResize = true;
                        cancelDelay && cancelDelay();
                        cancelDelay = delay(resizeUnblockUpdate, 250);
                        if (globalProjectionState.hasAnimatedSinceResize) {
                            globalProjectionState.hasAnimatedSinceResize = false;
                            this.nodes.forEach(finishAnimation);
                        }
                    });
                }
                if (layoutId) {
                    this.root.registerSharedNode(layoutId, this);
                }
                // Only register the handler if it requires layout animation
                if (this.options.animate !== false &&
                    visualElement &&
                    (layoutId || layout)) {
                    this.addEventListener("didUpdate", ({ delta, hasLayoutChanged, hasRelativeTargetChanged, layout: newLayout, }) => {
                        if (this.isTreeAnimationBlocked()) {
                            this.target = undefined;
                            this.relativeTarget = undefined;
                            return;
                        }
                        // TODO: Check here if an animation exists
                        const layoutTransition = this.options.transition ||
                            visualElement.getDefaultTransition() ||
                            defaultLayoutTransition;
                        const { onLayoutAnimationStart, onLayoutAnimationComplete, } = visualElement.getProps();
                        /**
                         * The target layout of the element might stay the same,
                         * but its position relative to its parent has changed.
                         */
                        const targetChanged = !this.targetLayout ||
                            !boxEqualsRounded(this.targetLayout, newLayout) ||
                            hasRelativeTargetChanged;
                        /**
                         * If the layout hasn't seemed to have changed, it might be that the
                         * element is visually in the same place in the document but its position
                         * relative to its parent has indeed changed. So here we check for that.
                         */
                        const hasOnlyRelativeTargetChanged = !hasLayoutChanged && hasRelativeTargetChanged;
                        if (this.options.layoutRoot ||
                            (this.resumeFrom && this.resumeFrom.instance) ||
                            hasOnlyRelativeTargetChanged ||
                            (hasLayoutChanged &&
                                (targetChanged || !this.currentAnimation))) {
                            if (this.resumeFrom) {
                                this.resumingFrom = this.resumeFrom;
                                this.resumingFrom.resumingFrom = undefined;
                            }
                            this.setAnimationOrigin(delta, hasOnlyRelativeTargetChanged);
                            const animationOptions = {
                                ...getValueTransition$1(layoutTransition, "layout"),
                                onPlay: onLayoutAnimationStart,
                                onComplete: onLayoutAnimationComplete,
                            };
                            if (visualElement.shouldReduceMotion ||
                                this.options.layoutRoot) {
                                animationOptions.delay = 0;
                                animationOptions.type = false;
                            }
                            this.startAnimation(animationOptions);
                        }
                        else {
                            /**
                             * If the layout hasn't changed and we have an animation that hasn't started yet,
                             * finish it immediately. Otherwise it will be animating from a location
                             * that was probably never commited to screen and look like a jumpy box.
                             */
                            if (!hasLayoutChanged) {
                                finishAnimation(this);
                            }
                            if (this.isLead() && this.options.onExitComplete) {
                                this.options.onExitComplete();
                            }
                        }
                        this.targetLayout = newLayout;
                    });
                }
            }
            unmount() {
                this.options.layoutId && this.willUpdate();
                this.root.nodes.remove(this);
                const stack = this.getStack();
                stack && stack.remove(this);
                this.parent && this.parent.children.delete(this);
                this.instance = undefined;
                cancelFrame(this.updateProjection);
            }
            // only on the root
            blockUpdate() {
                this.updateManuallyBlocked = true;
            }
            unblockUpdate() {
                this.updateManuallyBlocked = false;
            }
            isUpdateBlocked() {
                return this.updateManuallyBlocked || this.updateBlockedByResize;
            }
            isTreeAnimationBlocked() {
                return (this.isAnimationBlocked ||
                    (this.parent && this.parent.isTreeAnimationBlocked()) ||
                    false);
            }
            // Note: currently only running on root node
            startUpdate() {
                if (this.isUpdateBlocked())
                    return;
                this.isUpdating = true;
                this.nodes && this.nodes.forEach(resetSkewAndRotation);
                this.animationId++;
            }
            getTransformTemplate() {
                const { visualElement } = this.options;
                return visualElement && visualElement.getProps().transformTemplate;
            }
            willUpdate(shouldNotifyListeners = true) {
                this.root.hasTreeAnimated = true;
                if (this.root.isUpdateBlocked()) {
                    this.options.onExitComplete && this.options.onExitComplete();
                    return;
                }
                /**
                 * If we're running optimised appear animations then these must be
                 * cancelled before measuring the DOM. This is so we can measure
                 * the true layout of the element rather than the WAAPI animation
                 * which will be unaffected by the resetSkewAndRotate step.
                 *
                 * Note: This is a DOM write. Worst case scenario is this is sandwiched
                 * between other snapshot reads which will cause unnecessary style recalculations.
                 * This has to happen here though, as we don't yet know which nodes will need
                 * snapshots in startUpdate(), but we only want to cancel optimised animations
                 * if a layout animation measurement is actually going to be affected by them.
                 */
                if (window.MotionCancelOptimisedAnimation &&
                    !this.hasCheckedOptimisedAppear) {
                    cancelTreeOptimisedTransformAnimations(this);
                }
                !this.root.isUpdating && this.root.startUpdate();
                if (this.isLayoutDirty)
                    return;
                this.isLayoutDirty = true;
                for (let i = 0; i < this.path.length; i++) {
                    const node = this.path[i];
                    node.shouldResetTransform = true;
                    node.updateScroll("snapshot");
                    if (node.options.layoutRoot) {
                        node.willUpdate(false);
                    }
                }
                const { layoutId, layout } = this.options;
                if (layoutId === undefined && !layout)
                    return;
                const transformTemplate = this.getTransformTemplate();
                this.prevTransformTemplateValue = transformTemplate
                    ? transformTemplate(this.latestValues, "")
                    : undefined;
                this.updateSnapshot();
                shouldNotifyListeners && this.notifyListeners("willUpdate");
            }
            update() {
                this.updateScheduled = false;
                const updateWasBlocked = this.isUpdateBlocked();
                // When doing an instant transition, we skip the layout update,
                // but should still clean up the measurements so that the next
                // snapshot could be taken correctly.
                if (updateWasBlocked) {
                    this.unblockUpdate();
                    this.clearAllSnapshots();
                    this.nodes.forEach(clearMeasurements);
                    return;
                }
                if (!this.isUpdating) {
                    this.nodes.forEach(clearIsLayoutDirty);
                }
                this.isUpdating = false;
                /**
                 * Write
                 */
                this.nodes.forEach(resetTransformStyle);
                /**
                 * Read ==================
                 */
                // Update layout measurements of updated children
                this.nodes.forEach(updateLayout);
                /**
                 * Write
                 */
                // Notify listeners that the layout is updated
                this.nodes.forEach(notifyLayoutUpdate);
                this.clearAllSnapshots();
                /**
                 * Manually flush any pending updates. Ideally
                 * we could leave this to the following requestAnimationFrame but this seems
                 * to leave a flash of incorrectly styled content.
                 */
                const now = time.now();
                frameData.delta = clamp(0, 1000 / 60, now - frameData.timestamp);
                frameData.timestamp = now;
                frameData.isProcessing = true;
                frameSteps.update.process(frameData);
                frameSteps.preRender.process(frameData);
                frameSteps.render.process(frameData);
                frameData.isProcessing = false;
            }
            didUpdate() {
                if (!this.updateScheduled) {
                    this.updateScheduled = true;
                    microtask.read(this.scheduleUpdate);
                }
            }
            clearAllSnapshots() {
                this.nodes.forEach(clearSnapshot);
                this.sharedNodes.forEach(removeLeadSnapshots);
            }
            scheduleUpdateProjection() {
                if (!this.projectionUpdateScheduled) {
                    this.projectionUpdateScheduled = true;
                    frame.preRender(this.updateProjection, false, true);
                }
            }
            scheduleCheckAfterUnmount() {
                /**
                 * If the unmounting node is in a layoutGroup and did trigger a willUpdate,
                 * we manually call didUpdate to give a chance to the siblings to animate.
                 * Otherwise, cleanup all snapshots to prevents future nodes from reusing them.
                 */
                frame.postRender(() => {
                    if (this.isLayoutDirty) {
                        this.root.didUpdate();
                    }
                    else {
                        this.root.checkUpdateFailed();
                    }
                });
            }
            /**
             * Update measurements
             */
            updateSnapshot() {
                if (this.snapshot || !this.instance)
                    return;
                this.snapshot = this.measure();
            }
            updateLayout() {
                if (!this.instance)
                    return;
                // TODO: Incorporate into a forwarded scroll offset
                this.updateScroll();
                if (!(this.options.alwaysMeasureLayout && this.isLead()) &&
                    !this.isLayoutDirty) {
                    return;
                }
                /**
                 * When a node is mounted, it simply resumes from the prevLead's
                 * snapshot instead of taking a new one, but the ancestors scroll
                 * might have updated while the prevLead is unmounted. We need to
                 * update the scroll again to make sure the layout we measure is
                 * up to date.
                 */
                if (this.resumeFrom && !this.resumeFrom.instance) {
                    for (let i = 0; i < this.path.length; i++) {
                        const node = this.path[i];
                        node.updateScroll();
                    }
                }
                const prevLayout = this.layout;
                this.layout = this.measure(false);
                this.layoutCorrected = createBox();
                this.isLayoutDirty = false;
                this.projectionDelta = undefined;
                this.notifyListeners("measure", this.layout.layoutBox);
                const { visualElement } = this.options;
                visualElement &&
                    visualElement.notify("LayoutMeasure", this.layout.layoutBox, prevLayout ? prevLayout.layoutBox : undefined);
            }
            updateScroll(phase = "measure") {
                let needsMeasurement = Boolean(this.options.layoutScroll && this.instance);
                if (this.scroll &&
                    this.scroll.animationId === this.root.animationId &&
                    this.scroll.phase === phase) {
                    needsMeasurement = false;
                }
                if (needsMeasurement) {
                    const isRoot = checkIsScrollRoot(this.instance);
                    this.scroll = {
                        animationId: this.root.animationId,
                        phase,
                        isRoot,
                        offset: measureScroll(this.instance),
                        wasRoot: this.scroll ? this.scroll.isRoot : isRoot,
                    };
                }
            }
            resetTransform() {
                if (!resetTransform)
                    return;
                const isResetRequested = this.isLayoutDirty ||
                    this.shouldResetTransform ||
                    this.options.alwaysMeasureLayout;
                const hasProjection = this.projectionDelta && !isDeltaZero(this.projectionDelta);
                const transformTemplate = this.getTransformTemplate();
                const transformTemplateValue = transformTemplate
                    ? transformTemplate(this.latestValues, "")
                    : undefined;
                const transformTemplateHasChanged = transformTemplateValue !== this.prevTransformTemplateValue;
                if (isResetRequested &&
                    (hasProjection ||
                        hasTransform(this.latestValues) ||
                        transformTemplateHasChanged)) {
                    resetTransform(this.instance, transformTemplateValue);
                    this.shouldResetTransform = false;
                    this.scheduleRender();
                }
            }
            measure(removeTransform = true) {
                const pageBox = this.measurePageBox();
                let layoutBox = this.removeElementScroll(pageBox);
                /**
                 * Measurements taken during the pre-render stage
                 * still have transforms applied so we remove them
                 * via calculation.
                 */
                if (removeTransform) {
                    layoutBox = this.removeTransform(layoutBox);
                }
                roundBox(layoutBox);
                return {
                    animationId: this.root.animationId,
                    measuredBox: pageBox,
                    layoutBox,
                    latestValues: {},
                    source: this.id,
                };
            }
            measurePageBox() {
                var _a;
                const { visualElement } = this.options;
                if (!visualElement)
                    return createBox();
                const box = visualElement.measureViewportBox();
                const wasInScrollRoot = ((_a = this.scroll) === null || _a === void 0 ? void 0 : _a.wasRoot) || this.path.some(checkNodeWasScrollRoot);
                if (!wasInScrollRoot) {
                    // Remove viewport scroll to give page-relative coordinates
                    const { scroll } = this.root;
                    if (scroll) {
                        translateAxis(box.x, scroll.offset.x);
                        translateAxis(box.y, scroll.offset.y);
                    }
                }
                return box;
            }
            removeElementScroll(box) {
                var _a;
                const boxWithoutScroll = createBox();
                copyBoxInto(boxWithoutScroll, box);
                if ((_a = this.scroll) === null || _a === void 0 ? void 0 : _a.wasRoot) {
                    return boxWithoutScroll;
                }
                /**
                 * Performance TODO: Keep a cumulative scroll offset down the tree
                 * rather than loop back up the path.
                 */
                for (let i = 0; i < this.path.length; i++) {
                    const node = this.path[i];
                    const { scroll, options } = node;
                    if (node !== this.root && scroll && options.layoutScroll) {
                        /**
                         * If this is a new scroll root, we want to remove all previous scrolls
                         * from the viewport box.
                         */
                        if (scroll.wasRoot) {
                            copyBoxInto(boxWithoutScroll, box);
                        }
                        translateAxis(boxWithoutScroll.x, scroll.offset.x);
                        translateAxis(boxWithoutScroll.y, scroll.offset.y);
                    }
                }
                return boxWithoutScroll;
            }
            applyTransform(box, transformOnly = false) {
                const withTransforms = createBox();
                copyBoxInto(withTransforms, box);
                for (let i = 0; i < this.path.length; i++) {
                    const node = this.path[i];
                    if (!transformOnly &&
                        node.options.layoutScroll &&
                        node.scroll &&
                        node !== node.root) {
                        transformBox(withTransforms, {
                            x: -node.scroll.offset.x,
                            y: -node.scroll.offset.y,
                        });
                    }
                    if (!hasTransform(node.latestValues))
                        continue;
                    transformBox(withTransforms, node.latestValues);
                }
                if (hasTransform(this.latestValues)) {
                    transformBox(withTransforms, this.latestValues);
                }
                return withTransforms;
            }
            removeTransform(box) {
                const boxWithoutTransform = createBox();
                copyBoxInto(boxWithoutTransform, box);
                for (let i = 0; i < this.path.length; i++) {
                    const node = this.path[i];
                    if (!node.instance)
                        continue;
                    if (!hasTransform(node.latestValues))
                        continue;
                    hasScale(node.latestValues) && node.updateSnapshot();
                    const sourceBox = createBox();
                    const nodeBox = node.measurePageBox();
                    copyBoxInto(sourceBox, nodeBox);
                    removeBoxTransforms(boxWithoutTransform, node.latestValues, node.snapshot ? node.snapshot.layoutBox : undefined, sourceBox);
                }
                if (hasTransform(this.latestValues)) {
                    removeBoxTransforms(boxWithoutTransform, this.latestValues);
                }
                return boxWithoutTransform;
            }
            setTargetDelta(delta) {
                this.targetDelta = delta;
                this.root.scheduleUpdateProjection();
                this.isProjectionDirty = true;
            }
            setOptions(options) {
                this.options = {
                    ...this.options,
                    ...options,
                    crossfade: options.crossfade !== undefined ? options.crossfade : true,
                };
            }
            clearMeasurements() {
                this.scroll = undefined;
                this.layout = undefined;
                this.snapshot = undefined;
                this.prevTransformTemplateValue = undefined;
                this.targetDelta = undefined;
                this.target = undefined;
                this.isLayoutDirty = false;
            }
            forceRelativeParentToResolveTarget() {
                if (!this.relativeParent)
                    return;
                /**
                 * If the parent target isn't up-to-date, force it to update.
                 * This is an unfortunate de-optimisation as it means any updating relative
                 * projection will cause all the relative parents to recalculate back
                 * up the tree.
                 */
                if (this.relativeParent.resolvedRelativeTargetAt !==
                    frameData.timestamp) {
                    this.relativeParent.resolveTargetDelta(true);
                }
            }
            resolveTargetDelta(forceRecalculation = false) {
                var _a;
                /**
                 * Once the dirty status of nodes has been spread through the tree, we also
                 * need to check if we have a shared node of a different depth that has itself
                 * been dirtied.
                 */
                const lead = this.getLead();
                this.isProjectionDirty || (this.isProjectionDirty = lead.isProjectionDirty);
                this.isTransformDirty || (this.isTransformDirty = lead.isTransformDirty);
                this.isSharedProjectionDirty || (this.isSharedProjectionDirty = lead.isSharedProjectionDirty);
                const isShared = Boolean(this.resumingFrom) || this !== lead;
                /**
                 * We don't use transform for this step of processing so we don't
                 * need to check whether any nodes have changed transform.
                 */
                const canSkip = !(forceRecalculation ||
                    (isShared && this.isSharedProjectionDirty) ||
                    this.isProjectionDirty ||
                    ((_a = this.parent) === null || _a === void 0 ? void 0 : _a.isProjectionDirty) ||
                    this.attemptToResolveRelativeTarget ||
                    this.root.updateBlockedByResize);
                if (canSkip)
                    return;
                const { layout, layoutId } = this.options;
                /**
                 * If we have no layout, we can't perform projection, so early return
                 */
                if (!this.layout || !(layout || layoutId))
                    return;
                this.resolvedRelativeTargetAt = frameData.timestamp;
                /**
                 * If we don't have a targetDelta but do have a layout, we can attempt to resolve
                 * a relativeParent. This will allow a component to perform scale correction
                 * even if no animation has started.
                 */
                if (!this.targetDelta && !this.relativeTarget) {
                    const relativeParent = this.getClosestProjectingParent();
                    if (relativeParent &&
                        relativeParent.layout &&
                        this.animationProgress !== 1) {
                        this.relativeParent = relativeParent;
                        this.forceRelativeParentToResolveTarget();
                        this.relativeTarget = createBox();
                        this.relativeTargetOrigin = createBox();
                        calcRelativePosition(this.relativeTargetOrigin, this.layout.layoutBox, relativeParent.layout.layoutBox);
                        copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
                    }
                    else {
                        this.relativeParent = this.relativeTarget = undefined;
                    }
                }
                /**
                 * If we have no relative target or no target delta our target isn't valid
                 * for this frame.
                 */
                if (!this.relativeTarget && !this.targetDelta)
                    return;
                /**
                 * Lazy-init target data structure
                 */
                if (!this.target) {
                    this.target = createBox();
                    this.targetWithTransforms = createBox();
                }
                /**
                 * If we've got a relative box for this component, resolve it into a target relative to the parent.
                 */
                if (this.relativeTarget &&
                    this.relativeTargetOrigin &&
                    this.relativeParent &&
                    this.relativeParent.target) {
                    this.forceRelativeParentToResolveTarget();
                    calcRelativeBox(this.target, this.relativeTarget, this.relativeParent.target);
                    /**
                     * If we've only got a targetDelta, resolve it into a target
                     */
                }
                else if (this.targetDelta) {
                    if (Boolean(this.resumingFrom)) {
                        // TODO: This is creating a new object every frame
                        this.target = this.applyTransform(this.layout.layoutBox);
                    }
                    else {
                        copyBoxInto(this.target, this.layout.layoutBox);
                    }
                    applyBoxDelta(this.target, this.targetDelta);
                }
                else {
                    /**
                     * If no target, use own layout as target
                     */
                    copyBoxInto(this.target, this.layout.layoutBox);
                }
                /**
                 * If we've been told to attempt to resolve a relative target, do so.
                 */
                if (this.attemptToResolveRelativeTarget) {
                    this.attemptToResolveRelativeTarget = false;
                    const relativeParent = this.getClosestProjectingParent();
                    if (relativeParent &&
                        Boolean(relativeParent.resumingFrom) ===
                            Boolean(this.resumingFrom) &&
                        !relativeParent.options.layoutScroll &&
                        relativeParent.target &&
                        this.animationProgress !== 1) {
                        this.relativeParent = relativeParent;
                        this.forceRelativeParentToResolveTarget();
                        this.relativeTarget = createBox();
                        this.relativeTargetOrigin = createBox();
                        calcRelativePosition(this.relativeTargetOrigin, this.target, relativeParent.target);
                        copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
                    }
                    else {
                        this.relativeParent = this.relativeTarget = undefined;
                    }
                }
                /**
                 * Increase debug counter for resolved target deltas
                 */
                if (isDebug) {
                    metrics.resolvedTargetDeltas++;
                }
            }
            getClosestProjectingParent() {
                if (!this.parent ||
                    hasScale(this.parent.latestValues) ||
                    has2DTranslate(this.parent.latestValues)) {
                    return undefined;
                }
                if (this.parent.isProjecting()) {
                    return this.parent;
                }
                else {
                    return this.parent.getClosestProjectingParent();
                }
            }
            isProjecting() {
                return Boolean((this.relativeTarget ||
                    this.targetDelta ||
                    this.options.layoutRoot) &&
                    this.layout);
            }
            calcProjection() {
                var _a;
                const lead = this.getLead();
                const isShared = Boolean(this.resumingFrom) || this !== lead;
                let canSkip = true;
                /**
                 * If this is a normal layout animation and neither this node nor its nearest projecting
                 * is dirty then we can't skip.
                 */
                if (this.isProjectionDirty || ((_a = this.parent) === null || _a === void 0 ? void 0 : _a.isProjectionDirty)) {
                    canSkip = false;
                }
                /**
                 * If this is a shared layout animation and this node's shared projection is dirty then
                 * we can't skip.
                 */
                if (isShared &&
                    (this.isSharedProjectionDirty || this.isTransformDirty)) {
                    canSkip = false;
                }
                /**
                 * If we have resolved the target this frame we must recalculate the
                 * projection to ensure it visually represents the internal calculations.
                 */
                if (this.resolvedRelativeTargetAt === frameData.timestamp) {
                    canSkip = false;
                }
                if (canSkip)
                    return;
                const { layout, layoutId } = this.options;
                /**
                 * If this section of the tree isn't animating we can
                 * delete our target sources for the following frame.
                 */
                this.isTreeAnimating = Boolean((this.parent && this.parent.isTreeAnimating) ||
                    this.currentAnimation ||
                    this.pendingAnimation);
                if (!this.isTreeAnimating) {
                    this.targetDelta = this.relativeTarget = undefined;
                }
                if (!this.layout || !(layout || layoutId))
                    return;
                /**
                 * Reset the corrected box with the latest values from box, as we're then going
                 * to perform mutative operations on it.
                 */
                copyBoxInto(this.layoutCorrected, this.layout.layoutBox);
                /**
                 * Record previous tree scales before updating.
                 */
                const prevTreeScaleX = this.treeScale.x;
                const prevTreeScaleY = this.treeScale.y;
                /**
                 * Apply all the parent deltas to this box to produce the corrected box. This
                 * is the layout box, as it will appear on screen as a result of the transforms of its parents.
                 */
                applyTreeDeltas(this.layoutCorrected, this.treeScale, this.path, isShared);
                /**
                 * If this layer needs to perform scale correction but doesn't have a target,
                 * use the layout as the target.
                 */
                if (lead.layout &&
                    !lead.target &&
                    (this.treeScale.x !== 1 || this.treeScale.y !== 1)) {
                    lead.target = lead.layout.layoutBox;
                    lead.targetWithTransforms = createBox();
                }
                const { target } = lead;
                if (!target) {
                    /**
                     * If we don't have a target to project into, but we were previously
                     * projecting, we want to remove the stored transform and schedule
                     * a render to ensure the elements reflect the removed transform.
                     */
                    if (this.prevProjectionDelta) {
                        this.createProjectionDeltas();
                        this.scheduleRender();
                    }
                    return;
                }
                if (!this.projectionDelta || !this.prevProjectionDelta) {
                    this.createProjectionDeltas();
                }
                else {
                    copyAxisDeltaInto(this.prevProjectionDelta.x, this.projectionDelta.x);
                    copyAxisDeltaInto(this.prevProjectionDelta.y, this.projectionDelta.y);
                }
                /**
                 * Update the delta between the corrected box and the target box before user-set transforms were applied.
                 * This will allow us to calculate the corrected borderRadius and boxShadow to compensate
                 * for our layout reprojection, but still allow them to be scaled correctly by the user.
                 * It might be that to simplify this we may want to accept that user-set scale is also corrected
                 * and we wouldn't have to keep and calc both deltas, OR we could support a user setting
                 * to allow people to choose whether these styles are corrected based on just the
                 * layout reprojection or the final bounding box.
                 */
                calcBoxDelta(this.projectionDelta, this.layoutCorrected, target, this.latestValues);
                if (this.treeScale.x !== prevTreeScaleX ||
                    this.treeScale.y !== prevTreeScaleY ||
                    !axisDeltaEquals(this.projectionDelta.x, this.prevProjectionDelta.x) ||
                    !axisDeltaEquals(this.projectionDelta.y, this.prevProjectionDelta.y)) {
                    this.hasProjected = true;
                    this.scheduleRender();
                    this.notifyListeners("projectionUpdate", target);
                }
                /**
                 * Increase debug counter for recalculated projections
                 */
                if (isDebug) {
                    metrics.recalculatedProjection++;
                }
            }
            hide() {
                this.isVisible = false;
                // TODO: Schedule render
            }
            show() {
                this.isVisible = true;
                // TODO: Schedule render
            }
            scheduleRender(notifyAll = true) {
                var _a;
                (_a = this.options.visualElement) === null || _a === void 0 ? void 0 : _a.scheduleRender();
                if (notifyAll) {
                    const stack = this.getStack();
                    stack && stack.scheduleRender();
                }
                if (this.resumingFrom && !this.resumingFrom.instance) {
                    this.resumingFrom = undefined;
                }
            }
            createProjectionDeltas() {
                this.prevProjectionDelta = createDelta();
                this.projectionDelta = createDelta();
                this.projectionDeltaWithTransform = createDelta();
            }
            setAnimationOrigin(delta, hasOnlyRelativeTargetChanged = false) {
                const snapshot = this.snapshot;
                const snapshotLatestValues = snapshot
                    ? snapshot.latestValues
                    : {};
                const mixedValues = { ...this.latestValues };
                const targetDelta = createDelta();
                if (!this.relativeParent ||
                    !this.relativeParent.options.layoutRoot) {
                    this.relativeTarget = this.relativeTargetOrigin = undefined;
                }
                this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged;
                const relativeLayout = createBox();
                const snapshotSource = snapshot ? snapshot.source : undefined;
                const layoutSource = this.layout ? this.layout.source : undefined;
                const isSharedLayoutAnimation = snapshotSource !== layoutSource;
                const stack = this.getStack();
                const isOnlyMember = !stack || stack.members.length <= 1;
                const shouldCrossfadeOpacity = Boolean(isSharedLayoutAnimation &&
                    !isOnlyMember &&
                    this.options.crossfade === true &&
                    !this.path.some(hasOpacityCrossfade));
                this.animationProgress = 0;
                let prevRelativeTarget;
                this.mixTargetDelta = (latest) => {
                    const progress = latest / 1000;
                    mixAxisDelta(targetDelta.x, delta.x, progress);
                    mixAxisDelta(targetDelta.y, delta.y, progress);
                    this.setTargetDelta(targetDelta);
                    if (this.relativeTarget &&
                        this.relativeTargetOrigin &&
                        this.layout &&
                        this.relativeParent &&
                        this.relativeParent.layout) {
                        calcRelativePosition(relativeLayout, this.layout.layoutBox, this.relativeParent.layout.layoutBox);
                        mixBox(this.relativeTarget, this.relativeTargetOrigin, relativeLayout, progress);
                        /**
                         * If this is an unchanged relative target we can consider the
                         * projection not dirty.
                         */
                        if (prevRelativeTarget &&
                            boxEquals(this.relativeTarget, prevRelativeTarget)) {
                            this.isProjectionDirty = false;
                        }
                        if (!prevRelativeTarget)
                            prevRelativeTarget = createBox();
                        copyBoxInto(prevRelativeTarget, this.relativeTarget);
                    }
                    if (isSharedLayoutAnimation) {
                        this.animationValues = mixedValues;
                        mixValues(mixedValues, snapshotLatestValues, this.latestValues, progress, shouldCrossfadeOpacity, isOnlyMember);
                    }
                    this.root.scheduleUpdateProjection();
                    this.scheduleRender();
                    this.animationProgress = progress;
                };
                this.mixTargetDelta(this.options.layoutRoot ? 1000 : 0);
            }
            startAnimation(options) {
                this.notifyListeners("animationStart");
                this.currentAnimation && this.currentAnimation.stop();
                if (this.resumingFrom && this.resumingFrom.currentAnimation) {
                    this.resumingFrom.currentAnimation.stop();
                }
                if (this.pendingAnimation) {
                    cancelFrame(this.pendingAnimation);
                    this.pendingAnimation = undefined;
                }
                /**
                 * Start the animation in the next frame to have a frame with progress 0,
                 * where the target is the same as when the animation started, so we can
                 * calculate the relative positions correctly for instant transitions.
                 */
                this.pendingAnimation = frame.update(() => {
                    globalProjectionState.hasAnimatedSinceResize = true;
                    this.currentAnimation = animateSingleValue(0, animationTarget, {
                        ...options,
                        onUpdate: (latest) => {
                            this.mixTargetDelta(latest);
                            options.onUpdate && options.onUpdate(latest);
                        },
                        onComplete: () => {
                            options.onComplete && options.onComplete();
                            this.completeAnimation();
                        },
                    });
                    if (this.resumingFrom) {
                        this.resumingFrom.currentAnimation = this.currentAnimation;
                    }
                    this.pendingAnimation = undefined;
                });
            }
            completeAnimation() {
                if (this.resumingFrom) {
                    this.resumingFrom.currentAnimation = undefined;
                    this.resumingFrom.preserveOpacity = undefined;
                }
                const stack = this.getStack();
                stack && stack.exitAnimationComplete();
                this.resumingFrom =
                    this.currentAnimation =
                        this.animationValues =
                            undefined;
                this.notifyListeners("animationComplete");
            }
            finishAnimation() {
                if (this.currentAnimation) {
                    this.mixTargetDelta && this.mixTargetDelta(animationTarget);
                    this.currentAnimation.stop();
                }
                this.completeAnimation();
            }
            applyTransformsToTarget() {
                const lead = this.getLead();
                let { targetWithTransforms, target, layout, latestValues } = lead;
                if (!targetWithTransforms || !target || !layout)
                    return;
                /**
                 * If we're only animating position, and this element isn't the lead element,
                 * then instead of projecting into the lead box we instead want to calculate
                 * a new target that aligns the two boxes but maintains the layout shape.
                 */
                if (this !== lead &&
                    this.layout &&
                    layout &&
                    shouldAnimatePositionOnly(this.options.animationType, this.layout.layoutBox, layout.layoutBox)) {
                    target = this.target || createBox();
                    const xLength = calcLength(this.layout.layoutBox.x);
                    target.x.min = lead.target.x.min;
                    target.x.max = target.x.min + xLength;
                    const yLength = calcLength(this.layout.layoutBox.y);
                    target.y.min = lead.target.y.min;
                    target.y.max = target.y.min + yLength;
                }
                copyBoxInto(targetWithTransforms, target);
                /**
                 * Apply the latest user-set transforms to the targetBox to produce the targetBoxFinal.
                 * This is the final box that we will then project into by calculating a transform delta and
                 * applying it to the corrected box.
                 */
                transformBox(targetWithTransforms, latestValues);
                /**
                 * Update the delta between the corrected box and the final target box, after
                 * user-set transforms are applied to it. This will be used by the renderer to
                 * create a transform style that will reproject the element from its layout layout
                 * into the desired bounding box.
                 */
                calcBoxDelta(this.projectionDeltaWithTransform, this.layoutCorrected, targetWithTransforms, latestValues);
            }
            registerSharedNode(layoutId, node) {
                if (!this.sharedNodes.has(layoutId)) {
                    this.sharedNodes.set(layoutId, new NodeStack());
                }
                const stack = this.sharedNodes.get(layoutId);
                stack.add(node);
                const config = node.options.initialPromotionConfig;
                node.promote({
                    transition: config ? config.transition : undefined,
                    preserveFollowOpacity: config && config.shouldPreserveFollowOpacity
                        ? config.shouldPreserveFollowOpacity(node)
                        : undefined,
                });
            }
            isLead() {
                const stack = this.getStack();
                return stack ? stack.lead === this : true;
            }
            getLead() {
                var _a;
                const { layoutId } = this.options;
                return layoutId ? ((_a = this.getStack()) === null || _a === void 0 ? void 0 : _a.lead) || this : this;
            }
            getPrevLead() {
                var _a;
                const { layoutId } = this.options;
                return layoutId ? (_a = this.getStack()) === null || _a === void 0 ? void 0 : _a.prevLead : undefined;
            }
            getStack() {
                const { layoutId } = this.options;
                if (layoutId)
                    return this.root.sharedNodes.get(layoutId);
            }
            promote({ needsReset, transition, preserveFollowOpacity, } = {}) {
                const stack = this.getStack();
                if (stack)
                    stack.promote(this, preserveFollowOpacity);
                if (needsReset) {
                    this.projectionDelta = undefined;
                    this.needsReset = true;
                }
                if (transition)
                    this.setOptions({ transition });
            }
            relegate() {
                const stack = this.getStack();
                if (stack) {
                    return stack.relegate(this);
                }
                else {
                    return false;
                }
            }
            resetSkewAndRotation() {
                const { visualElement } = this.options;
                if (!visualElement)
                    return;
                // If there's no detected skew or rotation values, we can early return without a forced render.
                let hasDistortingTransform = false;
                /**
                 * An unrolled check for rotation values. Most elements don't have any rotation and
                 * skipping the nested loop and new object creation is 50% faster.
                 */
                const { latestValues } = visualElement;
                if (latestValues.z ||
                    latestValues.rotate ||
                    latestValues.rotateX ||
                    latestValues.rotateY ||
                    latestValues.rotateZ ||
                    latestValues.skewX ||
                    latestValues.skewY) {
                    hasDistortingTransform = true;
                }
                // If there's no distorting values, we don't need to do any more.
                if (!hasDistortingTransform)
                    return;
                const resetValues = {};
                if (latestValues.z) {
                    resetDistortingTransform("z", visualElement, resetValues, this.animationValues);
                }
                // Check the skew and rotate value of all axes and reset to 0
                for (let i = 0; i < transformAxes.length; i++) {
                    resetDistortingTransform(`rotate${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
                    resetDistortingTransform(`skew${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
                }
                // Force a render of this element to apply the transform with all skews and rotations
                // set to 0.
                visualElement.render();
                // Put back all the values we reset
                for (const key in resetValues) {
                    visualElement.setStaticValue(key, resetValues[key]);
                    if (this.animationValues) {
                        this.animationValues[key] = resetValues[key];
                    }
                }
                // Schedule a render for the next frame. This ensures we won't visually
                // see the element with the reset rotate value applied.
                visualElement.scheduleRender();
            }
            getProjectionStyles(styleProp) {
                var _a, _b;
                if (!this.instance || this.isSVG)
                    return undefined;
                if (!this.isVisible) {
                    return hiddenVisibility;
                }
                const styles = {
                    visibility: "",
                };
                const transformTemplate = this.getTransformTemplate();
                if (this.needsReset) {
                    this.needsReset = false;
                    styles.opacity = "";
                    styles.pointerEvents =
                        resolveMotionValue(styleProp === null || styleProp === void 0 ? void 0 : styleProp.pointerEvents) || "";
                    styles.transform = transformTemplate
                        ? transformTemplate(this.latestValues, "")
                        : "none";
                    return styles;
                }
                const lead = this.getLead();
                if (!this.projectionDelta || !this.layout || !lead.target) {
                    const emptyStyles = {};
                    if (this.options.layoutId) {
                        emptyStyles.opacity =
                            this.latestValues.opacity !== undefined
                                ? this.latestValues.opacity
                                : 1;
                        emptyStyles.pointerEvents =
                            resolveMotionValue(styleProp === null || styleProp === void 0 ? void 0 : styleProp.pointerEvents) || "";
                    }
                    if (this.hasProjected && !hasTransform(this.latestValues)) {
                        emptyStyles.transform = transformTemplate
                            ? transformTemplate({}, "")
                            : "none";
                        this.hasProjected = false;
                    }
                    return emptyStyles;
                }
                const valuesToRender = lead.animationValues || lead.latestValues;
                this.applyTransformsToTarget();
                styles.transform = buildProjectionTransform(this.projectionDeltaWithTransform, this.treeScale, valuesToRender);
                if (transformTemplate) {
                    styles.transform = transformTemplate(valuesToRender, styles.transform);
                }
                const { x, y } = this.projectionDelta;
                styles.transformOrigin = `${x.origin * 100}% ${y.origin * 100}% 0`;
                if (lead.animationValues) {
                    /**
                     * If the lead component is animating, assign this either the entering/leaving
                     * opacity
                     */
                    styles.opacity =
                        lead === this
                            ? (_b = (_a = valuesToRender.opacity) !== null && _a !== void 0 ? _a : this.latestValues.opacity) !== null && _b !== void 0 ? _b : 1
                            : this.preserveOpacity
                                ? this.latestValues.opacity
                                : valuesToRender.opacityExit;
                }
                else {
                    /**
                     * Or we're not animating at all, set the lead component to its layout
                     * opacity and other components to hidden.
                     */
                    styles.opacity =
                        lead === this
                            ? valuesToRender.opacity !== undefined
                                ? valuesToRender.opacity
                                : ""
                            : valuesToRender.opacityExit !== undefined
                                ? valuesToRender.opacityExit
                                : 0;
                }
                /**
                 * Apply scale correction
                 */
                for (const key in scaleCorrectors) {
                    if (valuesToRender[key] === undefined)
                        continue;
                    const { correct, applyTo } = scaleCorrectors[key];
                    /**
                     * Only apply scale correction to the value if we have an
                     * active projection transform. Otherwise these values become
                     * vulnerable to distortion if the element changes size without
                     * a corresponding layout animation.
                     */
                    const corrected = styles.transform === "none"
                        ? valuesToRender[key]
                        : correct(valuesToRender[key], lead);
                    if (applyTo) {
                        const num = applyTo.length;
                        for (let i = 0; i < num; i++) {
                            styles[applyTo[i]] = corrected;
                        }
                    }
                    else {
                        styles[key] = corrected;
                    }
                }
                /**
                 * Disable pointer events on follow components. This is to ensure
                 * that if a follow component covers a lead component it doesn't block
                 * pointer events on the lead.
                 */
                if (this.options.layoutId) {
                    styles.pointerEvents =
                        lead === this
                            ? resolveMotionValue(styleProp === null || styleProp === void 0 ? void 0 : styleProp.pointerEvents) || ""
                            : "none";
                }
                return styles;
            }
            clearSnapshot() {
                this.resumeFrom = this.snapshot = undefined;
            }
            // Only run on root
            resetTree() {
                this.root.nodes.forEach((node) => { var _a; return (_a = node.currentAnimation) === null || _a === void 0 ? void 0 : _a.stop(); });
                this.root.nodes.forEach(clearMeasurements);
                this.root.sharedNodes.clear();
            }
        };
    }
    function updateLayout(node) {
        node.updateLayout();
    }
    function notifyLayoutUpdate(node) {
        var _a;
        const snapshot = ((_a = node.resumeFrom) === null || _a === void 0 ? void 0 : _a.snapshot) || node.snapshot;
        if (node.isLead() &&
            node.layout &&
            snapshot &&
            node.hasListeners("didUpdate")) {
            const { layoutBox: layout, measuredBox: measuredLayout } = node.layout;
            const { animationType } = node.options;
            const isShared = snapshot.source !== node.layout.source;
            // TODO Maybe we want to also resize the layout snapshot so we don't trigger
            // animations for instance if layout="size" and an element has only changed position
            if (animationType === "size") {
                eachAxis((axis) => {
                    const axisSnapshot = isShared
                        ? snapshot.measuredBox[axis]
                        : snapshot.layoutBox[axis];
                    const length = calcLength(axisSnapshot);
                    axisSnapshot.min = layout[axis].min;
                    axisSnapshot.max = axisSnapshot.min + length;
                });
            }
            else if (shouldAnimatePositionOnly(animationType, snapshot.layoutBox, layout)) {
                eachAxis((axis) => {
                    const axisSnapshot = isShared
                        ? snapshot.measuredBox[axis]
                        : snapshot.layoutBox[axis];
                    const length = calcLength(layout[axis]);
                    axisSnapshot.max = axisSnapshot.min + length;
                    /**
                     * Ensure relative target gets resized and rerendererd
                     */
                    if (node.relativeTarget && !node.currentAnimation) {
                        node.isProjectionDirty = true;
                        node.relativeTarget[axis].max =
                            node.relativeTarget[axis].min + length;
                    }
                });
            }
            const layoutDelta = createDelta();
            calcBoxDelta(layoutDelta, layout, snapshot.layoutBox);
            const visualDelta = createDelta();
            if (isShared) {
                calcBoxDelta(visualDelta, node.applyTransform(measuredLayout, true), snapshot.measuredBox);
            }
            else {
                calcBoxDelta(visualDelta, layout, snapshot.layoutBox);
            }
            const hasLayoutChanged = !isDeltaZero(layoutDelta);
            let hasRelativeTargetChanged = false;
            if (!node.resumeFrom) {
                const relativeParent = node.getClosestProjectingParent();
                /**
                 * If the relativeParent is itself resuming from a different element then
                 * the relative snapshot is not relavent
                 */
                if (relativeParent && !relativeParent.resumeFrom) {
                    const { snapshot: parentSnapshot, layout: parentLayout } = relativeParent;
                    if (parentSnapshot && parentLayout) {
                        const relativeSnapshot = createBox();
                        calcRelativePosition(relativeSnapshot, snapshot.layoutBox, parentSnapshot.layoutBox);
                        const relativeLayout = createBox();
                        calcRelativePosition(relativeLayout, layout, parentLayout.layoutBox);
                        if (!boxEqualsRounded(relativeSnapshot, relativeLayout)) {
                            hasRelativeTargetChanged = true;
                        }
                        if (relativeParent.options.layoutRoot) {
                            node.relativeTarget = relativeLayout;
                            node.relativeTargetOrigin = relativeSnapshot;
                            node.relativeParent = relativeParent;
                        }
                    }
                }
            }
            node.notifyListeners("didUpdate", {
                layout,
                snapshot,
                delta: visualDelta,
                layoutDelta,
                hasLayoutChanged,
                hasRelativeTargetChanged,
            });
        }
        else if (node.isLead()) {
            const { onExitComplete } = node.options;
            onExitComplete && onExitComplete();
        }
        /**
         * Clearing transition
         * TODO: Investigate why this transition is being passed in as {type: false } from Framer
         * and why we need it at all
         */
        node.options.transition = undefined;
    }
    function propagateDirtyNodes(node) {
        /**
         * Increase debug counter for nodes encountered this frame
         */
        if (isDebug) {
            metrics.totalNodes++;
        }
        if (!node.parent)
            return;
        /**
         * If this node isn't projecting, propagate isProjectionDirty. It will have
         * no performance impact but it will allow the next child that *is* projecting
         * but *isn't* dirty to just check its parent to see if *any* ancestor needs
         * correcting.
         */
        if (!node.isProjecting()) {
            node.isProjectionDirty = node.parent.isProjectionDirty;
        }
        /**
         * Propagate isSharedProjectionDirty and isTransformDirty
         * throughout the whole tree. A future revision can take another look at
         * this but for safety we still recalcualte shared nodes.
         */
        node.isSharedProjectionDirty || (node.isSharedProjectionDirty = Boolean(node.isProjectionDirty ||
            node.parent.isProjectionDirty ||
            node.parent.isSharedProjectionDirty));
        node.isTransformDirty || (node.isTransformDirty = node.parent.isTransformDirty);
    }
    function cleanDirtyNodes(node) {
        node.isProjectionDirty =
            node.isSharedProjectionDirty =
                node.isTransformDirty =
                    false;
    }
    function clearSnapshot(node) {
        node.clearSnapshot();
    }
    function clearMeasurements(node) {
        node.clearMeasurements();
    }
    function clearIsLayoutDirty(node) {
        node.isLayoutDirty = false;
    }
    function resetTransformStyle(node) {
        const { visualElement } = node.options;
        if (visualElement && visualElement.getProps().onBeforeLayoutMeasure) {
            visualElement.notify("BeforeLayoutMeasure");
        }
        node.resetTransform();
    }
    function finishAnimation(node) {
        node.finishAnimation();
        node.targetDelta = node.relativeTarget = node.target = undefined;
        node.isProjectionDirty = true;
    }
    function resolveTargetDelta(node) {
        node.resolveTargetDelta();
    }
    function calcProjection(node) {
        node.calcProjection();
    }
    function resetSkewAndRotation(node) {
        node.resetSkewAndRotation();
    }
    function removeLeadSnapshots(stack) {
        stack.removeLeadSnapshot();
    }
    function mixAxisDelta(output, delta, p) {
        output.translate = mixNumber$1(delta.translate, 0, p);
        output.scale = mixNumber$1(delta.scale, 1, p);
        output.origin = delta.origin;
        output.originPoint = delta.originPoint;
    }
    function mixAxis(output, from, to, p) {
        output.min = mixNumber$1(from.min, to.min, p);
        output.max = mixNumber$1(from.max, to.max, p);
    }
    function mixBox(output, from, to, p) {
        mixAxis(output.x, from.x, to.x, p);
        mixAxis(output.y, from.y, to.y, p);
    }
    function hasOpacityCrossfade(node) {
        return (node.animationValues && node.animationValues.opacityExit !== undefined);
    }
    const defaultLayoutTransition = {
        duration: 0.45,
        ease: [0.4, 0, 0.1, 1],
    };
    const userAgentContains = (string) => typeof navigator !== "undefined" &&
        navigator.userAgent &&
        navigator.userAgent.toLowerCase().includes(string);
    /**
     * Measured bounding boxes must be rounded in Safari and
     * left untouched in Chrome, otherwise non-integer layouts within scaled-up elements
     * can appear to jump.
     */
    const roundPoint = userAgentContains("applewebkit/") && !userAgentContains("chrome/")
        ? Math.round
        : noop;
    function roundAxis(axis) {
        // Round to the nearest .5 pixels to support subpixel layouts
        axis.min = roundPoint(axis.min);
        axis.max = roundPoint(axis.max);
    }
    function roundBox(box) {
        roundAxis(box.x);
        roundAxis(box.y);
    }
    function shouldAnimatePositionOnly(animationType, snapshot, layout) {
        return (animationType === "position" ||
            (animationType === "preserve-aspect" &&
                !isNear(aspectRatio(snapshot), aspectRatio(layout), 0.2)));
    }
    function checkNodeWasScrollRoot(node) {
        var _a;
        return node !== node.root && ((_a = node.scroll) === null || _a === void 0 ? void 0 : _a.wasRoot);
    }

    const DocumentProjectionNode = createProjectionNode$1({
        attachResizeListener: (ref, notify) => addDomEvent(ref, "resize", notify),
        measureScroll: () => ({
            x: document.documentElement.scrollLeft || document.body.scrollLeft,
            y: document.documentElement.scrollTop || document.body.scrollTop,
        }),
        checkIsScrollRoot: () => true,
    });

    const rootProjectionNode = {
        current: undefined,
    };
    const HTMLProjectionNode = createProjectionNode$1({
        measureScroll: (instance) => ({
            x: instance.scrollLeft,
            y: instance.scrollTop,
        }),
        defaultParent: () => {
            if (!rootProjectionNode.current) {
                const documentNode = new DocumentProjectionNode({});
                documentNode.mount(window);
                documentNode.setOptions({ layoutScroll: true });
                rootProjectionNode.current = documentNode;
            }
            return rootProjectionNode.current;
        },
        resetTransform: (instance, value) => {
            instance.style.transform = value !== undefined ? value : "none";
        },
        checkIsScrollRoot: (instance) => Boolean(window.getComputedStyle(instance).position === "fixed"),
    });

    const notify = (node) => !node.isLayoutDirty && node.willUpdate(false);
    function nodeGroup() {
        const nodes = new Set();
        const subscriptions = new WeakMap();
        const dirtyAll = () => nodes.forEach(notify);
        return {
            add: (node) => {
                nodes.add(node);
                subscriptions.set(node, node.addEventListener("willUpdate", dirtyAll));
            },
            remove: (node) => {
                nodes.delete(node);
                const unsubscribe = subscriptions.get(node);
                if (unsubscribe) {
                    unsubscribe();
                    subscriptions.delete(node);
                }
                dirtyAll();
            },
            dirty: dirtyAll,
        };
    }

    function pixelsToPercent(pixels, axis) {
        if (axis.max === axis.min)
            return 0;
        return (pixels / (axis.max - axis.min)) * 100;
    }
    /**
     * We always correct borderRadius as a percentage rather than pixels to reduce paints.
     * For example, if you are projecting a box that is 100px wide with a 10px borderRadius
     * into a box that is 200px wide with a 20px borderRadius, that is actually a 10%
     * borderRadius in both states. If we animate between the two in pixels that will trigger
     * a paint each time. If we animate between the two in percentage we'll avoid a paint.
     */
    const correctBorderRadius = {
        correct: (latest, node) => {
            if (!node.target)
                return latest;
            /**
             * If latest is a string, if it's a percentage we can return immediately as it's
             * going to be stretched appropriately. Otherwise, if it's a pixel, convert it to a number.
             */
            if (typeof latest === "string") {
                if (px.test(latest)) {
                    latest = parseFloat(latest);
                }
                else {
                    return latest;
                }
            }
            /**
             * If latest is a number, it's a pixel value. We use the current viewportBox to calculate that
             * pixel value as a percentage of each axis
             */
            const x = pixelsToPercent(latest, node.target.x);
            const y = pixelsToPercent(latest, node.target.y);
            return `${x}% ${y}%`;
        },
    };

    const correctBoxShadow = {
        correct: (latest, { treeScale, projectionDelta }) => {
            const original = latest;
            const shadow = complex.parse(latest);
            // TODO: Doesn't support multiple shadows
            if (shadow.length > 5)
                return original;
            const template = complex.createTransformer(latest);
            const offset = typeof shadow[0] !== "number" ? 1 : 0;
            // Calculate the overall context scale
            const xScale = projectionDelta.x.scale * treeScale.x;
            const yScale = projectionDelta.y.scale * treeScale.y;
            shadow[0 + offset] /= xScale;
            shadow[1 + offset] /= yScale;
            /**
             * Ideally we'd correct x and y scales individually, but because blur and
             * spread apply to both we have to take a scale average and apply that instead.
             * We could potentially improve the outcome of this by incorporating the ratio between
             * the two scales.
             */
            const averageScale = mixNumber$1(xScale, yScale, 0.5);
            // Blur
            if (typeof shadow[2 + offset] === "number")
                shadow[2 + offset] /= averageScale;
            // Spread
            if (typeof shadow[3 + offset] === "number")
                shadow[3 + offset] /= averageScale;
            return template(shadow);
        },
    };

    const shouldInheritGroup = (inherit) => inherit === true;
    const shouldInheritId = (inherit) => shouldInheritGroup(inherit === true) || inherit === "id";
    const LayoutGroup = ({ children, id, inherit = true }) => {
        const layoutGroupContext = React$1.useContext(LayoutGroupContext);
        const deprecatedLayoutGroupContext = React$1.useContext(DeprecatedLayoutGroupContext);
        const [forceRender, key] = useForceUpdate();
        const context = React$1.useRef(null);
        const upstreamId = layoutGroupContext.id || deprecatedLayoutGroupContext;
        if (context.current === null) {
            if (shouldInheritId(inherit) && upstreamId) {
                id = id ? upstreamId + "-" + id : upstreamId;
            }
            context.current = {
                id,
                group: shouldInheritGroup(inherit)
                    ? layoutGroupContext.group || nodeGroup()
                    : nodeGroup(),
            };
        }
        const memoizedContext = React$1.useMemo(() => ({ ...context.current, forceRender }), [key]);
        return (jsx(LayoutGroupContext.Provider, { value: memoizedContext, children: children }));
    };

    const LazyContext = React$1.createContext({ strict: false });

    function loadFeatures(features) {
        for (const key in features) {
            featureDefinitions[key] = {
                ...featureDefinitions[key],
                ...features[key],
            };
        }
    }

    /**
     * Used in conjunction with the `m` component to reduce bundle size.
     *
     * `m` is a version of the `motion` component that only loads functionality
     * critical for the initial render.
     *
     * `LazyMotion` can then be used to either synchronously or asynchronously
     * load animation and gesture support.
     *
     * ```jsx
     * // Synchronous loading
     * import { LazyMotion, m, domAnimation } from "framer-motion"
     *
     * function App() {
     *   return (
     *     <LazyMotion features={domAnimation}>
     *       <m.div animate={{ scale: 2 }} />
     *     </LazyMotion>
     *   )
     * }
     *
     * // Asynchronous loading
     * import { LazyMotion, m } from "framer-motion"
     *
     * function App() {
     *   return (
     *     <LazyMotion features={() => import('./path/to/domAnimation')}>
     *       <m.div animate={{ scale: 2 }} />
     *     </LazyMotion>
     *   )
     * }
     * ```
     *
     * @public
     */
    function LazyMotion({ children, features, strict = false }) {
        const [, setIsLoaded] = React$1.useState(!isLazyBundle(features));
        const loadedRenderer = React$1.useRef(undefined);
        /**
         * If this is a synchronous load, load features immediately
         */
        if (!isLazyBundle(features)) {
            const { renderer, ...loadedFeatures } = features;
            loadedRenderer.current = renderer;
            loadFeatures(loadedFeatures);
        }
        React$1.useEffect(() => {
            if (isLazyBundle(features)) {
                features().then(({ renderer, ...loadedFeatures }) => {
                    loadFeatures(loadedFeatures);
                    loadedRenderer.current = renderer;
                    setIsLoaded(true);
                });
            }
        }, []);
        return (jsx(LazyContext.Provider, { value: { renderer: loadedRenderer.current, strict }, children: children }));
    }
    function isLazyBundle(features) {
        return typeof features === "function";
    }

    /**
     * `MotionConfig` is used to set configuration options for all children `motion` components.
     *
     * ```jsx
     * import { motion, MotionConfig } from "framer-motion"
     *
     * export function App() {
     *   return (
     *     <MotionConfig transition={{ type: "spring" }}>
     *       <motion.div animate={{ x: 100 }} />
     *     </MotionConfig>
     *   )
     * }
     * ```
     *
     * @public
     */
    function MotionConfig({ children, isValidProp, ...config }) {
        isValidProp && loadExternalIsValidProp(isValidProp);
        /**
         * Inherit props from any parent MotionConfig components
         */
        config = { ...React$1.useContext(MotionConfigContext), ...config };
        /**
         * Don't allow isStatic to change between renders as it affects how many hooks
         * motion components fire.
         */
        config.isStatic = useConstant(() => config.isStatic);
        /**
         * Creating a new config context object will re-render every `motion` component
         * every time it renders. So we only want to create a new one sparingly.
         */
        const context = React$1.useMemo(() => config, [
            JSON.stringify(config.transition),
            config.transformPagePoint,
            config.reducedMotion,
        ]);
        return (jsx(MotionConfigContext.Provider, { value: context, children: children }));
    }

    const ReorderContext = React$1.createContext(null);

    function createDOMMotionComponentProxy(componentFactory) {
        if (typeof Proxy === "undefined") {
            return componentFactory;
        }
        /**
         * A cache of generated `motion` components, e.g `motion.div`, `motion.input` etc.
         * Rather than generating them anew every render.
         */
        const componentCache = new Map();
        const deprecatedFactoryFunction = (...args) => {
            {
                warnOnce(false, "motion() is deprecated. Use motion.create() instead.");
            }
            return componentFactory(...args);
        };
        return new Proxy(deprecatedFactoryFunction, {
            /**
             * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
             * The prop name is passed through as `key` and we can use that to generate a `motion`
             * DOM component with that name.
             */
            get: (_target, key) => {
                if (key === "create")
                    return componentFactory;
                /**
                 * If this element doesn't exist in the component cache, create it and cache.
                 */
                if (!componentCache.has(key)) {
                    componentCache.set(key, componentFactory(key));
                }
                return componentCache.get(key);
            },
        });
    }

    /**
     * @internal
     */
    class PanSession {
        constructor(event, handlers, { transformPagePoint, contextWindow, dragSnapToOrigin = false, } = {}) {
            /**
             * @internal
             */
            this.startEvent = null;
            /**
             * @internal
             */
            this.lastMoveEvent = null;
            /**
             * @internal
             */
            this.lastMoveEventInfo = null;
            /**
             * @internal
             */
            this.handlers = {};
            /**
             * @internal
             */
            this.contextWindow = window;
            this.updatePoint = () => {
                if (!(this.lastMoveEvent && this.lastMoveEventInfo))
                    return;
                const info = getPanInfo(this.lastMoveEventInfo, this.history);
                const isPanStarted = this.startEvent !== null;
                // Only start panning if the offset is larger than 3 pixels. If we make it
                // any larger than this we'll want to reset the pointer history
                // on the first update to avoid visual snapping to the cursoe.
                const isDistancePastThreshold = distance2D(info.offset, { x: 0, y: 0 }) >= 3;
                if (!isPanStarted && !isDistancePastThreshold)
                    return;
                const { point } = info;
                const { timestamp } = frameData;
                this.history.push({ ...point, timestamp });
                const { onStart, onMove } = this.handlers;
                if (!isPanStarted) {
                    onStart && onStart(this.lastMoveEvent, info);
                    this.startEvent = this.lastMoveEvent;
                }
                onMove && onMove(this.lastMoveEvent, info);
            };
            this.handlePointerMove = (event, info) => {
                this.lastMoveEvent = event;
                this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint);
                // Throttle mouse move event to once per frame
                frame.update(this.updatePoint, true);
            };
            this.handlePointerUp = (event, info) => {
                this.end();
                const { onEnd, onSessionEnd, resumeAnimation } = this.handlers;
                if (this.dragSnapToOrigin)
                    resumeAnimation && resumeAnimation();
                if (!(this.lastMoveEvent && this.lastMoveEventInfo))
                    return;
                const panInfo = getPanInfo(event.type === "pointercancel"
                    ? this.lastMoveEventInfo
                    : transformPoint(info, this.transformPagePoint), this.history);
                if (this.startEvent && onEnd) {
                    onEnd(event, panInfo);
                }
                onSessionEnd && onSessionEnd(event, panInfo);
            };
            // If we have more than one touch, don't start detecting this gesture
            if (!isPrimaryPointer(event))
                return;
            this.dragSnapToOrigin = dragSnapToOrigin;
            this.handlers = handlers;
            this.transformPagePoint = transformPagePoint;
            this.contextWindow = contextWindow || window;
            const info = extractEventInfo(event);
            const initialInfo = transformPoint(info, this.transformPagePoint);
            const { point } = initialInfo;
            const { timestamp } = frameData;
            this.history = [{ ...point, timestamp }];
            const { onSessionStart } = handlers;
            onSessionStart &&
                onSessionStart(event, getPanInfo(initialInfo, this.history));
            this.removeListeners = pipe(addPointerEvent(this.contextWindow, "pointermove", this.handlePointerMove), addPointerEvent(this.contextWindow, "pointerup", this.handlePointerUp), addPointerEvent(this.contextWindow, "pointercancel", this.handlePointerUp));
        }
        updateHandlers(handlers) {
            this.handlers = handlers;
        }
        end() {
            this.removeListeners && this.removeListeners();
            cancelFrame(this.updatePoint);
        }
    }
    function transformPoint(info, transformPagePoint) {
        return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
    }
    function subtractPoint(a, b) {
        return { x: a.x - b.x, y: a.y - b.y };
    }
    function getPanInfo({ point }, history) {
        return {
            point,
            delta: subtractPoint(point, lastDevicePoint(history)),
            offset: subtractPoint(point, startDevicePoint(history)),
            velocity: getVelocity(history, 0.1),
        };
    }
    function startDevicePoint(history) {
        return history[0];
    }
    function lastDevicePoint(history) {
        return history[history.length - 1];
    }
    function getVelocity(history, timeDelta) {
        if (history.length < 2) {
            return { x: 0, y: 0 };
        }
        let i = history.length - 1;
        let timestampedPoint = null;
        const lastPoint = lastDevicePoint(history);
        while (i >= 0) {
            timestampedPoint = history[i];
            if (lastPoint.timestamp - timestampedPoint.timestamp >
                secondsToMilliseconds(timeDelta)) {
                break;
            }
            i--;
        }
        if (!timestampedPoint) {
            return { x: 0, y: 0 };
        }
        const time = millisecondsToSeconds(lastPoint.timestamp - timestampedPoint.timestamp);
        if (time === 0) {
            return { x: 0, y: 0 };
        }
        const currentVelocity = {
            x: (lastPoint.x - timestampedPoint.x) / time,
            y: (lastPoint.y - timestampedPoint.y) / time,
        };
        if (currentVelocity.x === Infinity) {
            currentVelocity.x = 0;
        }
        if (currentVelocity.y === Infinity) {
            currentVelocity.y = 0;
        }
        return currentVelocity;
    }

    function isRefObject(ref) {
        return (ref &&
            typeof ref === "object" &&
            Object.prototype.hasOwnProperty.call(ref, "current"));
    }

    /**
     * Apply constraints to a point. These constraints are both physical along an
     * axis, and an elastic factor that determines how much to constrain the point
     * by if it does lie outside the defined parameters.
     */
    function applyConstraints(point, { min, max }, elastic) {
        if (min !== undefined && point < min) {
            // If we have a min point defined, and this is outside of that, constrain
            point = elastic
                ? mixNumber$1(min, point, elastic.min)
                : Math.max(point, min);
        }
        else if (max !== undefined && point > max) {
            // If we have a max point defined, and this is outside of that, constrain
            point = elastic
                ? mixNumber$1(max, point, elastic.max)
                : Math.min(point, max);
        }
        return point;
    }
    /**
     * Calculate constraints in terms of the viewport when defined relatively to the
     * measured axis. This is measured from the nearest edge, so a max constraint of 200
     * on an axis with a max value of 300 would return a constraint of 500 - axis length
     */
    function calcRelativeAxisConstraints(axis, min, max) {
        return {
            min: min !== undefined ? axis.min + min : undefined,
            max: max !== undefined
                ? axis.max + max - (axis.max - axis.min)
                : undefined,
        };
    }
    /**
     * Calculate constraints in terms of the viewport when
     * defined relatively to the measured bounding box.
     */
    function calcRelativeConstraints(layoutBox, { top, left, bottom, right }) {
        return {
            x: calcRelativeAxisConstraints(layoutBox.x, left, right),
            y: calcRelativeAxisConstraints(layoutBox.y, top, bottom),
        };
    }
    /**
     * Calculate viewport constraints when defined as another viewport-relative axis
     */
    function calcViewportAxisConstraints(layoutAxis, constraintsAxis) {
        let min = constraintsAxis.min - layoutAxis.min;
        let max = constraintsAxis.max - layoutAxis.max;
        // If the constraints axis is actually smaller than the layout axis then we can
        // flip the constraints
        if (constraintsAxis.max - constraintsAxis.min <
            layoutAxis.max - layoutAxis.min) {
            [min, max] = [max, min];
        }
        return { min, max };
    }
    /**
     * Calculate viewport constraints when defined as another viewport-relative box
     */
    function calcViewportConstraints(layoutBox, constraintsBox) {
        return {
            x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
            y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y),
        };
    }
    /**
     * Calculate a transform origin relative to the source axis, between 0-1, that results
     * in an asthetically pleasing scale/transform needed to project from source to target.
     */
    function calcOrigin(source, target) {
        let origin = 0.5;
        const sourceLength = calcLength(source);
        const targetLength = calcLength(target);
        if (targetLength > sourceLength) {
            origin = progress(target.min, target.max - sourceLength, source.min);
        }
        else if (sourceLength > targetLength) {
            origin = progress(source.min, source.max - targetLength, target.min);
        }
        return clamp(0, 1, origin);
    }
    /**
     * Rebase the calculated viewport constraints relative to the layout.min point.
     */
    function rebaseAxisConstraints(layout, constraints) {
        const relativeConstraints = {};
        if (constraints.min !== undefined) {
            relativeConstraints.min = constraints.min - layout.min;
        }
        if (constraints.max !== undefined) {
            relativeConstraints.max = constraints.max - layout.min;
        }
        return relativeConstraints;
    }
    const defaultElastic = 0.35;
    /**
     * Accepts a dragElastic prop and returns resolved elastic values for each axis.
     */
    function resolveDragElastic(dragElastic = defaultElastic) {
        if (dragElastic === false) {
            dragElastic = 0;
        }
        else if (dragElastic === true) {
            dragElastic = defaultElastic;
        }
        return {
            x: resolveAxisElastic(dragElastic, "left", "right"),
            y: resolveAxisElastic(dragElastic, "top", "bottom"),
        };
    }
    function resolveAxisElastic(dragElastic, minLabel, maxLabel) {
        return {
            min: resolvePointElastic(dragElastic, minLabel),
            max: resolvePointElastic(dragElastic, maxLabel),
        };
    }
    function resolvePointElastic(dragElastic, label) {
        return typeof dragElastic === "number"
            ? dragElastic
            : dragElastic[label] || 0;
    }

    // Fixes https://github.com/motiondivision/motion/issues/2270
    const getContextWindow = ({ current }) => {
        return current ? current.ownerDocument.defaultView : null;
    };

    const elementDragControls = new WeakMap();
    /**
     *
     */
    // let latestPointerEvent: PointerEvent
    class VisualElementDragControls {
        constructor(visualElement) {
            this.openDragLock = null;
            this.isDragging = false;
            this.currentDirection = null;
            this.originPoint = { x: 0, y: 0 };
            /**
             * The permitted boundaries of travel, in pixels.
             */
            this.constraints = false;
            this.hasMutatedConstraints = false;
            /**
             * The per-axis resolved elastic values.
             */
            this.elastic = createBox();
            this.visualElement = visualElement;
        }
        start(originEvent, { snapToCursor = false } = {}) {
            /**
             * Don't start dragging if this component is exiting
             */
            const { presenceContext } = this.visualElement;
            if (presenceContext && presenceContext.isPresent === false)
                return;
            const onSessionStart = (event) => {
                const { dragSnapToOrigin } = this.getProps();
                // Stop or pause any animations on both axis values immediately. This allows the user to throw and catch
                // the component.
                dragSnapToOrigin ? this.pauseAnimation() : this.stopAnimation();
                if (snapToCursor) {
                    this.snapToCursor(extractEventInfo(event).point);
                }
            };
            const onStart = (event, info) => {
                // Attempt to grab the global drag gesture lock - maybe make this part of PanSession
                const { drag, dragPropagation, onDragStart } = this.getProps();
                if (drag && !dragPropagation) {
                    if (this.openDragLock)
                        this.openDragLock();
                    this.openDragLock = setDragLock(drag);
                    // If we don 't have the lock, don't start dragging
                    if (!this.openDragLock)
                        return;
                }
                this.isDragging = true;
                this.currentDirection = null;
                this.resolveConstraints();
                if (this.visualElement.projection) {
                    this.visualElement.projection.isAnimationBlocked = true;
                    this.visualElement.projection.target = undefined;
                }
                /**
                 * Record gesture origin
                 */
                eachAxis((axis) => {
                    let current = this.getAxisMotionValue(axis).get() || 0;
                    /**
                     * If the MotionValue is a percentage value convert to px
                     */
                    if (percent.test(current)) {
                        const { projection } = this.visualElement;
                        if (projection && projection.layout) {
                            const measuredAxis = projection.layout.layoutBox[axis];
                            if (measuredAxis) {
                                const length = calcLength(measuredAxis);
                                current = length * (parseFloat(current) / 100);
                            }
                        }
                    }
                    this.originPoint[axis] = current;
                });
                // Fire onDragStart event
                if (onDragStart) {
                    frame.postRender(() => onDragStart(event, info));
                }
                addValueToWillChange(this.visualElement, "transform");
                const { animationState } = this.visualElement;
                animationState && animationState.setActive("whileDrag", true);
            };
            const onMove = (event, info) => {
                // latestPointerEvent = event
                const { dragPropagation, dragDirectionLock, onDirectionLock, onDrag, } = this.getProps();
                // If we didn't successfully receive the gesture lock, early return.
                if (!dragPropagation && !this.openDragLock)
                    return;
                const { offset } = info;
                // Attempt to detect drag direction if directionLock is true
                if (dragDirectionLock && this.currentDirection === null) {
                    this.currentDirection = getCurrentDirection(offset);
                    // If we've successfully set a direction, notify listener
                    if (this.currentDirection !== null) {
                        onDirectionLock && onDirectionLock(this.currentDirection);
                    }
                    return;
                }
                // Update each point with the latest position
                this.updateAxis("x", info.point, offset);
                this.updateAxis("y", info.point, offset);
                /**
                 * Ideally we would leave the renderer to fire naturally at the end of
                 * this frame but if the element is about to change layout as the result
                 * of a re-render we want to ensure the browser can read the latest
                 * bounding box to ensure the pointer and element don't fall out of sync.
                 */
                this.visualElement.render();
                /**
                 * This must fire after the render call as it might trigger a state
                 * change which itself might trigger a layout update.
                 */
                onDrag && onDrag(event, info);
            };
            const onSessionEnd = (event, info) => this.stop(event, info);
            const resumeAnimation = () => eachAxis((axis) => {
                var _a;
                return this.getAnimationState(axis) === "paused" &&
                    ((_a = this.getAxisMotionValue(axis).animation) === null || _a === void 0 ? void 0 : _a.play());
            });
            const { dragSnapToOrigin } = this.getProps();
            this.panSession = new PanSession(originEvent, {
                onSessionStart,
                onStart,
                onMove,
                onSessionEnd,
                resumeAnimation,
            }, {
                transformPagePoint: this.visualElement.getTransformPagePoint(),
                dragSnapToOrigin,
                contextWindow: getContextWindow(this.visualElement),
            });
        }
        stop(event, info) {
            const isDragging = this.isDragging;
            this.cancel();
            if (!isDragging)
                return;
            const { velocity } = info;
            this.startAnimation(velocity);
            const { onDragEnd } = this.getProps();
            if (onDragEnd) {
                frame.postRender(() => onDragEnd(event, info));
            }
        }
        cancel() {
            this.isDragging = false;
            const { projection, animationState } = this.visualElement;
            if (projection) {
                projection.isAnimationBlocked = false;
            }
            this.panSession && this.panSession.end();
            this.panSession = undefined;
            const { dragPropagation } = this.getProps();
            if (!dragPropagation && this.openDragLock) {
                this.openDragLock();
                this.openDragLock = null;
            }
            animationState && animationState.setActive("whileDrag", false);
        }
        updateAxis(axis, _point, offset) {
            const { drag } = this.getProps();
            // If we're not dragging this axis, do an early return.
            if (!offset || !shouldDrag(axis, drag, this.currentDirection))
                return;
            const axisValue = this.getAxisMotionValue(axis);
            let next = this.originPoint[axis] + offset[axis];
            // Apply constraints
            if (this.constraints && this.constraints[axis]) {
                next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
            }
            axisValue.set(next);
        }
        resolveConstraints() {
            var _a;
            const { dragConstraints, dragElastic } = this.getProps();
            const layout = this.visualElement.projection &&
                !this.visualElement.projection.layout
                ? this.visualElement.projection.measure(false)
                : (_a = this.visualElement.projection) === null || _a === void 0 ? void 0 : _a.layout;
            const prevConstraints = this.constraints;
            if (dragConstraints && isRefObject(dragConstraints)) {
                if (!this.constraints) {
                    this.constraints = this.resolveRefConstraints();
                }
            }
            else {
                if (dragConstraints && layout) {
                    this.constraints = calcRelativeConstraints(layout.layoutBox, dragConstraints);
                }
                else {
                    this.constraints = false;
                }
            }
            this.elastic = resolveDragElastic(dragElastic);
            /**
             * If we're outputting to external MotionValues, we want to rebase the measured constraints
             * from viewport-relative to component-relative.
             */
            if (prevConstraints !== this.constraints &&
                layout &&
                this.constraints &&
                !this.hasMutatedConstraints) {
                eachAxis((axis) => {
                    if (this.constraints !== false &&
                        this.getAxisMotionValue(axis)) {
                        this.constraints[axis] = rebaseAxisConstraints(layout.layoutBox[axis], this.constraints[axis]);
                    }
                });
            }
        }
        resolveRefConstraints() {
            const { dragConstraints: constraints, onMeasureDragConstraints } = this.getProps();
            if (!constraints || !isRefObject(constraints))
                return false;
            const constraintsElement = constraints.current;
            exports.invariant(constraintsElement !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.");
            const { projection } = this.visualElement;
            // TODO
            if (!projection || !projection.layout)
                return false;
            const constraintsBox = measurePageBox(constraintsElement, projection.root, this.visualElement.getTransformPagePoint());
            let measuredConstraints = calcViewportConstraints(projection.layout.layoutBox, constraintsBox);
            /**
             * If there's an onMeasureDragConstraints listener we call it and
             * if different constraints are returned, set constraints to that
             */
            if (onMeasureDragConstraints) {
                const userConstraints = onMeasureDragConstraints(convertBoxToBoundingBox(measuredConstraints));
                this.hasMutatedConstraints = !!userConstraints;
                if (userConstraints) {
                    measuredConstraints = convertBoundingBoxToBox(userConstraints);
                }
            }
            return measuredConstraints;
        }
        startAnimation(velocity) {
            const { drag, dragMomentum, dragElastic, dragTransition, dragSnapToOrigin, onDragTransitionEnd, } = this.getProps();
            const constraints = this.constraints || {};
            const momentumAnimations = eachAxis((axis) => {
                if (!shouldDrag(axis, drag, this.currentDirection)) {
                    return;
                }
                let transition = (constraints && constraints[axis]) || {};
                if (dragSnapToOrigin)
                    transition = { min: 0, max: 0 };
                /**
                 * Overdamp the boundary spring if `dragElastic` is disabled. There's still a frame
                 * of spring animations so we should look into adding a disable spring option to `inertia`.
                 * We could do something here where we affect the `bounceStiffness` and `bounceDamping`
                 * using the value of `dragElastic`.
                 */
                const bounceStiffness = dragElastic ? 200 : 1000000;
                const bounceDamping = dragElastic ? 40 : 10000000;
                const inertia = {
                    type: "inertia",
                    velocity: dragMomentum ? velocity[axis] : 0,
                    bounceStiffness,
                    bounceDamping,
                    timeConstant: 750,
                    restDelta: 1,
                    restSpeed: 10,
                    ...dragTransition,
                    ...transition,
                };
                // If we're not animating on an externally-provided `MotionValue` we can use the
                // component's animation controls which will handle interactions with whileHover (etc),
                // otherwise we just have to animate the `MotionValue` itself.
                return this.startAxisValueAnimation(axis, inertia);
            });
            // Run all animations and then resolve the new drag constraints.
            return Promise.all(momentumAnimations).then(onDragTransitionEnd);
        }
        startAxisValueAnimation(axis, transition) {
            const axisValue = this.getAxisMotionValue(axis);
            addValueToWillChange(this.visualElement, axis);
            return axisValue.start(animateMotionValue(axis, axisValue, 0, transition, this.visualElement, false));
        }
        stopAnimation() {
            eachAxis((axis) => this.getAxisMotionValue(axis).stop());
        }
        pauseAnimation() {
            eachAxis((axis) => { var _a; return (_a = this.getAxisMotionValue(axis).animation) === null || _a === void 0 ? void 0 : _a.pause(); });
        }
        getAnimationState(axis) {
            var _a;
            return (_a = this.getAxisMotionValue(axis).animation) === null || _a === void 0 ? void 0 : _a.state;
        }
        /**
         * Drag works differently depending on which props are provided.
         *
         * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
         * - Otherwise, we apply the delta to the x/y motion values.
         */
        getAxisMotionValue(axis) {
            const dragKey = `_drag${axis.toUpperCase()}`;
            const props = this.visualElement.getProps();
            const externalMotionValue = props[dragKey];
            return externalMotionValue
                ? externalMotionValue
                : this.visualElement.getValue(axis, (props.initial
                    ? props.initial[axis]
                    : undefined) || 0);
        }
        snapToCursor(point) {
            eachAxis((axis) => {
                const { drag } = this.getProps();
                // If we're not dragging this axis, do an early return.
                if (!shouldDrag(axis, drag, this.currentDirection))
                    return;
                const { projection } = this.visualElement;
                const axisValue = this.getAxisMotionValue(axis);
                if (projection && projection.layout) {
                    const { min, max } = projection.layout.layoutBox[axis];
                    axisValue.set(point[axis] - mixNumber$1(min, max, 0.5));
                }
            });
        }
        /**
         * When the viewport resizes we want to check if the measured constraints
         * have changed and, if so, reposition the element within those new constraints
         * relative to where it was before the resize.
         */
        scalePositionWithinConstraints() {
            if (!this.visualElement.current)
                return;
            const { drag, dragConstraints } = this.getProps();
            const { projection } = this.visualElement;
            if (!isRefObject(dragConstraints) || !projection || !this.constraints)
                return;
            /**
             * Stop current animations as there can be visual glitching if we try to do
             * this mid-animation
             */
            this.stopAnimation();
            /**
             * Record the relative position of the dragged element relative to the
             * constraints box and save as a progress value.
             */
            const boxProgress = { x: 0, y: 0 };
            eachAxis((axis) => {
                const axisValue = this.getAxisMotionValue(axis);
                if (axisValue && this.constraints !== false) {
                    const latest = axisValue.get();
                    boxProgress[axis] = calcOrigin({ min: latest, max: latest }, this.constraints[axis]);
                }
            });
            /**
             * Update the layout of this element and resolve the latest drag constraints
             */
            const { transformTemplate } = this.visualElement.getProps();
            this.visualElement.current.style.transform = transformTemplate
                ? transformTemplate({}, "")
                : "none";
            projection.root && projection.root.updateScroll();
            projection.updateLayout();
            this.resolveConstraints();
            /**
             * For each axis, calculate the current progress of the layout axis
             * within the new constraints.
             */
            eachAxis((axis) => {
                if (!shouldDrag(axis, drag, null))
                    return;
                /**
                 * Calculate a new transform based on the previous box progress
                 */
                const axisValue = this.getAxisMotionValue(axis);
                const { min, max } = this.constraints[axis];
                axisValue.set(mixNumber$1(min, max, boxProgress[axis]));
            });
        }
        addListeners() {
            if (!this.visualElement.current)
                return;
            elementDragControls.set(this.visualElement, this);
            const element = this.visualElement.current;
            /**
             * Attach a pointerdown event listener on this DOM element to initiate drag tracking.
             */
            const stopPointerListener = addPointerEvent(element, "pointerdown", (event) => {
                const { drag, dragListener = true } = this.getProps();
                drag && dragListener && this.start(event);
            });
            const measureDragConstraints = () => {
                const { dragConstraints } = this.getProps();
                if (isRefObject(dragConstraints) && dragConstraints.current) {
                    this.constraints = this.resolveRefConstraints();
                }
            };
            const { projection } = this.visualElement;
            const stopMeasureLayoutListener = projection.addEventListener("measure", measureDragConstraints);
            if (projection && !projection.layout) {
                projection.root && projection.root.updateScroll();
                projection.updateLayout();
            }
            frame.read(measureDragConstraints);
            /**
             * Attach a window resize listener to scale the draggable target within its defined
             * constraints as the window resizes.
             */
            const stopResizeListener = addDomEvent(window, "resize", () => this.scalePositionWithinConstraints());
            /**
             * If the element's layout changes, calculate the delta and apply that to
             * the drag gesture's origin point.
             */
            const stopLayoutUpdateListener = projection.addEventListener("didUpdate", (({ delta, hasLayoutChanged }) => {
                if (this.isDragging && hasLayoutChanged) {
                    eachAxis((axis) => {
                        const motionValue = this.getAxisMotionValue(axis);
                        if (!motionValue)
                            return;
                        this.originPoint[axis] += delta[axis].translate;
                        motionValue.set(motionValue.get() + delta[axis].translate);
                    });
                    this.visualElement.render();
                }
            }));
            return () => {
                stopResizeListener();
                stopPointerListener();
                stopMeasureLayoutListener();
                stopLayoutUpdateListener && stopLayoutUpdateListener();
            };
        }
        getProps() {
            const props = this.visualElement.getProps();
            const { drag = false, dragDirectionLock = false, dragPropagation = false, dragConstraints = false, dragElastic = defaultElastic, dragMomentum = true, } = props;
            return {
                ...props,
                drag,
                dragDirectionLock,
                dragPropagation,
                dragConstraints,
                dragElastic,
                dragMomentum,
            };
        }
    }
    function shouldDrag(direction, drag, currentDirection) {
        return ((drag === true || drag === direction) &&
            (currentDirection === null || currentDirection === direction));
    }
    /**
     * Based on an x/y offset determine the current drag direction. If both axis' offsets are lower
     * than the provided threshold, return `null`.
     *
     * @param offset - The x/y offset from origin.
     * @param lockThreshold - (Optional) - the minimum absolute offset before we can determine a drag direction.
     */
    function getCurrentDirection(offset, lockThreshold = 10) {
        let direction = null;
        if (Math.abs(offset.y) > lockThreshold) {
            direction = "y";
        }
        else if (Math.abs(offset.x) > lockThreshold) {
            direction = "x";
        }
        return direction;
    }

    class DragGesture extends Feature {
        constructor(node) {
            super(node);
            this.removeGroupControls = noop;
            this.removeListeners = noop;
            this.controls = new VisualElementDragControls(node);
        }
        mount() {
            // If we've been provided a DragControls for manual control over the drag gesture,
            // subscribe this component to it on mount.
            const { dragControls } = this.node.getProps();
            if (dragControls) {
                this.removeGroupControls = dragControls.subscribe(this.controls);
            }
            this.removeListeners = this.controls.addListeners() || noop;
        }
        unmount() {
            this.removeGroupControls();
            this.removeListeners();
        }
    }

    const asyncHandler = (handler) => (event, info) => {
        if (handler) {
            frame.postRender(() => handler(event, info));
        }
    };
    class PanGesture extends Feature {
        constructor() {
            super(...arguments);
            this.removePointerDownListener = noop;
        }
        onPointerDown(pointerDownEvent) {
            this.session = new PanSession(pointerDownEvent, this.createPanHandlers(), {
                transformPagePoint: this.node.getTransformPagePoint(),
                contextWindow: getContextWindow(this.node),
            });
        }
        createPanHandlers() {
            const { onPanSessionStart, onPanStart, onPan, onPanEnd } = this.node.getProps();
            return {
                onSessionStart: asyncHandler(onPanSessionStart),
                onStart: asyncHandler(onPanStart),
                onMove: onPan,
                onEnd: (event, info) => {
                    delete this.session;
                    if (onPanEnd) {
                        frame.postRender(() => onPanEnd(event, info));
                    }
                },
            };
        }
        mount() {
            this.removePointerDownListener = addPointerEvent(this.node.current, "pointerdown", (event) => this.onPointerDown(event));
        }
        update() {
            this.session && this.session.updateHandlers(this.createPanHandlers());
        }
        unmount() {
            this.removePointerDownListener();
            this.session && this.session.end();
        }
    }

    /**
     * Internal, exported only for usage in Framer
     */
    const SwitchLayoutGroupContext = React$1.createContext({});

    class MeasureLayoutWithContext extends React$1.Component {
        /**
         * This only mounts projection nodes for components that
         * need measuring, we might want to do it for all components
         * in order to incorporate transforms
         */
        componentDidMount() {
            const { visualElement, layoutGroup, switchLayoutGroup, layoutId } = this.props;
            const { projection } = visualElement;
            addScaleCorrector(defaultScaleCorrectors);
            if (projection) {
                if (layoutGroup.group)
                    layoutGroup.group.add(projection);
                if (switchLayoutGroup && switchLayoutGroup.register && layoutId) {
                    switchLayoutGroup.register(projection);
                }
                projection.root.didUpdate();
                projection.addEventListener("animationComplete", () => {
                    this.safeToRemove();
                });
                projection.setOptions({
                    ...projection.options,
                    onExitComplete: () => this.safeToRemove(),
                });
            }
            globalProjectionState.hasEverUpdated = true;
        }
        getSnapshotBeforeUpdate(prevProps) {
            const { layoutDependency, visualElement, drag, isPresent } = this.props;
            const projection = visualElement.projection;
            if (!projection)
                return null;
            /**
             * TODO: We use this data in relegate to determine whether to
             * promote a previous element. There's no guarantee its presence data
             * will have updated by this point - if a bug like this arises it will
             * have to be that we markForRelegation and then find a new lead some other way,
             * perhaps in didUpdate
             */
            projection.isPresent = isPresent;
            if (drag ||
                prevProps.layoutDependency !== layoutDependency ||
                layoutDependency === undefined) {
                projection.willUpdate();
            }
            else {
                this.safeToRemove();
            }
            if (prevProps.isPresent !== isPresent) {
                if (isPresent) {
                    projection.promote();
                }
                else if (!projection.relegate()) {
                    /**
                     * If there's another stack member taking over from this one,
                     * it's in charge of the exit animation and therefore should
                     * be in charge of the safe to remove. Otherwise we call it here.
                     */
                    frame.postRender(() => {
                        const stack = projection.getStack();
                        if (!stack || !stack.members.length) {
                            this.safeToRemove();
                        }
                    });
                }
            }
            return null;
        }
        componentDidUpdate() {
            const { projection } = this.props.visualElement;
            if (projection) {
                projection.root.didUpdate();
                microtask.postRender(() => {
                    if (!projection.currentAnimation && projection.isLead()) {
                        this.safeToRemove();
                    }
                });
            }
        }
        componentWillUnmount() {
            const { visualElement, layoutGroup, switchLayoutGroup: promoteContext, } = this.props;
            const { projection } = visualElement;
            if (projection) {
                projection.scheduleCheckAfterUnmount();
                if (layoutGroup && layoutGroup.group)
                    layoutGroup.group.remove(projection);
                if (promoteContext && promoteContext.deregister)
                    promoteContext.deregister(projection);
            }
        }
        safeToRemove() {
            const { safeToRemove } = this.props;
            safeToRemove && safeToRemove();
        }
        render() {
            return null;
        }
    }
    function MeasureLayout(props) {
        const [isPresent, safeToRemove] = usePresence();
        const layoutGroup = React$1.useContext(LayoutGroupContext);
        return (jsx(MeasureLayoutWithContext, { ...props, layoutGroup: layoutGroup, switchLayoutGroup: React$1.useContext(SwitchLayoutGroupContext), isPresent: isPresent, safeToRemove: safeToRemove }));
    }
    const defaultScaleCorrectors = {
        borderRadius: {
            ...correctBorderRadius,
            applyTo: [
                "borderTopLeftRadius",
                "borderTopRightRadius",
                "borderBottomLeftRadius",
                "borderBottomRightRadius",
            ],
        },
        borderTopLeftRadius: correctBorderRadius,
        borderTopRightRadius: correctBorderRadius,
        borderBottomLeftRadius: correctBorderRadius,
        borderBottomRightRadius: correctBorderRadius,
        boxShadow: correctBoxShadow,
    };

    const drag = {
        pan: {
            Feature: PanGesture,
        },
        drag: {
            Feature: DragGesture,
            ProjectionNode: HTMLProjectionNode,
            MeasureLayout,
        },
    };

    function handleHoverEvent(node, event, lifecycle) {
        const { props } = node;
        if (node.animationState && props.whileHover) {
            node.animationState.setActive("whileHover", lifecycle === "Start");
        }
        const eventName = ("onHover" + lifecycle);
        const callback = props[eventName];
        if (callback) {
            frame.postRender(() => callback(event, extractEventInfo(event)));
        }
    }
    class HoverGesture extends Feature {
        mount() {
            const { current } = this.node;
            if (!current)
                return;
            this.unmount = hover(current, (startEvent) => {
                handleHoverEvent(this.node, startEvent, "Start");
                return (endEvent) => handleHoverEvent(this.node, endEvent, "End");
            });
        }
        unmount() { }
    }

    class FocusGesture extends Feature {
        constructor() {
            super(...arguments);
            this.isActive = false;
        }
        onFocus() {
            let isFocusVisible = false;
            /**
             * If this element doesn't match focus-visible then don't
             * apply whileHover. But, if matches throws that focus-visible
             * is not a valid selector then in that browser outline styles will be applied
             * to the element by default and we want to match that behaviour with whileFocus.
             */
            try {
                isFocusVisible = this.node.current.matches(":focus-visible");
            }
            catch (e) {
                isFocusVisible = true;
            }
            if (!isFocusVisible || !this.node.animationState)
                return;
            this.node.animationState.setActive("whileFocus", true);
            this.isActive = true;
        }
        onBlur() {
            if (!this.isActive || !this.node.animationState)
                return;
            this.node.animationState.setActive("whileFocus", false);
            this.isActive = false;
        }
        mount() {
            this.unmount = pipe(addDomEvent(this.node.current, "focus", () => this.onFocus()), addDomEvent(this.node.current, "blur", () => this.onBlur()));
        }
        unmount() { }
    }

    function handlePressEvent(node, event, lifecycle) {
        const { props } = node;
        if (node.animationState && props.whileTap) {
            node.animationState.setActive("whileTap", lifecycle === "Start");
        }
        const eventName = ("onTap" + (lifecycle === "End" ? "" : lifecycle));
        const callback = props[eventName];
        if (callback) {
            frame.postRender(() => callback(event, extractEventInfo(event)));
        }
    }
    class PressGesture extends Feature {
        mount() {
            const { current } = this.node;
            if (!current)
                return;
            this.unmount = press(current, (startEvent) => {
                handlePressEvent(this.node, startEvent, "Start");
                return (endEvent, { success }) => handlePressEvent(this.node, endEvent, success ? "End" : "Cancel");
            }, { useGlobalTarget: this.node.props.globalTapTarget });
        }
        unmount() { }
    }

    /**
     * Map an IntersectionHandler callback to an element. We only ever make one handler for one
     * element, so even though these handlers might all be triggered by different
     * observers, we can keep them in the same map.
     */
    const observerCallbacks = new WeakMap();
    /**
     * Multiple observers can be created for multiple element/document roots. Each with
     * different settings. So here we store dictionaries of observers to each root,
     * using serialised settings (threshold/margin) as lookup keys.
     */
    const observers = new WeakMap();
    const fireObserverCallback = (entry) => {
        const callback = observerCallbacks.get(entry.target);
        callback && callback(entry);
    };
    const fireAllObserverCallbacks = (entries) => {
        entries.forEach(fireObserverCallback);
    };
    function initIntersectionObserver({ root, ...options }) {
        const lookupRoot = root || document;
        /**
         * If we don't have an observer lookup map for this root, create one.
         */
        if (!observers.has(lookupRoot)) {
            observers.set(lookupRoot, {});
        }
        const rootObservers = observers.get(lookupRoot);
        const key = JSON.stringify(options);
        /**
         * If we don't have an observer for this combination of root and settings,
         * create one.
         */
        if (!rootObservers[key]) {
            rootObservers[key] = new IntersectionObserver(fireAllObserverCallbacks, { root, ...options });
        }
        return rootObservers[key];
    }
    function observeIntersection(element, options, callback) {
        const rootInteresectionObserver = initIntersectionObserver(options);
        observerCallbacks.set(element, callback);
        rootInteresectionObserver.observe(element);
        return () => {
            observerCallbacks.delete(element);
            rootInteresectionObserver.unobserve(element);
        };
    }

    const thresholdNames = {
        some: 0,
        all: 1,
    };
    class InViewFeature extends Feature {
        constructor() {
            super(...arguments);
            this.hasEnteredView = false;
            this.isInView = false;
        }
        startObserver() {
            this.unmount();
            const { viewport = {} } = this.node.getProps();
            const { root, margin: rootMargin, amount = "some", once } = viewport;
            const options = {
                root: root ? root.current : undefined,
                rootMargin,
                threshold: typeof amount === "number" ? amount : thresholdNames[amount],
            };
            const onIntersectionUpdate = (entry) => {
                const { isIntersecting } = entry;
                /**
                 * If there's been no change in the viewport state, early return.
                 */
                if (this.isInView === isIntersecting)
                    return;
                this.isInView = isIntersecting;
                /**
                 * Handle hasEnteredView. If this is only meant to run once, and
                 * element isn't visible, early return. Otherwise set hasEnteredView to true.
                 */
                if (once && !isIntersecting && this.hasEnteredView) {
                    return;
                }
                else if (isIntersecting) {
                    this.hasEnteredView = true;
                }
                if (this.node.animationState) {
                    this.node.animationState.setActive("whileInView", isIntersecting);
                }
                /**
                 * Use the latest committed props rather than the ones in scope
                 * when this observer is created
                 */
                const { onViewportEnter, onViewportLeave } = this.node.getProps();
                const callback = isIntersecting ? onViewportEnter : onViewportLeave;
                callback && callback(entry);
            };
            return observeIntersection(this.node.current, options, onIntersectionUpdate);
        }
        mount() {
            this.startObserver();
        }
        update() {
            if (typeof IntersectionObserver === "undefined")
                return;
            const { props, prevProps } = this.node;
            const hasOptionsChanged = ["amount", "margin", "root"].some(hasViewportOptionChanged(props, prevProps));
            if (hasOptionsChanged) {
                this.startObserver();
            }
        }
        unmount() { }
    }
    function hasViewportOptionChanged({ viewport = {} }, { viewport: prevViewport = {} } = {}) {
        return (name) => viewport[name] !== prevViewport[name];
    }

    const gestureAnimations = {
        inView: {
            Feature: InViewFeature,
        },
        tap: {
            Feature: PressGesture,
        },
        focus: {
            Feature: FocusGesture,
        },
        hover: {
            Feature: HoverGesture,
        },
    };

    const layout = {
        layout: {
            ProjectionNode: HTMLProjectionNode,
            MeasureLayout,
        },
    };

    function getCurrentTreeVariants(props, context) {
        if (isControllingVariants(props)) {
            const { initial, animate } = props;
            return {
                initial: initial === false || isVariantLabel(initial)
                    ? initial
                    : undefined,
                animate: isVariantLabel(animate) ? animate : undefined,
            };
        }
        return props.inherit !== false ? context : {};
    }

    function useCreateMotionContext(props) {
        const { initial, animate } = getCurrentTreeVariants(props, React$1.useContext(MotionContext));
        return React$1.useMemo(() => ({ initial, animate }), [variantLabelsAsDependency(initial), variantLabelsAsDependency(animate)]);
    }
    function variantLabelsAsDependency(prop) {
        return Array.isArray(prop) ? prop.join(" ") : prop;
    }

    const motionComponentSymbol = Symbol.for("motionComponentSymbol");

    /**
     * Creates a ref function that, when called, hydrates the provided
     * external ref and VisualElement.
     */
    function useMotionRef(visualState, visualElement, externalRef) {
        return React$1.useCallback((instance) => {
            if (instance) {
                visualState.onMount && visualState.onMount(instance);
            }
            if (visualElement) {
                if (instance) {
                    visualElement.mount(instance);
                }
                else {
                    visualElement.unmount();
                }
            }
            if (externalRef) {
                if (typeof externalRef === "function") {
                    externalRef(instance);
                }
                else if (isRefObject(externalRef)) {
                    externalRef.current = instance;
                }
            }
        }, 
        /**
         * Only pass a new ref callback to React if we've received a visual element
         * factory. Otherwise we'll be mounting/remounting every time externalRef
         * or other dependencies change.
         */
        [visualElement]);
    }

    function useVisualElement(Component, visualState, props, createVisualElement, ProjectionNodeConstructor) {
        var _a, _b;
        const { visualElement: parent } = React$1.useContext(MotionContext);
        const lazyContext = React$1.useContext(LazyContext);
        const presenceContext = React$1.useContext(PresenceContext);
        const reducedMotionConfig = React$1.useContext(MotionConfigContext).reducedMotion;
        const visualElementRef = React$1.useRef(null);
        /**
         * If we haven't preloaded a renderer, check to see if we have one lazy-loaded
         */
        createVisualElement = createVisualElement || lazyContext.renderer;
        if (!visualElementRef.current && createVisualElement) {
            visualElementRef.current = createVisualElement(Component, {
                visualState,
                parent,
                props,
                presenceContext,
                blockInitialAnimation: presenceContext
                    ? presenceContext.initial === false
                    : false,
                reducedMotionConfig,
            });
        }
        const visualElement = visualElementRef.current;
        /**
         * Load Motion gesture and animation features. These are rendered as renderless
         * components so each feature can optionally make use of React lifecycle methods.
         */
        const initialLayoutGroupConfig = React$1.useContext(SwitchLayoutGroupContext);
        if (visualElement &&
            !visualElement.projection &&
            ProjectionNodeConstructor &&
            (visualElement.type === "html" || visualElement.type === "svg")) {
            createProjectionNode(visualElementRef.current, props, ProjectionNodeConstructor, initialLayoutGroupConfig);
        }
        const isMounted = React$1.useRef(false);
        React$1.useInsertionEffect(() => {
            /**
             * Check the component has already mounted before calling
             * `update` unnecessarily. This ensures we skip the initial update.
             */
            if (visualElement && isMounted.current) {
                visualElement.update(props, presenceContext);
            }
        });
        /**
         * Cache this value as we want to know whether HandoffAppearAnimations
         * was present on initial render - it will be deleted after this.
         */
        const optimisedAppearId = props[optimizedAppearDataAttribute];
        const wantsHandoff = React$1.useRef(Boolean(optimisedAppearId) &&
            !((_a = window.MotionHandoffIsComplete) === null || _a === void 0 ? void 0 : _a.call(window, optimisedAppearId)) &&
            ((_b = window.MotionHasOptimisedAnimation) === null || _b === void 0 ? void 0 : _b.call(window, optimisedAppearId)));
        useIsomorphicLayoutEffect(() => {
            if (!visualElement)
                return;
            isMounted.current = true;
            window.MotionIsMounted = true;
            visualElement.updateFeatures();
            microtask.render(visualElement.render);
            /**
             * Ideally this function would always run in a useEffect.
             *
             * However, if we have optimised appear animations to handoff from,
             * it needs to happen synchronously to ensure there's no flash of
             * incorrect styles in the event of a hydration error.
             *
             * So if we detect a situtation where optimised appear animations
             * are running, we use useLayoutEffect to trigger animations.
             */
            if (wantsHandoff.current && visualElement.animationState) {
                visualElement.animationState.animateChanges();
            }
        });
        React$1.useEffect(() => {
            if (!visualElement)
                return;
            if (!wantsHandoff.current && visualElement.animationState) {
                visualElement.animationState.animateChanges();
            }
            if (wantsHandoff.current) {
                // This ensures all future calls to animateChanges() in this component will run in useEffect
                queueMicrotask(() => {
                    var _a;
                    (_a = window.MotionHandoffMarkAsComplete) === null || _a === void 0 ? void 0 : _a.call(window, optimisedAppearId);
                });
                wantsHandoff.current = false;
            }
        });
        return visualElement;
    }
    function createProjectionNode(visualElement, props, ProjectionNodeConstructor, initialPromotionConfig) {
        const { layoutId, layout, drag, dragConstraints, layoutScroll, layoutRoot, } = props;
        visualElement.projection = new ProjectionNodeConstructor(visualElement.latestValues, props["data-framer-portal-id"]
            ? undefined
            : getClosestProjectingNode(visualElement.parent));
        visualElement.projection.setOptions({
            layoutId,
            layout,
            alwaysMeasureLayout: Boolean(drag) || (dragConstraints && isRefObject(dragConstraints)),
            visualElement,
            /**
             * TODO: Update options in an effect. This could be tricky as it'll be too late
             * to update by the time layout animations run.
             * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
             * ensuring it gets called if there's no potential layout animations.
             *
             */
            animationType: typeof layout === "string" ? layout : "both",
            initialPromotionConfig,
            layoutScroll,
            layoutRoot,
        });
    }
    function getClosestProjectingNode(visualElement) {
        if (!visualElement)
            return undefined;
        return visualElement.options.allowProjection !== false
            ? visualElement.projection
            : getClosestProjectingNode(visualElement.parent);
    }

    /**
     * Create a `motion` component.
     *
     * This function accepts a Component argument, which can be either a string (ie "div"
     * for `motion.div`), or an actual React component.
     *
     * Alongside this is a config option which provides a way of rendering the provided
     * component "offline", or outside the React render cycle.
     */
    function createRendererMotionComponent({ preloadedFeatures, createVisualElement, useRender, useVisualState, Component, }) {
        var _a, _b;
        preloadedFeatures && loadFeatures(preloadedFeatures);
        function MotionComponent(props, externalRef) {
            /**
             * If we need to measure the element we load this functionality in a
             * separate class component in order to gain access to getSnapshotBeforeUpdate.
             */
            let MeasureLayout;
            const configAndProps = {
                ...React$1.useContext(MotionConfigContext),
                ...props,
                layoutId: useLayoutId(props),
            };
            const { isStatic } = configAndProps;
            const context = useCreateMotionContext(props);
            const visualState = useVisualState(props, isStatic);
            if (!isStatic && isBrowser) {
                useStrictMode(configAndProps, preloadedFeatures);
                const layoutProjection = getProjectionFunctionality(configAndProps);
                MeasureLayout = layoutProjection.MeasureLayout;
                /**
                 * Create a VisualElement for this component. A VisualElement provides a common
                 * interface to renderer-specific APIs (ie DOM/Three.js etc) as well as
                 * providing a way of rendering to these APIs outside of the React render loop
                 * for more performant animations and interactions
                 */
                context.visualElement = useVisualElement(Component, visualState, configAndProps, createVisualElement, layoutProjection.ProjectionNode);
            }
            /**
             * The mount order and hierarchy is specific to ensure our element ref
             * is hydrated by the time features fire their effects.
             */
            return (jsxs(MotionContext.Provider, { value: context, children: [MeasureLayout && context.visualElement ? (jsx(MeasureLayout, { visualElement: context.visualElement, ...configAndProps })) : null, useRender(Component, props, useMotionRef(visualState, context.visualElement, externalRef), visualState, isStatic, context.visualElement)] }));
        }
        MotionComponent.displayName = `motion.${typeof Component === "string"
        ? Component
        : `create(${(_b = (_a = Component.displayName) !== null && _a !== void 0 ? _a : Component.name) !== null && _b !== void 0 ? _b : ""})`}`;
        const ForwardRefMotionComponent = React$1.forwardRef(MotionComponent);
        ForwardRefMotionComponent[motionComponentSymbol] = Component;
        return ForwardRefMotionComponent;
    }
    function useLayoutId({ layoutId }) {
        const layoutGroupId = React$1.useContext(LayoutGroupContext).id;
        return layoutGroupId && layoutId !== undefined
            ? layoutGroupId + "-" + layoutId
            : layoutId;
    }
    function useStrictMode(configAndProps, preloadedFeatures) {
        const isStrict = React$1.useContext(LazyContext).strict;
        /**
         * If we're in development mode, check to make sure we're not rendering a motion component
         * as a child of LazyMotion, as this will break the file-size benefits of using it.
         */
        if (preloadedFeatures &&
            isStrict) {
            const strictMessage = "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead.";
            configAndProps.ignoreStrict
                ? warning(false, strictMessage)
                : exports.invariant(false, strictMessage);
        }
    }
    function getProjectionFunctionality(props) {
        const { drag, layout } = featureDefinitions;
        if (!drag && !layout)
            return {};
        const combined = { ...drag, ...layout };
        return {
            MeasureLayout: (drag === null || drag === void 0 ? void 0 : drag.isEnabled(props)) || (layout === null || layout === void 0 ? void 0 : layout.isEnabled(props))
                ? combined.MeasureLayout
                : undefined,
            ProjectionNode: combined.ProjectionNode,
        };
    }

    /**
     * We keep these listed separately as we use the lowercase tag names as part
     * of the runtime bundle to detect SVG components
     */
    const lowercaseSVGElements = [
        "animate",
        "circle",
        "defs",
        "desc",
        "ellipse",
        "g",
        "image",
        "line",
        "filter",
        "marker",
        "mask",
        "metadata",
        "path",
        "pattern",
        "polygon",
        "polyline",
        "rect",
        "stop",
        "switch",
        "symbol",
        "svg",
        "text",
        "tspan",
        "use",
        "view",
    ];

    function isSVGComponent(Component) {
        if (
        /**
         * If it's not a string, it's a custom React component. Currently we only support
         * HTML custom React components.
         */
        typeof Component !== "string" ||
            /**
             * If it contains a dash, the element is a custom HTML webcomponent.
             */
            Component.includes("-")) {
            return false;
        }
        else if (
        /**
         * If it's in our list of lowercase SVG tags, it's an SVG component
         */
        lowercaseSVGElements.indexOf(Component) > -1 ||
            /**
             * If it contains a capital letter, it's an SVG component
             */
            /[A-Z]/u.test(Component)) {
            return true;
        }
        return false;
    }

    const createHtmlRenderState = () => ({
        style: {},
        transform: {},
        transformOrigin: {},
        vars: {},
    });

    const createSvgRenderState = () => ({
        ...createHtmlRenderState(),
        attrs: {},
    });

    function updateSVGDimensions(instance, renderState) {
        try {
            renderState.dimensions =
                typeof instance.getBBox === "function"
                    ? instance.getBBox()
                    : instance.getBoundingClientRect();
        }
        catch (e) {
            // Most likely trying to measure an unrendered element under Firefox
            renderState.dimensions = {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            };
        }
    }
    const layoutProps = ["x", "y", "width", "height", "cx", "cy", "r"];
    const svgMotionConfig = {
        useVisualState: makeUseVisualState({
            scrapeMotionValuesFromProps: scrapeMotionValuesFromProps,
            createRenderState: createSvgRenderState,
            onUpdate: ({ props, prevProps, current, renderState, latestValues, }) => {
                if (!current)
                    return;
                let hasTransform = !!props.drag;
                if (!hasTransform) {
                    for (const key in latestValues) {
                        if (transformProps.has(key)) {
                            hasTransform = true;
                            break;
                        }
                    }
                }
                if (!hasTransform)
                    return;
                let needsMeasure = !prevProps;
                if (prevProps) {
                    /**
                     * Check the layout props for changes, if any are found we need to
                     * measure the element again.
                     */
                    for (let i = 0; i < layoutProps.length; i++) {
                        const key = layoutProps[i];
                        if (props[key] !==
                            prevProps[key]) {
                            needsMeasure = true;
                        }
                    }
                }
                if (!needsMeasure)
                    return;
                frame.read(() => {
                    updateSVGDimensions(current, renderState);
                    frame.render(() => {
                        buildSVGAttrs(renderState, latestValues, isSVGTag(current.tagName), props.transformTemplate);
                        renderSVG(current, renderState);
                    });
                });
            },
        }),
    };

    const htmlMotionConfig = {
        useVisualState: makeUseVisualState({
            scrapeMotionValuesFromProps: scrapeMotionValuesFromProps$1,
            createRenderState: createHtmlRenderState,
        }),
    };

    function copyRawValuesOnly(target, source, props) {
        for (const key in source) {
            if (!isMotionValue(source[key]) && !isForcedMotionValue(key, props)) {
                target[key] = source[key];
            }
        }
    }
    function useInitialMotionValues({ transformTemplate }, visualState) {
        return React$1.useMemo(() => {
            const state = createHtmlRenderState();
            buildHTMLStyles(state, visualState, transformTemplate);
            return Object.assign({}, state.vars, state.style);
        }, [visualState]);
    }
    function useStyle(props, visualState) {
        const styleProp = props.style || {};
        const style = {};
        /**
         * Copy non-Motion Values straight into style
         */
        copyRawValuesOnly(style, styleProp, props);
        Object.assign(style, useInitialMotionValues(props, visualState));
        return style;
    }
    function useHTMLProps(props, visualState) {
        // The `any` isn't ideal but it is the type of createElement props argument
        const htmlProps = {};
        const style = useStyle(props, visualState);
        if (props.drag && props.dragListener !== false) {
            // Disable the ghost element when a user drags
            htmlProps.draggable = false;
            // Disable text selection
            style.userSelect =
                style.WebkitUserSelect =
                    style.WebkitTouchCallout =
                        "none";
            // Disable scrolling on the draggable direction
            style.touchAction =
                props.drag === true
                    ? "none"
                    : `pan-${props.drag === "x" ? "y" : "x"}`;
        }
        if (props.tabIndex === undefined &&
            (props.onTap || props.onTapStart || props.whileTap)) {
            htmlProps.tabIndex = 0;
        }
        htmlProps.style = style;
        return htmlProps;
    }

    function useSVGProps(props, visualState, _isStatic, Component) {
        const visualProps = React$1.useMemo(() => {
            const state = createSvgRenderState();
            buildSVGAttrs(state, visualState, isSVGTag(Component), props.transformTemplate);
            return {
                ...state.attrs,
                style: { ...state.style },
            };
        }, [visualState]);
        if (props.style) {
            const rawStyles = {};
            copyRawValuesOnly(rawStyles, props.style, props);
            visualProps.style = { ...rawStyles, ...visualProps.style };
        }
        return visualProps;
    }

    function createUseRender(forwardMotionProps = false) {
        const useRender = (Component, props, ref, { latestValues }, isStatic) => {
            const useVisualProps = isSVGComponent(Component)
                ? useSVGProps
                : useHTMLProps;
            const visualProps = useVisualProps(props, latestValues, isStatic, Component);
            const filteredProps = filterProps(props, typeof Component === "string", forwardMotionProps);
            const elementProps = Component !== React$1.Fragment
                ? { ...filteredProps, ...visualProps, ref }
                : {};
            /**
             * If component has been handed a motion value as its child,
             * memoise its initial value and render that. Subsequent updates
             * will be handled by the onChange handler
             */
            const { children } = props;
            const renderedChildren = React$1.useMemo(() => (isMotionValue(children) ? children.get() : children), [children]);
            return React$1.createElement(Component, {
                ...elementProps,
                children: renderedChildren,
            });
        };
        return useRender;
    }

    function createMotionComponentFactory(preloadedFeatures, createVisualElement) {
        return function createMotionComponent(Component, { forwardMotionProps } = { forwardMotionProps: false }) {
            const baseConfig = isSVGComponent(Component)
                ? svgMotionConfig
                : htmlMotionConfig;
            const config = {
                ...baseConfig,
                preloadedFeatures,
                useRender: createUseRender(forwardMotionProps),
                createVisualElement,
                Component,
            };
            return createRendererMotionComponent(config);
        };
    }

    const createDomVisualElement = (Component, options) => {
        return isSVGComponent(Component)
            ? new SVGVisualElement(options)
            : new HTMLVisualElement(options, {
                allowProjection: Component !== React$1.Fragment,
            });
    };

    const createMotionComponent = /*@__PURE__*/ createMotionComponentFactory({
        ...animations,
        ...gestureAnimations,
        ...drag,
        ...layout,
    }, createDomVisualElement);

    const motion = /*@__PURE__*/ createDOMMotionComponentProxy(createMotionComponent);

    function checkReorder(order, value, offset, velocity) {
        if (!velocity)
            return order;
        const index = order.findIndex((item) => item.value === value);
        if (index === -1)
            return order;
        const nextOffset = velocity > 0 ? 1 : -1;
        const nextItem = order[index + nextOffset];
        if (!nextItem)
            return order;
        const item = order[index];
        const nextLayout = nextItem.layout;
        const nextItemCenter = mixNumber$1(nextLayout.min, nextLayout.max, 0.5);
        if ((nextOffset === 1 && item.layout.max + offset > nextItemCenter) ||
            (nextOffset === -1 && item.layout.min + offset < nextItemCenter)) {
            return moveItem(order, index, index + nextOffset);
        }
        return order;
    }

    function ReorderGroupComponent({ children, as = "ul", axis = "y", onReorder, values, ...props }, externalRef) {
        const Component = useConstant(() => motion[as]);
        const order = [];
        const isReordering = React$1.useRef(false);
        exports.invariant(Boolean(values), "Reorder.Group must be provided a values prop");
        const context = {
            axis,
            registerItem: (value, layout) => {
                // If the entry was already added, update it rather than adding it again
                const idx = order.findIndex((entry) => value === entry.value);
                if (idx !== -1) {
                    order[idx].layout = layout[axis];
                }
                else {
                    order.push({ value: value, layout: layout[axis] });
                }
                order.sort(compareMin);
            },
            updateOrder: (item, offset, velocity) => {
                if (isReordering.current)
                    return;
                const newOrder = checkReorder(order, item, offset, velocity);
                if (order !== newOrder) {
                    isReordering.current = true;
                    onReorder(newOrder
                        .map(getValue)
                        .filter((value) => values.indexOf(value) !== -1));
                }
            },
        };
        React$1.useEffect(() => {
            isReordering.current = false;
        });
        return (jsx(Component, { ...props, ref: externalRef, ignoreStrict: true, children: jsx(ReorderContext.Provider, { value: context, children: children }) }));
    }
    const ReorderGroup = /*@__PURE__*/ React$1.forwardRef(ReorderGroupComponent);
    function getValue(item) {
        return item.value;
    }
    function compareMin(a, b) {
        return a.layout.min - b.layout.min;
    }

    /**
     * Creates a `MotionValue` to track the state and velocity of a value.
     *
     * Usually, these are created automatically. For advanced use-cases, like use with `useTransform`, you can create `MotionValue`s externally and pass them into the animated component via the `style` prop.
     *
     * ```jsx
     * export const MyComponent = () => {
     *   const scale = useMotionValue(1)
     *
     *   return <motion.div style={{ scale }} />
     * }
     * ```
     *
     * @param initial - The initial state.
     *
     * @public
     */
    function useMotionValue(initial) {
        const value = useConstant(() => motionValue(initial));
        /**
         * If this motion value is being used in static mode, like on
         * the Framer canvas, force components to rerender when the motion
         * value is updated.
         */
        const { isStatic } = React$1.useContext(MotionConfigContext);
        if (isStatic) {
            const [, setLatest] = React$1.useState(initial);
            React$1.useEffect(() => value.on("change", setLatest), []);
        }
        return value;
    }

    function useCombineMotionValues(values, combineValues) {
        /**
         * Initialise the returned motion value. This remains the same between renders.
         */
        const value = useMotionValue(combineValues());
        /**
         * Create a function that will update the template motion value with the latest values.
         * This is pre-bound so whenever a motion value updates it can schedule its
         * execution in Framesync. If it's already been scheduled it won't be fired twice
         * in a single frame.
         */
        const updateValue = () => value.set(combineValues());
        /**
         * Synchronously update the motion value with the latest values during the render.
         * This ensures that within a React render, the styles applied to the DOM are up-to-date.
         */
        updateValue();
        /**
         * Subscribe to all motion values found within the template. Whenever any of them change,
         * schedule an update.
         */
        useIsomorphicLayoutEffect(() => {
            const scheduleUpdate = () => frame.preRender(updateValue, false, true);
            const subscriptions = values.map((v) => v.on("change", scheduleUpdate));
            return () => {
                subscriptions.forEach((unsubscribe) => unsubscribe());
                cancelFrame(updateValue);
            };
        });
        return value;
    }

    function useComputed(compute) {
        /**
         * Open session of collectMotionValues. Any MotionValue that calls get()
         * will be saved into this array.
         */
        collectMotionValues.current = [];
        compute();
        const value = useCombineMotionValues(collectMotionValues.current, compute);
        /**
         * Synchronously close session of collectMotionValues.
         */
        collectMotionValues.current = undefined;
        return value;
    }

    function useTransform(input, inputRangeOrTransformer, outputRange, options) {
        if (typeof input === "function") {
            return useComputed(input);
        }
        const transformer = typeof inputRangeOrTransformer === "function"
            ? inputRangeOrTransformer
            : transform(inputRangeOrTransformer, outputRange, options);
        return Array.isArray(input)
            ? useListTransform(input, transformer)
            : useListTransform([input], ([latest]) => transformer(latest));
    }
    function useListTransform(values, transformer) {
        const latest = useConstant(() => []);
        return useCombineMotionValues(values, () => {
            latest.length = 0;
            const numValues = values.length;
            for (let i = 0; i < numValues; i++) {
                latest[i] = values[i].get();
            }
            return transformer(latest);
        });
    }

    function useDefaultMotionValue(value, defaultValue = 0) {
        return isMotionValue(value) ? value : useMotionValue(defaultValue);
    }
    function ReorderItemComponent({ children, style = {}, value, as = "li", onDrag, layout = true, ...props }, externalRef) {
        const Component = useConstant(() => motion[as]);
        const context = React$1.useContext(ReorderContext);
        const point = {
            x: useDefaultMotionValue(style.x),
            y: useDefaultMotionValue(style.y),
        };
        const zIndex = useTransform([point.x, point.y], ([latestX, latestY]) => latestX || latestY ? 1 : "unset");
        exports.invariant(Boolean(context), "Reorder.Item must be a child of Reorder.Group");
        const { axis, registerItem, updateOrder } = context;
        return (jsx(Component, { drag: axis, ...props, dragSnapToOrigin: true, style: { ...style, x: point.x, y: point.y, zIndex }, layout: layout, onDrag: (event, gesturePoint) => {
                const { velocity } = gesturePoint;
                velocity[axis] &&
                    updateOrder(value, point[axis].get(), velocity[axis]);
                onDrag && onDrag(event, gesturePoint);
            }, onLayoutMeasure: (measured) => registerItem(value, measured), ref: externalRef, ignoreStrict: true, children: children }));
    }
    const ReorderItem = /*@__PURE__*/ React$1.forwardRef(ReorderItemComponent);

    var namespace = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Group: ReorderGroup,
        Item: ReorderItem
    });

    const createMinimalMotionComponent = 
    /*@__PURE__*/ createMotionComponentFactory();

    const m = /*@__PURE__*/ createDOMMotionComponentProxy(createMinimalMotionComponent);

    /**
     * @public
     */
    const domAnimation = {
        renderer: createDomVisualElement,
        ...animations,
        ...gestureAnimations,
    };

    /**
     * @public
     */
    const domMax = {
        ...domAnimation,
        ...drag,
        ...layout,
    };

    /**
     * @public
     */
    const domMin = {
        renderer: createDomVisualElement,
        ...animations,
    };

    function useMotionValueEvent(value, event, callback) {
        /**
         * useInsertionEffect will create subscriptions before any other
         * effects will run. Effects run upwards through the tree so it
         * can be that binding a useLayoutEffect higher up the tree can
         * miss changes from lower down the tree.
         */
        React$1.useInsertionEffect(() => value.on(event, callback), [value, event, callback]);
    }

    function refWarning(name, ref) {
        warning(Boolean(!ref || ref.current), `You have defined a ${name} options but the provided ref is not yet hydrated, probably because it's defined higher up the tree. Try calling useScroll() in the same component as the ref, or setting its \`layoutEffect: false\` option.`);
    }
    const createScrollMotionValues = () => ({
        scrollX: motionValue(0),
        scrollY: motionValue(0),
        scrollXProgress: motionValue(0),
        scrollYProgress: motionValue(0),
    });
    function useScroll({ container, target, layoutEffect = true, ...options } = {}) {
        const values = useConstant(createScrollMotionValues);
        const useLifecycleEffect = layoutEffect
            ? useIsomorphicLayoutEffect
            : React$1.useEffect;
        useLifecycleEffect(() => {
            refWarning("target", target);
            refWarning("container", container);
            return scroll((_progress, { x, y }) => {
                values.scrollX.set(x.current);
                values.scrollXProgress.set(x.progress);
                values.scrollY.set(y.current);
                values.scrollYProgress.set(y.progress);
            }, {
                ...options,
                container: (container === null || container === void 0 ? void 0 : container.current) || undefined,
                target: (target === null || target === void 0 ? void 0 : target.current) || undefined,
            });
        }, [container, target, JSON.stringify(options.offset)]);
        return values;
    }

    /**
     * @deprecated useElementScroll is deprecated. Convert to useScroll({ container: ref })
     */
    function useElementScroll(ref) {
        {
            warnOnce(false, "useElementScroll is deprecated. Convert to useScroll({ container: ref }).");
        }
        return useScroll({ container: ref });
    }

    /**
     * @deprecated useViewportScroll is deprecated. Convert to useScroll()
     */
    function useViewportScroll() {
        {
            warnOnce(false, "useViewportScroll is deprecated. Convert to useScroll().");
        }
        return useScroll();
    }

    /**
     * Combine multiple motion values into a new one using a string template literal.
     *
     * ```jsx
     * import {
     *   motion,
     *   useSpring,
     *   useMotionValue,
     *   useMotionTemplate
     * } from "framer-motion"
     *
     * function Component() {
     *   const shadowX = useSpring(0)
     *   const shadowY = useMotionValue(0)
     *   const shadow = useMotionTemplate`drop-shadow(${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.3))`
     *
     *   return <motion.div style={{ filter: shadow }} />
     * }
     * ```
     *
     * @public
     */
    function useMotionTemplate(fragments, ...values) {
        /**
         * Create a function that will build a string from the latest motion values.
         */
        const numFragments = fragments.length;
        function buildValue() {
            let output = ``;
            for (let i = 0; i < numFragments; i++) {
                output += fragments[i];
                const value = values[i];
                if (value) {
                    output += isMotionValue(value) ? value.get() : value;
                }
            }
            return output;
        }
        return useCombineMotionValues(values.filter(isMotionValue), buildValue);
    }

    function toNumber(v) {
        if (typeof v === "number")
            return v;
        return parseFloat(v);
    }
    /**
     * Creates a `MotionValue` that, when `set`, will use a spring animation to animate to its new state.
     *
     * It can either work as a stand-alone `MotionValue` by initialising it with a value, or as a subscriber
     * to another `MotionValue`.
     *
     * @remarks
     *
     * ```jsx
     * const x = useSpring(0, { stiffness: 300 })
     * const y = useSpring(x, { damping: 10 })
     * ```
     *
     * @param inputValue - `MotionValue` or number. If provided a `MotionValue`, when the input `MotionValue` changes, the created `MotionValue` will spring towards that value.
     * @param springConfig - Configuration options for the spring.
     * @returns `MotionValue`
     *
     * @public
     */
    function useSpring(source, config = {}) {
        const { isStatic } = React$1.useContext(MotionConfigContext);
        const activeSpringAnimation = React$1.useRef(null);
        const value = useMotionValue(isMotionValue(source) ? toNumber(source.get()) : source);
        const latestValue = React$1.useRef(value.get());
        const latestSetter = React$1.useRef(() => { });
        const startAnimation = () => {
            /**
             * If the previous animation hasn't had the chance to even render a frame, render it now.
             */
            const animation = activeSpringAnimation.current;
            if (animation && animation.time === 0) {
                animation.sample(frameData.delta);
            }
            stopAnimation();
            activeSpringAnimation.current = animateValue({
                keyframes: [value.get(), latestValue.current],
                velocity: value.getVelocity(),
                type: "spring",
                restDelta: 0.001,
                restSpeed: 0.01,
                ...config,
                onUpdate: latestSetter.current,
            });
        };
        const stopAnimation = () => {
            if (activeSpringAnimation.current) {
                activeSpringAnimation.current.stop();
            }
        };
        React$1.useInsertionEffect(() => {
            return value.attach((v, set) => {
                /**
                 * A more hollistic approach to this might be to use isStatic to fix VisualElement animations
                 * at that level, but this will work for now
                 */
                if (isStatic)
                    return set(v);
                latestValue.current = v;
                latestSetter.current = set;
                frame.update(startAnimation);
                return value.get();
            }, stopAnimation);
        }, [JSON.stringify(config)]);
        useIsomorphicLayoutEffect(() => {
            if (isMotionValue(source)) {
                return source.on("change", (v) => value.set(toNumber(v)));
            }
        }, [value]);
        return value;
    }

    function useAnimationFrame(callback) {
        const initialTimestamp = React$1.useRef(0);
        const { isStatic } = React$1.useContext(MotionConfigContext);
        React$1.useEffect(() => {
            if (isStatic)
                return;
            const provideTimeSinceStart = ({ timestamp, delta }) => {
                if (!initialTimestamp.current)
                    initialTimestamp.current = timestamp;
                callback(timestamp - initialTimestamp.current, delta);
            };
            frame.update(provideTimeSinceStart, true);
            return () => cancelFrame(provideTimeSinceStart);
        }, [callback]);
    }

    function useTime() {
        const time = useMotionValue(0);
        useAnimationFrame((t) => time.set(t));
        return time;
    }

    /**
     * Creates a `MotionValue` that updates when the velocity of the provided `MotionValue` changes.
     *
     * ```javascript
     * const x = useMotionValue(0)
     * const xVelocity = useVelocity(x)
     * const xAcceleration = useVelocity(xVelocity)
     * ```
     *
     * @public
     */
    function useVelocity(value) {
        const velocity = useMotionValue(value.getVelocity());
        const updateVelocity = () => {
            const latest = value.getVelocity();
            velocity.set(latest);
            /**
             * If we still have velocity, schedule an update for the next frame
             * to keep checking until it is zero.
             */
            if (latest)
                frame.update(updateVelocity);
        };
        useMotionValueEvent(value, "change", () => {
            // Schedule an update to this value at the end of the current frame.
            frame.update(updateVelocity, false, true);
        });
        return velocity;
    }

    function getWillChangeName(name) {
        if (transformProps.has(name)) {
            return "transform";
        }
        else if (acceleratedValues.has(name)) {
            return camelToDash(name);
        }
    }

    class WillChangeMotionValue extends MotionValue {
        constructor() {
            super(...arguments);
            this.values = [];
        }
        add(name) {
            const styleName = getWillChangeName(name);
            if (styleName) {
                addUniqueItem(this.values, styleName);
                this.update();
            }
        }
        update() {
            this.set(this.values.length ? this.values.join(", ") : "auto");
        }
    }

    function useWillChange() {
        return useConstant(() => new WillChangeMotionValue("auto"));
    }

    /**
     * A hook that returns `true` if we should be using reduced motion based on the current device's Reduced Motion setting.
     *
     * This can be used to implement changes to your UI based on Reduced Motion. For instance, replacing motion-sickness inducing
     * `x`/`y` animations with `opacity`, disabling the autoplay of background videos, or turning off parallax motion.
     *
     * It will actively respond to changes and re-render your components with the latest setting.
     *
     * ```jsx
     * export function Sidebar({ isOpen }) {
     *   const shouldReduceMotion = useReducedMotion()
     *   const closedX = shouldReduceMotion ? 0 : "-100%"
     *
     *   return (
     *     <motion.div animate={{
     *       opacity: isOpen ? 1 : 0,
     *       x: isOpen ? 0 : closedX
     *     }} />
     *   )
     * }
     * ```
     *
     * @return boolean
     *
     * @public
     */
    function useReducedMotion() {
        /**
         * Lazy initialisation of prefersReducedMotion
         */
        !hasReducedMotionListener.current && initPrefersReducedMotion();
        const [shouldReduceMotion] = React$1.useState(prefersReducedMotion.current);
        {
            warnOnce(shouldReduceMotion !== true, "You have Reduced Motion enabled on your device. Animations may not appear as expected.");
        }
        /**
         * TODO See if people miss automatically updating shouldReduceMotion setting
         */
        return shouldReduceMotion;
    }

    function useReducedMotionConfig() {
        const reducedMotionPreference = useReducedMotion();
        const { reducedMotion } = React$1.useContext(MotionConfigContext);
        if (reducedMotion === "never") {
            return false;
        }
        else if (reducedMotion === "always") {
            return true;
        }
        else {
            return reducedMotionPreference;
        }
    }

    function stopAnimation(visualElement) {
        visualElement.values.forEach((value) => value.stop());
    }
    function setVariants(visualElement, variantLabels) {
        const reversedLabels = [...variantLabels].reverse();
        reversedLabels.forEach((key) => {
            const variant = visualElement.getVariant(key);
            variant && setTarget(visualElement, variant);
            if (visualElement.variantChildren) {
                visualElement.variantChildren.forEach((child) => {
                    setVariants(child, variantLabels);
                });
            }
        });
    }
    function setValues(visualElement, definition) {
        if (Array.isArray(definition)) {
            return setVariants(visualElement, definition);
        }
        else if (typeof definition === "string") {
            return setVariants(visualElement, [definition]);
        }
        else {
            setTarget(visualElement, definition);
        }
    }
    /**
     * @public
     */
    function animationControls() {
        /**
         * Track whether the host component has mounted.
         */
        let hasMounted = false;
        /**
         * A collection of linked component animation controls.
         */
        const subscribers = new Set();
        const controls = {
            subscribe(visualElement) {
                subscribers.add(visualElement);
                return () => void subscribers.delete(visualElement);
            },
            start(definition, transitionOverride) {
                exports.invariant(hasMounted, "controls.start() should only be called after a component has mounted. Consider calling within a useEffect hook.");
                const animations = [];
                subscribers.forEach((visualElement) => {
                    animations.push(animateVisualElement(visualElement, definition, {
                        transitionOverride,
                    }));
                });
                return Promise.all(animations);
            },
            set(definition) {
                exports.invariant(hasMounted, "controls.set() should only be called after a component has mounted. Consider calling within a useEffect hook.");
                return subscribers.forEach((visualElement) => {
                    setValues(visualElement, definition);
                });
            },
            stop() {
                subscribers.forEach((visualElement) => {
                    stopAnimation(visualElement);
                });
            },
            mount() {
                hasMounted = true;
                return () => {
                    hasMounted = false;
                    controls.stop();
                };
            },
        };
        return controls;
    }

    function useAnimate() {
        const scope = useConstant(() => ({
            current: null, // Will be hydrated by React
            animations: [],
        }));
        const animate = useConstant(() => createScopedAnimate(scope));
        useUnmountEffect(() => {
            scope.animations.forEach((animation) => animation.stop());
        });
        return [scope, animate];
    }

    function useAnimateMini() {
        const scope = useConstant(() => ({
            current: null, // Will be hydrated by React
            animations: [],
        }));
        const animate = useConstant(() => createScopedWaapiAnimate(scope));
        useUnmountEffect(() => {
            scope.animations.forEach((animation) => animation.stop());
        });
        return [scope, animate];
    }

    /**
     * Creates `AnimationControls`, which can be used to manually start, stop
     * and sequence animations on one or more components.
     *
     * The returned `AnimationControls` should be passed to the `animate` property
     * of the components you want to animate.
     *
     * These components can then be animated with the `start` method.
     *
     * ```jsx
     * import * as React from 'react'
     * import { motion, useAnimation } from 'framer-motion'
     *
     * export function MyComponent(props) {
     *    const controls = useAnimation()
     *
     *    controls.start({
     *        x: 100,
     *        transition: { duration: 0.5 },
     *    })
     *
     *    return <motion.div animate={controls} />
     * }
     * ```
     *
     * @returns Animation controller with `start` and `stop` methods
     *
     * @public
     */
    function useAnimationControls() {
        const controls = useConstant(animationControls);
        useIsomorphicLayoutEffect(controls.mount, []);
        return controls;
    }
    const useAnimation = useAnimationControls;

    /**
     * Attaches an event listener directly to the provided DOM element.
     *
     * Bypassing React's event system can be desirable, for instance when attaching non-passive
     * event handlers.
     *
     * ```jsx
     * const ref = useRef(null)
     *
     * useDomEvent(ref, 'wheel', onWheel, { passive: false })
     *
     * return <div ref={ref} />
     * ```
     *
     * @param ref - React.RefObject that's been provided to the element you want to bind the listener to.
     * @param eventName - Name of the event you want listen for.
     * @param handler - Function to fire when receiving the event.
     * @param options - Options to pass to `Event.addEventListener`.
     *
     * @public
     */
    function useDomEvent(ref, eventName, handler, options) {
        React$1.useEffect(() => {
            const element = ref.current;
            if (handler && element) {
                return addDomEvent(element, eventName, handler, options);
            }
        }, [ref, eventName, handler, options]);
    }

    /**
     * Can manually trigger a drag gesture on one or more `drag`-enabled `motion` components.
     *
     * ```jsx
     * const dragControls = useDragControls()
     *
     * function startDrag(event) {
     *   dragControls.start(event, { snapToCursor: true })
     * }
     *
     * return (
     *   <>
     *     <div onPointerDown={startDrag} />
     *     <motion.div drag="x" dragControls={dragControls} />
     *   </>
     * )
     * ```
     *
     * @public
     */
    class DragControls {
        constructor() {
            this.componentControls = new Set();
        }
        /**
         * Subscribe a component's internal `VisualElementDragControls` to the user-facing API.
         *
         * @internal
         */
        subscribe(controls) {
            this.componentControls.add(controls);
            return () => this.componentControls.delete(controls);
        }
        /**
         * Start a drag gesture on every `motion` component that has this set of drag controls
         * passed into it via the `dragControls` prop.
         *
         * ```jsx
         * dragControls.start(e, {
         *   snapToCursor: true
         * })
         * ```
         *
         * @param event - PointerEvent
         * @param options - Options
         *
         * @public
         */
        start(event, options) {
            this.componentControls.forEach((controls) => {
                controls.start(event.nativeEvent || event, options);
            });
        }
    }
    const createDragControls = () => new DragControls();
    /**
     * Usually, dragging is initiated by pressing down on a `motion` component with a `drag` prop
     * and moving it. For some use-cases, for instance clicking at an arbitrary point on a video scrubber, we
     * might want to initiate that dragging from a different component than the draggable one.
     *
     * By creating a `dragControls` using the `useDragControls` hook, we can pass this into
     * the draggable component's `dragControls` prop. It exposes a `start` method
     * that can start dragging from pointer events on other components.
     *
     * ```jsx
     * const dragControls = useDragControls()
     *
     * function startDrag(event) {
     *   dragControls.start(event, { snapToCursor: true })
     * }
     *
     * return (
     *   <>
     *     <div onPointerDown={startDrag} />
     *     <motion.div drag="x" dragControls={dragControls} />
     *   </>
     * )
     * ```
     *
     * @public
     */
    function useDragControls() {
        return useConstant(createDragControls);
    }

    /**
     * Checks if a component is a `motion` component.
     */
    function isMotionComponent(component) {
        return (component !== null &&
            typeof component === "object" &&
            motionComponentSymbol in component);
    }

    /**
     * Unwraps a `motion` component and returns either a string for `motion.div` or
     * the React component for `motion(Component)`.
     *
     * If the component is not a `motion` component it returns undefined.
     */
    function unwrapMotionComponent(component) {
        if (isMotionComponent(component)) {
            return component[motionComponentSymbol];
        }
        return undefined;
    }

    function useInstantLayoutTransition() {
        return startTransition;
    }
    function startTransition(callback) {
        if (!rootProjectionNode.current)
            return;
        rootProjectionNode.current.isUpdating = false;
        rootProjectionNode.current.blockUpdate();
        callback && callback();
    }

    function useResetProjection() {
        const reset = React$1.useCallback(() => {
            const root = rootProjectionNode.current;
            if (!root)
                return;
            root.resetTree();
        }, []);
        return reset;
    }

    /**
     * Cycles through a series of visual properties. Can be used to toggle between or cycle through animations. It works similar to `useState` in React. It is provided an initial array of possible states, and returns an array of two arguments.
     *
     * An index value can be passed to the returned `cycle` function to cycle to a specific index.
     *
     * ```jsx
     * import * as React from "react"
     * import { motion, useCycle } from "framer-motion"
     *
     * export const MyComponent = () => {
     *   const [x, cycleX] = useCycle(0, 50, 100)
     *
     *   return (
     *     <motion.div
     *       animate={{ x: x }}
     *       onTap={() => cycleX()}
     *      />
     *    )
     * }
     * ```
     *
     * @param items - items to cycle through
     * @returns [currentState, cycleState]
     *
     * @public
     */
    function useCycle(...items) {
        const index = React$1.useRef(0);
        const [item, setItem] = React$1.useState(items[index.current]);
        const runCycle = React$1.useCallback((next) => {
            index.current =
                typeof next !== "number"
                    ? wrap(0, items.length, index.current + 1)
                    : next;
            setItem(items[index.current]);
        }, 
        // The array will change on each call, but by putting items.length at
        // the front of this array, we guarantee the dependency comparison will match up
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items.length, ...items]);
        return [item, runCycle];
    }

    function useInView(ref, { root, margin, amount, once = false } = {}) {
        const [isInView, setInView] = React$1.useState(false);
        React$1.useEffect(() => {
            if (!ref.current || (once && isInView))
                return;
            const onEnter = () => {
                setInView(true);
                return once ? undefined : () => setInView(false);
            };
            const options = {
                root: (root && root.current) || undefined,
                margin,
                amount,
            };
            return inView(ref.current, onEnter, options);
        }, [root, ref, margin, once, amount]);
        return isInView;
    }

    function useInstantTransition() {
        const [forceUpdate, forcedRenderCount] = useForceUpdate();
        const startInstantLayoutTransition = useInstantLayoutTransition();
        const unlockOnFrameRef = React$1.useRef(-1);
        React$1.useEffect(() => {
            /**
             * Unblock after two animation frames, otherwise this will unblock too soon.
             */
            frame.postRender(() => frame.postRender(() => {
                /**
                 * If the callback has been called again after the effect
                 * triggered this 2 frame delay, don't unblock animations. This
                 * prevents the previous effect from unblocking the current
                 * instant transition too soon. This becomes more likely when
                 * used in conjunction with React.startTransition().
                 */
                if (forcedRenderCount !== unlockOnFrameRef.current)
                    return;
                instantAnimationState.current = false;
            }));
        }, [forcedRenderCount]);
        return (callback) => {
            startInstantLayoutTransition(() => {
                instantAnimationState.current = true;
                forceUpdate();
                callback();
                unlockOnFrameRef.current = forcedRenderCount + 1;
            });
        };
    }
    function disableInstantTransitions() {
        instantAnimationState.current = false;
    }

    const appearStoreId = (elementId, valueName) => {
        const key = transformProps.has(valueName) ? "transform" : valueName;
        return `${elementId}: ${key}`;
    };

    const appearAnimationStore = new Map();
    const appearComplete = new Map();

    function handoffOptimizedAppearAnimation(elementId, valueName, frame) {
        var _a;
        const storeId = appearStoreId(elementId, valueName);
        const optimisedAnimation = appearAnimationStore.get(storeId);
        if (!optimisedAnimation) {
            return null;
        }
        const { animation, startTime } = optimisedAnimation;
        function cancelAnimation() {
            var _a;
            (_a = window.MotionCancelOptimisedAnimation) === null || _a === void 0 ? void 0 : _a.call(window, elementId, valueName, frame);
        }
        /**
         * We can cancel the animation once it's finished now that we've synced
         * with Motion.
         *
         * Prefer onfinish over finished as onfinish is backwards compatible with
         * older browsers.
         */
        animation.onfinish = cancelAnimation;
        if (startTime === null || ((_a = window.MotionHandoffIsComplete) === null || _a === void 0 ? void 0 : _a.call(window, elementId))) {
            /**
             * If the startTime is null, this animation is the Paint Ready detection animation
             * and we can cancel it immediately without handoff.
             *
             * Or if we've already handed off the animation then we're now interrupting it.
             * In which case we need to cancel it.
             */
            cancelAnimation();
            return null;
        }
        else {
            return startTime;
        }
    }

    /**
     * A single time to use across all animations to manually set startTime
     * and ensure they're all in sync.
     */
    let startFrameTime;
    /**
     * A dummy animation to detect when Chrome is ready to start
     * painting the page and hold off from triggering the real animation
     * until then. We only need one animation to detect paint ready.
     *
     * https://bugs.chromium.org/p/chromium/issues/detail?id=1406850
     */
    let readyAnimation;
    /**
     * Keep track of animations that were suspended vs cancelled so we
     * can easily resume them when we're done measuring layout.
     */
    const suspendedAnimations = new Set();
    function resumeSuspendedAnimations() {
        suspendedAnimations.forEach((data) => {
            data.animation.play();
            data.animation.startTime = data.startTime;
        });
        suspendedAnimations.clear();
    }
    function startOptimizedAppearAnimation(element, name, keyframes, options, onReady) {
        // Prevent optimised appear animations if Motion has already started animating.
        if (window.MotionIsMounted) {
            return;
        }
        const id = element.dataset[optimizedAppearDataId];
        if (!id)
            return;
        window.MotionHandoffAnimation = handoffOptimizedAppearAnimation;
        const storeId = appearStoreId(id, name);
        if (!readyAnimation) {
            readyAnimation = startWaapiAnimation(element, name, [keyframes[0], keyframes[0]], 
            /**
             * 10 secs is basically just a super-safe duration to give Chrome
             * long enough to get the animation ready.
             */
            { duration: 10000, ease: "linear" });
            appearAnimationStore.set(storeId, {
                animation: readyAnimation,
                startTime: null,
            });
            /**
             * If there's no readyAnimation then there's been no instantiation
             * of handoff animations.
             */
            window.MotionHandoffAnimation = handoffOptimizedAppearAnimation;
            window.MotionHasOptimisedAnimation = (elementId, valueName) => {
                if (!elementId)
                    return false;
                /**
                 * Keep a map of elementIds that have started animating. We check
                 * via ID instead of Element because of hydration errors and
                 * pre-hydration checks. We also actively record IDs as they start
                 * animating rather than simply checking for data-appear-id as
                 * this attrbute might be present but not lead to an animation, for
                 * instance if the element's appear animation is on a different
                 * breakpoint.
                 */
                if (!valueName) {
                    return appearComplete.has(elementId);
                }
                const animationId = appearStoreId(elementId, valueName);
                return Boolean(appearAnimationStore.get(animationId));
            };
            window.MotionHandoffMarkAsComplete = (elementId) => {
                if (appearComplete.has(elementId)) {
                    appearComplete.set(elementId, true);
                }
            };
            window.MotionHandoffIsComplete = (elementId) => {
                return appearComplete.get(elementId) === true;
            };
            /**
             * We only need to cancel transform animations as
             * they're the ones that will interfere with the
             * layout animation measurements.
             */
            window.MotionCancelOptimisedAnimation = (elementId, valueName, frame, canResume) => {
                const animationId = appearStoreId(elementId, valueName);
                const data = appearAnimationStore.get(animationId);
                if (!data)
                    return;
                if (frame && canResume === undefined) {
                    /**
                     * Wait until the end of the subsequent frame to cancel the animation
                     * to ensure we don't remove the animation before the main thread has
                     * had a chance to resolve keyframes and render.
                     */
                    frame.postRender(() => {
                        frame.postRender(() => {
                            data.animation.cancel();
                        });
                    });
                }
                else {
                    data.animation.cancel();
                }
                if (frame && canResume) {
                    suspendedAnimations.add(data);
                    frame.render(resumeSuspendedAnimations);
                }
                else {
                    appearAnimationStore.delete(animationId);
                    /**
                     * If there are no more animations left, we can remove the cancel function.
                     * This will let us know when we can stop checking for conflicting layout animations.
                     */
                    if (!appearAnimationStore.size) {
                        window.MotionCancelOptimisedAnimation = undefined;
                    }
                }
            };
            window.MotionCheckAppearSync = (visualElement, valueName, value) => {
                var _a, _b;
                const appearId = getOptimisedAppearId(visualElement);
                if (!appearId)
                    return;
                const valueIsOptimised = (_a = window.MotionHasOptimisedAnimation) === null || _a === void 0 ? void 0 : _a.call(window, appearId, valueName);
                const externalAnimationValue = (_b = visualElement.props.values) === null || _b === void 0 ? void 0 : _b[valueName];
                if (!valueIsOptimised || !externalAnimationValue)
                    return;
                const removeSyncCheck = value.on("change", (latestValue) => {
                    var _a;
                    if (externalAnimationValue.get() !== latestValue) {
                        (_a = window.MotionCancelOptimisedAnimation) === null || _a === void 0 ? void 0 : _a.call(window, appearId, valueName);
                        removeSyncCheck();
                    }
                });
                return removeSyncCheck;
            };
        }
        const startAnimation = () => {
            readyAnimation.cancel();
            const appearAnimation = startWaapiAnimation(element, name, keyframes, options);
            /**
             * Record the time of the first started animation. We call performance.now() once
             * here and once in handoff to ensure we're getting
             * close to a frame-locked time. This keeps all animations in sync.
             */
            if (startFrameTime === undefined) {
                startFrameTime = performance.now();
            }
            appearAnimation.startTime = startFrameTime;
            appearAnimationStore.set(storeId, {
                animation: appearAnimation,
                startTime: startFrameTime,
            });
            if (onReady)
                onReady(appearAnimation);
        };
        appearComplete.set(id, false);
        if (readyAnimation.ready) {
            readyAnimation.ready.then(startAnimation).catch(noop);
        }
        else {
            startAnimation();
        }
    }

    const createObject = () => ({});
    class StateVisualElement extends VisualElement {
        constructor() {
            super(...arguments);
            this.measureInstanceViewportBox = createBox;
        }
        build() { }
        resetTransform() { }
        restoreTransform() { }
        removeValueFromRenderState() { }
        renderInstance() { }
        scrapeMotionValuesFromProps() {
            return createObject();
        }
        getBaseTargetFromProps() {
            return undefined;
        }
        readValueFromInstance(_state, key, options) {
            return options.initialState[key] || 0;
        }
        sortInstanceNodePosition() {
            return 0;
        }
    }
    const useVisualState = makeUseVisualState({
        scrapeMotionValuesFromProps: createObject,
        createRenderState: createObject,
    });
    /**
     * This is not an officially supported API and may be removed
     * on any version.
     */
    function useAnimatedState(initialState) {
        const [animationState, setAnimationState] = React$1.useState(initialState);
        const visualState = useVisualState({}, false);
        const element = useConstant(() => {
            return new StateVisualElement({
                props: {
                    onUpdate: (v) => {
                        setAnimationState({ ...v });
                    },
                },
                visualState,
                presenceContext: null,
            }, { initialState });
        });
        React$1.useLayoutEffect(() => {
            element.mount({});
            return () => element.unmount();
        }, [element]);
        const startAnimation = useConstant(() => (animationDefinition) => {
            return animateVisualElement(element, animationDefinition);
        });
        return [animationState, startAnimation];
    }

    let id = 0;
    const AnimateSharedLayout = ({ children }) => {
        React__namespace.useEffect(() => {
            exports.invariant(false, "AnimateSharedLayout is deprecated: https://www.framer.com/docs/guide-upgrade/##shared-layout-animations");
        }, []);
        return (jsx(LayoutGroup, { id: useConstant(() => `asl-${id++}`), children: children }));
    };

    // Keep things reasonable and avoid scale: Infinity. In practise we might need
    // to add another value, opacity, that could interpolate scaleX/Y [0,0.01] => [0,1]
    // to simply hide content at unreasonable scales.
    const maxScale = 100000;
    const invertScale = (scale) => scale > 0.001 ? 1 / scale : maxScale;
    let hasWarned = false;
    /**
     * Returns a `MotionValue` each for `scaleX` and `scaleY` that update with the inverse
     * of their respective parent scales.
     *
     * This is useful for undoing the distortion of content when scaling a parent component.
     *
     * By default, `useInvertedScale` will automatically fetch `scaleX` and `scaleY` from the nearest parent.
     * By passing other `MotionValue`s in as `useInvertedScale({ scaleX, scaleY })`, it will invert the output
     * of those instead.
     *
     * ```jsx
     * const MyComponent = () => {
     *   const { scaleX, scaleY } = useInvertedScale()
     *   return <motion.div style={{ scaleX, scaleY }} />
     * }
     * ```
     *
     * @deprecated
     */
    function useInvertedScale(scale) {
        let parentScaleX = useMotionValue(1);
        let parentScaleY = useMotionValue(1);
        const { visualElement } = React$1.useContext(MotionContext);
        exports.invariant(!!(scale || visualElement), "If no scale values are provided, useInvertedScale must be used within a child of another motion component.");
        warning(hasWarned, "useInvertedScale is deprecated and will be removed in 3.0. Use the layout prop instead.");
        hasWarned = true;
        if (scale) {
            parentScaleX = scale.scaleX || parentScaleX;
            parentScaleY = scale.scaleY || parentScaleY;
        }
        else if (visualElement) {
            parentScaleX = visualElement.getValue("scaleX", 1);
            parentScaleY = visualElement.getValue("scaleY", 1);
        }
        const scaleX = useTransform(parentScaleX, invertScale);
        const scaleY = useTransform(parentScaleY, invertScale);
        return { scaleX, scaleY };
    }

    exports.AcceleratedAnimation = AcceleratedAnimation;
    exports.AnimatePresence = AnimatePresence;
    exports.AnimateSharedLayout = AnimateSharedLayout;
    exports.DeprecatedLayoutGroupContext = DeprecatedLayoutGroupContext;
    exports.DragControls = DragControls;
    exports.FlatTree = FlatTree;
    exports.LayoutGroup = LayoutGroup;
    exports.LayoutGroupContext = LayoutGroupContext;
    exports.LazyMotion = LazyMotion;
    exports.MotionConfig = MotionConfig;
    exports.MotionConfigContext = MotionConfigContext;
    exports.MotionContext = MotionContext;
    exports.MotionGlobalConfig = MotionGlobalConfig;
    exports.MotionValue = MotionValue;
    exports.PresenceContext = PresenceContext;
    exports.Reorder = namespace;
    exports.SwitchLayoutGroupContext = SwitchLayoutGroupContext;
    exports.VisualElement = VisualElement;
    exports.addPointerEvent = addPointerEvent;
    exports.addPointerInfo = addPointerInfo;
    exports.addScaleCorrector = addScaleCorrector;
    exports.animate = animate;
    exports.animateMini = animateMini;
    exports.animateValue = animateValue;
    exports.animateVisualElement = animateVisualElement;
    exports.animationControls = animationControls;
    exports.animations = animations;
    exports.anticipate = anticipate;
    exports.backIn = backIn;
    exports.backInOut = backInOut;
    exports.backOut = backOut;
    exports.buildTransform = buildTransform;
    exports.calcLength = calcLength;
    exports.cancelFrame = cancelFrame;
    exports.cancelSync = cancelSync;
    exports.circIn = circIn;
    exports.circInOut = circInOut;
    exports.circOut = circOut;
    exports.clamp = clamp;
    exports.color = color;
    exports.complex = complex;
    exports.createBox = createBox;
    exports.createRendererMotionComponent = createRendererMotionComponent;
    exports.createScopedAnimate = createScopedAnimate;
    exports.cubicBezier = cubicBezier;
    exports.delay = delay;
    exports.disableInstantTransitions = disableInstantTransitions;
    exports.distance = distance;
    exports.distance2D = distance2D;
    exports.domAnimation = domAnimation;
    exports.domMax = domMax;
    exports.domMin = domMin;
    exports.easeIn = easeIn;
    exports.easeInOut = easeInOut;
    exports.easeOut = easeOut;
    exports.filterProps = filterProps;
    exports.findSpring = findSpring;
    exports.frame = frame;
    exports.frameData = frameData;
    exports.frameSteps = frameSteps;
    exports.inView = inView;
    exports.inertia = inertia;
    exports.interpolate = interpolate;
    exports.isBrowser = isBrowser;
    exports.isDragActive = isDragActive;
    exports.isMotionComponent = isMotionComponent;
    exports.isMotionValue = isMotionValue;
    exports.isValidMotionProp = isValidMotionProp;
    exports.keyframes = keyframes;
    exports.m = m;
    exports.makeUseVisualState = makeUseVisualState;
    exports.mirrorEasing = mirrorEasing;
    exports.mix = mix;
    exports.motion = motion;
    exports.motionValue = motionValue;
    exports.noop = noop;
    exports.optimizedAppearDataAttribute = optimizedAppearDataAttribute;
    exports.pipe = pipe;
    exports.progress = progress;
    exports.px = px;
    exports.resolveMotionValue = resolveMotionValue;
    exports.reverseEasing = reverseEasing;
    exports.scroll = scroll;
    exports.scrollInfo = scrollInfo;
    exports.spring = spring;
    exports.stagger = stagger;
    exports.startOptimizedAppearAnimation = startOptimizedAppearAnimation;
    exports.steps = steps;
    exports.sync = sync;
    exports.time = time;
    exports.transform = transform;
    exports.unwrapMotionComponent = unwrapMotionComponent;
    exports.useAnimate = useAnimate;
    exports.useAnimateMini = useAnimateMini;
    exports.useAnimation = useAnimation;
    exports.useAnimationControls = useAnimationControls;
    exports.useAnimationFrame = useAnimationFrame;
    exports.useCycle = useCycle;
    exports.useDeprecatedAnimatedState = useAnimatedState;
    exports.useDeprecatedInvertedScale = useInvertedScale;
    exports.useDomEvent = useDomEvent;
    exports.useDragControls = useDragControls;
    exports.useElementScroll = useElementScroll;
    exports.useForceUpdate = useForceUpdate;
    exports.useInView = useInView;
    exports.useInstantLayoutTransition = useInstantLayoutTransition;
    exports.useInstantTransition = useInstantTransition;
    exports.useIsPresent = useIsPresent;
    exports.useIsomorphicLayoutEffect = useIsomorphicLayoutEffect;
    exports.useMotionTemplate = useMotionTemplate;
    exports.useMotionValue = useMotionValue;
    exports.useMotionValueEvent = useMotionValueEvent;
    exports.usePresence = usePresence;
    exports.useReducedMotion = useReducedMotion;
    exports.useReducedMotionConfig = useReducedMotionConfig;
    exports.useResetProjection = useResetProjection;
    exports.useScroll = useScroll;
    exports.useSpring = useSpring;
    exports.useTime = useTime;
    exports.useTransform = useTransform;
    exports.useUnmountEffect = useUnmountEffect;
    exports.useVelocity = useVelocity;
    exports.useViewportScroll = useViewportScroll;
    exports.useWillChange = useWillChange;
    exports.visualElementStore = visualElementStore;
    exports.wrap = wrap;

}));
