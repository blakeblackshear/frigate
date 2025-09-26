'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var react = require('react');
var motionDom = require('motion-dom');
var motionUtils = require('motion-utils');

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

function useUnmountEffect(callback) {
    return react.useEffect(() => () => callback(), []);
}

function startWaapiAnimation(element, valueName, keyframes, { delay = 0, duration = 300, repeat = 0, repeatType = "loop", ease = "easeInOut", times, } = {}) {
    const keyframeOptions = { [valueName]: keyframes };
    if (times)
        keyframeOptions.offset = times;
    const easing = motionDom.mapEasingToNativeEasing(ease, duration);
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

const createUnitType = (unit) => ({
    test: (v) => typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
    parse: parseFloat,
    transform: (v) => `${v}${unit}`,
});
const px = /*@__PURE__*/ createUnitType("px");

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

function setCSSVar(element, name, value) {
    element.style.setProperty(`--${name}`, value);
}
function setStyle(element, name, value) {
    element.style[name] = value;
}

const supportsPartialKeyframes = /*@__PURE__*/ motionUtils.memo(() => {
    try {
        document.createElement("div").animate({ opacity: [1] });
    }
    catch (e) {
        return false;
    }
    return true;
});

const supportsWaapi = /*@__PURE__*/ motionUtils.memo(() => Object.hasOwnProperty.call(Element.prototype, "animate"));

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
class NativeAnimation extends motionDom.NativeAnimationControls {
    constructor(element, valueName, valueKeyframes, options) {
        const isCSSVar = valueName.startsWith("--");
        motionUtils.invariant(typeof options.type !== "string", `animateMini doesn't support "type" as a string. Did you mean to import { spring } from "framer-motion"?`);
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
        if (motionDom.isGenerator(options.type)) {
            const generatorOptions = motionDom.createGeneratorEasing(options, 100, options.type);
            options.ease = motionDom.supportsLinearEasing()
                ? generatorOptions.ease
                : defaultEasing;
            options.duration = motionUtils.secondsToMilliseconds(generatorOptions.duration);
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
    const elements = motionDom.resolveElements(elementOrSelector, scope);
    const numElements = elements.length;
    motionUtils.invariant(Boolean(numElements), "No valid element provided.");
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
                ...motionDom.getValueTransition(elementTransition, valueName),
            };
            valueOptions.duration = valueOptions.duration
                ? motionUtils.secondsToMilliseconds(valueOptions.duration)
                : valueOptions.duration;
            valueOptions.delay = motionUtils.secondsToMilliseconds(valueOptions.delay || 0);
            animations.push(new NativeAnimation(element, valueName, valueKeyframes, valueOptions));
        }
    }
    return animations;
}

const createScopedWaapiAnimate = (scope) => {
    function scopedAnimate(elementOrSelector, keyframes, options) {
        return new motionDom.GroupPlaybackControls(animateElements(elementOrSelector, keyframes, options, scope));
    }
    return scopedAnimate;
};

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

exports.useAnimate = useAnimateMini;
