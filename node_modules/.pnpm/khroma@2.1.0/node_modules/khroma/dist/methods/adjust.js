/* IMPORT */
import Color from '../color/index.js';
import change from './change.js';
/* MAIN */
const adjust = (color, channels) => {
    const ch = Color.parse(color);
    const changes = {};
    for (const c in channels) {
        if (!channels[c])
            continue;
        changes[c] = ch[c] + channels[c];
    }
    return change(color, changes);
};
/* EXPORT */
export default adjust;
