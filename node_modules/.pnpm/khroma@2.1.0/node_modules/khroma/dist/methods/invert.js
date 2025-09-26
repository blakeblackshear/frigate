/* IMPORT */
import Color from '../color/index.js';
import mix from './mix.js';
/* MAIN */
const invert = (color, weight = 100) => {
    const inverse = Color.parse(color);
    inverse.r = 255 - inverse.r;
    inverse.g = 255 - inverse.g;
    inverse.b = 255 - inverse.b;
    return mix(inverse, color, weight);
};
/* EXPORT */
export default invert;
