/* IMPORT */
import _ from '../utils/index.js';
import Color from '../color/index.js';
/* MAIN */
const change = (color, channels) => {
    const ch = Color.parse(color);
    for (const c in channels) {
        ch[c] = _.channel.clamp[c](channels[c]);
    }
    return Color.stringify(ch);
};
/* EXPORT */
export default change;
