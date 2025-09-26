/* IMPORT */
import _ from '../utils/index.js';
import luminance from './luminance.js';
/* MAIN */
const contrast = (color1, color2) => {
    const luminance1 = luminance(color1);
    const luminance2 = luminance(color2);
    const max = Math.max(luminance1, luminance2);
    const min = Math.min(luminance1, luminance2);
    const ratio = (max + Number.EPSILON) / (min + Number.EPSILON);
    return _.lang.round(_.lang.clamp(ratio, 1, 10));
};
/* EXPORT */
export default contrast;
