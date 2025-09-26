/* IMPORT */
import _ from '../utils/index.js';
import Color from '../color/index.js';
import adjust from './adjust.js';
/* MAIN */
const scale = (color, channels) => {
    const ch = Color.parse(color);
    const adjustments = {};
    const delta = (amount, weight, max) => weight > 0 ? (max - amount) * weight / 100 : amount * weight / 100;
    for (const c in channels) {
        adjustments[c] = delta(ch[c], channels[c], _.channel.max[c]);
    }
    return adjust(color, adjustments);
};
/* EXPORT */
export default scale;
