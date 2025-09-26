/* IMPORT */
import luminance from './luminance.js';
/* MAIN */
const isLight = (color) => {
    return luminance(color) >= .5;
};
/* EXPORT */
export default isLight;
