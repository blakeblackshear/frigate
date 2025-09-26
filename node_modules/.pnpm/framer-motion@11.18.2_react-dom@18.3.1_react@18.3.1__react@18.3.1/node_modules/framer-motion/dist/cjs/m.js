'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var jsxRuntime = require('react/jsx-runtime');
var motionUtils = require('motion-utils');
var react = require('react');

const LayoutGroupContext = react.createContext({});

const LazyContext = react.createContext({ strict: false });

/**
 * @public
 */
const MotionConfigContext = react.createContext({
    transformPagePoint: (p) => p,
    isStatic: false,
    reducedMotion: "never",
});

const MotionContext = react.createContext({});

/**
 * Decides if the supplied variable is variant label
 */
function isVariantLabel(v) {
    return typeof v === "string" || Array.isArray(v);
}

function isAnimationControls(v) {
    return (v !== null &&
        typeof v === "object" &&
        typeof v.start === "function");
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

function isControllingVariants(props) {
    return (isAnimationControls(props.animate) ||
        variantProps.some((name) => isVariantLabel(props[name])));
}
function isVariantNode(props) {
    return Boolean(isControllingVariants(props) || props.variants);
}

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
    const { initial, animate } = getCurrentTreeVariants(props, react.useContext(MotionContext));
    return react.useMemo(() => ({ initial, animate }), [variantLabelsAsDependency(initial), variantLabelsAsDependency(animate)]);
}
function variantLabelsAsDependency(prop) {
    return Array.isArray(prop) ? prop.join(" ") : prop;
}

const isBrowser = typeof window !== "undefined";

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

function loadFeatures(features) {
    for (const key in features) {
        featureDefinitions[key] = {
            ...featureDefinitions[key],
            ...features[key],
        };
    }
}

const motionComponentSymbol = Symbol.for("motionComponentSymbol");

function isRefObject(ref) {
    return (ref &&
        typeof ref === "object" &&
        Object.prototype.hasOwnProperty.call(ref, "current"));
}

/**
 * Creates a ref function that, when called, hydrates the provided
 * external ref and VisualElement.
 */
function useMotionRef(visualState, visualElement, externalRef) {
    return react.useCallback((instance) => {
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

/**
 * @public
 */
const PresenceContext = react.createContext(null);

const useIsomorphicLayoutEffect = isBrowser ? react.useLayoutEffect : react.useEffect;

/**
 * Convert camelCase to dash-case properties.
 */
const camelToDash = (str) => str.replace(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase();

const optimizedAppearDataId = "framerAppearId";
const optimizedAppearDataAttribute = "data-" + camelToDash(optimizedAppearDataId);

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
const maxElapsed = 40;
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
        const timestamp = performance.now();
        runNextFrame = false;
        state.delta = useDefaultElapsed
            ? 1000 / 60
            : Math.max(Math.min(timestamp - state.timestamp, maxElapsed), 1);
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

const { schedule: microtask, cancel: cancelMicrotask } = createRenderBatcher(queueMicrotask, false);

/**
 * Internal, exported only for usage in Framer
 */
const SwitchLayoutGroupContext = react.createContext({});

function useVisualElement(Component, visualState, props, createVisualElement, ProjectionNodeConstructor) {
    var _a, _b;
    const { visualElement: parent } = react.useContext(MotionContext);
    const lazyContext = react.useContext(LazyContext);
    const presenceContext = react.useContext(PresenceContext);
    const reducedMotionConfig = react.useContext(MotionConfigContext).reducedMotion;
    const visualElementRef = react.useRef(null);
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
    const initialLayoutGroupConfig = react.useContext(SwitchLayoutGroupContext);
    if (visualElement &&
        !visualElement.projection &&
        ProjectionNodeConstructor &&
        (visualElement.type === "html" || visualElement.type === "svg")) {
        createProjectionNode(visualElementRef.current, props, ProjectionNodeConstructor, initialLayoutGroupConfig);
    }
    const isMounted = react.useRef(false);
    react.useInsertionEffect(() => {
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
    const wantsHandoff = react.useRef(Boolean(optimisedAppearId) &&
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
    react.useEffect(() => {
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
            ...react.useContext(MotionConfigContext),
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
        return (jsxRuntime.jsxs(MotionContext.Provider, { value: context, children: [MeasureLayout && context.visualElement ? (jsxRuntime.jsx(MeasureLayout, { visualElement: context.visualElement, ...configAndProps })) : null, useRender(Component, props, useMotionRef(visualState, context.visualElement, externalRef), visualState, isStatic, context.visualElement)] }));
    }
    MotionComponent.displayName = `motion.${typeof Component === "string"
        ? Component
        : `create(${(_b = (_a = Component.displayName) !== null && _a !== void 0 ? _a : Component.name) !== null && _b !== void 0 ? _b : ""})`}`;
    const ForwardRefMotionComponent = react.forwardRef(MotionComponent);
    ForwardRefMotionComponent[motionComponentSymbol] = Component;
    return ForwardRefMotionComponent;
}
function useLayoutId({ layoutId }) {
    const layoutGroupId = react.useContext(LayoutGroupContext).id;
    return layoutGroupId && layoutId !== undefined
        ? layoutGroupId + "-" + layoutId
        : layoutId;
}
function useStrictMode(configAndProps, preloadedFeatures) {
    const isStrict = react.useContext(LazyContext).strict;
    /**
     * If we're in development mode, check to make sure we're not rendering a motion component
     * as a child of LazyMotion, as this will break the file-size benefits of using it.
     */
    if (process.env.NODE_ENV !== "production" &&
        preloadedFeatures &&
        isStrict) {
        const strictMessage = "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead.";
        configAndProps.ignoreStrict
            ? motionUtils.warning(false, strictMessage)
            : motionUtils.invariant(false, strictMessage);
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

const { schedule: frame, cancel: cancelFrame, state: frameData, steps: frameSteps, } = createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : motionUtils.noop, true);

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

/**
 * Creates a constant value over the lifecycle of a component.
 *
 * Even if `useMemo` is provided an empty array as its final argument, it doesn't offer
 * a guarantee that it won't re-run for performance reasons later on. By using `useConstant`
 * you can ensure that initialisers don't execute twice or more.
 */
function useConstant(init) {
    const ref = react.useRef(null);
    if (ref.current === null) {
        ref.current = init();
    }
    return ref.current;
}

const isCustomValue = (v) => {
    return Boolean(v && typeof v === "object" && v.mix && v.toValue);
};

const isMotionValue = (value) => Boolean(value && value.getVelocity);

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
    const context = react.useContext(MotionContext);
    const presenceContext = react.useContext(PresenceContext);
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

const checkStringStartsWith = (token) => (key) => typeof key === "string" && key.startsWith(token);
const isCSSVariableName = 
/*@__PURE__*/ checkStringStartsWith("--");

/**
 * Provided a value and a ValueType, returns the value as that value type.
 */
const getValueAsType = (value, type) => {
    return type && typeof value === "number"
        ? type.transform(value)
        : value;
};

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

const createUnitType = (unit) => ({
    test: (v) => typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
    parse: parseFloat,
    transform: (v) => `${v}${unit}`,
});
const degrees = /*@__PURE__*/ createUnitType("deg");
const percent = /*@__PURE__*/ createUnitType("%");
const px = /*@__PURE__*/ createUnitType("px");
const progressPercentage = {
    ...percent,
    parse: (v) => percent.parse(v) / 100,
    transform: (v) => percent.transform(v * 100),
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

function calcOrigin(origin, offset, size) {
    return typeof origin === "string"
        ? origin
        : px.transform(offset + size * origin);
}
/**
 * The SVG transform origin defaults are different to CSS and is less intuitive,
 * so we use the measured dimensions of the SVG to reconcile these.
 */
function calcSVGTransformOrigin(dimensions, originX, originY) {
    const pxOriginX = calcOrigin(originX, dimensions.x, dimensions.width);
    const pxOriginY = calcOrigin(originY, dimensions.y, dimensions.height);
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

const isSVGTag = (tag) => typeof tag === "string" && tag.toLowerCase() === "svg";

function renderHTML(element, { style, vars }, styleProp, projection) {
    Object.assign(element.style, style, projection && projection.getProjectionStyles(styleProp));
    // Loop over any CSS variables and assign those.
    for (const key in vars) {
        element.style.setProperty(key, vars[key]);
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

function renderSVG(element, renderState, _styleProp, projection) {
    renderHTML(element, renderState, undefined, projection);
    for (const key in renderState.attrs) {
        element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
    }
}

const scaleCorrectors = {};

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
    return react.useMemo(() => {
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

function useSVGProps(props, visualState, _isStatic, Component) {
    const visualProps = react.useMemo(() => {
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
        const elementProps = Component !== react.Fragment
            ? { ...filteredProps, ...visualProps, ref }
            : {};
        /**
         * If component has been handed a motion value as its child,
         * memoise its initial value and render that. Subsequent updates
         * will be handled by the onChange handler
         */
        const { children } = props;
        const renderedChildren = react.useMemo(() => (isMotionValue(children) ? children.get() : children), [children]);
        return react.createElement(Component, {
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

const createMinimalMotionComponent = 
/*@__PURE__*/ createMotionComponentFactory();

/**
 * HTML components
 */
const MotionA = /*@__PURE__*/ createMinimalMotionComponent("a");
const MotionAbbr = /*@__PURE__*/ createMinimalMotionComponent("abbr");
const MotionAddress = 
/*@__PURE__*/ createMinimalMotionComponent("address");
const MotionArea = /*@__PURE__*/ createMinimalMotionComponent("area");
const MotionArticle = 
/*@__PURE__*/ createMinimalMotionComponent("article");
const MotionAside = /*@__PURE__*/ createMinimalMotionComponent("aside");
const MotionAudio = /*@__PURE__*/ createMinimalMotionComponent("audio");
const MotionB = /*@__PURE__*/ createMinimalMotionComponent("b");
const MotionBase = /*@__PURE__*/ createMinimalMotionComponent("base");
const MotionBdi = /*@__PURE__*/ createMinimalMotionComponent("bdi");
const MotionBdo = /*@__PURE__*/ createMinimalMotionComponent("bdo");
const MotionBig = /*@__PURE__*/ createMinimalMotionComponent("big");
const MotionBlockquote = 
/*@__PURE__*/ createMinimalMotionComponent("blockquote");
const MotionBody = /*@__PURE__*/ createMinimalMotionComponent("body");
const MotionButton = /*@__PURE__*/ createMinimalMotionComponent("button");
const MotionCanvas = /*@__PURE__*/ createMinimalMotionComponent("canvas");
const MotionCaption = 
/*@__PURE__*/ createMinimalMotionComponent("caption");
const MotionCite = /*@__PURE__*/ createMinimalMotionComponent("cite");
const MotionCode = /*@__PURE__*/ createMinimalMotionComponent("code");
const MotionCol = /*@__PURE__*/ createMinimalMotionComponent("col");
const MotionColgroup = 
/*@__PURE__*/ createMinimalMotionComponent("colgroup");
const MotionData = /*@__PURE__*/ createMinimalMotionComponent("data");
const MotionDatalist = 
/*@__PURE__*/ createMinimalMotionComponent("datalist");
const MotionDd = /*@__PURE__*/ createMinimalMotionComponent("dd");
const MotionDel = /*@__PURE__*/ createMinimalMotionComponent("del");
const MotionDetails = 
/*@__PURE__*/ createMinimalMotionComponent("details");
const MotionDfn = /*@__PURE__*/ createMinimalMotionComponent("dfn");
const MotionDialog = /*@__PURE__*/ createMinimalMotionComponent("dialog");
const MotionDiv = /*@__PURE__*/ createMinimalMotionComponent("div");
const MotionDl = /*@__PURE__*/ createMinimalMotionComponent("dl");
const MotionDt = /*@__PURE__*/ createMinimalMotionComponent("dt");
const MotionEm = /*@__PURE__*/ createMinimalMotionComponent("em");
const MotionEmbed = /*@__PURE__*/ createMinimalMotionComponent("embed");
const MotionFieldset = 
/*@__PURE__*/ createMinimalMotionComponent("fieldset");
const MotionFigcaption = 
/*@__PURE__*/ createMinimalMotionComponent("figcaption");
const MotionFigure = /*@__PURE__*/ createMinimalMotionComponent("figure");
const MotionFooter = /*@__PURE__*/ createMinimalMotionComponent("footer");
const MotionForm = /*@__PURE__*/ createMinimalMotionComponent("form");
const MotionH1 = /*@__PURE__*/ createMinimalMotionComponent("h1");
const MotionH2 = /*@__PURE__*/ createMinimalMotionComponent("h2");
const MotionH3 = /*@__PURE__*/ createMinimalMotionComponent("h3");
const MotionH4 = /*@__PURE__*/ createMinimalMotionComponent("h4");
const MotionH5 = /*@__PURE__*/ createMinimalMotionComponent("h5");
const MotionH6 = /*@__PURE__*/ createMinimalMotionComponent("h6");
const MotionHead = /*@__PURE__*/ createMinimalMotionComponent("head");
const MotionHeader = /*@__PURE__*/ createMinimalMotionComponent("header");
const MotionHgroup = /*@__PURE__*/ createMinimalMotionComponent("hgroup");
const MotionHr = /*@__PURE__*/ createMinimalMotionComponent("hr");
const MotionHtml = /*@__PURE__*/ createMinimalMotionComponent("html");
const MotionI = /*@__PURE__*/ createMinimalMotionComponent("i");
const MotionIframe = /*@__PURE__*/ createMinimalMotionComponent("iframe");
const MotionImg = /*@__PURE__*/ createMinimalMotionComponent("img");
const MotionInput = /*@__PURE__*/ createMinimalMotionComponent("input");
const MotionIns = /*@__PURE__*/ createMinimalMotionComponent("ins");
const MotionKbd = /*@__PURE__*/ createMinimalMotionComponent("kbd");
const MotionKeygen = /*@__PURE__*/ createMinimalMotionComponent("keygen");
const MotionLabel = /*@__PURE__*/ createMinimalMotionComponent("label");
const MotionLegend = /*@__PURE__*/ createMinimalMotionComponent("legend");
const MotionLi = /*@__PURE__*/ createMinimalMotionComponent("li");
const MotionLink = /*@__PURE__*/ createMinimalMotionComponent("link");
const MotionMain = /*@__PURE__*/ createMinimalMotionComponent("main");
const MotionMap = /*@__PURE__*/ createMinimalMotionComponent("map");
const MotionMark = /*@__PURE__*/ createMinimalMotionComponent("mark");
const MotionMenu = /*@__PURE__*/ createMinimalMotionComponent("menu");
const MotionMenuitem = 
/*@__PURE__*/ createMinimalMotionComponent("menuitem");
const MotionMeter = /*@__PURE__*/ createMinimalMotionComponent("meter");
const MotionNav = /*@__PURE__*/ createMinimalMotionComponent("nav");
const MotionObject = /*@__PURE__*/ createMinimalMotionComponent("object");
const MotionOl = /*@__PURE__*/ createMinimalMotionComponent("ol");
const MotionOptgroup = 
/*@__PURE__*/ createMinimalMotionComponent("optgroup");
const MotionOption = /*@__PURE__*/ createMinimalMotionComponent("option");
const MotionOutput = /*@__PURE__*/ createMinimalMotionComponent("output");
const MotionP = /*@__PURE__*/ createMinimalMotionComponent("p");
const MotionParam = /*@__PURE__*/ createMinimalMotionComponent("param");
const MotionPicture = 
/*@__PURE__*/ createMinimalMotionComponent("picture");
const MotionPre = /*@__PURE__*/ createMinimalMotionComponent("pre");
const MotionProgress = 
/*@__PURE__*/ createMinimalMotionComponent("progress");
const MotionQ = /*@__PURE__*/ createMinimalMotionComponent("q");
const MotionRp = /*@__PURE__*/ createMinimalMotionComponent("rp");
const MotionRt = /*@__PURE__*/ createMinimalMotionComponent("rt");
const MotionRuby = /*@__PURE__*/ createMinimalMotionComponent("ruby");
const MotionS = /*@__PURE__*/ createMinimalMotionComponent("s");
const MotionSamp = /*@__PURE__*/ createMinimalMotionComponent("samp");
const MotionScript = /*@__PURE__*/ createMinimalMotionComponent("script");
const MotionSection = 
/*@__PURE__*/ createMinimalMotionComponent("section");
const MotionSelect = /*@__PURE__*/ createMinimalMotionComponent("select");
const MotionSmall = /*@__PURE__*/ createMinimalMotionComponent("small");
const MotionSource = /*@__PURE__*/ createMinimalMotionComponent("source");
const MotionSpan = /*@__PURE__*/ createMinimalMotionComponent("span");
const MotionStrong = /*@__PURE__*/ createMinimalMotionComponent("strong");
const MotionStyle = /*@__PURE__*/ createMinimalMotionComponent("style");
const MotionSub = /*@__PURE__*/ createMinimalMotionComponent("sub");
const MotionSummary = 
/*@__PURE__*/ createMinimalMotionComponent("summary");
const MotionSup = /*@__PURE__*/ createMinimalMotionComponent("sup");
const MotionTable = /*@__PURE__*/ createMinimalMotionComponent("table");
const MotionTbody = /*@__PURE__*/ createMinimalMotionComponent("tbody");
const MotionTd = /*@__PURE__*/ createMinimalMotionComponent("td");
const MotionTextarea = 
/*@__PURE__*/ createMinimalMotionComponent("textarea");
const MotionTfoot = /*@__PURE__*/ createMinimalMotionComponent("tfoot");
const MotionTh = /*@__PURE__*/ createMinimalMotionComponent("th");
const MotionThead = /*@__PURE__*/ createMinimalMotionComponent("thead");
const MotionTime = /*@__PURE__*/ createMinimalMotionComponent("time");
const MotionTitle = /*@__PURE__*/ createMinimalMotionComponent("title");
const MotionTr = /*@__PURE__*/ createMinimalMotionComponent("tr");
const MotionTrack = /*@__PURE__*/ createMinimalMotionComponent("track");
const MotionU = /*@__PURE__*/ createMinimalMotionComponent("u");
const MotionUl = /*@__PURE__*/ createMinimalMotionComponent("ul");
const MotionVideo = /*@__PURE__*/ createMinimalMotionComponent("video");
const MotionWbr = /*@__PURE__*/ createMinimalMotionComponent("wbr");
const MotionWebview = 
/*@__PURE__*/ createMinimalMotionComponent("webview");
/**
 * SVG components
 */
const MotionAnimate = 
/*@__PURE__*/ createMinimalMotionComponent("animate");
const MotionCircle = /*@__PURE__*/ createMinimalMotionComponent("circle");
const MotionDefs = /*@__PURE__*/ createMinimalMotionComponent("defs");
const MotionDesc = /*@__PURE__*/ createMinimalMotionComponent("desc");
const MotionEllipse = 
/*@__PURE__*/ createMinimalMotionComponent("ellipse");
const MotionG = /*@__PURE__*/ createMinimalMotionComponent("g");
const MotionImage = /*@__PURE__*/ createMinimalMotionComponent("image");
const MotionLine = /*@__PURE__*/ createMinimalMotionComponent("line");
const MotionFilter = /*@__PURE__*/ createMinimalMotionComponent("filter");
const MotionMarker = /*@__PURE__*/ createMinimalMotionComponent("marker");
const MotionMask = /*@__PURE__*/ createMinimalMotionComponent("mask");
const MotionMetadata = 
/*@__PURE__*/ createMinimalMotionComponent("metadata");
const MotionPath = /*@__PURE__*/ createMinimalMotionComponent("path");
const MotionPattern = 
/*@__PURE__*/ createMinimalMotionComponent("pattern");
const MotionPolygon = 
/*@__PURE__*/ createMinimalMotionComponent("polygon");
const MotionPolyline = 
/*@__PURE__*/ createMinimalMotionComponent("polyline");
const MotionRect = /*@__PURE__*/ createMinimalMotionComponent("rect");
const MotionStop = /*@__PURE__*/ createMinimalMotionComponent("stop");
const MotionSvg = /*@__PURE__*/ createMinimalMotionComponent("svg");
const MotionSymbol = /*@__PURE__*/ createMinimalMotionComponent("symbol");
const MotionText = /*@__PURE__*/ createMinimalMotionComponent("text");
const MotionTspan = /*@__PURE__*/ createMinimalMotionComponent("tspan");
const MotionUse = /*@__PURE__*/ createMinimalMotionComponent("use");
const MotionView = /*@__PURE__*/ createMinimalMotionComponent("view");
const MotionClipPath = 
/*@__PURE__*/ createMinimalMotionComponent("clipPath");
const MotionFeBlend = 
/*@__PURE__*/ createMinimalMotionComponent("feBlend");
const MotionFeColorMatrix = 
/*@__PURE__*/ createMinimalMotionComponent("feColorMatrix");
const MotionFeComponentTransfer = 
/*@__PURE__*/ createMinimalMotionComponent("feComponentTransfer");
const MotionFeComposite = 
/*@__PURE__*/ createMinimalMotionComponent("feComposite");
const MotionFeConvolveMatrix = 
/*@__PURE__*/ createMinimalMotionComponent("feConvolveMatrix");
const MotionFeDiffuseLighting = 
/*@__PURE__*/ createMinimalMotionComponent("feDiffuseLighting");
const MotionFeDisplacementMap = 
/*@__PURE__*/ createMinimalMotionComponent("feDisplacementMap");
const MotionFeDistantLight = 
/*@__PURE__*/ createMinimalMotionComponent("feDistantLight");
const MotionFeDropShadow = 
/*@__PURE__*/ createMinimalMotionComponent("feDropShadow");
const MotionFeFlood = 
/*@__PURE__*/ createMinimalMotionComponent("feFlood");
const MotionFeFuncA = 
/*@__PURE__*/ createMinimalMotionComponent("feFuncA");
const MotionFeFuncB = 
/*@__PURE__*/ createMinimalMotionComponent("feFuncB");
const MotionFeFuncG = 
/*@__PURE__*/ createMinimalMotionComponent("feFuncG");
const MotionFeFuncR = 
/*@__PURE__*/ createMinimalMotionComponent("feFuncR");
const MotionFeGaussianBlur = 
/*@__PURE__*/ createMinimalMotionComponent("feGaussianBlur");
const MotionFeImage = 
/*@__PURE__*/ createMinimalMotionComponent("feImage");
const MotionFeMerge = 
/*@__PURE__*/ createMinimalMotionComponent("feMerge");
const MotionFeMergeNode = 
/*@__PURE__*/ createMinimalMotionComponent("feMergeNode");
const MotionFeMorphology = 
/*@__PURE__*/ createMinimalMotionComponent("feMorphology");
const MotionFeOffset = 
/*@__PURE__*/ createMinimalMotionComponent("feOffset");
const MotionFePointLight = 
/*@__PURE__*/ createMinimalMotionComponent("fePointLight");
const MotionFeSpecularLighting = 
/*@__PURE__*/ createMinimalMotionComponent("feSpecularLighting");
const MotionFeSpotLight = 
/*@__PURE__*/ createMinimalMotionComponent("feSpotLight");
const MotionFeTile = /*@__PURE__*/ createMinimalMotionComponent("feTile");
const MotionFeTurbulence = 
/*@__PURE__*/ createMinimalMotionComponent("feTurbulence");
const MotionForeignObject = 
/*@__PURE__*/ createMinimalMotionComponent("foreignObject");
const MotionLinearGradient = 
/*@__PURE__*/ createMinimalMotionComponent("linearGradient");
const MotionRadialGradient = 
/*@__PURE__*/ createMinimalMotionComponent("radialGradient");
const MotionTextPath = 
/*@__PURE__*/ createMinimalMotionComponent("textPath");

exports.a = MotionA;
exports.abbr = MotionAbbr;
exports.address = MotionAddress;
exports.animate = MotionAnimate;
exports.area = MotionArea;
exports.article = MotionArticle;
exports.aside = MotionAside;
exports.audio = MotionAudio;
exports.b = MotionB;
exports.base = MotionBase;
exports.bdi = MotionBdi;
exports.bdo = MotionBdo;
exports.big = MotionBig;
exports.blockquote = MotionBlockquote;
exports.body = MotionBody;
exports.button = MotionButton;
exports.canvas = MotionCanvas;
exports.caption = MotionCaption;
exports.circle = MotionCircle;
exports.cite = MotionCite;
exports.clipPath = MotionClipPath;
exports.code = MotionCode;
exports.col = MotionCol;
exports.colgroup = MotionColgroup;
exports.create = createMinimalMotionComponent;
exports.data = MotionData;
exports.datalist = MotionDatalist;
exports.dd = MotionDd;
exports.defs = MotionDefs;
exports.del = MotionDel;
exports.desc = MotionDesc;
exports.details = MotionDetails;
exports.dfn = MotionDfn;
exports.dialog = MotionDialog;
exports.div = MotionDiv;
exports.dl = MotionDl;
exports.dt = MotionDt;
exports.ellipse = MotionEllipse;
exports.em = MotionEm;
exports.embed = MotionEmbed;
exports.feBlend = MotionFeBlend;
exports.feColorMatrix = MotionFeColorMatrix;
exports.feComponentTransfer = MotionFeComponentTransfer;
exports.feComposite = MotionFeComposite;
exports.feConvolveMatrix = MotionFeConvolveMatrix;
exports.feDiffuseLighting = MotionFeDiffuseLighting;
exports.feDisplacementMap = MotionFeDisplacementMap;
exports.feDistantLight = MotionFeDistantLight;
exports.feDropShadow = MotionFeDropShadow;
exports.feFlood = MotionFeFlood;
exports.feFuncA = MotionFeFuncA;
exports.feFuncB = MotionFeFuncB;
exports.feFuncG = MotionFeFuncG;
exports.feFuncR = MotionFeFuncR;
exports.feGaussianBlur = MotionFeGaussianBlur;
exports.feImage = MotionFeImage;
exports.feMerge = MotionFeMerge;
exports.feMergeNode = MotionFeMergeNode;
exports.feMorphology = MotionFeMorphology;
exports.feOffset = MotionFeOffset;
exports.fePointLight = MotionFePointLight;
exports.feSpecularLighting = MotionFeSpecularLighting;
exports.feSpotLight = MotionFeSpotLight;
exports.feTile = MotionFeTile;
exports.feTurbulence = MotionFeTurbulence;
exports.fieldset = MotionFieldset;
exports.figcaption = MotionFigcaption;
exports.figure = MotionFigure;
exports.filter = MotionFilter;
exports.footer = MotionFooter;
exports.foreignObject = MotionForeignObject;
exports.form = MotionForm;
exports.g = MotionG;
exports.h1 = MotionH1;
exports.h2 = MotionH2;
exports.h3 = MotionH3;
exports.h4 = MotionH4;
exports.h5 = MotionH5;
exports.h6 = MotionH6;
exports.head = MotionHead;
exports.header = MotionHeader;
exports.hgroup = MotionHgroup;
exports.hr = MotionHr;
exports.html = MotionHtml;
exports.i = MotionI;
exports.iframe = MotionIframe;
exports.image = MotionImage;
exports.img = MotionImg;
exports.input = MotionInput;
exports.ins = MotionIns;
exports.kbd = MotionKbd;
exports.keygen = MotionKeygen;
exports.label = MotionLabel;
exports.legend = MotionLegend;
exports.li = MotionLi;
exports.line = MotionLine;
exports.linearGradient = MotionLinearGradient;
exports.link = MotionLink;
exports.main = MotionMain;
exports.map = MotionMap;
exports.mark = MotionMark;
exports.marker = MotionMarker;
exports.mask = MotionMask;
exports.menu = MotionMenu;
exports.menuitem = MotionMenuitem;
exports.metadata = MotionMetadata;
exports.meter = MotionMeter;
exports.nav = MotionNav;
exports.object = MotionObject;
exports.ol = MotionOl;
exports.optgroup = MotionOptgroup;
exports.option = MotionOption;
exports.output = MotionOutput;
exports.p = MotionP;
exports.param = MotionParam;
exports.path = MotionPath;
exports.pattern = MotionPattern;
exports.picture = MotionPicture;
exports.polygon = MotionPolygon;
exports.polyline = MotionPolyline;
exports.pre = MotionPre;
exports.progress = MotionProgress;
exports.q = MotionQ;
exports.radialGradient = MotionRadialGradient;
exports.rect = MotionRect;
exports.rp = MotionRp;
exports.rt = MotionRt;
exports.ruby = MotionRuby;
exports.s = MotionS;
exports.samp = MotionSamp;
exports.script = MotionScript;
exports.section = MotionSection;
exports.select = MotionSelect;
exports.small = MotionSmall;
exports.source = MotionSource;
exports.span = MotionSpan;
exports.stop = MotionStop;
exports.strong = MotionStrong;
exports.style = MotionStyle;
exports.sub = MotionSub;
exports.summary = MotionSummary;
exports.sup = MotionSup;
exports.svg = MotionSvg;
exports.symbol = MotionSymbol;
exports.table = MotionTable;
exports.tbody = MotionTbody;
exports.td = MotionTd;
exports.text = MotionText;
exports.textPath = MotionTextPath;
exports.textarea = MotionTextarea;
exports.tfoot = MotionTfoot;
exports.th = MotionTh;
exports.thead = MotionThead;
exports.time = MotionTime;
exports.title = MotionTitle;
exports.tr = MotionTr;
exports.track = MotionTrack;
exports.tspan = MotionTspan;
exports.u = MotionU;
exports.ul = MotionUl;
exports.use = MotionUse;
exports.video = MotionVideo;
exports.view = MotionView;
exports.wbr = MotionWbr;
exports.webview = MotionWebview;
