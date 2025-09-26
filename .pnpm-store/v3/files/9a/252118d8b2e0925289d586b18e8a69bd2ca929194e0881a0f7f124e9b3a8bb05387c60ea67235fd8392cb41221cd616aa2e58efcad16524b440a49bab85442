/// <reference types="react" />
import * as react from 'react';
import { SVGAttributes, CSSProperties, PropsWithoutRef, RefAttributes, JSX } from 'react';
import { AnimationPlaybackControls, TransformProperties, SVGPathProperties, VariableKeyframesDefinition, Easing, Transition as Transition$1, ProgressTimeline } from 'motion-dom';

/**
 * @public
 */
type Subscriber<T> = (v: T) => void;
interface MotionValueEventCallbacks<V> {
    animationStart: () => void;
    animationComplete: () => void;
    animationCancel: () => void;
    change: (latestValue: V) => void;
    renderRequest: () => void;
}
interface ResolvedValues$1 {
    [key: string]: string | number;
}
interface Owner {
    current: HTMLElement | unknown;
    getProps: () => {
        onUpdate?: (latest: ResolvedValues$1) => void;
        transformTemplate?: (transform: TransformProperties, generatedTransform: string) => string;
    };
}
/**
 * `MotionValue` is used to track the state and velocity of motion values.
 *
 * @public
 */
declare class MotionValue<V = any> {
    /**
     * This will be replaced by the build step with the latest version number.
     * When MotionValues are provided to motion components, warn if versions are mixed.
     */
    version: string;
    /**
     * If a MotionValue has an owner, it was created internally within Motion
     * and therefore has no external listeners. It is therefore safe to animate via WAAPI.
     */
    owner?: Owner;
    /**
     * The current state of the `MotionValue`.
     */
    private current;
    /**
     * The previous state of the `MotionValue`.
     */
    private prev;
    /**
     * The previous state of the `MotionValue` at the end of the previous frame.
     */
    private prevFrameValue;
    /**
     * The last time the `MotionValue` was updated.
     */
    updatedAt: number;
    /**
     * The time `prevFrameValue` was updated.
     */
    prevUpdatedAt: number | undefined;
    private stopPassiveEffect?;
    /**
     * A reference to the currently-controlling animation.
     */
    animation?: AnimationPlaybackControls;
    setCurrent(current: V): void;
    setPrevFrameValue(prevFrameValue?: V | undefined): void;
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
    onChange(subscription: Subscriber<V>): () => void;
    /**
     * An object containing a SubscriptionManager for each active event.
     */
    private events;
    on<EventName extends keyof MotionValueEventCallbacks<V>>(eventName: EventName, callback: MotionValueEventCallbacks<V>[EventName]): VoidFunction;
    clearListeners(): void;
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
    set(v: V, render?: boolean): void;
    setWithVelocity(prev: V, current: V, delta: number): void;
    /**
     * Set the state of the `MotionValue`, stopping any active animations,
     * effects, and resets velocity to `0`.
     */
    jump(v: V, endAnimation?: boolean): void;
    updateAndNotify: (v: V, render?: boolean) => void;
    /**
     * Returns the latest state of `MotionValue`
     *
     * @returns - The latest state of `MotionValue`
     *
     * @public
     */
    get(): NonNullable<V>;
    /**
     * @public
     */
    getPrevious(): V | undefined;
    /**
     * Returns the latest velocity of `MotionValue`
     *
     * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
     *
     * @public
     */
    getVelocity(): number;
    hasAnimated: boolean;
    /**
     * Stop the currently active animation.
     *
     * @public
     */
    stop(): void;
    /**
     * Returns `true` if this value is currently animating.
     *
     * @public
     */
    isAnimating(): boolean;
    private clearAnimation;
    /**
     * Destroy and clean up subscribers to this `MotionValue`.
     *
     * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
     * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
     * created a `MotionValue` via the `motionValue` function.
     *
     * @public
     */
    destroy(): void;
}

/**
 * Options for orchestrating the timing of animations.
 *
 * @public
 */
interface Orchestration {
    /**
     * Delay the animation by this duration (in seconds). Defaults to `0`.
     *
     * @remarks
     * ```javascript
     * const transition = {
     *   delay: 0.2
     * }
     * ```
     *
     * @public
     */
    delay?: number;
    /**
     * Describes the relationship between the transition and its children. Set
     * to `false` by default.
     *
     * @remarks
     * When using variants, the transition can be scheduled in relation to its
     * children with either `"beforeChildren"` to finish this transition before
     * starting children transitions, `"afterChildren"` to finish children
     * transitions before starting this transition.
     *
     * ```jsx
     * const list = {
     *   hidden: {
     *     opacity: 0,
     *     transition: { when: "afterChildren" }
     *   }
     * }
     *
     * const item = {
     *   hidden: {
     *     opacity: 0,
     *     transition: { duration: 2 }
     *   }
     * }
     *
     * return (
     *   <motion.ul variants={list} animate="hidden">
     *     <motion.li variants={item} />
     *     <motion.li variants={item} />
     *   </motion.ul>
     * )
     * ```
     *
     * @public
     */
    when?: false | "beforeChildren" | "afterChildren" | string;
    /**
     * When using variants, children animations will start after this duration
     * (in seconds). You can add the `transition` property to both the `Frame` and the `variant` directly. Adding it to the `variant` generally offers more flexibility, as it allows you to customize the delay per visual state.
     *
     * ```jsx
     * const container = {
     *   hidden: { opacity: 0 },
     *   show: {
     *     opacity: 1,
     *     transition: {
     *       delayChildren: 0.5
     *     }
     *   }
     * }
     *
     * const item = {
     *   hidden: { opacity: 0 },
     *   show: { opacity: 1 }
     * }
     *
     * return (
     *   <motion.ul
     *     variants={container}
     *     initial="hidden"
     *     animate="show"
     *   >
     *     <motion.li variants={item} />
     *     <motion.li variants={item} />
     *   </motion.ul>
     * )
     * ```
     *
     * @public
     */
    delayChildren?: number;
    /**
     * When using variants, animations of child components can be staggered by this
     * duration (in seconds).
     *
     * For instance, if `staggerChildren` is `0.01`, the first child will be
     * delayed by `0` seconds, the second by `0.01`, the third by `0.02` and so
     * on.
     *
     * The calculated stagger delay will be added to `delayChildren`.
     *
     * ```jsx
     * const container = {
     *   hidden: { opacity: 0 },
     *   show: {
     *     opacity: 1,
     *     transition: {
     *       staggerChildren: 0.5
     *     }
     *   }
     * }
     *
     * const item = {
     *   hidden: { opacity: 0 },
     *   show: { opacity: 1 }
     * }
     *
     * return (
     *   <motion.ol
     *     variants={container}
     *     initial="hidden"
     *     animate="show"
     *   >
     *     <motion.li variants={item} />
     *     <motion.li variants={item} />
     *   </motion.ol>
     * )
     * ```
     *
     * @public
     */
    staggerChildren?: number;
    /**
     * The direction in which to stagger children.
     *
     * A value of `1` staggers from the first to the last while `-1`
     * staggers from the last to the first.
     *
     * ```jsx
     * const container = {
     *   hidden: { opacity: 0 },
     *   show: {
     *     opacity: 1,
     *     transition: {
     *       staggerChildren: 0.5,
     *       staggerDirection: -1
     *     }
     *   }
     * }
     *
     * const item = {
     *   hidden: { opacity: 0 },
     *   show: { opacity: 1 }
     * }
     *
     * return (
     *   <motion.ul
     *     variants={container}
     *     initial="hidden"
     *     animate="show"
     *   >
     *     <motion.li variants={item} size={50} />
     *     <motion.li variants={item} size={50} />
     *   </motion.ul>
     * )
     * ```
     *
     * @public
     */
    staggerDirection?: number;
}
interface Repeat {
    /**
     * The number of times to repeat the transition. Set to `Infinity` for perpetual repeating.
     *
     * Without setting `repeatType`, this will loop the animation.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ repeat: Infinity, duration: 2 }}
     * />
     * ```
     *
     * @public
     */
    repeat?: number;
    /**
     * How to repeat the animation. This can be either:
     *
     * "loop": Repeats the animation from the start
     *
     * "reverse": Alternates between forward and backwards playback
     *
     * "mirror": Switches `from` and `to` alternately
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{
     *     repeat: 1,
     *     repeatType: "reverse",
     *     duration: 2
     *   }}
     * />
     * ```
     *
     * @public
     */
    repeatType?: "loop" | "reverse" | "mirror";
    /**
     * When repeating an animation, `repeatDelay` will set the
     * duration of the time to wait, in seconds, between each repetition.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ repeat: Infinity, repeatDelay: 1 }}
     * />
     * ```
     *
     * @public
     */
    repeatDelay?: number;
}
/**
 * An animation that animates between two or more values over a specific duration of time.
 * This is the default animation for non-physical values like `color` and `opacity`.
 *
 * @public
 */
interface Tween extends Repeat {
    /**
     * Set `type` to `"tween"` to use a duration-based tween animation.
     * If any non-orchestration `transition` values are set without a `type` property,
     * this is used as the default animation.
     *
     * ```jsx
     * <motion.path
     *   animate={{ pathLength: 1 }}
     *   transition={{ duration: 2, type: "tween" }}
     * />
     * ```
     *
     * @public
     */
    type?: "tween";
    /**
     * The duration of the tween animation. Set to `0.3` by default, 0r `0.8` if animating a series of keyframes.
     *
     * ```jsx
     * const variants = {
     *   visible: {
     *     opacity: 1,
     *     transition: { duration: 2 }
     *   }
     * }
     * ```
     *
     * @public
     */
    duration?: number;
    /**
     * The easing function to use. Set as one of the below.
     *
     * - The name of an existing easing function.
     *
     * - An array of four numbers to define a cubic bezier curve.
     *
     * - An easing function, that accepts and returns a value `0-1`.
     *
     * If the animating value is set as an array of multiple values for a keyframes
     * animation, `ease` can be set as an array of easing functions to set different easings between
     * each of those values.
     *
     *
     * ```jsx
     * <motion.div
     *   animate={{ opacity: 0 }}
     *   transition={{ ease: [0.17, 0.67, 0.83, 0.67] }}
     * />
     * ```
     *
     * @public
     */
    ease?: Easing | Easing[];
    /**
     * When animating keyframes, `times` can be used to determine where in the animation each keyframe is reached.
     * Each value in `times` is a value between `0` and `1`, representing `duration`.
     *
     * There must be the same number of `times` as there are keyframes.
     * Defaults to an array of evenly-spread durations.
     *
     * ```jsx
     * <motion.div
     *   animate={{ scale: [0, 1, 0.5, 1] }}
     *   transition={{ times: [0, 0.1, 0.9, 1] }}
     * />
     * ```
     *
     * @public
     */
    times?: number[];
    /**
     * When animating keyframes, `easings` can be used to define easing functions between each keyframe. This array should be one item fewer than the number of keyframes, as these easings apply to the transitions between the keyframes.
     *
     * ```jsx
     * <motion.div
     *   animate={{ backgroundColor: ["#0f0", "#00f", "#f00"] }}
     *   transition={{ easings: ["easeIn", "easeOut"] }}
     * />
     * ```
     *
     * @public
     */
    easings?: Easing[];
    /**
     * The value to animate from.
     * By default, this is the current state of the animating value.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ from: 90, duration: 2 }}
     * />
     * ```
     *
     * @public
     */
    from?: number | string;
}
/**
 * An animation that simulates spring physics for realistic motion.
 * This is the default animation for physical values like `x`, `y`, `scale` and `rotate`.
 *
 * @public
 */
interface Spring extends Repeat {
    /**
     * Set `type` to `"spring"` to animate using spring physics for natural
     * movement. Type is set to `"spring"` by default.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'spring' }}
     * />
     * ```
     *
     * @public
     */
    type: "spring";
    /**
     * Stiffness of the spring. Higher values will create more sudden movement.
     * Set to `100` by default.
     *
     * ```jsx
     * <motion.section
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'spring', stiffness: 50 }}
     * />
     * ```
     *
     * @public
     */
    stiffness?: number;
    /**
     * Strength of opposing force. If set to 0, spring will oscillate
     * indefinitely. Set to `10` by default.
     *
     * ```jsx
     * <motion.a
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'spring', damping: 300 }}
     * />
     * ```
     *
     * @public
     */
    damping?: number;
    /**
     * Mass of the moving object. Higher values will result in more lethargic
     * movement. Set to `1` by default.
     *
     * ```jsx
     * <motion.feTurbulence
     *   animate={{ baseFrequency: 0.5 } as any}
     *   transition={{ type: "spring", mass: 0.5 }}
     * />
     * ```
     *
     * @public
     */
    mass?: number;
    /**
     * The duration of the animation, defined in seconds. Spring animations can be a maximum of 10 seconds.
     *
     * If `bounce` is set, this defaults to `0.8`.
     *
     * Note: `duration` and `bounce` will be overridden if `stiffness`, `damping` or `mass` are set.
     *
     * ```jsx
     * <motion.div
     *   animate={{ x: 100 }}
     *   transition={{ type: "spring", duration: 0.8 }}
     * />
     * ```
     *
     * @public
     */
    duration?: number;
    /**
     * If visualDuration is set, this will override duration.
     *
     * The visual duration is a time, set in seconds, that the animation will take to visually appear to reach its target.
     *
     * In other words, the bulk of the transition will occur before this time, and the "bouncy bit" will mostly happen after.
     *
     * This makes it easier to edit a spring, as well as visually coordinate it with other time-based animations.
     *
     * ```jsx
     * <motion.div
     *   animate={{ x: 100 }}
     *   transition={{ type: "spring", visualDuration: 0.5 }}
     * />
     * ```
     *
     * @public
     */
    visualDuration?: number;
    /**
     * `bounce` determines the "bounciness" of a spring animation.
     *
     * `0` is no bounce, and `1` is extremely bouncy.
     *
     * If `duration` is set, this defaults to `0.25`.
     *
     * Note: `bounce` and `duration` will be overridden if `stiffness`, `damping` or `mass` are set.
     *
     * ```jsx
     * <motion.div
     *   animate={{ x: 100 }}
     *   transition={{ type: "spring", bounce: 0.25 }}
     * />
     * ```
     *
     * @public
     */
    bounce?: number;
    /**
     * End animation if absolute speed (in units per second) drops below this
     * value and delta is smaller than `restDelta`. Set to `0.01` by default.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'spring', restSpeed: 0.5 }}
     * />
     * ```
     *
     * @public
     */
    restSpeed?: number;
    /**
     * End animation if distance is below this value and speed is below
     * `restSpeed`. When animation ends, spring gets “snapped” to. Set to
     * `0.01` by default.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'spring', restDelta: 0.5 }}
     * />
     * ```
     *
     * @public
     */
    restDelta?: number;
    /**
     * The value to animate from.
     * By default, this is the initial state of the animating value.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'spring', from: 90 }}
     * />
     * ```
     *
     * @public
     */
    from?: number | string;
    /**
     * The initial velocity of the spring. By default this is the current velocity of the component.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'spring', velocity: 2 }}
     * />
     * ```
     *
     * @public
     */
    velocity?: number;
}
/**
 * An animation that decelerates a value based on its initial velocity,
 * usually used to implement inertial scrolling.
 *
 * Optionally, `min` and `max` boundaries can be defined, and inertia
 * will snap to these with a spring animation.
 *
 * This animation will automatically precalculate a target value,
 * which can be modified with the `modifyTarget` property.
 *
 * This allows you to add snap-to-grid or similar functionality.
 *
 * Inertia is also the animation used for `dragTransition`, and can be configured via that prop.
 *
 * @public
 */
interface Inertia {
    /**
     * Set `type` to animate using the inertia animation. Set to `"tween"` by
     * default. This can be used for natural deceleration, like momentum scrolling.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ type: "inertia", velocity: 50 }}
     * />
     * ```
     *
     * @public
     */
    type: "inertia";
    /**
     * A function that receives the automatically-calculated target and returns a new one. Useful for snapping the target to a grid.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{
     *     power: 0,
     *     // Snap calculated target to nearest 50 pixels
     *     modifyTarget: target => Math.round(target / 50) * 50
     *   }}
     * />
     * ```
     *
     * @public
     */
    modifyTarget?(v: number): number;
    /**
     * If `min` or `max` is set, this affects the stiffness of the bounce
     * spring. Higher values will create more sudden movement. Set to `500` by
     * default.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{
     *     min: 0,
     *     max: 100,
     *     bounceStiffness: 100
     *   }}
     * />
     * ```
     *
     * @public
     */
    bounceStiffness?: number;
    /**
     * If `min` or `max` is set, this affects the damping of the bounce spring.
     * If set to `0`, spring will oscillate indefinitely. Set to `10` by
     * default.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{
     *     min: 0,
     *     max: 100,
     *     bounceDamping: 8
     *   }}
     * />
     * ```
     *
     * @public
     */
    bounceDamping?: number;
    /**
     * A higher power value equals a further target. Set to `0.8` by default.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{ power: 0.2 }}
     * />
     * ```
     *
     * @public
     */
    power?: number;
    /**
     * Adjusting the time constant will change the duration of the
     * deceleration, thereby affecting its feel. Set to `700` by default.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{ timeConstant: 200 }}
     * />
     * ```
     *
     * @public
     */
    timeConstant?: number;
    /**
     * End the animation if the distance to the animation target is below this value, and the absolute speed is below `restSpeed`.
     * When the animation ends, the value gets snapped to the animation target. Set to `0.01` by default.
     * Generally the default values provide smooth animation endings, only in rare cases should you need to customize these.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{ restDelta: 10 }}
     * />
     * ```
     *
     * @public
     */
    restDelta?: number;
    /**
     * Minimum constraint. If set, the value will "bump" against this value (or immediately spring to it if the animation starts as less than this value).
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{ min: 0, max: 100 }}
     * />
     * ```
     *
     * @public
     */
    min?: number;
    /**
     * Maximum constraint. If set, the value will "bump" against this value (or immediately snap to it, if the initial animation value exceeds this value).
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{ min: 0, max: 100 }}
     * />
     * ```
     *
     * @public
     */
    max?: number;
    /**
     * The value to animate from. By default, this is the current state of the animating value.
     *
     * ```jsx
     * <Frame
     *   drag
     *   dragTransition={{ from: 50 }}
     * />
     * ```
     *
     * @public
     */
    from?: number | string;
    /**
     * The initial velocity of the animation.
     * By default this is the current velocity of the component.
     *
     * ```jsx
     * <motion.div
     *   animate={{ rotate: 180 }}
     *   transition={{ type: 'inertia', velocity: 200 }}
     * />
     * ```
     *
     * @public
     */
    velocity?: number;
}
/**
 * Keyframes tweens between multiple `values`.
 *
 * These tweens can be arranged using the `duration`, `easings`, and `times` properties.
 */
interface Keyframes {
    /**
     * Set `type` to `"keyframes"` to animate using the keyframes animation.
     * Set to `"tween"` by default. This can be used to animate between a series of values.
     *
     * @public
     */
    type: "keyframes";
    /**
     * An array of numbers between 0 and 1, where `1` represents the `total` duration.
     *
     * Each value represents at which point during the animation each item in the animation target should be hit, so the array should be the same length as `values`.
     *
     * Defaults to an array of evenly-spread durations.
     *
     * @public
     */
    times?: number[];
    /**
     * An array of easing functions for each generated tween, or a single easing function applied to all tweens.
     *
     * This array should be one item less than `values`, as these easings apply to the transitions *between* the `values`.
     *
     * ```jsx
     * const transition = {
     *   backgroundColor: {
     *     type: 'keyframes',
     *     easings: ['circIn', 'circOut']
     *   }
     * }
     * ```
     *
     * @public
     */
    ease?: Easing | Easing[];
    /**
     * The total duration of the animation. Set to `0.3` by default.
     *
     * ```jsx
     * const transition = {
     *   type: "keyframes",
     *   duration: 2
     * }
     *
     * <Frame
     *   animate={{ opacity: 0 }}
     *   transition={transition}
     * />
     * ```
     *
     * @public
     */
    duration?: number;
    /**
     * @public
     */
    repeatDelay?: number;
}
/**
 * @public
 */
interface None {
    /**
     * Set `type` to `false` for an instant transition.
     *
     * @public
     */
    type: false;
}
/**
 * @public
 */
type PermissiveTransitionDefinition = {
    [key: string]: any;
};
/**
 * @public
 */
type TransitionDefinition = Tween | Spring | Keyframes | Inertia | None | PermissiveTransitionDefinition;
type TransitionMap = Orchestration & TransitionDefinition & {
    [key: string]: TransitionDefinition;
};
/**
 * Transition props
 *
 * @public
 */
type Transition = (Orchestration & Repeat & TransitionDefinition) | (Orchestration & Repeat & TransitionMap);
type Omit$1<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type CSSPropertiesWithoutTransitionOrSingleTransforms = Omit$1<CSSProperties, "transition" | "rotate" | "scale" | "perspective">;
type SVGTransformAttributes = {
    attrX?: number;
    attrY?: number;
    attrScale?: number;
};
type TargetProperties = CSSPropertiesWithoutTransitionOrSingleTransforms & SVGAttributes<SVGElement> & SVGTransformAttributes & TransformProperties & CustomStyles & SVGPathProperties & VariableKeyframesDefinition;
/**
 * @public
 */
type MakeCustomValueType<T> = {
    [K in keyof T]: T[K] | CustomValueType;
};
/**
 * @public
 */
type Target = MakeCustomValueType<TargetProperties>;
/**
 * @public
 */
type MakeKeyframes<T> = {
    [K in keyof T]: T[K] | T[K][] | [null, ...T[K][]];
};
/**
 * @public
 */
type TargetWithKeyframes = MakeKeyframes<Target>;
/**
 * An object that specifies values to animate to. Each value may be set either as
 * a single value, or an array of values.
 *
 * It may also option contain these properties:
 *
 * - `transition`: Specifies transitions for all or individual values.
 * - `transitionEnd`: Specifies values to set when the animation finishes.
 *
 * ```jsx
 * const target = {
 *   x: "0%",
 *   opacity: 0,
 *   transition: { duration: 1 },
 *   transitionEnd: { display: "none" }
 * }
 * ```
 *
 * @public
 */
type TargetAndTransition = TargetWithKeyframes & {
    transition?: Transition;
    transitionEnd?: Target;
};
type TargetResolver = (custom: any, current: Target, velocity: Target) => TargetAndTransition | string;
/**
 * @public
 */
type Variant = TargetAndTransition | TargetResolver;
/**
 * @public
 */
type Variants = {
    [key: string]: Variant;
};
/**
 * @public
 */
interface CustomValueType {
    mix: (from: any, to: any) => (p: number) => number | string;
    toValue: () => number | string;
}

interface Point {
    x: number;
    y: number;
}
interface Axis {
    min: number;
    max: number;
}
interface Box {
    x: Axis;
    y: Axis;
}
interface BoundingBox {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

type AnimationDefinition = VariantLabels | TargetAndTransition | TargetResolver;
/**
 * @public
 */
interface AnimationControls {
    /**
     * Starts an animation on all linked components.
     *
     * @remarks
     *
     * ```jsx
     * controls.start("variantLabel")
     * controls.start({
     *   x: 0,
     *   transition: { duration: 1 }
     * })
     * ```
     *
     * @param definition - Properties or variant label to animate to
     * @param transition - Optional `transtion` to apply to a variant
     * @returns - A `Promise` that resolves when all animations have completed.
     *
     * @public
     */
    start(definition: AnimationDefinition, transitionOverride?: Transition$1): Promise<any>;
    /**
     * Instantly set to a set of properties or a variant.
     *
     * ```jsx
     * // With properties
     * controls.set({ opacity: 0 })
     *
     * // With variants
     * controls.set("hidden")
     * ```
     *
     * @privateRemarks
     * We could perform a similar trick to `.start` where this can be called before mount
     * and we maintain a list of of pending actions that get applied on mount. But the
     * expectation of `set` is that it happens synchronously and this would be difficult
     * to do before any children have even attached themselves. It's also poor practise
     * and we should discourage render-synchronous `.start` calls rather than lean into this.
     *
     * @public
     */
    set(definition: AnimationDefinition): void;
    /**
     * Stops animations on all linked components.
     *
     * ```jsx
     * controls.stop()
     * ```
     *
     * @public
     */
    stop(): void;
    mount(): () => void;
}

type RefObject<T> = {
    current: T | null;
};

/**
 * Passed in to pan event handlers like `onPan` the `PanInfo` object contains
 * information about the current state of the tap gesture such as its
 * `point`, `delta`, `offset` and `velocity`.
 *
 * ```jsx
 * <motion.div onPan={(event, info) => {
 *   console.log(info.point.x, info.point.y)
 * }} />
 * ```
 *
 * @public
 */
interface PanInfo {
    /**
     * Contains `x` and `y` values for the current pan position relative
     * to the device or page.
     *
     * ```jsx
     * function onPan(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onPan={onPan} />
     * ```
     *
     * @public
     */
    point: Point;
    /**
     * Contains `x` and `y` values for the distance moved since
     * the last event.
     *
     * ```jsx
     * function onPan(event, info) {
     *   console.log(info.delta.x, info.delta.y)
     * }
     *
     * <motion.div onPan={onPan} />
     * ```
     *
     * @public
     */
    delta: Point;
    /**
     * Contains `x` and `y` values for the distance moved from
     * the first pan event.
     *
     * ```jsx
     * function onPan(event, info) {
     *   console.log(info.offset.x, info.offset.y)
     * }
     *
     * <motion.div onPan={onPan} />
     * ```
     *
     * @public
     */
    offset: Point;
    /**
     * Contains `x` and `y` values for the current velocity of the pointer, in px/ms.
     *
     * ```jsx
     * function onPan(event, info) {
     *   console.log(info.velocity.x, info.velocity.y)
     * }
     *
     * <motion.div onPan={onPan} />
     * ```
     *
     * @public
     */
    velocity: Point;
}

interface DragControlOptions {
    snapToCursor?: boolean;
    cursorProgress?: Point;
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
declare class DragControls {
    private componentControls;
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
    start(event: react.PointerEvent | PointerEvent, options?: DragControlOptions): void;
}

type DragElastic = boolean | number | Partial<BoundingBox>;
/**
 * @public
 */
interface DragHandlers {
    /**
     * Callback function that fires when dragging starts.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   onDragStart={
     *     (event, info) => console.log(info.point.x, info.point.y)
     *   }
     * />
     * ```
     *
     * @public
     */
    onDragStart?(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void;
    /**
     * Callback function that fires when dragging ends.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   onDragEnd={
     *     (event, info) => console.log(info.point.x, info.point.y)
     *   }
     * />
     * ```
     *
     * @public
     */
    onDragEnd?(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void;
    /**
     * Callback function that fires when the component is dragged.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   onDrag={
     *     (event, info) => console.log(info.point.x, info.point.y)
     *   }
     * />
     * ```
     *
     * @public
     */
    onDrag?(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void;
    /**
     * Callback function that fires a drag direction is determined.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragDirectionLock
     *   onDirectionLock={axis => console.log(axis)}
     * />
     * ```
     *
     * @public
     */
    onDirectionLock?(axis: "x" | "y"): void;
    /**
     * Callback function that fires when drag momentum/bounce transition finishes.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   onDragTransitionEnd={() => console.log('Drag transition complete')}
     * />
     * ```
     *
     * @public
     */
    onDragTransitionEnd?(): void;
}
/**
 * @public
 */
type InertiaOptions = Partial<Omit<Inertia, "velocity" | "type">>;
/**
 * @public
 */
interface DraggableProps extends DragHandlers {
    /**
     * Enable dragging for this element. Set to `false` by default.
     * Set `true` to drag in both directions.
     * Set `"x"` or `"y"` to only drag in a specific direction.
     *
     * ```jsx
     * <motion.div drag="x" />
     * ```
     */
    drag?: boolean | "x" | "y";
    /**
     * Properties or variant label to animate to while the drag gesture is recognised.
     *
     * ```jsx
     * <motion.div whileDrag={{ scale: 1.2 }} />
     * ```
     */
    whileDrag?: VariantLabels | TargetAndTransition;
    /**
     * If `true`, this will lock dragging to the initially-detected direction. Defaults to `false`.
     *
     * ```jsx
     * <motion.div drag dragDirectionLock />
     * ```
     */
    dragDirectionLock?: boolean;
    /**
     * Allows drag gesture propagation to child components. Set to `false` by
     * default.
     *
     * ```jsx
     * <motion.div drag="x" dragPropagation />
     * ```
     */
    dragPropagation?: boolean;
    /**
     * Applies constraints on the permitted draggable area.
     *
     * It can accept an object of optional `top`, `left`, `right`, and `bottom` values, measured in pixels.
     * This will define a distance the named edge of the draggable component.
     *
     * Alternatively, it can accept a `ref` to another component created with React's `useRef` hook.
     * This `ref` should be passed both to the draggable component's `dragConstraints` prop, and the `ref`
     * of the component you want to use as constraints.
     *
     * ```jsx
     * // In pixels
     * <motion.div
     *   drag="x"
     *   dragConstraints={{ left: 0, right: 300 }}
     * />
     *
     * // As a ref to another component
     * const MyComponent = () => {
     *   const constraintsRef = useRef(null)
     *
     *   return (
     *      <motion.div ref={constraintsRef}>
     *          <motion.div drag dragConstraints={constraintsRef} />
     *      </motion.div>
     *   )
     * }
     * ```
     */
    dragConstraints?: false | Partial<BoundingBox> | RefObject<Element | null>;
    /**
     * The degree of movement allowed outside constraints. 0 = no movement, 1 =
     * full movement.
     *
     * Set to `0.5` by default. Can also be set as `false` to disable movement.
     *
     * By passing an object of `top`/`right`/`bottom`/`left`, individual values can be set
     * per constraint. Any missing values will be set to `0`.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragConstraints={{ left: 0, right: 300 }}
     *   dragElastic={0.2}
     * />
     * ```
     */
    dragElastic?: DragElastic;
    /**
     * Apply momentum from the pan gesture to the component when dragging
     * finishes. Set to `true` by default.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragConstraints={{ left: 0, right: 300 }}
     *   dragMomentum={false}
     * />
     * ```
     */
    dragMomentum?: boolean;
    /**
     * Allows you to change dragging inertia parameters.
     * When releasing a draggable Frame, an animation with type `inertia` starts. The animation is based on your dragging velocity. This property allows you to customize it.
     * See {@link https://framer.com/api/animation/#inertia | Inertia} for all properties you can use.
     *
     * ```jsx
     * <motion.div
     *   drag
     *   dragTransition={{ bounceStiffness: 600, bounceDamping: 10 }}
     * />
     * ```
     */
    dragTransition?: InertiaOptions;
    /**
     * Usually, dragging is initiated by pressing down on a component and moving it. For some
     * use-cases, for instance clicking at an arbitrary point on a video scrubber, we
     * might want to initiate dragging from a different component than the draggable one.
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
     */
    dragControls?: DragControls;
    /**
     * If true, element will snap back to its origin when dragging ends.
     *
     * Enabling this is the equivalent of setting all `dragConstraints` axes to `0`
     * with `dragElastic={1}`, but when used together `dragConstraints` can define
     * a wider draggable area and `dragSnapToOrigin` will ensure the element
     * animates back to its origin on release.
     */
    dragSnapToOrigin?: boolean;
    /**
     * By default, if `drag` is defined on a component then an event listener will be attached
     * to automatically initiate dragging when a user presses down on it.
     *
     * By setting `dragListener` to `false`, this event listener will not be created.
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
     *     <motion.div
     *       drag="x"
     *       dragControls={dragControls}
     *       dragListener={false}
     *     />
     *   </>
     * )
     * ```
     */
    dragListener?: boolean;
    /**
     * If `dragConstraints` is set to a React ref, this callback will call with the measured drag constraints.
     *
     * @public
     */
    onMeasureDragConstraints?: (constraints: BoundingBox) => BoundingBox | void;
    /**
     * Usually, dragging uses the layout project engine, and applies transforms to the underlying VisualElement.
     * Passing MotionValues as _dragX and _dragY instead applies drag updates to these motion values.
     * This allows you to manually control how updates from a drag gesture on an element is applied.
     *
     * @public
     */
    _dragX?: MotionValue<number>;
    /**
     * Usually, dragging uses the layout project engine, and applies transforms to the underlying VisualElement.
     * Passing MotionValues as _dragX and _dragY instead applies drag updates to these motion values.
     * This allows you to manually control how updates from a drag gesture on an element is applied.
     *
     * @public
     */
    _dragY?: MotionValue<number>;
}

/** @public */
interface EventInfo {
    point: Point;
}

/**
 * @public
 */
interface FocusHandlers {
    /**
     * Properties or variant label to animate to while the focus gesture is recognised.
     *
     * ```jsx
     * <motion.input whileFocus={{ scale: 1.2 }} />
     * ```
     */
    whileFocus?: VariantLabels | TargetAndTransition;
}
/**
 * Passed in to tap event handlers like `onTap` the `TapInfo` object contains
 * information about the tap gesture such as it‘s location.
 *
 * ```jsx
 * function onTap(event, info) {
 *   console.log(info.point.x, info.point.y)
 * }
 *
 * <motion.div onTap={onTap} />
 * ```
 *
 * @public
 */
interface TapInfo {
    /**
     * Contains `x` and `y` values for the tap gesture relative to the
     * device or page.
     *
     * ```jsx
     * function onTapStart(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onTapStart={onTapStart} />
     * ```
     *
     * @public
     */
    point: Point;
}
/**
 * @public
 */
interface TapHandlers {
    /**
     * Callback when the tap gesture successfully ends on this element.
     *
     * ```jsx
     * function onTap(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onTap={onTap} />
     * ```
     *
     * @param event - The originating pointer event.
     * @param info - An {@link TapInfo} object containing `x` and `y` values for the `point` relative to the device or page.
     */
    onTap?(event: MouseEvent | TouchEvent | PointerEvent, info: TapInfo): void;
    /**
     * Callback when the tap gesture starts on this element.
     *
     * ```jsx
     * function onTapStart(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onTapStart={onTapStart} />
     * ```
     *
     * @param event - The originating pointer event.
     * @param info - An {@link TapInfo} object containing `x` and `y` values for the `point` relative to the device or page.
     */
    onTapStart?(event: MouseEvent | TouchEvent | PointerEvent, info: TapInfo): void;
    /**
     * Callback when the tap gesture ends outside this element.
     *
     * ```jsx
     * function onTapCancel(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onTapCancel={onTapCancel} />
     * ```
     *
     * @param event - The originating pointer event.
     * @param info - An {@link TapInfo} object containing `x` and `y` values for the `point` relative to the device or page.
     */
    onTapCancel?(event: MouseEvent | TouchEvent | PointerEvent, info: TapInfo): void;
    /**
     * Properties or variant label to animate to while the component is pressed.
     *
     * ```jsx
     * <motion.div whileTap={{ scale: 0.8 }} />
     * ```
     */
    whileTap?: VariantLabels | TargetAndTransition;
    /**
     * If `true`, the tap gesture will attach its start listener to window.
     *
     * Note: This is not supported publically.
     */
    globalTapTarget?: boolean;
}
/**
 * @public
 */
interface PanHandlers {
    /**
     * Callback function that fires when the pan gesture is recognised on this element.
     *
     * **Note:** For pan gestures to work correctly with touch input, the element needs
     * touch scrolling to be disabled on either x/y or both axis with the
     * [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) CSS rule.
     *
     * ```jsx
     * function onPan(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onPan={onPan} />
     * ```
     *
     * @param event - The originating pointer event.
     * @param info - A {@link PanInfo} object containing `x` and `y` values for:
     *
     *   - `point`: Relative to the device or page.
     *   - `delta`: Distance moved since the last event.
     *   - `offset`: Offset from the original pan event.
     *   - `velocity`: Current velocity of the pointer.
     */
    onPan?(event: PointerEvent, info: PanInfo): void;
    /**
     * Callback function that fires when the pan gesture begins on this element.
     *
     * ```jsx
     * function onPanStart(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onPanStart={onPanStart} />
     * ```
     *
     * @param event - The originating pointer event.
     * @param info - A {@link PanInfo} object containing `x`/`y` values for:
     *
     *   - `point`: Relative to the device or page.
     *   - `delta`: Distance moved since the last event.
     *   - `offset`: Offset from the original pan event.
     *   - `velocity`: Current velocity of the pointer.
     */
    onPanStart?(event: PointerEvent, info: PanInfo): void;
    /**
     * Callback function that fires when we begin detecting a pan gesture. This
     * is analogous to `onMouseStart` or `onTouchStart`.
     *
     * ```jsx
     * function onPanSessionStart(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onPanSessionStart={onPanSessionStart} />
     * ```
     *
     * @param event - The originating pointer event.
     * @param info - An {@link EventInfo} object containing `x`/`y` values for:
     *
     *   - `point`: Relative to the device or page.
     */
    onPanSessionStart?(event: PointerEvent, info: EventInfo): void;
    /**
     * Callback function that fires when the pan gesture ends on this element.
     *
     * ```jsx
     * function onPanEnd(event, info) {
     *   console.log(info.point.x, info.point.y)
     * }
     *
     * <motion.div onPanEnd={onPanEnd} />
     * ```
     *
     * @param event - The originating pointer event.
     * @param info - A {@link PanInfo} object containing `x`/`y` values for:
     *
     *   - `point`: Relative to the device or page.
     *   - `delta`: Distance moved since the last event.
     *   - `offset`: Offset from the original pan event.
     *   - `velocity`: Current velocity of the pointer.
     */
    onPanEnd?(event: PointerEvent, info: PanInfo): void;
}
/**
 * @public
 */
interface HoverHandlers {
    /**
     * Properties or variant label to animate to while the hover gesture is recognised.
     *
     * ```jsx
     * <motion.div whileHover={{ scale: 1.2 }} />
     * ```
     */
    whileHover?: VariantLabels | TargetAndTransition;
    /**
     * Callback function that fires when pointer starts hovering over the component.
     *
     * ```jsx
     * <motion.div onHoverStart={() => console.log('Hover starts')} />
     * ```
     */
    onHoverStart?(event: MouseEvent, info: EventInfo): void;
    /**
     * Callback function that fires when pointer stops hovering over the component.
     *
     * ```jsx
     * <motion.div onHoverEnd={() => console.log("Hover ends")} />
     * ```
     */
    onHoverEnd?(event: MouseEvent, info: EventInfo): void;
}

/**
 * @public
 */
interface LayoutProps {
    /**
     * If `true`, this component will automatically animate to its new position when
     * its layout changes.
     *
     * ```jsx
     * <motion.div layout />
     * ```
     *
     * This will perform a layout animation using performant transforms. Part of this technique
     * involved animating an element's scale. This can introduce visual distortions on children,
     * `boxShadow` and `borderRadius`.
     *
     * To correct distortion on immediate children, add `layout` to those too.
     *
     * `boxShadow` and `borderRadius` will automatically be corrected if they are already being
     * animated on this component. Otherwise, set them directly via the `initial` prop.
     *
     * If `layout` is set to `"position"`, the size of the component will change instantly and
     * only its position will animate.
     *
     * If `layout` is set to `"size"`, the position of the component will change instantly and
     * only its size will animate.
     *
     * If `layout` is set to `"preserve-aspect"`, the component will animate size & position if
     * the aspect ratio remains the same between renders, and just position if the ratio changes.
     *
     * @public
     */
    layout?: boolean | "position" | "size" | "preserve-aspect";
    /**
     * Enable shared layout transitions between different components with the same `layoutId`.
     *
     * When a component with a layoutId is removed from the React tree, and then
     * added elsewhere, it will visually animate from the previous component's bounding box
     * and its latest animated values.
     *
     * ```jsx
     *   {items.map(item => (
     *      <motion.li layout>
     *         {item.name}
     *         {item.isSelected && <motion.div layoutId="underline" />}
     *      </motion.li>
     *   ))}
     * ```
     *
     * If the previous component remains in the tree it will crossfade with the new component.
     *
     * @public
     */
    layoutId?: string;
    /**
     * A callback that will fire when a layout animation on this component starts.
     *
     * @public
     */
    onLayoutAnimationStart?(): void;
    /**
     * A callback that will fire when a layout animation on this component completes.
     *
     * @public
     */
    onLayoutAnimationComplete?(): void;
    /**
     * @public
     */
    layoutDependency?: any;
    /**
     * Whether a projection node should measure its scroll when it or its descendants update their layout.
     *
     * @public
     */
    layoutScroll?: boolean;
    /**
     * Whether an element should be considered a "layout root", where
     * all children will be forced to resolve relatively to it.
     * Currently used for `position: sticky` elements in Framer.
     */
    layoutRoot?: boolean;
    /**
     * Attached to a portal root to ensure we attach the child to the document root and don't
     * perform scale correction on it.
     */
    "data-framer-portal-id"?: string;
}

type ViewportEventHandler = (entry: IntersectionObserverEntry | null) => void;
interface ViewportOptions {
    root?: RefObject<Element | null>;
    once?: boolean;
    margin?: string;
    amount?: "some" | "all" | number;
}
interface ViewportProps {
    whileInView?: VariantLabels | TargetAndTransition;
    onViewportEnter?: ViewportEventHandler;
    onViewportLeave?: ViewportEventHandler;
    viewport?: ViewportOptions;
}

/**
 * Either a string, or array of strings, that reference variants defined via the `variants` prop.
 * @public
 */
type VariantLabels = string | string[];

interface CustomStyles {
    /**
     * Framer Library custom prop types. These are not actually supported in Motion - preferably
     * we'd have a way of external consumers injecting supported styles into this library.
     */
    size?: string | number;
    radius?: string | number;
    shadow?: string;
    image?: string;
}
type MakeMotion<T> = MakeCustomValueType<{
    [K in keyof T]: T[K] | MotionValue<number> | MotionValue<string> | MotionValue<any>;
}>;
type MotionCSS = MakeMotion<Omit$1<CSSProperties, "rotate" | "scale" | "perspective">>;
/**
 * @public
 */
type MotionTransform = MakeMotion<TransformProperties>;
/**
 * @public
 */
type MotionStyle$1 = MotionCSS & MotionTransform & MakeMotion<SVGPathProperties> & MakeCustomValueType<CustomStyles>;
/**
 * @public
 */
interface AnimationProps {
    /**
     * Properties, variant label or array of variant labels to start in.
     *
     * Set to `false` to initialise with the values in `animate` (disabling the mount animation)
     *
     * ```jsx
     * // As values
     * <motion.div initial={{ opacity: 1 }} />
     *
     * // As variant
     * <motion.div initial="visible" variants={variants} />
     *
     * // Multiple variants
     * <motion.div initial={["visible", "active"]} variants={variants} />
     *
     * // As false (disable mount animation)
     * <motion.div initial={false} animate={{ opacity: 0 }} />
     * ```
     */
    initial?: boolean | Target | VariantLabels;
    /**
     * Values to animate to, variant label(s), or `AnimationControls`.
     *
     * ```jsx
     * // As values
     * <motion.div animate={{ opacity: 1 }} />
     *
     * // As variant
     * <motion.div animate="visible" variants={variants} />
     *
     * // Multiple variants
     * <motion.div animate={["visible", "active"]} variants={variants} />
     *
     * // AnimationControls
     * <motion.div animate={animation} />
     * ```
     */
    animate?: AnimationControls | TargetAndTransition | VariantLabels | boolean;
    /**
     * A target to animate to when this component is removed from the tree.
     *
     * This component **must** be the first animatable child of an `AnimatePresence` to enable this exit animation.
     *
     * This limitation exists because React doesn't allow components to defer unmounting until after
     * an animation is complete. Once this limitation is fixed, the `AnimatePresence` component will be unnecessary.
     *
     * ```jsx
     * import { AnimatePresence, motion } from 'framer-motion'
     *
     * export const MyComponent = ({ isVisible }) => {
     *   return (
     *     <AnimatePresence>
     *        {isVisible && (
     *          <motion.div
     *            initial={{ opacity: 0 }}
     *            animate={{ opacity: 1 }}
     *            exit={{ opacity: 0 }}
     *          />
     *        )}
     *     </AnimatePresence>
     *   )
     * }
     * ```
     */
    exit?: TargetAndTransition | VariantLabels;
    /**
     * Variants allow you to define animation states and organise them by name. They allow
     * you to control animations throughout a component tree by switching a single `animate` prop.
     *
     * Using `transition` options like `delayChildren` and `staggerChildren`, you can orchestrate
     * when children animations play relative to their parent.

     *
     * After passing variants to one or more `motion` component's `variants` prop, these variants
     * can be used in place of values on the `animate`, `initial`, `whileFocus`, `whileTap` and `whileHover` props.
     *
     * ```jsx
     * const variants = {
     *   active: {
     *       backgroundColor: "#f00"
     *   },
     *   inactive: {
     *     backgroundColor: "#fff",
     *     transition: { duration: 2 }
     *   }
     * }
     *
     * <motion.div variants={variants} animate="active" />
     * ```
     */
    variants?: Variants;
    /**
     * Default transition. If no `transition` is defined in `animate`, it will use the transition defined here.
     * ```jsx
     * const spring = {
     *   type: "spring",
     *   damping: 10,
     *   stiffness: 100
     * }
     *
     * <motion.div transition={spring} animate={{ scale: 1.2 }} />
     * ```
     */
    transition?: Transition;
}
/**
 * @public
 */
interface MotionAdvancedProps {
    /**
     * Custom data to use to resolve dynamic variants differently for each animating component.
     *
     * ```jsx
     * const variants = {
     *   visible: (custom) => ({
     *     opacity: 1,
     *     transition: { delay: custom * 0.2 }
     *   })
     * }
     *
     * <motion.div custom={0} animate="visible" variants={variants} />
     * <motion.div custom={1} animate="visible" variants={variants} />
     * <motion.div custom={2} animate="visible" variants={variants} />
     * ```
     *
     * @public
     */
    custom?: any;
    /**
     * @public
     * Set to `false` to prevent inheriting variant changes from its parent.
     */
    inherit?: boolean;
    /**
     * @public
     * Set to `false` to prevent throwing an error when a `motion` component is used within a `LazyMotion` set to strict.
     */
    ignoreStrict?: boolean;
}
/**
 * Props for `motion` components.
 *
 * @public
 */
interface MotionProps extends AnimationProps, EventProps, PanHandlers, TapHandlers, HoverHandlers, FocusHandlers, ViewportProps, DraggableProps, LayoutProps, MotionAdvancedProps {
    /**
     *
     * The React DOM `style` prop, enhanced with support for `MotionValue`s and separate `transform` values.
     *
     * ```jsx
     * export const MyComponent = () => {
     *   const x = useMotionValue(0)
     *
     *   return <motion.div style={{ x, opacity: 1, scale: 0.5 }} />
     * }
     * ```
     */
    style?: MotionStyle$1;
    /**
     * By default, Motion generates a `transform` property with a sensible transform order. `transformTemplate`
     * can be used to create a different order, or to append/preprend the automatically generated `transform` property.
     *
     * ```jsx
     * <motion.div
     *   style={{ x: 0, rotate: 180 }}
     *   transformTemplate={
     *     ({ x, rotate }) => `rotate(${rotate}deg) translateX(${x}px)`
     *   }
     * />
     * ```
     *
     * @param transform - The latest animated transform props.
     * @param generatedTransform - The transform string as automatically generated by Motion
     *
     * @public
     */
    transformTemplate?(transform: TransformProperties, generatedTransform: string): string;
    children?: React.ReactNode | MotionValue<number> | MotionValue<string>;
    "data-framer-appear-id"?: string;
}

/**
 * A generic set of string/number values
 */
interface ResolvedValues {
    [key: string]: string | number;
}
interface LayoutLifecycles {
    onBeforeLayoutMeasure?(box: Box): void;
    onLayoutMeasure?(box: Box, prevBox: Box): void;
}
interface AnimationLifecycles {
    /**
     * Callback with latest motion values, fired max once per frame.
     *
     * ```jsx
     * function onUpdate(latest) {
     *   console.log(latest.x, latest.opacity)
     * }
     *
     * <motion.div animate={{ x: 100, opacity: 0 }} onUpdate={onUpdate} />
     * ```
     */
    onUpdate?(latest: ResolvedValues): void;
    /**
     * Callback when animation defined in `animate` begins.
     *
     * The provided callback will be called with the triggering animation definition.
     * If this is a variant, it'll be the variant name, and if a target object
     * then it'll be the target object.
     *
     * This way, it's possible to figure out which animation has started.
     *
     * ```jsx
     * function onStart() {
     *   console.log("Animation started")
     * }
     *
     * <motion.div animate={{ x: 100 }} onAnimationStart={onStart} />
     * ```
     */
    onAnimationStart?(definition: AnimationDefinition): void;
    /**
     * Callback when animation defined in `animate` is complete.
     *
     * The provided callback will be called with the triggering animation definition.
     * If this is a variant, it'll be the variant name, and if a target object
     * then it'll be the target object.
     *
     * This way, it's possible to figure out which animation has completed.
     *
     * ```jsx
     * function onComplete() {
     *   console.log("Animation completed")
     * }
     *
     * <motion.div
     *   animate={{ x: 100 }}
     *   onAnimationComplete={definition => {
     *     console.log('Completed animating', definition)
     *   }}
     * />
     * ```
     */
    onAnimationComplete?(definition: AnimationDefinition): void;
}
type EventProps = LayoutLifecycles & AnimationLifecycles;

type MotionComponentProps<Props> = {
    [K in Exclude<keyof Props, keyof MotionProps>]?: Props[K];
} & MotionProps;

interface HTMLElements {
    a: HTMLAnchorElement;
    abbr: HTMLElement;
    address: HTMLElement;
    area: HTMLAreaElement;
    article: HTMLElement;
    aside: HTMLElement;
    audio: HTMLAudioElement;
    b: HTMLElement;
    base: HTMLBaseElement;
    bdi: HTMLElement;
    bdo: HTMLElement;
    big: HTMLElement;
    blockquote: HTMLQuoteElement;
    body: HTMLBodyElement;
    br: HTMLBRElement;
    button: HTMLButtonElement;
    canvas: HTMLCanvasElement;
    caption: HTMLElement;
    center: HTMLElement;
    cite: HTMLElement;
    code: HTMLElement;
    col: HTMLTableColElement;
    colgroup: HTMLTableColElement;
    data: HTMLDataElement;
    datalist: HTMLDataListElement;
    dd: HTMLElement;
    del: HTMLModElement;
    details: HTMLDetailsElement;
    dfn: HTMLElement;
    dialog: HTMLDialogElement;
    div: HTMLDivElement;
    dl: HTMLDListElement;
    dt: HTMLElement;
    em: HTMLElement;
    embed: HTMLEmbedElement;
    fieldset: HTMLFieldSetElement;
    figcaption: HTMLElement;
    figure: HTMLElement;
    footer: HTMLElement;
    form: HTMLFormElement;
    h1: HTMLHeadingElement;
    h2: HTMLHeadingElement;
    h3: HTMLHeadingElement;
    h4: HTMLHeadingElement;
    h5: HTMLHeadingElement;
    h6: HTMLHeadingElement;
    head: HTMLHeadElement;
    header: HTMLElement;
    hgroup: HTMLElement;
    hr: HTMLHRElement;
    html: HTMLHtmlElement;
    i: HTMLElement;
    iframe: HTMLIFrameElement;
    img: HTMLImageElement;
    input: HTMLInputElement;
    ins: HTMLModElement;
    kbd: HTMLElement;
    keygen: HTMLElement;
    label: HTMLLabelElement;
    legend: HTMLLegendElement;
    li: HTMLLIElement;
    link: HTMLLinkElement;
    main: HTMLElement;
    map: HTMLMapElement;
    mark: HTMLElement;
    menu: HTMLElement;
    menuitem: HTMLElement;
    meta: HTMLMetaElement;
    meter: HTMLMeterElement;
    nav: HTMLElement;
    noindex: HTMLElement;
    noscript: HTMLElement;
    object: HTMLObjectElement;
    ol: HTMLOListElement;
    optgroup: HTMLOptGroupElement;
    option: HTMLOptionElement;
    output: HTMLOutputElement;
    p: HTMLParagraphElement;
    param: HTMLParamElement;
    picture: HTMLElement;
    pre: HTMLPreElement;
    progress: HTMLProgressElement;
    q: HTMLQuoteElement;
    rp: HTMLElement;
    rt: HTMLElement;
    ruby: HTMLElement;
    s: HTMLElement;
    samp: HTMLElement;
    search: HTMLElement;
    slot: HTMLSlotElement;
    script: HTMLScriptElement;
    section: HTMLElement;
    select: HTMLSelectElement;
    small: HTMLElement;
    source: HTMLSourceElement;
    span: HTMLSpanElement;
    strong: HTMLElement;
    style: HTMLStyleElement;
    sub: HTMLElement;
    summary: HTMLElement;
    sup: HTMLElement;
    table: HTMLTableElement;
    template: HTMLTemplateElement;
    tbody: HTMLTableSectionElement;
    td: HTMLTableDataCellElement;
    textarea: HTMLTextAreaElement;
    tfoot: HTMLTableSectionElement;
    th: HTMLTableHeaderCellElement;
    thead: HTMLTableSectionElement;
    time: HTMLTimeElement;
    title: HTMLTitleElement;
    tr: HTMLTableRowElement;
    track: HTMLTrackElement;
    u: HTMLElement;
    ul: HTMLUListElement;
    var: HTMLElement;
    video: HTMLVideoElement;
    wbr: HTMLElement;
    webview: HTMLWebViewElement;
}

/**
 * @public
 */
type ForwardRefComponent<T, P> = {
    readonly $$typeof: symbol;
} & ((props: PropsWithoutRef<P> & RefAttributes<T>) => JSX.Element);
type AttributesWithoutMotionProps<Attributes> = {
    [K in Exclude<keyof Attributes, keyof MotionProps>]?: Attributes[K];
};
/**
 * @public
 */
type HTMLMotionProps<Tag extends keyof HTMLElements> = AttributesWithoutMotionProps<JSX.IntrinsicElements[Tag]> & MotionProps;
/**
 * Motion-optimised versions of React's HTML components.
 *
 * @public
 */
type HTMLMotionComponents = {
    [K in keyof HTMLElements]: ForwardRefComponent<HTMLElements[K], HTMLMotionProps<K>>;
};

type UnionStringArray<T extends Readonly<string[]>> = T[number];
declare const svgElements: readonly ["animate", "circle", "defs", "desc", "ellipse", "g", "image", "line", "filter", "marker", "mask", "metadata", "path", "pattern", "polygon", "polyline", "rect", "stop", "svg", "switch", "symbol", "text", "tspan", "use", "view", "clipPath", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "foreignObject", "linearGradient", "radialGradient", "textPath"];
type SVGElements = UnionStringArray<typeof svgElements>;

interface SVGAttributesWithoutMotionProps<T> extends Pick<SVGAttributes<T>, Exclude<keyof SVGAttributes<T>, keyof MotionProps>> {
}
/**
 * Blanket-accept any SVG attribute as a `MotionValue`
 * @public
 */
type SVGAttributesAsMotionValues<T> = MakeMotion<SVGAttributesWithoutMotionProps<T>>;
type UnwrapSVGFactoryElement<F> = F extends React.SVGProps<infer P> ? P : never;
/**
 * @public
 */
interface SVGMotionProps<T> extends SVGAttributesAsMotionValues<T>, MotionProps {
}
/**
 * Motion-optimised versions of React's SVG components.
 *
 * @public
 */
type SVGMotionComponents = {
    [K in SVGElements]: ForwardRefComponent<UnwrapSVGFactoryElement<JSX.IntrinsicElements[K]>, SVGMotionProps<UnwrapSVGFactoryElement<JSX.IntrinsicElements[K]>>>;
};

interface ScrollOptions {
    source?: HTMLElement;
    container?: HTMLElement;
    target?: Element;
    axis?: "x" | "y";
    offset?: ScrollOffset;
}
type SupportedEdgeUnit = "px" | "vw" | "vh" | "%";
type EdgeUnit = `${number}${SupportedEdgeUnit}`;
type NamedEdges = "start" | "end" | "center";
type EdgeString = NamedEdges | EdgeUnit | `${number}`;
type Edge = EdgeString | number;
type ProgressIntersection = [number, number];
type Intersection = `${Edge} ${Edge}`;
type ScrollOffset = Array<Edge | Intersection | ProgressIntersection>;

declare global {
    interface Window {
        ScrollTimeline: ScrollTimeline;
    }
}
declare class ScrollTimeline implements ProgressTimeline {
    constructor(options: ScrollOptions);
    currentTime: null | {
        value: number;
    };
    cancel?: VoidFunction;
}

type Process = (data: FrameData) => void;
type Schedule = (process: Process, keepAlive?: boolean, immediate?: boolean) => Process;
type StepId = "read" | "resolveKeyframes" | "update" | "preRender" | "render" | "postRender";
type Batcher = {
    [key in StepId]: Schedule;
};
interface FrameData {
    delta: number;
    timestamp: number;
    isProcessing: boolean;
}

declare const optimizedAppearDataAttribute: "data-framer-appear-id";

/**
 * Expose only the needed part of the VisualElement interface to
 * ensure React types don't end up in the generic DOM bundle.
 */
interface WithAppearProps {
    props: {
        [optimizedAppearDataAttribute]?: string;
        values?: {
            [key: string]: MotionValue<number> | MotionValue<string>;
        };
    };
}
type HandoffFunction = (storeId: string, valueName: string, frame: Batcher) => number | null;
/**
 * The window global object acts as a bridge between our inline script
 * triggering the optimized appear animations, and Motion.
 */
declare global {
    interface Window {
        MotionHandoffAnimation?: HandoffFunction;
        MotionHandoffMarkAsComplete?: (elementId: string) => void;
        MotionHandoffIsComplete?: (elementId: string) => boolean;
        MotionHasOptimisedAnimation?: (elementId?: string, valueName?: string) => boolean;
        MotionCancelOptimisedAnimation?: (elementId?: string, valueName?: string, frame?: Batcher, canResume?: boolean) => void;
        MotionCheckAppearSync?: (visualElement: WithAppearProps, valueName: string, value: MotionValue) => VoidFunction | void;
        MotionIsMounted?: boolean;
    }
}

type DOMMotionComponents = HTMLMotionComponents & SVGMotionComponents;

declare const createMotionComponent: <Props, TagName extends string = "div">(Component: string | TagName | react.ComponentType<Props>, { forwardMotionProps }?: {
    forwardMotionProps: boolean;
}) => TagName extends "symbol" | "clipPath" | "filter" | "mask" | "marker" | "text" | "animate" | "stop" | "path" | "image" | "circle" | "switch" | "svg" | keyof HTMLElements | "defs" | "desc" | "ellipse" | "feBlend" | "feColorMatrix" | "feComponentTransfer" | "feComposite" | "feConvolveMatrix" | "feDiffuseLighting" | "feDisplacementMap" | "feDistantLight" | "feDropShadow" | "feFlood" | "feFuncA" | "feFuncB" | "feFuncG" | "feFuncR" | "feGaussianBlur" | "feImage" | "feMerge" | "feMergeNode" | "feMorphology" | "feOffset" | "fePointLight" | "feSpecularLighting" | "feSpotLight" | "feTile" | "feTurbulence" | "foreignObject" | "g" | "line" | "linearGradient" | "metadata" | "pattern" | "polygon" | "polyline" | "radialGradient" | "rect" | "textPath" | "tspan" | "use" | "view" ? DOMMotionComponents[TagName] : react.ComponentType<MotionComponentProps<react.PropsWithChildren<Props>>>;

/**
 * HTML components
 */
declare const MotionA: ForwardRefComponent<HTMLAnchorElement, HTMLMotionProps<"a">>;
declare const MotionAbbr: ForwardRefComponent<HTMLElement, HTMLMotionProps<"abbr">>;
declare const MotionAddress: ForwardRefComponent<HTMLElement, HTMLMotionProps<"address">>;
declare const MotionArea: ForwardRefComponent<HTMLAreaElement, HTMLMotionProps<"area">>;
declare const MotionArticle: ForwardRefComponent<HTMLElement, HTMLMotionProps<"article">>;
declare const MotionAside: ForwardRefComponent<HTMLElement, HTMLMotionProps<"aside">>;
declare const MotionAudio: ForwardRefComponent<HTMLAudioElement, HTMLMotionProps<"audio">>;
declare const MotionB: ForwardRefComponent<HTMLElement, HTMLMotionProps<"b">>;
declare const MotionBase: ForwardRefComponent<HTMLBaseElement, HTMLMotionProps<"base">>;
declare const MotionBdi: ForwardRefComponent<HTMLElement, HTMLMotionProps<"bdi">>;
declare const MotionBdo: ForwardRefComponent<HTMLElement, HTMLMotionProps<"bdo">>;
declare const MotionBig: ForwardRefComponent<HTMLElement, HTMLMotionProps<"big">>;
declare const MotionBlockquote: ForwardRefComponent<HTMLQuoteElement, HTMLMotionProps<"blockquote">>;
declare const MotionBody: ForwardRefComponent<HTMLBodyElement, HTMLMotionProps<"body">>;
declare const MotionButton: ForwardRefComponent<HTMLButtonElement, HTMLMotionProps<"button">>;
declare const MotionCanvas: ForwardRefComponent<HTMLCanvasElement, HTMLMotionProps<"canvas">>;
declare const MotionCaption: ForwardRefComponent<HTMLElement, HTMLMotionProps<"caption">>;
declare const MotionCite: ForwardRefComponent<HTMLElement, HTMLMotionProps<"cite">>;
declare const MotionCode: ForwardRefComponent<HTMLElement, HTMLMotionProps<"code">>;
declare const MotionCol: ForwardRefComponent<HTMLTableColElement, HTMLMotionProps<"col">>;
declare const MotionColgroup: ForwardRefComponent<HTMLTableColElement, HTMLMotionProps<"colgroup">>;
declare const MotionData: ForwardRefComponent<HTMLDataElement, HTMLMotionProps<"data">>;
declare const MotionDatalist: ForwardRefComponent<HTMLDataListElement, HTMLMotionProps<"datalist">>;
declare const MotionDd: ForwardRefComponent<HTMLElement, HTMLMotionProps<"dd">>;
declare const MotionDel: ForwardRefComponent<HTMLModElement, HTMLMotionProps<"del">>;
declare const MotionDetails: ForwardRefComponent<HTMLDetailsElement, HTMLMotionProps<"details">>;
declare const MotionDfn: ForwardRefComponent<HTMLElement, HTMLMotionProps<"dfn">>;
declare const MotionDialog: ForwardRefComponent<HTMLDialogElement, HTMLMotionProps<"dialog">>;
declare const MotionDiv: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<"div">>;
declare const MotionDl: ForwardRefComponent<HTMLDListElement, HTMLMotionProps<"dl">>;
declare const MotionDt: ForwardRefComponent<HTMLElement, HTMLMotionProps<"dt">>;
declare const MotionEm: ForwardRefComponent<HTMLElement, HTMLMotionProps<"em">>;
declare const MotionEmbed: ForwardRefComponent<HTMLEmbedElement, HTMLMotionProps<"embed">>;
declare const MotionFieldset: ForwardRefComponent<HTMLFieldSetElement, HTMLMotionProps<"fieldset">>;
declare const MotionFigcaption: ForwardRefComponent<HTMLElement, HTMLMotionProps<"figcaption">>;
declare const MotionFigure: ForwardRefComponent<HTMLElement, HTMLMotionProps<"figure">>;
declare const MotionFooter: ForwardRefComponent<HTMLElement, HTMLMotionProps<"footer">>;
declare const MotionForm: ForwardRefComponent<HTMLFormElement, HTMLMotionProps<"form">>;
declare const MotionH1: ForwardRefComponent<HTMLHeadingElement, HTMLMotionProps<"h1">>;
declare const MotionH2: ForwardRefComponent<HTMLHeadingElement, HTMLMotionProps<"h2">>;
declare const MotionH3: ForwardRefComponent<HTMLHeadingElement, HTMLMotionProps<"h3">>;
declare const MotionH4: ForwardRefComponent<HTMLHeadingElement, HTMLMotionProps<"h4">>;
declare const MotionH5: ForwardRefComponent<HTMLHeadingElement, HTMLMotionProps<"h5">>;
declare const MotionH6: ForwardRefComponent<HTMLHeadingElement, HTMLMotionProps<"h6">>;
declare const MotionHead: ForwardRefComponent<HTMLHeadElement, HTMLMotionProps<"head">>;
declare const MotionHeader: ForwardRefComponent<HTMLElement, HTMLMotionProps<"header">>;
declare const MotionHgroup: ForwardRefComponent<HTMLElement, HTMLMotionProps<"hgroup">>;
declare const MotionHr: ForwardRefComponent<HTMLHRElement, HTMLMotionProps<"hr">>;
declare const MotionHtml: ForwardRefComponent<HTMLHtmlElement, HTMLMotionProps<"html">>;
declare const MotionI: ForwardRefComponent<HTMLElement, HTMLMotionProps<"i">>;
declare const MotionIframe: ForwardRefComponent<HTMLIFrameElement, HTMLMotionProps<"iframe">>;
declare const MotionImg: ForwardRefComponent<HTMLImageElement, HTMLMotionProps<"img">>;
declare const MotionInput: ForwardRefComponent<HTMLInputElement, HTMLMotionProps<"input">>;
declare const MotionIns: ForwardRefComponent<HTMLModElement, HTMLMotionProps<"ins">>;
declare const MotionKbd: ForwardRefComponent<HTMLElement, HTMLMotionProps<"kbd">>;
declare const MotionKeygen: ForwardRefComponent<HTMLElement, HTMLMotionProps<"keygen">>;
declare const MotionLabel: ForwardRefComponent<HTMLLabelElement, HTMLMotionProps<"label">>;
declare const MotionLegend: ForwardRefComponent<HTMLLegendElement, HTMLMotionProps<"legend">>;
declare const MotionLi: ForwardRefComponent<HTMLLIElement, HTMLMotionProps<"li">>;
declare const MotionLink: ForwardRefComponent<HTMLLinkElement, HTMLMotionProps<"link">>;
declare const MotionMain: ForwardRefComponent<HTMLElement, HTMLMotionProps<"main">>;
declare const MotionMap: ForwardRefComponent<HTMLMapElement, HTMLMotionProps<"map">>;
declare const MotionMark: ForwardRefComponent<HTMLElement, HTMLMotionProps<"mark">>;
declare const MotionMenu: ForwardRefComponent<HTMLElement, HTMLMotionProps<"menu">>;
declare const MotionMenuitem: ForwardRefComponent<HTMLElement, HTMLMotionProps<"menuitem">>;
declare const MotionMeter: ForwardRefComponent<HTMLMeterElement, HTMLMotionProps<"meter">>;
declare const MotionNav: ForwardRefComponent<HTMLElement, HTMLMotionProps<"nav">>;
declare const MotionObject: ForwardRefComponent<HTMLObjectElement, HTMLMotionProps<"object">>;
declare const MotionOl: ForwardRefComponent<HTMLOListElement, HTMLMotionProps<"ol">>;
declare const MotionOptgroup: ForwardRefComponent<HTMLOptGroupElement, HTMLMotionProps<"optgroup">>;
declare const MotionOption: ForwardRefComponent<HTMLOptionElement, HTMLMotionProps<"option">>;
declare const MotionOutput: ForwardRefComponent<HTMLOutputElement, HTMLMotionProps<"output">>;
declare const MotionP: ForwardRefComponent<HTMLParagraphElement, HTMLMotionProps<"p">>;
declare const MotionParam: ForwardRefComponent<HTMLParamElement, HTMLMotionProps<"param">>;
declare const MotionPicture: ForwardRefComponent<HTMLElement, HTMLMotionProps<"picture">>;
declare const MotionPre: ForwardRefComponent<HTMLPreElement, HTMLMotionProps<"pre">>;
declare const MotionProgress: ForwardRefComponent<HTMLProgressElement, HTMLMotionProps<"progress">>;
declare const MotionQ: ForwardRefComponent<HTMLQuoteElement, HTMLMotionProps<"q">>;
declare const MotionRp: ForwardRefComponent<HTMLElement, HTMLMotionProps<"rp">>;
declare const MotionRt: ForwardRefComponent<HTMLElement, HTMLMotionProps<"rt">>;
declare const MotionRuby: ForwardRefComponent<HTMLElement, HTMLMotionProps<"ruby">>;
declare const MotionS: ForwardRefComponent<HTMLElement, HTMLMotionProps<"s">>;
declare const MotionSamp: ForwardRefComponent<HTMLElement, HTMLMotionProps<"samp">>;
declare const MotionScript: ForwardRefComponent<HTMLScriptElement, HTMLMotionProps<"script">>;
declare const MotionSection: ForwardRefComponent<HTMLElement, HTMLMotionProps<"section">>;
declare const MotionSelect: ForwardRefComponent<HTMLSelectElement, HTMLMotionProps<"select">>;
declare const MotionSmall: ForwardRefComponent<HTMLElement, HTMLMotionProps<"small">>;
declare const MotionSource: ForwardRefComponent<HTMLSourceElement, HTMLMotionProps<"source">>;
declare const MotionSpan: ForwardRefComponent<HTMLSpanElement, HTMLMotionProps<"span">>;
declare const MotionStrong: ForwardRefComponent<HTMLElement, HTMLMotionProps<"strong">>;
declare const MotionStyle: ForwardRefComponent<HTMLStyleElement, HTMLMotionProps<"style">>;
declare const MotionSub: ForwardRefComponent<HTMLElement, HTMLMotionProps<"sub">>;
declare const MotionSummary: ForwardRefComponent<HTMLElement, HTMLMotionProps<"summary">>;
declare const MotionSup: ForwardRefComponent<HTMLElement, HTMLMotionProps<"sup">>;
declare const MotionTable: ForwardRefComponent<HTMLTableElement, HTMLMotionProps<"table">>;
declare const MotionTbody: ForwardRefComponent<HTMLTableSectionElement, HTMLMotionProps<"tbody">>;
declare const MotionTd: ForwardRefComponent<HTMLTableDataCellElement, HTMLMotionProps<"td">>;
declare const MotionTextarea: ForwardRefComponent<HTMLTextAreaElement, HTMLMotionProps<"textarea">>;
declare const MotionTfoot: ForwardRefComponent<HTMLTableSectionElement, HTMLMotionProps<"tfoot">>;
declare const MotionTh: ForwardRefComponent<HTMLTableHeaderCellElement, HTMLMotionProps<"th">>;
declare const MotionThead: ForwardRefComponent<HTMLTableSectionElement, HTMLMotionProps<"thead">>;
declare const MotionTime: ForwardRefComponent<HTMLTimeElement, HTMLMotionProps<"time">>;
declare const MotionTitle: ForwardRefComponent<HTMLTitleElement, HTMLMotionProps<"title">>;
declare const MotionTr: ForwardRefComponent<HTMLTableRowElement, HTMLMotionProps<"tr">>;
declare const MotionTrack: ForwardRefComponent<HTMLTrackElement, HTMLMotionProps<"track">>;
declare const MotionU: ForwardRefComponent<HTMLElement, HTMLMotionProps<"u">>;
declare const MotionUl: ForwardRefComponent<HTMLUListElement, HTMLMotionProps<"ul">>;
declare const MotionVideo: ForwardRefComponent<HTMLVideoElement, HTMLMotionProps<"video">>;
declare const MotionWbr: ForwardRefComponent<HTMLElement, HTMLMotionProps<"wbr">>;
declare const MotionWebview: ForwardRefComponent<HTMLWebViewElement, HTMLMotionProps<"webview">>;
/**
 * SVG components
 */
declare const MotionAnimate: ForwardRefComponent<SVGElement, SVGMotionProps<SVGElement>>;
declare const MotionCircle: ForwardRefComponent<SVGCircleElement, SVGMotionProps<SVGCircleElement>>;
declare const MotionDefs: ForwardRefComponent<SVGDefsElement, SVGMotionProps<SVGDefsElement>>;
declare const MotionDesc: ForwardRefComponent<SVGDescElement, SVGMotionProps<SVGDescElement>>;
declare const MotionEllipse: ForwardRefComponent<SVGEllipseElement, SVGMotionProps<SVGEllipseElement>>;
declare const MotionG: ForwardRefComponent<SVGGElement, SVGMotionProps<SVGGElement>>;
declare const MotionImage: ForwardRefComponent<SVGImageElement, SVGMotionProps<SVGImageElement>>;
declare const MotionLine: ForwardRefComponent<SVGLineElement, SVGMotionProps<SVGLineElement>>;
declare const MotionFilter: ForwardRefComponent<SVGFilterElement, SVGMotionProps<SVGFilterElement>>;
declare const MotionMarker: ForwardRefComponent<SVGMarkerElement, SVGMotionProps<SVGMarkerElement>>;
declare const MotionMask: ForwardRefComponent<SVGMaskElement, SVGMotionProps<SVGMaskElement>>;
declare const MotionMetadata: ForwardRefComponent<SVGMetadataElement, SVGMotionProps<SVGMetadataElement>>;
declare const MotionPath: ForwardRefComponent<SVGPathElement, SVGMotionProps<SVGPathElement>>;
declare const MotionPattern: ForwardRefComponent<SVGPatternElement, SVGMotionProps<SVGPatternElement>>;
declare const MotionPolygon: ForwardRefComponent<SVGPolygonElement, SVGMotionProps<SVGPolygonElement>>;
declare const MotionPolyline: ForwardRefComponent<SVGPolylineElement, SVGMotionProps<SVGPolylineElement>>;
declare const MotionRect: ForwardRefComponent<SVGRectElement, SVGMotionProps<SVGRectElement>>;
declare const MotionStop: ForwardRefComponent<SVGStopElement, SVGMotionProps<SVGStopElement>>;
declare const MotionSvg: ForwardRefComponent<SVGSVGElement, SVGMotionProps<SVGSVGElement>>;
declare const MotionSymbol: ForwardRefComponent<SVGSymbolElement, SVGMotionProps<SVGSymbolElement>>;
declare const MotionText: ForwardRefComponent<SVGTextElement, SVGMotionProps<SVGTextElement>>;
declare const MotionTspan: ForwardRefComponent<SVGTSpanElement, SVGMotionProps<SVGTSpanElement>>;
declare const MotionUse: ForwardRefComponent<SVGUseElement, SVGMotionProps<SVGUseElement>>;
declare const MotionView: ForwardRefComponent<SVGViewElement, SVGMotionProps<SVGViewElement>>;
declare const MotionClipPath: ForwardRefComponent<SVGClipPathElement, SVGMotionProps<SVGClipPathElement>>;
declare const MotionFeBlend: ForwardRefComponent<SVGFEBlendElement, SVGMotionProps<SVGFEBlendElement>>;
declare const MotionFeColorMatrix: ForwardRefComponent<SVGFEColorMatrixElement, SVGMotionProps<SVGFEColorMatrixElement>>;
declare const MotionFeComponentTransfer: ForwardRefComponent<SVGFEComponentTransferElement, SVGMotionProps<SVGFEComponentTransferElement>>;
declare const MotionFeComposite: ForwardRefComponent<SVGFECompositeElement, SVGMotionProps<SVGFECompositeElement>>;
declare const MotionFeConvolveMatrix: ForwardRefComponent<SVGFEConvolveMatrixElement, SVGMotionProps<SVGFEConvolveMatrixElement>>;
declare const MotionFeDiffuseLighting: ForwardRefComponent<SVGFEDiffuseLightingElement, SVGMotionProps<SVGFEDiffuseLightingElement>>;
declare const MotionFeDisplacementMap: ForwardRefComponent<SVGFEDisplacementMapElement, SVGMotionProps<SVGFEDisplacementMapElement>>;
declare const MotionFeDistantLight: ForwardRefComponent<SVGFEDistantLightElement, SVGMotionProps<SVGFEDistantLightElement>>;
declare const MotionFeDropShadow: ForwardRefComponent<SVGFEDropShadowElement, SVGMotionProps<SVGFEDropShadowElement>>;
declare const MotionFeFlood: ForwardRefComponent<SVGFEFloodElement, SVGMotionProps<SVGFEFloodElement>>;
declare const MotionFeFuncA: ForwardRefComponent<SVGFEFuncAElement, SVGMotionProps<SVGFEFuncAElement>>;
declare const MotionFeFuncB: ForwardRefComponent<SVGFEFuncBElement, SVGMotionProps<SVGFEFuncBElement>>;
declare const MotionFeFuncG: ForwardRefComponent<SVGFEFuncGElement, SVGMotionProps<SVGFEFuncGElement>>;
declare const MotionFeFuncR: ForwardRefComponent<SVGFEFuncRElement, SVGMotionProps<SVGFEFuncRElement>>;
declare const MotionFeGaussianBlur: ForwardRefComponent<SVGFEGaussianBlurElement, SVGMotionProps<SVGFEGaussianBlurElement>>;
declare const MotionFeImage: ForwardRefComponent<SVGFEImageElement, SVGMotionProps<SVGFEImageElement>>;
declare const MotionFeMerge: ForwardRefComponent<SVGFEMergeElement, SVGMotionProps<SVGFEMergeElement>>;
declare const MotionFeMergeNode: ForwardRefComponent<SVGFEMergeNodeElement, SVGMotionProps<SVGFEMergeNodeElement>>;
declare const MotionFeMorphology: ForwardRefComponent<SVGFEMorphologyElement, SVGMotionProps<SVGFEMorphologyElement>>;
declare const MotionFeOffset: ForwardRefComponent<SVGFEOffsetElement, SVGMotionProps<SVGFEOffsetElement>>;
declare const MotionFePointLight: ForwardRefComponent<SVGFEPointLightElement, SVGMotionProps<SVGFEPointLightElement>>;
declare const MotionFeSpecularLighting: ForwardRefComponent<SVGFESpecularLightingElement, SVGMotionProps<SVGFESpecularLightingElement>>;
declare const MotionFeSpotLight: ForwardRefComponent<SVGFESpotLightElement, SVGMotionProps<SVGFESpotLightElement>>;
declare const MotionFeTile: ForwardRefComponent<SVGFETileElement, SVGMotionProps<SVGFETileElement>>;
declare const MotionFeTurbulence: ForwardRefComponent<SVGFETurbulenceElement, SVGMotionProps<SVGFETurbulenceElement>>;
declare const MotionForeignObject: ForwardRefComponent<SVGForeignObjectElement, SVGMotionProps<SVGForeignObjectElement>>;
declare const MotionLinearGradient: ForwardRefComponent<SVGLinearGradientElement, SVGMotionProps<SVGLinearGradientElement>>;
declare const MotionRadialGradient: ForwardRefComponent<SVGRadialGradientElement, SVGMotionProps<SVGRadialGradientElement>>;
declare const MotionTextPath: ForwardRefComponent<SVGTextPathElement, SVGMotionProps<SVGTextPathElement>>;

export { MotionA as a, MotionAbbr as abbr, MotionAddress as address, MotionAnimate as animate, MotionArea as area, MotionArticle as article, MotionAside as aside, MotionAudio as audio, MotionB as b, MotionBase as base, MotionBdi as bdi, MotionBdo as bdo, MotionBig as big, MotionBlockquote as blockquote, MotionBody as body, MotionButton as button, MotionCanvas as canvas, MotionCaption as caption, MotionCircle as circle, MotionCite as cite, MotionClipPath as clipPath, MotionCode as code, MotionCol as col, MotionColgroup as colgroup, createMotionComponent as create, MotionData as data, MotionDatalist as datalist, MotionDd as dd, MotionDefs as defs, MotionDel as del, MotionDesc as desc, MotionDetails as details, MotionDfn as dfn, MotionDialog as dialog, MotionDiv as div, MotionDl as dl, MotionDt as dt, MotionEllipse as ellipse, MotionEm as em, MotionEmbed as embed, MotionFeBlend as feBlend, MotionFeColorMatrix as feColorMatrix, MotionFeComponentTransfer as feComponentTransfer, MotionFeComposite as feComposite, MotionFeConvolveMatrix as feConvolveMatrix, MotionFeDiffuseLighting as feDiffuseLighting, MotionFeDisplacementMap as feDisplacementMap, MotionFeDistantLight as feDistantLight, MotionFeDropShadow as feDropShadow, MotionFeFlood as feFlood, MotionFeFuncA as feFuncA, MotionFeFuncB as feFuncB, MotionFeFuncG as feFuncG, MotionFeFuncR as feFuncR, MotionFeGaussianBlur as feGaussianBlur, MotionFeImage as feImage, MotionFeMerge as feMerge, MotionFeMergeNode as feMergeNode, MotionFeMorphology as feMorphology, MotionFeOffset as feOffset, MotionFePointLight as fePointLight, MotionFeSpecularLighting as feSpecularLighting, MotionFeSpotLight as feSpotLight, MotionFeTile as feTile, MotionFeTurbulence as feTurbulence, MotionFieldset as fieldset, MotionFigcaption as figcaption, MotionFigure as figure, MotionFilter as filter, MotionFooter as footer, MotionForeignObject as foreignObject, MotionForm as form, MotionG as g, MotionH1 as h1, MotionH2 as h2, MotionH3 as h3, MotionH4 as h4, MotionH5 as h5, MotionH6 as h6, MotionHead as head, MotionHeader as header, MotionHgroup as hgroup, MotionHr as hr, MotionHtml as html, MotionI as i, MotionIframe as iframe, MotionImage as image, MotionImg as img, MotionInput as input, MotionIns as ins, MotionKbd as kbd, MotionKeygen as keygen, MotionLabel as label, MotionLegend as legend, MotionLi as li, MotionLine as line, MotionLinearGradient as linearGradient, MotionLink as link, MotionMain as main, MotionMap as map, MotionMark as mark, MotionMarker as marker, MotionMask as mask, MotionMenu as menu, MotionMenuitem as menuitem, MotionMetadata as metadata, MotionMeter as meter, MotionNav as nav, MotionObject as object, MotionOl as ol, MotionOptgroup as optgroup, MotionOption as option, MotionOutput as output, MotionP as p, MotionParam as param, MotionPath as path, MotionPattern as pattern, MotionPicture as picture, MotionPolygon as polygon, MotionPolyline as polyline, MotionPre as pre, MotionProgress as progress, MotionQ as q, MotionRadialGradient as radialGradient, MotionRect as rect, MotionRp as rp, MotionRt as rt, MotionRuby as ruby, MotionS as s, MotionSamp as samp, MotionScript as script, MotionSection as section, MotionSelect as select, MotionSmall as small, MotionSource as source, MotionSpan as span, MotionStop as stop, MotionStrong as strong, MotionStyle as style, MotionSub as sub, MotionSummary as summary, MotionSup as sup, MotionSvg as svg, MotionSymbol as symbol, MotionTable as table, MotionTbody as tbody, MotionTd as td, MotionText as text, MotionTextPath as textPath, MotionTextarea as textarea, MotionTfoot as tfoot, MotionTh as th, MotionThead as thead, MotionTime as time, MotionTitle as title, MotionTr as tr, MotionTrack as track, MotionTspan as tspan, MotionU as u, MotionUl as ul, MotionUse as use, MotionVideo as video, MotionView as view, MotionWbr as wbr, MotionWebview as webview };
