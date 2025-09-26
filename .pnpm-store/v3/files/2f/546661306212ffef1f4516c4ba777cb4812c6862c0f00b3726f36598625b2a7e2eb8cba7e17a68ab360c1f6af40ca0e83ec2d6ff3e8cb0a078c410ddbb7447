/* IMPORT */
import _ from '../utils/index.js';
import ChannelsReusable from '../channels/reusable.js';
import Color from '../color/index.js';
import change from './change.js';
/* MAIN */
const rgba = (r, g, b = 0, a = 1) => {
    if (typeof r !== 'number')
        return change(r, { a: g });
    const channels = ChannelsReusable.set({
        r: _.channel.clamp.r(r),
        g: _.channel.clamp.g(g),
        b: _.channel.clamp.b(b),
        a: _.channel.clamp.a(a)
    });
    return Color.stringify(channels);
};
/* EXPORT */
export default rgba;
