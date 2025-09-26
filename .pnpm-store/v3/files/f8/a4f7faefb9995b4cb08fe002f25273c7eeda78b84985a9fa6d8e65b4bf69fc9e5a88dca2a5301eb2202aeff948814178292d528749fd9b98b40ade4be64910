/* IMPORT */
import Color from '../color/index.js';
import rgba from './rgba.js';
/* MAIN */
//SOURCE: https://github.com/sass/dart-sass/blob/7457d2e9e7e623d9844ffd037a070cf32d39c348/lib/src/functions/color.dart#L718-L756
const mix = (color1, color2, weight = 50) => {
    const { r: r1, g: g1, b: b1, a: a1 } = Color.parse(color1);
    const { r: r2, g: g2, b: b2, a: a2 } = Color.parse(color2);
    const weightScale = weight / 100;
    const weightNormalized = (weightScale * 2) - 1;
    const alphaDelta = a1 - a2;
    const weight1combined = ((weightNormalized * alphaDelta) === -1) ? weightNormalized : (weightNormalized + alphaDelta) / (1 + weightNormalized * alphaDelta);
    const weight1 = (weight1combined + 1) / 2;
    const weight2 = 1 - weight1;
    const r = (r1 * weight1) + (r2 * weight2);
    const g = (g1 * weight1) + (g2 * weight2);
    const b = (b1 * weight1) + (b2 * weight2);
    const a = (a1 * weightScale) + (a2 * (1 - weightScale));
    return rgba(r, g, b, a);
};
/* EXPORT */
export default mix;
