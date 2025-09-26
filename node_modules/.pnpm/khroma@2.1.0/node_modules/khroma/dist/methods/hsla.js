/* IMPORT */
import _ from '../utils/index.js';
import ChannelsReusable from '../channels/reusable.js';
import Color from '../color/index.js';
/* MAIN */
const hsla = (h, s, l, a = 1) => {
    const channels = ChannelsReusable.set({
        h: _.channel.clamp.h(h),
        s: _.channel.clamp.s(s),
        l: _.channel.clamp.l(l),
        a: _.channel.clamp.a(a)
    });
    return Color.stringify(channels);
};
/* EXPORT */
export default hsla;
