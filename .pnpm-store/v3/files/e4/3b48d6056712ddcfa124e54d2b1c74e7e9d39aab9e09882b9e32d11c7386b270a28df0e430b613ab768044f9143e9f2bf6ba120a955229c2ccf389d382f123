/// <reference types="react" />
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React$1 from 'react';
import { SVGAttributes, CSSProperties, PropsWithoutRef, RefAttributes, JSX, useEffect, RefObject as RefObject$1 } from 'react';
import * as motion_dom from 'motion-dom';
import { AnimationPlaybackControls, TransformProperties, Easing, SVGPathProperties, VariableKeyframesDefinition, ValueAnimationOptions, Transition as Transition$1, UnresolvedValueKeyframe, ElementOrSelector, DOMKeyframesDefinition, AnimationOptions, AnimationPlaybackOptions, AnimationScope, ValueAnimationTransition, EasingFunction, ProgressTimeline, EasingModifier, KeyframeGenerator, DynamicOption, SpringOptions, RepeatType, AnimationState as AnimationState$1 } from 'motion-dom';
export * from 'motion-dom';
export { BezierDefinition, Easing, EasingDefinition, EasingFunction, EasingModifier, isDragActive } from 'motion-dom';
export { invariant, noop, progress } from 'motion-utils';

/**
 * @public
 */
interface AnimatePresenceProps {
    /**
     * By passing `initial={false}`, `AnimatePresence` will disable any initial animations on children
     * that are present when the component is first rendered.
     *
     * ```jsx
     * <AnimatePresence initial={false}>
     *   {isVisible && (
     *     <motion.div
     *       key="modal"
     *       initial={{ opacity: 0 }}
     *       animate={{ opacity: 1 }}
     *       exit={{ opacity: 0 }}
     *     />
     *   )}
     * </AnimatePresence>
     * ```
     *
     * @public
     */
    initial?: boolean;
    /**
     * When a component is removed, there's no longer a chance to update its props. So if a component's `exit`
     * prop is defined as a dynamic variant and you want to pass a new `custom` prop, you can do so via `AnimatePresence`.
     * This will ensure all leaving components animate using the latest data.
     *
     * @public
     */
    custom?: any;
    /**
     * Fires when all exiting nodes have completed animating out.
     *
     * @public
     */
    onExitComplete?: () => void;
    /**
     * Determines how to handle entering and exiting elements.
     *
     * - `"sync"`: Default. Elements animate in and out as soon as they're added/removed.
     * - `"popLayout"`: Exiting elements are "popped" from the page layout, allowing sibling
     *      elements to immediately occupy their new layouts.
     * - `"wait"`: Only renders one component at a time. Wait for the exiting component to animate out
     *      before animating the next component in.
     *
     * @public
     */
    mode?: "sync" | "popLayout" | "wait";
    /**
     * Internal. Used in Framer to flag that sibling children *shouldn't* re-render as a result of a
     * child being removed.
     */
    presenceAffectsLayout?: boolean;
    /**
     * If true, the `AnimatePresence` component will propagate parent exit animations
     * to its children.
     */
    propagate?: boolean;
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
declare const AnimatePresence: ({ children, custom, initial, onExitComplete, presenceAffectsLayout, mode, propagate, }: React$1.PropsWithChildren<AnimatePresenceProps>) => react_jsx_runtime.JSX.Element | undefined;

type InheritOption = boolean | "id";
interface Props$2 {
    id?: string;
    inherit?: InheritOption;
}
declare const LayoutGroup: React$1.FunctionComponent<React$1.PropsWithChildren<Props$2>>;

/**
 * @public
 */
type Subscriber<T> = (v: T) => void;
/**
 * @public
 */
type PassiveEffect<T> = (v: T, safeSetter: (v: T) => void) => void;
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
interface MotionValueOptions {
    owner?: Owner;
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
declare function motionValue<V>(init: V, options?: MotionValueOptions): MotionValue<V>;

type GenericKeyframesTarget<V> = V[] | Array<null | V>;
/**
 * @public
 */
type ResolvedKeyframesTarget = GenericKeyframesTarget<number> | GenericKeyframesTarget<string>;
/**
 * @public
 */
type KeyframesTarget = ResolvedKeyframesTarget | GenericKeyframesTarget<CustomValueType>;
/**
 * @public
 */
type ResolvedSingleTarget = string | number;
/**
 * @public
 */
type SingleTarget = ResolvedSingleTarget | CustomValueType;
/**
 * @public
 */
type ResolvedValueTarget = ResolvedSingleTarget | ResolvedKeyframesTarget;
/**
 * @public
 */
type ValueTarget = SingleTarget | KeyframesTarget;
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
interface AxisDelta {
    translate: number;
    scale: number;
    origin: number;
    originPoint: number;
}
interface Delta {
    x: AxisDelta;
    y: AxisDelta;
}
type TransformPoint = (point: Point) => Point;

type ReducedMotionConfig = "always" | "never" | "user";
/**
 * @public
 */
interface MotionConfigContext {
    /**
     * Internal, exported only for usage in Framer
     */
    transformPagePoint: TransformPoint;
    /**
     * Internal. Determines whether this is a static context ie the Framer canvas. If so,
     * it'll disable all dynamic functionality.
     */
    isStatic: boolean;
    /**
     * Defines a new default transition for the entire tree.
     *
     * @public
     */
    transition?: Transition;
    /**
     * If true, will respect the device prefersReducedMotion setting by switching
     * transform animations off.
     *
     * @public
     */
    reducedMotion?: ReducedMotionConfig;
    /**
     * A custom `nonce` attribute used when wanting to enforce a Content Security Policy (CSP).
     * For more details see:
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src#unsafe_inline_styles
     *
     * @public
     */
    nonce?: string;
}
/**
 * @public
 */
declare const MotionConfigContext: React$1.Context<MotionConfigContext>;

/**
 * @public
 */
interface PresenceContextProps {
    id: string;
    isPresent: boolean;
    register: (id: string | number) => () => void;
    onExitComplete?: (id: string | number) => void;
    initial?: false | VariantLabels;
    custom?: any;
}
/**
 * @public
 */
declare const PresenceContext: React$1.Context<PresenceContextProps | null>;

interface SwitchLayoutGroup {
    register?: (member: IProjectionNode) => void;
    deregister?: (member: IProjectionNode) => void;
}
type InitialPromotionConfig = {
    /**
     * The initial transition to use when the elements in this group mount (and automatically promoted).
     * Subsequent updates should provide a transition in the promote method.
     */
    transition?: Transition;
    /**
     * If the follow tree should preserve its opacity when the lead is promoted on mount
     */
    shouldPreserveFollowOpacity?: (member: IProjectionNode) => boolean;
};
type SwitchLayoutGroupContext = SwitchLayoutGroup & InitialPromotionConfig;
/**
 * Internal, exported only for usage in Framer
 */
declare const SwitchLayoutGroupContext: React$1.Context<SwitchLayoutGroupContext>;

interface OnUpdateSettings<Instance, RenderState> {
    props: MotionProps;
    prevProps?: MotionProps;
    current: Instance | null;
    renderState: RenderState;
    latestValues: ResolvedValues;
}
interface VisualState<Instance, RenderState> {
    renderState: RenderState;
    latestValues: ResolvedValues;
    onUpdate?: (settings: OnUpdateSettings<Instance, RenderState>) => void;
    onMount?: (instance: Instance) => void;
}
type UseVisualState<Instance, RenderState> = (props: MotionProps, isStatic: boolean) => VisualState<Instance, RenderState>;
interface UseVisualStateConfig<Instance, RenderState> {
    scrapeMotionValuesFromProps: ScrapeMotionValuesFromProps;
    createRenderState: () => RenderState;
    onUpdate?: (settings: OnUpdateSettings<Instance, RenderState>) => void;
}
declare const makeUseVisualState: <I, RS>(config: UseVisualStateConfig<I, RS>) => UseVisualState<I, RS>;

type ScrapeMotionValuesFromProps = (props: MotionProps, prevProps: MotionProps, visualElement?: VisualElement) => {
    [key: string]: MotionValue | string | number;
};
type VisualElementOptions<Instance, RenderState = any> = {
    visualState: VisualState<Instance, RenderState>;
    parent?: VisualElement<unknown>;
    variantParent?: VisualElement<unknown>;
    presenceContext: PresenceContextProps | null;
    props: MotionProps;
    blockInitialAnimation?: boolean;
    reducedMotionConfig?: ReducedMotionConfig;
};
/**
 * A generic set of string/number values
 */
interface ResolvedValues {
    [key: string]: string | number;
}
interface VisualElementEventCallbacks {
    BeforeLayoutMeasure: () => void;
    LayoutMeasure: (layout: Box, prevLayout?: Box) => void;
    LayoutUpdate: (layout: Axis, prevLayout: Axis) => void;
    Update: (latest: ResolvedValues) => void;
    AnimationStart: (definition: AnimationDefinition) => void;
    AnimationComplete: (definition: AnimationDefinition) => void;
    LayoutAnimationStart: () => void;
    LayoutAnimationComplete: () => void;
    SetAxisTarget: () => void;
    Unmount: () => void;
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
type CreateVisualElement<Instance> = (Component: string | React.ComponentType<React.PropsWithChildren<unknown>>, options: VisualElementOptions<Instance>) => VisualElement<Instance>;

interface WithDepth {
    depth: number;
}

declare class FlatTree {
    private children;
    private isDirty;
    add(child: WithDepth): void;
    remove(child: WithDepth): void;
    forEach(callback: (child: WithDepth) => void): void;
}

declare class NodeStack {
    lead?: IProjectionNode;
    prevLead?: IProjectionNode;
    members: IProjectionNode[];
    add(node: IProjectionNode): void;
    remove(node: IProjectionNode): void;
    relegate(node: IProjectionNode): boolean;
    promote(node: IProjectionNode, preserveFollowOpacity?: boolean): void;
    exitAnimationComplete(): void;
    scheduleRender(): void;
    /**
     * Clear any leads that have been removed this render to prevent them from being
     * used in future animations and to prevent memory leaks
     */
    removeLeadSnapshot(): void;
}

interface Measurements {
    animationId: number;
    measuredBox: Box;
    layoutBox: Box;
    latestValues: ResolvedValues;
    source: number;
}
type Phase = "snapshot" | "measure";
interface ScrollMeasurements {
    animationId: number;
    phase: Phase;
    offset: Point;
    isRoot: boolean;
    wasRoot: boolean;
}
type LayoutEvents = "willUpdate" | "didUpdate" | "beforeMeasure" | "measure" | "projectionUpdate" | "animationStart" | "animationComplete";
interface IProjectionNode<I = unknown> {
    id: number;
    animationId: number;
    parent?: IProjectionNode;
    relativeParent?: IProjectionNode;
    root?: IProjectionNode;
    children: Set<IProjectionNode>;
    path: IProjectionNode[];
    nodes?: FlatTree;
    depth: number;
    instance: I;
    mount: (node: I, isLayoutDirty?: boolean) => void;
    unmount: () => void;
    options: ProjectionNodeOptions;
    setOptions(options: ProjectionNodeOptions): void;
    layout?: Measurements;
    snapshot?: Measurements;
    target?: Box;
    relativeTarget?: Box;
    relativeTargetOrigin?: Box;
    targetDelta?: Delta;
    targetWithTransforms?: Box;
    scroll?: ScrollMeasurements;
    treeScale?: Point;
    projectionDelta?: Delta;
    projectionDeltaWithTransform?: Delta;
    latestValues: ResolvedValues;
    isLayoutDirty: boolean;
    isProjectionDirty: boolean;
    isSharedProjectionDirty: boolean;
    isTransformDirty: boolean;
    resolvedRelativeTargetAt?: number;
    shouldResetTransform: boolean;
    prevTransformTemplateValue: string | undefined;
    isUpdateBlocked(): boolean;
    updateManuallyBlocked: boolean;
    updateBlockedByResize: boolean;
    blockUpdate(): void;
    unblockUpdate(): void;
    isUpdating: boolean;
    needsReset: boolean;
    startUpdate(): void;
    willUpdate(notifyListeners?: boolean): void;
    didUpdate(): void;
    measure(removeTransform?: boolean): Measurements;
    measurePageBox(): Box;
    updateLayout(): void;
    updateSnapshot(): void;
    clearSnapshot(): void;
    updateScroll(phase?: Phase): void;
    scheduleUpdateProjection(): void;
    scheduleCheckAfterUnmount(): void;
    checkUpdateFailed(): void;
    sharedNodes: Map<string, NodeStack>;
    registerSharedNode(id: string, node: IProjectionNode): void;
    getStack(): NodeStack | undefined;
    isVisible: boolean;
    hide(): void;
    show(): void;
    scheduleRender(notifyAll?: boolean): void;
    getClosestProjectingParent(): IProjectionNode | undefined;
    setTargetDelta(delta: Delta): void;
    resetTransform(): void;
    resetSkewAndRotation(): void;
    applyTransform(box: Box, transformOnly?: boolean): Box;
    resolveTargetDelta(force?: boolean): void;
    calcProjection(): void;
    getProjectionStyles(styleProp?: MotionStyle): MotionStyle | undefined;
    clearMeasurements(): void;
    resetTree(): void;
    isProjecting(): boolean;
    animationValues?: ResolvedValues;
    currentAnimation?: AnimationPlaybackControls;
    isTreeAnimating?: boolean;
    isAnimationBlocked?: boolean;
    isTreeAnimationBlocked: () => boolean;
    setAnimationOrigin(delta: Delta): void;
    startAnimation(transition: Transition): void;
    finishAnimation(): void;
    hasCheckedOptimisedAppear: boolean;
    isLead(): boolean;
    promote(options?: {
        needsReset?: boolean;
        transition?: Transition;
        preserveFollowOpacity?: boolean;
    }): void;
    relegate(): boolean;
    resumeFrom?: IProjectionNode;
    resumingFrom?: IProjectionNode;
    isPresent?: boolean;
    addEventListener(name: LayoutEvents, handler: any): VoidFunction;
    notifyListeners(name: LayoutEvents, ...args: any): void;
    hasListeners(name: LayoutEvents): boolean;
    hasTreeAnimated: boolean;
    preserveOpacity?: boolean;
}
interface ProjectionNodeOptions {
    animate?: boolean;
    layoutScroll?: boolean;
    layoutRoot?: boolean;
    alwaysMeasureLayout?: boolean;
    onExitComplete?: VoidFunction;
    animationType?: "size" | "position" | "both" | "preserve-aspect";
    layoutId?: string;
    layout?: boolean | string;
    visualElement?: VisualElement;
    crossfade?: boolean;
    transition?: Transition;
    initialPromotionConfig?: InitialPromotionConfig;
}

type AnimationType = "animate" | "whileHover" | "whileTap" | "whileDrag" | "whileFocus" | "whileInView" | "exit";

type VisualElementAnimationOptions = {
    delay?: number;
    transitionOverride?: Transition;
    custom?: any;
    type?: AnimationType;
};

interface AnimationState {
    animateChanges: (type?: AnimationType) => Promise<any>;
    setActive: (type: AnimationType, isActive: boolean, options?: VisualElementAnimationOptions) => Promise<any>;
    setAnimateFunction: (fn: any) => void;
    getState: () => {
        [key: string]: AnimationTypeState;
    };
    reset: () => void;
}
interface AnimationTypeState {
    isActive: boolean;
    protectedKeys: {
        [key: string]: true;
    };
    needsAnimating: {
        [key: string]: boolean;
    };
    prevResolvedValues: {
        [key: string]: any;
    };
    prevProp?: VariantLabels | TargetAndTransition;
}

/**
 * A VisualElement is an imperative abstraction around UI elements such as
 * HTMLElement, SVGElement, Three.Object3D etc.
 */
declare abstract class VisualElement<Instance = unknown, RenderState = unknown, Options extends {} = {}> {
    /**
     * VisualElements are arranged in trees mirroring that of the React tree.
     * Each type of VisualElement has a unique name, to detect when we're crossing
     * type boundaries within that tree.
     */
    abstract type: string;
    /**
     * An `Array.sort` compatible function that will compare two Instances and
     * compare their respective positions within the tree.
     */
    abstract sortInstanceNodePosition(a: Instance, b: Instance): number;
    /**
     * Measure the viewport-relative bounding box of the Instance.
     */
    abstract measureInstanceViewportBox(instance: Instance, props: MotionProps & Partial<MotionConfigContext>): Box;
    /**
     * When a value has been removed from all animation props we need to
     * pick a target to animate back to. For instance, for HTMLElements
     * we can look in the style prop.
     */
    abstract getBaseTargetFromProps(props: MotionProps, key: string): string | number | undefined | MotionValue;
    /**
     * When we first animate to a value we need to animate it *from* a value.
     * Often this have been specified via the initial prop but it might be
     * that the value needs to be read from the Instance.
     */
    abstract readValueFromInstance(instance: Instance, key: string, options: Options): string | number | null | undefined;
    /**
     * When a value has been removed from the VisualElement we use this to remove
     * it from the inherting class' unique render state.
     */
    abstract removeValueFromRenderState(key: string, renderState: RenderState): void;
    /**
     * Run before a React or VisualElement render, builds the latest motion
     * values into an Instance-specific format. For example, HTMLVisualElement
     * will use this step to build `style` and `var` values.
     */
    abstract build(renderState: RenderState, latestValues: ResolvedValues, props: MotionProps): void;
    /**
     * Apply the built values to the Instance. For example, HTMLElements will have
     * styles applied via `setProperty` and the style attribute, whereas SVGElements
     * will have values applied to attributes.
     */
    abstract renderInstance(instance: Instance, renderState: RenderState, styleProp?: MotionStyle, projection?: IProjectionNode): void;
    /**
     * If the component child is provided as a motion value, handle subscriptions
     * with the renderer-specific VisualElement.
     */
    handleChildMotionValue?(): void;
    /**
     * This method takes React props and returns found MotionValues. For example, HTML
     * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
     *
     * This isn't an abstract method as it needs calling in the constructor, but it is
     * intended to be one.
     */
    scrapeMotionValuesFromProps(_props: MotionProps, _prevProps: MotionProps, _visualElement: VisualElement): {
        [key: string]: MotionValue | string | number;
    };
    /**
     * A reference to the current underlying Instance, e.g. a HTMLElement
     * or Three.Mesh etc.
     */
    current: Instance | null;
    /**
     * A reference to the parent VisualElement (if exists).
     */
    parent: VisualElement | undefined;
    /**
     * A set containing references to this VisualElement's children.
     */
    children: Set<VisualElement<unknown, unknown, {}>>;
    /**
     * The depth of this VisualElement within the overall VisualElement tree.
     */
    depth: number;
    /**
     * The current render state of this VisualElement. Defined by inherting VisualElements.
     */
    renderState: RenderState;
    /**
     * An object containing the latest static values for each of this VisualElement's
     * MotionValues.
     */
    latestValues: ResolvedValues;
    /**
     * Determine what role this visual element should take in the variant tree.
     */
    isVariantNode: boolean;
    isControllingVariants: boolean;
    /**
     * If this component is part of the variant tree, it should track
     * any children that are also part of the tree. This is essentially
     * a shadow tree to simplify logic around how to stagger over children.
     */
    variantChildren?: Set<VisualElement>;
    /**
     * Decides whether this VisualElement should animate in reduced motion
     * mode.
     *
     * TODO: This is currently set on every individual VisualElement but feels
     * like it could be set globally.
     */
    shouldReduceMotion: boolean | null;
    /**
     * Normally, if a component is controlled by a parent's variants, it can
     * rely on that ancestor to trigger animations further down the tree.
     * However, if a component is created after its parent is mounted, the parent
     * won't trigger that mount animation so the child needs to.
     *
     * TODO: This might be better replaced with a method isParentMounted
     */
    manuallyAnimateOnMount: boolean;
    /**
     * This can be set by AnimatePresence to force components that mount
     * at the same time as it to mount as if they have initial={false} set.
     */
    blockInitialAnimation: boolean;
    /**
     * A reference to this VisualElement's projection node, used in layout animations.
     */
    projection?: IProjectionNode;
    /**
     * A map of all motion values attached to this visual element. Motion
     * values are source of truth for any given animated value. A motion
     * value might be provided externally by the component via props.
     */
    values: Map<string, MotionValue<any>>;
    /**
     * The AnimationState, this is hydrated by the animation Feature.
     */
    animationState?: AnimationState;
    KeyframeResolver: typeof KeyframeResolver;
    /**
     * The options used to create this VisualElement. The Options type is defined
     * by the inheriting VisualElement and is passed straight through to the render functions.
     */
    readonly options: Options;
    /**
     * A reference to the latest props provided to the VisualElement's host React component.
     */
    props: MotionProps;
    prevProps?: MotionProps;
    presenceContext: PresenceContextProps | null;
    prevPresenceContext?: PresenceContextProps | null;
    /**
     * Cleanup functions for active features (hover/tap/exit etc)
     */
    private features;
    /**
     * A map of every subscription that binds the provided or generated
     * motion values onChange listeners to this visual element.
     */
    private valueSubscriptions;
    /**
     * A reference to the ReducedMotionConfig passed to the VisualElement's host React component.
     */
    private reducedMotionConfig;
    /**
     * On mount, this will be hydrated with a callback to disconnect
     * this visual element from its parent on unmount.
     */
    private removeFromVariantTree;
    /**
     * A reference to the previously-provided motion values as returned
     * from scrapeMotionValuesFromProps. We use the keys in here to determine
     * if any motion values need to be removed after props are updated.
     */
    private prevMotionValues;
    /**
     * When values are removed from all animation props we need to search
     * for a fallback value to animate to. These values are tracked in baseTarget.
     */
    private baseTarget;
    /**
     * Create an object of the values we initially animated from (if initial prop present).
     */
    private initialValues;
    /**
     * An object containing a SubscriptionManager for each active event.
     */
    private events;
    /**
     * An object containing an unsubscribe function for each prop event subscription.
     * For example, every "Update" event can have multiple subscribers via
     * VisualElement.on(), but only one of those can be defined via the onUpdate prop.
     */
    private propEventSubscriptions;
    private onUpdate?;
    constructor({ parent, props, presenceContext, reducedMotionConfig, blockInitialAnimation, visualState, }: VisualElementOptions<Instance, RenderState>, options?: Options);
    mount(instance: Instance): void;
    unmount(): void;
    private bindToMotionValue;
    sortNodePosition(other: VisualElement<Instance>): number;
    updateFeatures(): void;
    notifyUpdate: () => void;
    triggerBuild(): void;
    render: () => void;
    private renderScheduledAt;
    scheduleRender: () => void;
    /**
     * Measure the current viewport box with or without transforms.
     * Only measures axis-aligned boxes, rotate and skew must be manually
     * removed with a re-render to work.
     */
    measureViewportBox(): Box;
    getStaticValue(key: string): string | number;
    setStaticValue(key: string, value: string | number): void;
    /**
     * Update the provided props. Ensure any newly-added motion values are
     * added to our map, old ones removed, and listeners updated.
     */
    update(props: MotionProps, presenceContext: PresenceContextProps | null): void;
    getProps(): MotionProps;
    /**
     * Returns the variant definition with a given name.
     */
    getVariant(name: string): Variant | undefined;
    /**
     * Returns the defined default transition on this component.
     */
    getDefaultTransition(): Transition | undefined;
    getTransformPagePoint(): any;
    getClosestVariantNode(): VisualElement | undefined;
    /**
     * Add a child visual element to our set of children.
     */
    addVariantChild(child: VisualElement): (() => boolean) | undefined;
    /**
     * Add a motion value and bind it to this visual element.
     */
    addValue(key: string, value: MotionValue): void;
    /**
     * Remove a motion value and unbind any active subscriptions.
     */
    removeValue(key: string): void;
    /**
     * Check whether we have a motion value for this key
     */
    hasValue(key: string): boolean;
    /**
     * Get a motion value for this key. If called with a default
     * value, we'll create one if none exists.
     */
    getValue(key: string): MotionValue | undefined;
    getValue(key: string, defaultValue: string | number | null): MotionValue;
    /**
     * If we're trying to animate to a previously unencountered value,
     * we need to check for it in our state and as a last resort read it
     * directly from the instance (which might have performance implications).
     */
    readValue(key: string, target?: string | number | null): any;
    /**
     * Set the base target to later animate back to. This is currently
     * only hydrated on creation and when we first read a value.
     */
    setBaseTarget(key: string, value: string | number): void;
    /**
     * Find the base target for a value thats been removed from all animation
     * props.
     */
    getBaseTarget(key: string): ResolvedValues[string] | undefined | null;
    on<EventName extends keyof VisualElementEventCallbacks>(eventName: EventName, callback: VisualElementEventCallbacks[EventName]): VoidFunction;
    notify<EventName extends keyof VisualElementEventCallbacks>(eventName: EventName, ...args: any): void;
}

type UnresolvedKeyframes<T extends string | number> = Array<T | null>;
type ResolvedKeyframes<T extends string | number> = Array<T>;
type OnKeyframesResolved<T extends string | number> = (resolvedKeyframes: ResolvedKeyframes<T>, finalKeyframe: T) => void;
declare class KeyframeResolver<T extends string | number = any> {
    name?: string;
    element?: VisualElement<any>;
    finalKeyframe?: T;
    suspendedScrollY?: number;
    protected unresolvedKeyframes: UnresolvedKeyframes<string | number>;
    private motionValue?;
    private onComplete;
    /**
     * Track whether this resolver has completed. Once complete, it never
     * needs to attempt keyframe resolution again.
     */
    private isComplete;
    /**
     * Track whether this resolver is async. If it is, it'll be added to the
     * resolver queue and flushed in the next frame. Resolvers that aren't going
     * to trigger read/write thrashing don't need to be async.
     */
    private isAsync;
    /**
     * Track whether this resolver needs to perform a measurement
     * to resolve its keyframes.
     */
    needsMeasurement: boolean;
    /**
     * Track whether this resolver is currently scheduled to resolve
     * to allow it to be cancelled and resumed externally.
     */
    isScheduled: boolean;
    constructor(unresolvedKeyframes: UnresolvedKeyframes<string | number>, onComplete: OnKeyframesResolved<T>, name?: string, motionValue?: MotionValue<T>, element?: VisualElement<any>, isAsync?: boolean);
    scheduleResolve(): void;
    readKeyframes(): void;
    setFinalKeyframe(): void;
    measureInitialState(): void;
    renderEndStyles(): void;
    measureEndState(): void;
    complete(): void;
    cancel(): void;
    resume(): void;
}

type ResolveKeyframes<V extends string | number> = (keyframes: V[], onComplete: OnKeyframesResolved<V>, name?: string, motionValue?: any) => KeyframeResolver<V>;
interface ValueAnimationOptionsWithRenderContext<V extends string | number = number> extends ValueAnimationOptions<V> {
    KeyframeResolver?: typeof KeyframeResolver;
    motionValue?: MotionValue<V>;
    element?: VisualElement;
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
    start(event: React$1.PointerEvent | PointerEvent, options?: DragControlOptions): void;
}
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
declare function useDragControls(): DragControls;

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
type MotionStyle = MotionCSS & MotionTransform & MakeMotion<SVGPathProperties> & MakeCustomValueType<CustomStyles>;
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
    style?: MotionStyle;
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

declare abstract class Feature<T extends any = any> {
    isMounted: boolean;
    node: VisualElement<T>;
    constructor(node: VisualElement<T>);
    abstract mount(): void;
    abstract unmount(): void;
    update(): void;
}

declare function MeasureLayout(props: MotionProps & {
    visualElement: VisualElement;
}): react_jsx_runtime.JSX.Element;

interface FeatureClass<Props = unknown> {
    new (props: Props): Feature<Props>;
}
type HydratedFeatureDefinition = {
    isEnabled: (props: MotionProps) => boolean;
    Feature: FeatureClass<unknown>;
    ProjectionNode?: any;
    MeasureLayout?: typeof MeasureLayout;
};
interface HydratedFeatureDefinitions {
    animation?: HydratedFeatureDefinition;
    exit?: HydratedFeatureDefinition;
    drag?: HydratedFeatureDefinition;
    tap?: HydratedFeatureDefinition;
    focus?: HydratedFeatureDefinition;
    hover?: HydratedFeatureDefinition;
    pan?: HydratedFeatureDefinition;
    inView?: HydratedFeatureDefinition;
    layout?: HydratedFeatureDefinition;
}
type FeatureDefinition = {
    isEnabled: HydratedFeatureDefinition["isEnabled"];
    Feature?: HydratedFeatureDefinition["Feature"];
    ProjectionNode?: HydratedFeatureDefinition["ProjectionNode"];
    MeasureLayout?: HydratedFeatureDefinition["MeasureLayout"];
};
type FeatureDefinitions = {
    [K in keyof HydratedFeatureDefinitions]: FeatureDefinition;
};
type FeaturePackage = {
    Feature?: HydratedFeatureDefinition["Feature"];
    ProjectionNode?: HydratedFeatureDefinition["ProjectionNode"];
    MeasureLayout?: HydratedFeatureDefinition["MeasureLayout"];
};
type FeaturePackages = {
    [K in keyof HydratedFeatureDefinitions]: FeaturePackage;
};
interface FeatureBundle extends FeaturePackages {
    renderer: CreateVisualElement<any>;
}
type LazyFeatureBundle$1 = () => Promise<FeatureBundle>;
type RenderComponent<Instance, RenderState> = (Component: string | React$1.ComponentType<React$1.PropsWithChildren<unknown>>, props: MotionProps, ref: React$1.Ref<Instance>, visualState: VisualState<Instance, RenderState>, isStatic: boolean, visualElement?: VisualElement<Instance>) => any;

type LazyFeatureBundle = () => Promise<FeatureBundle>;
/**
 * @public
 */
interface LazyProps {
    children?: React.ReactNode;
    /**
     * Can be used to provide a feature bundle synchronously or asynchronously.
     *
     * ```jsx
     * // features.js
     * import { domAnimation } from "framer-motion"
     * export default domAnimation
     *
     * // index.js
     * import { LazyMotion, m } from "framer-motion"
     *
     * const loadFeatures = import("./features.js")
     *   .then(res => res.default)
     *
     * function Component() {
     *   return (
     *     <LazyMotion features={loadFeatures}>
     *       <m.div animate={{ scale: 1.5 }} />
     *     </LazyMotion>
     *   )
     * }
     * ```
     *
     * @public
     */
    features: FeatureBundle | LazyFeatureBundle;
    /**
     * If `true`, will throw an error if a `motion` component renders within
     * a `LazyMotion` component.
     *
     * ```jsx
     * // This component will throw an error that explains using a motion component
     * // instead of the m component will break the benefits of code-splitting.
     * function Component() {
     *   return (
     *     <LazyMotion features={domAnimation} strict>
     *       <motion.div />
     *     </LazyMotion>
     *   )
     * }
     * ```
     *
     * @public
     */
    strict?: boolean;
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
declare function LazyMotion({ children, features, strict }: LazyProps): react_jsx_runtime.JSX.Element;

type IsValidProp = (key: string) => boolean;
declare function filterProps(props: MotionProps, isDom: boolean, forwardMotionProps: boolean): MotionProps;

interface MotionConfigProps extends Partial<MotionConfigContext> {
    children?: React$1.ReactNode;
    isValidProp?: IsValidProp;
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
declare function MotionConfig({ children, isValidProp, ...config }: MotionConfigProps): react_jsx_runtime.JSX.Element;

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

interface TransformOrigin {
    originX?: number | string;
    originY?: number | string;
    originZ?: number | string;
}
interface HTMLRenderState {
    /**
     * A mutable record of transforms we want to apply directly to the rendered Element
     * every frame. We use a mutable data structure to reduce GC during animations.
     */
    transform: ResolvedValues;
    /**
     * A mutable record of transform origins we want to apply directly to the rendered Element
     * every frame. We use a mutable data structure to reduce GC during animations.
     */
    transformOrigin: TransformOrigin;
    /**
     * A mutable record of styles we want to apply directly to the rendered Element
     * every frame. We use a mutable data structure to reduce GC during animations.
     */
    style: ResolvedValues;
    /**
     * A mutable record of CSS variables we want to apply directly to the rendered Element
     * every frame. We use a mutable data structure to reduce GC during animations.
     */
    vars: ResolvedValues;
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

interface Props$1<V> {
    /**
     * A HTML element to render this component as. Defaults to `"ul"`.
     *
     * @public
     */
    as?: keyof HTMLElements;
    /**
     * The axis to reorder along. By default, items will be draggable on this axis.
     * To make draggable on both axes, set `<Reorder.Item drag />`
     *
     * @public
     */
    axis?: "x" | "y";
    /**
     * A callback to fire with the new value order. For instance, if the values
     * are provided as a state from `useState`, this could be the set state function.
     *
     * @public
     */
    onReorder: (newOrder: V[]) => void;
    /**
     * The latest values state.
     *
     * ```jsx
     * function Component() {
     *   const [items, setItems] = useState([0, 1, 2])
     *
     *   return (
     *     <Reorder.Group values={items} onReorder={setItems}>
     *         {items.map((item) => <Reorder.Item key={item} value={item} />)}
     *     </Reorder.Group>
     *   )
     * }
     * ```
     *
     * @public
     */
    values: V[];
}
type ReorderGroupProps<V> = Props$1<V> & Omit<HTMLMotionProps<any>, "values"> & React$1.PropsWithChildren<{}>;
declare function ReorderGroupComponent<V>({ children, as, axis, onReorder, values, ...props }: ReorderGroupProps<V>, externalRef?: React$1.ForwardedRef<any>): react_jsx_runtime.JSX.Element;
declare const ReorderGroup: <V>(props: ReorderGroupProps<V> & {
    ref?: React$1.ForwardedRef<any>;
}) => ReturnType<typeof ReorderGroupComponent>;

interface Props<V> {
    /**
     * A HTML element to render this component as. Defaults to `"li"`.
     *
     * @public
     */
    as?: keyof HTMLElements;
    /**
     * The value in the list that this component represents.
     *
     * @public
     */
    value: V;
    /**
     * A subset of layout options primarily used to disable layout="size"
     *
     * @public
     * @default true
     */
    layout?: true | "position";
}
type ReorderItemProps<V> = Props<V> & HTMLMotionProps<any> & React$1.PropsWithChildren<{}>;
declare function ReorderItemComponent<V>({ children, style, value, as, onDrag, layout, ...props }: ReorderItemProps<V>, externalRef?: React$1.ForwardedRef<any>): react_jsx_runtime.JSX.Element;
declare const ReorderItem: <V>(props: ReorderItemProps<V> & {
    ref?: React$1.ForwardedRef<any>;
}) => ReturnType<typeof ReorderItemComponent>;

declare namespace namespace_d {
  export { ReorderGroup as Group, ReorderItem as Item };
}

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

interface MotionComponentConfig<Instance, RenderState> {
    preloadedFeatures?: FeatureBundle;
    createVisualElement?: CreateVisualElement<Instance>;
    useRender: RenderComponent<Instance, RenderState>;
    useVisualState: UseVisualState<Instance, RenderState>;
    Component: string | React$1.ComponentType<React$1.PropsWithChildren<unknown>>;
}
type MotionComponentProps<Props> = {
    [K in Exclude<keyof Props, keyof MotionProps>]?: Props[K];
} & MotionProps;
/**
 * Create a `motion` component.
 *
 * This function accepts a Component argument, which can be either a string (ie "div"
 * for `motion.div`), or an actual React component.
 *
 * Alongside this is a config option which provides a way of rendering the provided
 * component "offline", or outside the React render cycle.
 */
declare function createRendererMotionComponent<Props extends {}, Instance, RenderState>({ preloadedFeatures, createVisualElement, useRender, useVisualState, Component, }: MotionComponentConfig<Instance, RenderState>): React$1.ForwardRefExoticComponent<React$1.RefAttributes<unknown>>;

declare const m: (<Props, TagName extends string = "div">(Component: string | TagName | React$1.ComponentType<Props>, { forwardMotionProps }?: {
    forwardMotionProps: boolean;
}) => TagName extends "symbol" | "clipPath" | "filter" | "mask" | "marker" | "text" | "animate" | "stop" | "path" | "image" | "circle" | "switch" | "svg" | keyof HTMLElements | "defs" | "desc" | "ellipse" | "feBlend" | "feColorMatrix" | "feComponentTransfer" | "feComposite" | "feConvolveMatrix" | "feDiffuseLighting" | "feDisplacementMap" | "feDistantLight" | "feDropShadow" | "feFlood" | "feFuncA" | "feFuncB" | "feFuncG" | "feFuncR" | "feGaussianBlur" | "feImage" | "feMerge" | "feMergeNode" | "feMorphology" | "feOffset" | "fePointLight" | "feSpecularLighting" | "feSpotLight" | "feTile" | "feTurbulence" | "foreignObject" | "g" | "line" | "linearGradient" | "metadata" | "pattern" | "polygon" | "polyline" | "radialGradient" | "rect" | "textPath" | "tspan" | "use" | "view" ? DOMMotionComponents[TagName] : React$1.ComponentType<MotionComponentProps<React$1.PropsWithChildren<Props>>>) & HTMLMotionComponents & SVGMotionComponents & {
    create: <Props, TagName extends string = "div">(Component: string | TagName | React$1.ComponentType<Props>, { forwardMotionProps }?: {
        forwardMotionProps: boolean;
    }) => TagName extends "symbol" | "clipPath" | "filter" | "mask" | "marker" | "text" | "animate" | "stop" | "path" | "image" | "circle" | "switch" | "svg" | keyof HTMLElements | "defs" | "desc" | "ellipse" | "feBlend" | "feColorMatrix" | "feComponentTransfer" | "feComposite" | "feConvolveMatrix" | "feDiffuseLighting" | "feDisplacementMap" | "feDistantLight" | "feDropShadow" | "feFlood" | "feFuncA" | "feFuncB" | "feFuncG" | "feFuncR" | "feGaussianBlur" | "feImage" | "feMerge" | "feMergeNode" | "feMorphology" | "feOffset" | "fePointLight" | "feSpecularLighting" | "feSpotLight" | "feTile" | "feTurbulence" | "foreignObject" | "g" | "line" | "linearGradient" | "metadata" | "pattern" | "polygon" | "polyline" | "radialGradient" | "rect" | "textPath" | "tspan" | "use" | "view" ? DOMMotionComponents[TagName] : React$1.ComponentType<MotionComponentProps<React$1.PropsWithChildren<Props>>>;
};

declare const motion: (<Props, TagName extends string = "div">(Component: string | TagName | React$1.ComponentType<Props>, { forwardMotionProps }?: {
    forwardMotionProps: boolean;
}) => TagName extends "symbol" | "clipPath" | "filter" | "mask" | "marker" | "text" | "animate" | "stop" | "path" | "image" | "circle" | "switch" | "svg" | keyof HTMLElements | "defs" | "desc" | "ellipse" | "feBlend" | "feColorMatrix" | "feComponentTransfer" | "feComposite" | "feConvolveMatrix" | "feDiffuseLighting" | "feDisplacementMap" | "feDistantLight" | "feDropShadow" | "feFlood" | "feFuncA" | "feFuncB" | "feFuncG" | "feFuncR" | "feGaussianBlur" | "feImage" | "feMerge" | "feMergeNode" | "feMorphology" | "feOffset" | "fePointLight" | "feSpecularLighting" | "feSpotLight" | "feTile" | "feTurbulence" | "foreignObject" | "g" | "line" | "linearGradient" | "metadata" | "pattern" | "polygon" | "polyline" | "radialGradient" | "rect" | "textPath" | "tspan" | "use" | "view" ? DOMMotionComponents[TagName] : React$1.ComponentType<MotionComponentProps<React$1.PropsWithChildren<Props>>>) & HTMLMotionComponents & SVGMotionComponents & {
    create: <Props, TagName extends string = "div">(Component: string | TagName | React$1.ComponentType<Props>, { forwardMotionProps }?: {
        forwardMotionProps: boolean;
    }) => TagName extends "symbol" | "clipPath" | "filter" | "mask" | "marker" | "text" | "animate" | "stop" | "path" | "image" | "circle" | "switch" | "svg" | keyof HTMLElements | "defs" | "desc" | "ellipse" | "feBlend" | "feColorMatrix" | "feComponentTransfer" | "feComposite" | "feConvolveMatrix" | "feDiffuseLighting" | "feDisplacementMap" | "feDistantLight" | "feDropShadow" | "feFlood" | "feFuncA" | "feFuncB" | "feFuncG" | "feFuncR" | "feGaussianBlur" | "feImage" | "feMerge" | "feMergeNode" | "feMorphology" | "feOffset" | "fePointLight" | "feSpecularLighting" | "feSpotLight" | "feTile" | "feTurbulence" | "foreignObject" | "g" | "line" | "linearGradient" | "metadata" | "pattern" | "polygon" | "polyline" | "radialGradient" | "rect" | "textPath" | "tspan" | "use" | "view" ? DOMMotionComponents[TagName] : React$1.ComponentType<MotionComponentProps<React$1.PropsWithChildren<Props>>>;
};

type ObjectTarget<O> = {
    [K in keyof O]?: O[K] | GenericKeyframesTarget<O[K]>;
};
type SequenceTime = number | "<" | `+${number}` | `-${number}` | `${string}`;
type SequenceLabel = string;
interface SequenceLabelWithTime {
    name: SequenceLabel;
    at: SequenceTime;
}
interface At {
    at?: SequenceTime;
}
type MotionValueSegment = [
    MotionValue,
    UnresolvedValueKeyframe | UnresolvedValueKeyframe[]
];
type MotionValueSegmentWithTransition = [
    MotionValue,
    UnresolvedValueKeyframe | UnresolvedValueKeyframe[],
    Transition$1 & At
];
type DOMSegment = [ElementOrSelector, DOMKeyframesDefinition];
type DOMSegmentWithTransition = [
    ElementOrSelector,
    DOMKeyframesDefinition,
    AnimationOptions & At
];
type ObjectSegment<O extends {} = {}> = [O, ObjectTarget<O>];
type ObjectSegmentWithTransition<O extends {} = {}> = [
    O,
    ObjectTarget<O>,
    AnimationOptions & At
];
type Segment = ObjectSegment | ObjectSegmentWithTransition | SequenceLabel | SequenceLabelWithTime | MotionValueSegment | MotionValueSegmentWithTransition | DOMSegment | DOMSegmentWithTransition;
type AnimationSequence = Segment[];
interface SequenceOptions extends AnimationPlaybackOptions {
    delay?: number;
    duration?: number;
    defaultTransition?: Transition$1;
}
interface AbsoluteKeyframe {
    value: string | number | null;
    at: number;
    easing?: Easing;
}
type ValueSequence = AbsoluteKeyframe[];
interface SequenceMap {
    [key: string]: ValueSequence;
}
type ResolvedAnimationDefinition = {
    keyframes: {
        [key: string]: UnresolvedValueKeyframe[];
    };
    transition: {
        [key: string]: Transition$1;
    };
};
type ResolvedAnimationDefinitions = Map<Element | MotionValue, ResolvedAnimationDefinition>;

/**
 * Creates an animation function that is optionally scoped
 * to a specific element.
 */
declare function createScopedAnimate(scope?: AnimationScope): {
    (sequence: AnimationSequence, options?: SequenceOptions): AnimationPlaybackControls;
    (value: string | MotionValue<string>, keyframes: string | GenericKeyframesTarget<string>, options?: ValueAnimationTransition<string>): AnimationPlaybackControls;
    (value: number | MotionValue<number>, keyframes: number | GenericKeyframesTarget<number>, options?: ValueAnimationTransition<number>): AnimationPlaybackControls;
    <V>(value: V | MotionValue<V>, keyframes: V | GenericKeyframesTarget<V>, options?: ValueAnimationTransition<V>): AnimationPlaybackControls;
    (element: ElementOrSelector, keyframes: DOMKeyframesDefinition, options?: AnimationOptions): AnimationPlaybackControls;
    <O extends {}>(object: O | O[], keyframes: ObjectTarget<O>, options?: AnimationOptions): AnimationPlaybackControls;
};
declare const animate: {
    (sequence: AnimationSequence, options?: SequenceOptions): AnimationPlaybackControls;
    (value: string | MotionValue<string>, keyframes: string | GenericKeyframesTarget<string>, options?: ValueAnimationTransition<string>): AnimationPlaybackControls;
    (value: number | MotionValue<number>, keyframes: number | GenericKeyframesTarget<number>, options?: ValueAnimationTransition<number>): AnimationPlaybackControls;
    <V>(value: V | MotionValue<V>, keyframes: V | GenericKeyframesTarget<V>, options?: ValueAnimationTransition<V>): AnimationPlaybackControls;
    (element: ElementOrSelector, keyframes: DOMKeyframesDefinition, options?: AnimationOptions): AnimationPlaybackControls;
    <O extends {}>(object: O | O[], keyframes: ObjectTarget<O>, options?: AnimationOptions): AnimationPlaybackControls;
};

declare const animateMini: (elementOrSelector: ElementOrSelector, keyframes: DOMKeyframesDefinition, options?: AnimationOptions) => AnimationPlaybackControls;

interface ScrollOptions {
    source?: HTMLElement;
    container?: HTMLElement;
    target?: Element;
    axis?: "x" | "y";
    offset?: ScrollOffset;
}
type OnScrollProgress = (progress: number) => void;
type OnScrollWithInfo = (progress: number, info: ScrollInfo) => void;
type OnScroll = OnScrollProgress | OnScrollWithInfo;
interface AxisScrollInfo {
    current: number;
    offset: number[];
    progress: number;
    scrollLength: number;
    velocity: number;
    targetOffset: number;
    targetLength: number;
    containerLength: number;
    interpolatorOffsets?: number[];
    interpolate?: EasingFunction;
}
interface ScrollInfo {
    time: number;
    x: AxisScrollInfo;
    y: AxisScrollInfo;
}
type OnScrollInfo = (info: ScrollInfo) => void;
type SupportedEdgeUnit = "px" | "vw" | "vh" | "%";
type EdgeUnit = `${number}${SupportedEdgeUnit}`;
type NamedEdges = "start" | "end" | "center";
type EdgeString = NamedEdges | EdgeUnit | `${number}`;
type Edge = EdgeString | number;
type ProgressIntersection = [number, number];
type Intersection = `${Edge} ${Edge}`;
type ScrollOffset = Array<Edge | Intersection | ProgressIntersection>;
interface ScrollInfoOptions {
    container?: HTMLElement;
    target?: Element;
    axis?: "x" | "y";
    offset?: ScrollOffset;
}

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
declare function scroll(onScroll: OnScroll | AnimationPlaybackControls, { axis, ...options }?: ScrollOptions): VoidFunction;

declare function scrollInfo(onScroll: OnScrollInfo, { container, ...options }?: ScrollInfoOptions): () => void;

type ViewChangeHandler = (entry: IntersectionObserverEntry) => void;
type MarginValue = `${number}${"px" | "%"}`;
type MarginType = MarginValue | `${MarginValue} ${MarginValue}` | `${MarginValue} ${MarginValue} ${MarginValue}` | `${MarginValue} ${MarginValue} ${MarginValue} ${MarginValue}`;
interface InViewOptions {
    root?: Element | Document;
    margin?: MarginType;
    amount?: "some" | "all" | number;
}
declare function inView(elementOrSelector: ElementOrSelector, onStart: (entry: IntersectionObserverEntry) => void | ViewChangeHandler, { root, margin: rootMargin, amount }?: InViewOptions): VoidFunction;

declare const anticipate: (p: number) => number;

declare const backOut: (t: number) => number;
declare const backIn: motion_dom.EasingFunction;
declare const backInOut: motion_dom.EasingFunction;

declare const circIn: EasingFunction;
declare const circOut: EasingFunction;
declare const circInOut: EasingFunction;

declare function cubicBezier(mX1: number, mY1: number, mX2: number, mY2: number): (t: number) => number;

declare const easeIn: (t: number) => number;
declare const easeOut: (t: number) => number;
declare const easeInOut: (t: number) => number;

declare const mirrorEasing: EasingModifier;

declare const reverseEasing: EasingModifier;

type Direction = "start" | "end";
declare function steps(numSteps: number, direction?: Direction): EasingFunction;

declare function inertia({ keyframes, velocity, power, timeConstant, bounceDamping, bounceStiffness, modifyTarget, min, max, restDelta, restSpeed, }: ValueAnimationOptions<number>): KeyframeGenerator<number>;

declare function keyframes<T extends string | number>({ duration, keyframes: keyframeValues, times, ease, }: ValueAnimationOptions<T>): KeyframeGenerator<T>;

declare function spring(optionsOrVisualDuration?: ValueAnimationOptions<number> | number, bounce?: number): KeyframeGenerator<number>;

type StaggerOrigin = "first" | "last" | "center" | number;
type StaggerOptions = {
    startDelay?: number;
    from?: StaggerOrigin;
    ease?: Easing;
};
declare function stagger(duration?: number, { startDelay, from, ease }?: StaggerOptions): DynamicOption<number>;

type Process = (data: FrameData) => void;
type Schedule = (process: Process, keepAlive?: boolean, immediate?: boolean) => Process;
interface Step {
    schedule: Schedule;
    cancel: (process: Process) => void;
    process: (data: FrameData) => void;
}
type StepId = "read" | "resolveKeyframes" | "update" | "preRender" | "render" | "postRender";
type Batcher = {
    [key in StepId]: Schedule;
};
type Steps = {
    [key in StepId]: Step;
};
interface FrameData {
    delta: number;
    timestamp: number;
    isProcessing: boolean;
}

declare const frame: Batcher;
declare const cancelFrame: (process: Process) => void;
declare const frameData: FrameData;
declare const frameSteps: Steps;

/**
 * An eventloop-synchronous alternative to performance.now().
 *
 * Ensures that time measurements remain consistent within a synchronous context.
 * Usually calling performance.now() twice within the same synchronous context
 * will return different values which isn't useful for animations when we're usually
 * trying to sync animations to the same frame.
 */
declare const time: {
    now: () => number;
    set: (newTime: number) => void;
};

declare const clamp: (min: number, max: number, v: number) => number;

type DelayedFunction = (overshoot: number) => void;
/**
 * Timeout defined in ms
 */
declare function delay(callback: DelayedFunction, timeout: number): () => void;

declare const distance: (a: number, b: number) => number;
declare function distance2D(a: Point, b: Point): number;

type Mix<T> = (v: number) => T;
type MixerFactory<T> = (from: T, to: T) => Mix<T>;
interface InterpolateOptions<T> {
    clamp?: boolean;
    ease?: EasingFunction | EasingFunction[];
    mixer?: MixerFactory<T>;
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
declare function interpolate<T>(input: number[], output: T[], { clamp: isClamp, ease, mixer }?: InterpolateOptions<T>): (v: number) => T;

type Mixer<T> = (p: number) => T;

declare function mix<T>(from: T, to: T): Mixer<T>;
declare function mix(from: number, to: number, p: number): number;

declare const pipe: (...transformers: Function[]) => Function;

/**
 * @public
 */
interface TransformOptions<T> {
    /**
     * Clamp values to within the given range. Defaults to `true`
     *
     * @public
     */
    clamp?: boolean;
    /**
     * Easing functions to use on the interpolations between each value in the input and output ranges.
     *
     * If provided as an array, the array must be one item shorter than the input and output ranges, as the easings apply to the transition **between** each.
     *
     * @public
     */
    ease?: EasingFunction | EasingFunction[];
    /**
     * Provide a function that can interpolate between any two values in the provided range.
     *
     * @public
     */
    mixer?: (from: T, to: T) => (v: number) => any;
}
/**
 * Transforms numbers into other values by mapping them from an input range to an output range.
 * Returns the type of the input provided.
 *
 * @remarks
 *
 * Given an input range of `[0, 200]` and an output range of
 * `[0, 1]`, this function will return a value between `0` and `1`.
 * The input range must be a linear series of numbers. The output range
 * can be any supported value type, such as numbers, colors, shadows, arrays, objects and more.
 * Every value in the output range must be of the same type and in the same format.
 *
 * ```jsx
 * import * as React from "react"
 * import { transform } from "framer-motion"
 *
 * export function MyComponent() {
 *    const inputRange = [0, 200]
 *    const outputRange = [0, 1]
 *    const output = transform(100, inputRange, outputRange)
 *
 *    // Returns 0.5
 *    return <div>{output}</div>
 * }
 * ```
 *
 * @param inputValue - A number to transform between the input and output ranges.
 * @param inputRange - A linear series of numbers (either all increasing or decreasing).
 * @param outputRange - A series of numbers, colors, strings, or arrays/objects of those. Must be the same length as `inputRange`.
 * @param options - Clamp: Clamp values to within the given range. Defaults to `true`.
 *
 * @public
 */
declare function transform<T>(inputValue: number, inputRange: number[], outputRange: T[], options?: TransformOptions<T>): T;
/**
 *
 * Transforms numbers into other values by mapping them from an input range to an output range.
 *
 * Given an input range of `[0, 200]` and an output range of
 * `[0, 1]`, this function will return a value between `0` and `1`.
 * The input range must be a linear series of numbers. The output range
 * can be any supported value type, such as numbers, colors, shadows, arrays, objects and more.
 * Every value in the output range must be of the same type and in the same format.
 *
 * ```jsx
 * import * as React from "react"
 * import { Frame, transform } from "framer"
 *
 * export function MyComponent() {
 *     const inputRange = [-200, -100, 100, 200]
 *     const outputRange = [0, 1, 1, 0]
 *     const convertRange = transform(inputRange, outputRange)
 *     const output = convertRange(-150)
 *
 *     // Returns 0.5
 *     return <div>{output}</div>
 * }
 *
 * ```
 *
 * @param inputRange - A linear series of numbers (either all increasing or decreasing).
 * @param outputRange - A series of numbers, colors or strings. Must be the same length as `inputRange`.
 * @param options - Clamp: clamp values to within the given range. Defaults to `true`.
 *
 * @public
 */
declare function transform<T>(inputRange: number[], outputRange: T[], options?: TransformOptions<T>): (inputValue: number) => T;

declare const wrap: (min: number, max: number, v: number) => number;

/**
 * @deprecated
 *
 * Import as `frame` instead.
 */
declare const sync: Batcher;
/**
 * @deprecated
 *
 * Use cancelFrame(callback) instead.
 */
declare const cancelSync: Record<string, (process: Process) => void>;

declare const animations: FeaturePackages;

interface MotionContextProps<Instance = unknown> {
    visualElement?: VisualElement<Instance>;
    initial?: false | string | string[];
    animate?: string | string[];
}
declare const MotionContext: React$1.Context<MotionContextProps<unknown>>;

declare const createBox: () => Box;

declare function calcLength(axis: Axis): number;

type EventListenerWithPointInfo = (e: PointerEvent, info: EventInfo) => void;
declare const addPointerInfo: (handler: EventListenerWithPointInfo) => EventListener;

declare function addPointerEvent(target: EventTarget, eventName: string, handler: EventListenerWithPointInfo, options?: AddEventListenerOptions): () => void;

declare const isMotionValue: (value: any) => value is MotionValue<any>;

declare const isBrowser: boolean;

declare function useUnmountEffect(callback: () => void): void;

declare const useIsomorphicLayoutEffect: typeof useEffect;

declare function useForceUpdate(): [VoidFunction, number];

/**
 * @public
 */
declare const domAnimation: FeatureBundle;

/**
 * @public
 */
declare const domMax: FeatureBundle;

/**
 * @public
 */
declare const domMin: FeatureBundle;

declare function useMotionValueEvent<V, EventName extends keyof MotionValueEventCallbacks<V>>(value: MotionValue<V>, event: EventName, callback: MotionValueEventCallbacks<V>[EventName]): void;

/**
 * @deprecated useElementScroll is deprecated. Convert to useScroll({ container: ref })
 */
declare function useElementScroll(ref: RefObject$1<HTMLElement | null>): {
    scrollX: MotionValue<number>;
    scrollY: MotionValue<number>;
    scrollXProgress: MotionValue<number>;
    scrollYProgress: MotionValue<number>;
};

/**
 * @deprecated useViewportScroll is deprecated. Convert to useScroll()
 */
declare function useViewportScroll(): {
    scrollX: MotionValue<number>;
    scrollY: MotionValue<number>;
    scrollXProgress: MotionValue<number>;
    scrollYProgress: MotionValue<number>;
};

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
declare function useMotionTemplate(fragments: TemplateStringsArray, ...values: Array<MotionValue | number | string>): MotionValue<string>;

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
declare function useMotionValue<T>(initial: T): MotionValue<T>;

interface UseScrollOptions extends Omit<ScrollInfoOptions, "container" | "target"> {
    container?: RefObject$1<HTMLElement | null>;
    target?: RefObject$1<HTMLElement | null>;
    layoutEffect?: boolean;
}
declare function useScroll({ container, target, layoutEffect, ...options }?: UseScrollOptions): {
    scrollX: MotionValue<number>;
    scrollY: MotionValue<number>;
    scrollXProgress: MotionValue<number>;
    scrollYProgress: MotionValue<number>;
};

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
declare function useSpring(source: MotionValue<string> | MotionValue<number> | number, config?: SpringOptions): MotionValue<number>;

declare function useTime(): MotionValue<number>;

type InputRange = number[];
type SingleTransformer<I, O> = (input: I) => O;
type MultiTransformer<I, O> = (input: I[]) => O;
/**
 * Create a `MotionValue` that transforms the output of another `MotionValue` by mapping it from one range of values into another.
 *
 * @remarks
 *
 * Given an input range of `[-200, -100, 100, 200]` and an output range of
 * `[0, 1, 1, 0]`, the returned `MotionValue` will:
 *
 * - When provided a value between `-200` and `-100`, will return a value between `0` and  `1`.
 * - When provided a value between `-100` and `100`, will return `1`.
 * - When provided a value between `100` and `200`, will return a value between `1` and  `0`
 *
 *
 * The input range must be a linear series of numbers. The output range
 * can be any value type supported by Motion: numbers, colors, shadows, etc.
 *
 * Every value in the output range must be of the same type and in the same format.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const x = useMotionValue(0)
 *   const xRange = [-200, -100, 100, 200]
 *   const opacityRange = [0, 1, 1, 0]
 *   const opacity = useTransform(x, xRange, opacityRange)
 *
 *   return (
 *     <motion.div
 *       animate={{ x: 200 }}
 *       style={{ opacity, x }}
 *     />
 *   )
 * }
 * ```
 *
 * @param inputValue - `MotionValue`
 * @param inputRange - A linear series of numbers (either all increasing or decreasing)
 * @param outputRange - A series of numbers, colors or strings. Must be the same length as `inputRange`.
 * @param options -
 *
 *  - clamp: boolean. Clamp values to within the given range. Defaults to `true`
 *  - ease: EasingFunction[]. Easing functions to use on the interpolations between each value in the input and output ranges. If provided as an array, the array must be one item shorter than the input and output ranges, as the easings apply to the transition between each.
 *
 * @returns `MotionValue`
 *
 * @public
 */
declare function useTransform<I, O>(value: MotionValue<number>, inputRange: InputRange, outputRange: O[], options?: TransformOptions<O>): MotionValue<O>;
/**
 * Create a `MotionValue` that transforms the output of another `MotionValue` through a function.
 * In this example, `y` will always be double `x`.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const x = useMotionValue(10)
 *   const y = useTransform(x, value => value * 2)
 *
 *   return <motion.div style={{ x, y }} />
 * }
 * ```
 *
 * @param input - A `MotionValue` that will pass its latest value through `transform` to update the returned `MotionValue`.
 * @param transform - A function that accepts the latest value from `input` and returns a new value.
 * @returns `MotionValue`
 *
 * @public
 */
declare function useTransform<I, O>(input: MotionValue<I>, transformer: SingleTransformer<I, O>): MotionValue<O>;
/**
 * Pass an array of `MotionValue`s and a function to combine them. In this example, `z` will be the `x` multiplied by `y`.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const x = useMotionValue(0)
 *   const y = useMotionValue(0)
 *   const z = useTransform([x, y], ([latestX, latestY]) => latestX * latestY)
 *
 *   return <motion.div style={{ x, y, z }} />
 * }
 * ```
 *
 * @param input - An array of `MotionValue`s that will pass their latest values through `transform` to update the returned `MotionValue`.
 * @param transform - A function that accepts the latest values from `input` and returns a new value.
 * @returns `MotionValue`
 *
 * @public
 */
declare function useTransform<I, O>(input: MotionValue<string>[] | MotionValue<number>[] | MotionValue<string | number>[], transformer: MultiTransformer<I, O>): MotionValue<O>;
declare function useTransform<I, O>(transformer: () => O): MotionValue<O>;

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
declare function useVelocity(value: MotionValue<number>): MotionValue<number>;

interface WillChange extends MotionValue {
    add(name: string): void;
}

declare function useWillChange(): WillChange;

/**
 * If the provided value is a MotionValue, this returns the actual value, otherwise just the value itself
 *
 * TODO: Remove and move to library
 */
declare function resolveMotionValue(value?: string | number | CustomValueType | MotionValue): string | number;

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
declare function useReducedMotion(): boolean | null;

declare function useReducedMotionConfig(): boolean | null;

interface ValueAnimationOptionsWithDefaults<T extends string | number> extends ValueAnimationOptionsWithRenderContext<T> {
    autoplay: boolean;
    delay: number;
    repeat: number;
    repeatDelay: number;
    repeatType: RepeatType;
}
declare abstract class BaseAnimation<T extends string | number, Resolved> implements AnimationPlaybackControls {
    protected options: ValueAnimationOptionsWithDefaults<T>;
    protected resolveFinishedPromise: VoidFunction;
    protected currentFinishedPromise: Promise<void>;
    protected isStopped: boolean;
    protected _resolved: Resolved & {
        keyframes: ResolvedKeyframes<T>;
    };
    protected hasAttemptedResolve: boolean;
    protected resolver: KeyframeResolver<T>;
    private createdAt;
    private resolvedAt;
    constructor({ autoplay, delay, type, repeat, repeatDelay, repeatType, ...options }: ValueAnimationOptions<T>);
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
    calcStartTime(): number;
    protected abstract initPlayback(keyframes: ResolvedKeyframes<T>, finalKeyframe?: T): Resolved | false;
    abstract play(): void;
    abstract pause(): void;
    abstract stop(): void;
    abstract cancel(): void;
    abstract complete(): void;
    abstract get speed(): number;
    abstract set speed(newSpeed: number);
    abstract get time(): number;
    abstract set time(newTime: number);
    abstract get duration(): number;
    abstract get state(): AnimationPlayState;
    abstract get startTime(): number | null;
    /**
     * A getter for resolved data. If keyframes are not yet resolved, accessing
     * this.resolved will synchronously flush all pending keyframe resolvers.
     * This is a deoptimisation, but at its worst still batches read/writes.
     */
    get resolved(): (Resolved & {
        keyframes: ResolvedKeyframes<T>;
        finalKeyframe?: T;
    }) | undefined;
    /**
     * A method to be called when the keyframes resolver completes. This method
     * will check if its possible to run the animation and, if not, skip it.
     * Otherwise, it will call initPlayback on the implementing class.
     */
    protected onKeyframesResolved(keyframes: ResolvedKeyframes<T>, finalKeyframe?: T): void;
    onPostResolved(): void;
    /**
     * Allows the returned animation to be awaited or promise-chained. Currently
     * resolves when the animation finishes at all but in a future update could/should
     * reject if its cancels.
     */
    then(resolve: VoidFunction, reject?: VoidFunction): Promise<void>;
    flatten(): void;
    protected updateFinishedPromise(): void;
}

interface AcceleratedValueAnimationOptions<T extends string | number = number> extends ValueAnimationOptions<T> {
    name: string;
    motionValue: MotionValue<T>;
}
interface ResolvedAcceleratedAnimation {
    animation: Animation;
    duration: number;
    times: ValueAnimationOptions["times"];
    type: ValueAnimationOptions["type"];
    ease: ValueAnimationOptions["ease"];
    keyframes: string[] | number[];
}
declare class AcceleratedAnimation<T extends string | number> extends BaseAnimation<T, ResolvedAcceleratedAnimation> {
    protected options: ValueAnimationOptionsWithDefaults<T> & {
        name: string;
        motionValue: MotionValue<T>;
    };
    constructor(options: ValueAnimationOptionsWithRenderContext<T>);
    /**
     * An AnimationTimline to attach to the WAAPI animation once it's created.
     */
    private pendingTimeline;
    protected initPlayback(keyframes: ResolvedKeyframes<T>, finalKeyframe: T): false | {
        animation: Animation;
        duration: number;
        times: number[] | undefined;
        type: motion_dom.AnimationGeneratorType | undefined;
        ease: motion_dom.Easing | motion_dom.Easing[] | undefined;
        keyframes: number[] | string[];
    };
    get duration(): number;
    get time(): number;
    set time(newTime: number);
    get speed(): number;
    set speed(newSpeed: number);
    get state(): AnimationPlayState;
    get startTime(): number | null;
    /**
     * Replace the default DocumentTimeline with another AnimationTimeline.
     * Currently used for scroll animations.
     */
    attachTimeline(timeline: any): (any: void) => void;
    play(): void;
    pause(): void;
    stop(): void;
    complete(): void;
    cancel(): void;
    static supports(options: ValueAnimationOptionsWithRenderContext): options is AcceleratedValueAnimationOptions;
}

interface ResolvedData<T extends string | number> {
    generator: KeyframeGenerator<T>;
    mirroredGenerator: KeyframeGenerator<T> | undefined;
    mapPercentToKeyframes: ((v: number) => T) | undefined;
    /**
     * Duration of the animation as calculated by the generator.
     */
    calculatedDuration: number;
    /**
     * Duration of the animation plus repeatDelay.
     */
    resolvedDuration: number;
    /**
     * Total duration of the animation including repeats.
     */
    totalDuration: number;
}
/**
 * Animation that runs on the main thread. Designed to be WAAPI-spec in the subset of
 * features we expose publically. Mostly the compatibility is to ensure visual identity
 * between both WAAPI and main thread animations.
 */
declare class MainThreadAnimation<T extends string | number> extends BaseAnimation<T, ResolvedData<T>> {
    /**
     * The driver that's controlling the animation loop. Normally this is a requestAnimationFrame loop
     * but in tests we can pass in a synchronous loop.
     */
    private driver?;
    /**
     * The time at which the animation was paused.
     */
    private holdTime;
    /**
     * The time at which the animation was cancelled.
     */
    private cancelTime;
    /**
     * The current time of the animation.
     */
    private currentTime;
    /**
     * Playback speed as a factor. 0 would be stopped, -1 reverse and 2 double speed.
     */
    private playbackSpeed;
    /**
     * The state of the animation to apply when the animation is resolved. This
     * allows calls to the public API to control the animation before it is resolved,
     * without us having to resolve it first.
     */
    private pendingPlayState;
    /**
     * The time at which the animation was started.
     */
    startTime: number | null;
    constructor(options: ValueAnimationOptions<T>);
    flatten(): void;
    protected initPlayback(keyframes: ResolvedKeyframes<T>): {
        generator: KeyframeGenerator<any>;
        mirroredGenerator: KeyframeGenerator<T> | undefined;
        mapPercentToKeyframes: ((v: number) => T) | undefined;
        calculatedDuration: number;
        resolvedDuration: number;
        totalDuration: number;
    };
    onPostResolved(): void;
    tick(timestamp: number, sample?: boolean): {
        done: boolean;
        value: T;
    };
    state: AnimationPlayState;
    get duration(): number;
    get time(): number;
    set time(newTime: number);
    get speed(): number;
    set speed(newSpeed: number);
    play(): void;
    pause(): void;
    /**
     * This method is bound to the instance to fix a pattern where
     * animation.stop is returned as a reference from a useEffect.
     */
    stop: () => void;
    complete(): void;
    finish(): void;
    cancel(): void;
    private teardown;
    private stopDriver;
    sample(time: number): AnimationState$1<T>;
}
declare function animateValue(options: ValueAnimationOptionsWithRenderContext<any>): MainThreadAnimation<any>;

/**
 * @public
 */
declare function animationControls(): AnimationControls;

declare function useAnimate<T extends Element = any>(): [AnimationScope<T>, {
    (sequence: AnimationSequence, options?: SequenceOptions | undefined): motion_dom.AnimationPlaybackControls;
    (value: string | MotionValue<string>, keyframes: string | GenericKeyframesTarget<string>, options?: motion_dom.ValueAnimationTransition<string> | undefined): motion_dom.AnimationPlaybackControls;
    (value: number | MotionValue<number>, keyframes: number | GenericKeyframesTarget<number>, options?: motion_dom.ValueAnimationTransition<number> | undefined): motion_dom.AnimationPlaybackControls;
    <V>(value: V | MotionValue<V>, keyframes: V | GenericKeyframesTarget<V>, options?: motion_dom.ValueAnimationTransition<V> | undefined): motion_dom.AnimationPlaybackControls;
    (element: motion_dom.ElementOrSelector, keyframes: motion_dom.DOMKeyframesDefinition, options?: motion_dom.AnimationOptions | undefined): motion_dom.AnimationPlaybackControls;
    <O extends {}>(object: O | O[], keyframes: ObjectTarget<O>, options?: motion_dom.AnimationOptions | undefined): motion_dom.AnimationPlaybackControls;
}];

declare function useAnimateMini<T extends Element = any>(): [AnimationScope<T>, (elementOrSelector: motion_dom.ElementOrSelector, keyframes: motion_dom.DOMKeyframesDefinition, options?: motion_dom.AnimationOptions | undefined) => motion_dom.AnimationPlaybackControls];

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
declare function useAnimationControls(): AnimationControls;
declare const useAnimation: typeof useAnimationControls;

declare function animateVisualElement(visualElement: VisualElement, definition: AnimationDefinition, options?: VisualElementAnimationOptions): Promise<void>;

type SafeToRemove = () => void;
type AlwaysPresent = [true, null];
type Present = [true];
type NotPresent = [false, SafeToRemove];
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
declare function usePresence(subscribe?: boolean): AlwaysPresent | Present | NotPresent;
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
declare function useIsPresent(): boolean;

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
declare function useDomEvent(ref: RefObject$1<EventTarget | null>, eventName: string, handler?: EventListener | undefined, options?: AddEventListenerOptions): void;

/**
 * Checks if a component is a `motion` component.
 */
declare function isMotionComponent(component: React.ComponentType | string): boolean;

/**
 * Unwraps a `motion` component and returns either a string for `motion.div` or
 * the React component for `motion(Component)`.
 *
 * If the component is not a `motion` component it returns undefined.
 */
declare function unwrapMotionComponent(component: React.ComponentType | string): React.ComponentType | string | undefined;

/**
 * Check whether a prop name is a valid `MotionProp` key.
 *
 * @param key - Name of the property to check
 * @returns `true` is key is a valid `MotionProp`.
 *
 * @public
 */
declare function isValidMotionProp(key: string): boolean;

type ScaleCorrector = (latest: string | number, node: IProjectionNode) => string | number;
interface ScaleCorrectorDefinition {
    correct: ScaleCorrector;
    applyTo?: string[];
}
interface ScaleCorrectorMap {
    [key: string]: ScaleCorrectorDefinition;
}

declare function addScaleCorrector(correctors: ScaleCorrectorMap): void;

declare function useInstantLayoutTransition(): (cb?: (() => void) | undefined) => void;

declare function useResetProjection(): () => void;

/**
 * Build a CSS transform style from individual x/y/scale etc properties.
 *
 * This outputs with a default order of transforms/scales/rotations, this can be customised by
 * providing a transformTemplate function.
 */
declare function buildTransform(latestValues: ResolvedValues, transform: HTMLRenderState["transform"], transformTemplate?: MotionProps["transformTemplate"]): string;

declare const visualElementStore: WeakMap<any, VisualElement<unknown, unknown, {}>>;

declare const MotionGlobalConfig: {
    skipAnimations: boolean;
    useManualTiming: boolean;
};

type FrameCallback = (timestamp: number, delta: number) => void;
declare function useAnimationFrame(callback: FrameCallback): void;

type Cycle = (i?: number) => void;
type CycleState<T> = [T, Cycle];
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
declare function useCycle<T>(...items: T[]): CycleState<T>;

interface UseInViewOptions extends Omit<InViewOptions, "root" | "amount"> {
    root?: RefObject$1<Element | null>;
    once?: boolean;
    amount?: "some" | "all" | number;
}
declare function useInView(ref: RefObject$1<Element | null>, { root, margin, amount, once }?: UseInViewOptions): boolean;

declare function useInstantTransition(): (callback: () => void) => void;
declare function disableInstantTransitions(): void;

type Transformer = (v: any) => any;
type ValueType = {
    test: (v: any) => boolean;
    parse: (v: any) => any;
    transform?: Transformer;
    createTransformer?: (template: string) => Transformer;
    default?: any;
    getAnimatableNone?: (v: any) => any;
};
type RGBA = {
    red: number;
    green: number;
    blue: number;
    alpha: number;
};
type HSLA = {
    hue: number;
    saturation: number;
    lightness: number;
    alpha: number;
};
type Color = HSLA | RGBA;

declare const color: {
    test: (v: any) => boolean;
    parse: (v: any) => RGBA | HSLA;
    transform: (v: HSLA | RGBA | string) => string;
};

type CSSVariableName = `--${string}`;
type CSSVariableToken = `var(${CSSVariableName})`;

declare function test(v: any): boolean;
type ComplexValues = Array<CSSVariableToken | string | number | Color>;
declare function parseComplexValue(v: string | number): ComplexValues;
declare function createTransformer(source: string | number): (v: Array<CSSVariableToken | Color | number | string>) => string;
declare function getAnimatableNone(v: string | number): string;
declare const complex: {
    test: typeof test;
    parse: typeof parseComplexValue;
    createTransformer: typeof createTransformer;
    getAnimatableNone: typeof getAnimatableNone;
};

declare const px: {
    test: (v: string | number) => boolean;
    parse: typeof parseFloat;
    transform: (v: number | string) => string;
};

declare function findSpring({ duration, bounce, velocity, mass, }: SpringOptions): {
    stiffness: number;
    damping: number;
    duration: number;
};

declare const optimizedAppearDataAttribute: "data-framer-appear-id";

interface NativeAnimationOptions {
    delay?: number;
    duration?: number;
    ease?: EasingFunction | Easing | Easing[];
    times?: number[];
    repeat?: number;
    repeatType?: "loop" | "reverse" | "mirror";
}

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

declare function startOptimizedAppearAnimation(element: HTMLElement, name: string, keyframes: string[] | number[], options: NativeAnimationOptions, onReady?: (animation: Animation) => void): void;

interface NodeGroup {
    add: (node: IProjectionNode) => void;
    remove: (node: IProjectionNode) => void;
    dirty: VoidFunction;
}

interface LayoutGroupContextProps {
    id?: string;
    group?: NodeGroup;
    forceRender?: VoidFunction;
}
declare const LayoutGroupContext: React$1.Context<LayoutGroupContextProps>;

type DOMMotionComponents = HTMLMotionComponents & SVGMotionComponents;

/**
 * @public
 */
interface ScrollMotionValues {
    scrollX: MotionValue<number>;
    scrollY: MotionValue<number>;
    scrollXProgress: MotionValue<number>;
    scrollYProgress: MotionValue<number>;
}

/**
 * This is not an officially supported API and may be removed
 * on any version.
 */
declare function useAnimatedState(initialState: any): any[];

declare const AnimateSharedLayout: React$1.FunctionComponent<React$1.PropsWithChildren<unknown>>;

/**
 * Note: Still used by components generated by old versions of Framer
 *
 * @deprecated
 */
declare const DeprecatedLayoutGroupContext: React$1.Context<string | null>;

interface ScaleMotionValues {
    scaleX: MotionValue<number>;
    scaleY: MotionValue<number>;
}
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
declare function useInvertedScale(scale?: Partial<ScaleMotionValues>): ScaleMotionValues;

export { type AbsoluteKeyframe, AcceleratedAnimation, AnimatePresence, type AnimatePresenceProps, AnimateSharedLayout, type AnimationControls, type AnimationDefinition, type AnimationLifecycles, type AnimationProps, type AnimationSequence, type AnimationType, type At, type Axis, type AxisDelta, type BoundingBox, type Box, type CreateVisualElement, type CustomValueType, type Cycle, type CycleState, type DOMMotionComponents, type DOMSegment, type DOMSegmentWithTransition, type DelayedFunction, type Delta, DeprecatedLayoutGroupContext, type Direction, DragControls, type DragElastic, type DragHandlers, type DraggableProps, type EventInfo, type FeatureBundle, type FeatureDefinition, type FeatureDefinitions, type FeaturePackage, type FeaturePackages, FlatTree, type FocusHandlers, type ForwardRefComponent, type HTMLMotionProps, type HoverHandlers, type HydratedFeatureDefinition, type HydratedFeatureDefinitions, type IProjectionNode, type Inertia, type InterpolateOptions, type Keyframes, type KeyframesTarget, LayoutGroup, LayoutGroupContext, type LayoutProps, type LazyFeatureBundle$1 as LazyFeatureBundle, LazyMotion, type LazyProps, type MixerFactory, type MotionAdvancedProps, MotionConfig, MotionConfigContext, type MotionConfigProps, MotionContext, MotionGlobalConfig, type MotionProps, type MotionStyle, type MotionTransform, MotionValue, type MotionValueSegment, type MotionValueSegmentWithTransition, type None, type ObjectSegment, type ObjectSegmentWithTransition, type ObjectTarget, type Orchestration, type PanHandlers, type PanInfo, type PassiveEffect, type Point, PresenceContext, type RenderComponent, namespace_d as Reorder, type Repeat, type ResolveKeyframes, type ResolvedAnimationDefinition, type ResolvedAnimationDefinitions, type ResolvedKeyframesTarget, type ResolvedSingleTarget, type ResolvedValueTarget, type ResolvedValues, type SVGAttributesAsMotionValues, type SVGMotionProps, type ScrapeMotionValuesFromProps, type ScrollMotionValues, type Segment, type SequenceLabel, type SequenceLabelWithTime, type SequenceMap, type SequenceOptions, type SequenceTime, type SingleTarget, type Spring, type Subscriber, SwitchLayoutGroupContext, type TapHandlers, type TapInfo, type Target, type TargetAndTransition, type TransformPoint, type Transition, type Tween, type UseInViewOptions, type UseScrollOptions, type ValueAnimationOptionsWithRenderContext, type ValueSequence, type ValueTarget, type ValueType, type Variant, type VariantLabels, type Variants, VisualElement, type VisualState, addPointerEvent, addPointerInfo, addScaleCorrector, animate, animateMini, animateValue, animateVisualElement, animationControls, animations, anticipate, backIn, backInOut, backOut, buildTransform, calcLength, cancelFrame, cancelSync, circIn, circInOut, circOut, clamp, color, complex, createBox, createRendererMotionComponent, createScopedAnimate, cubicBezier, delay, disableInstantTransitions, distance, distance2D, domAnimation, domMax, domMin, easeIn, easeInOut, easeOut, filterProps, findSpring, frame, frameData, frameSteps, inView, inertia, interpolate, isBrowser, isMotionComponent, isMotionValue, isValidMotionProp, keyframes, m, makeUseVisualState, mirrorEasing, mix, motion, motionValue, optimizedAppearDataAttribute, pipe, px, resolveMotionValue, reverseEasing, scroll, scrollInfo, spring, stagger, startOptimizedAppearAnimation, steps, sync, time, transform, unwrapMotionComponent, useAnimate, useAnimateMini, useAnimation, useAnimationControls, useAnimationFrame, useCycle, useAnimatedState as useDeprecatedAnimatedState, useInvertedScale as useDeprecatedInvertedScale, useDomEvent, useDragControls, useElementScroll, useForceUpdate, useInView, useInstantLayoutTransition, useInstantTransition, useIsPresent, useIsomorphicLayoutEffect, useMotionTemplate, useMotionValue, useMotionValueEvent, usePresence, useReducedMotion, useReducedMotionConfig, useResetProjection, useScroll, useSpring, useTime, useTransform, useUnmountEffect, useVelocity, useViewportScroll, useWillChange, visualElementStore, wrap };
