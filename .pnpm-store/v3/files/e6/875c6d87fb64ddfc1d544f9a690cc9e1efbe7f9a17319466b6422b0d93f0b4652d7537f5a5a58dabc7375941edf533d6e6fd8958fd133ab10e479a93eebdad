import type { RGB, HSL } from '../types';
declare const Channel: {
    min: {
        r: number;
        g: number;
        b: number;
        s: number;
        l: number;
        a: number;
    };
    max: {
        r: number;
        g: number;
        b: number;
        h: number;
        s: number;
        l: number;
        a: number;
    };
    clamp: {
        r: (r: number) => number;
        g: (g: number) => number;
        b: (b: number) => number;
        h: (h: number) => number;
        s: (s: number) => number;
        l: (l: number) => number;
        a: (a: number) => number;
    };
    toLinear: (c: number) => number;
    hue2rgb: (p: number, q: number, t: number) => number;
    hsl2rgb: ({ h, s, l }: HSL, channel: keyof RGB) => number;
    rgb2hsl: ({ r, g, b }: RGB, channel: keyof HSL) => number;
};
export default Channel;
