import Type from './type';
import type { RGBA, HSLA, CHANNELS } from '../types';
declare class Channels {
    color?: string;
    changed: boolean;
    data: CHANNELS;
    type: Type;
    constructor(data: RGBA | HSLA | CHANNELS, color?: string);
    set(data: RGBA | HSLA | CHANNELS, color?: string): this;
    _ensureHSL(): void;
    _ensureRGB(): void;
    get r(): number;
    get g(): number;
    get b(): number;
    get h(): number;
    get s(): number;
    get l(): number;
    get a(): number;
    set r(r: number);
    set g(g: number);
    set b(b: number);
    set h(h: number);
    set s(s: number);
    set l(l: number);
    set a(a: number);
}
export default Channels;
