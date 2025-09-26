import { mirrorEasing } from './modifiers/mirror.mjs';
import { reverseEasing } from './modifiers/reverse.mjs';

const circIn = (p) => 1 - Math.sin(Math.acos(p));
const circOut = reverseEasing(circIn);
const circInOut = mirrorEasing(circIn);

export { circIn, circInOut, circOut };
