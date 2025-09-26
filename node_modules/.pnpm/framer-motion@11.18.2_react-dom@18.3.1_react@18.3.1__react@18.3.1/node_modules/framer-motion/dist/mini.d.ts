import * as motion_dom from 'motion-dom';
import { AnimationScope } from 'motion-dom';

declare function useAnimateMini<T extends Element = any>(): [AnimationScope<T>, (elementOrSelector: motion_dom.ElementOrSelector, keyframes: motion_dom.DOMKeyframesDefinition, options?: motion_dom.AnimationOptions | undefined) => motion_dom.AnimationPlaybackControls];

export { useAnimateMini as useAnimate };
