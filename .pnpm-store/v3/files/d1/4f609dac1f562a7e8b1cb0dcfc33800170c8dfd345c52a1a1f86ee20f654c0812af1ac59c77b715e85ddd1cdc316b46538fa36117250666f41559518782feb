/* IMPORT */
import _ from '../utils/index.js';
import ChannelsReusable from '../channels/reusable.js';
/* MAIN */
const RGB = {
    /* VARIABLES */
    re: /^rgba?\(\s*?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e\d+)?(%?))\s*?(?:,|\s)\s*?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e\d+)?(%?))\s*?(?:,|\s)\s*?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e\d+)?(%?))(?:\s*?(?:,|\/)\s*?\+?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e\d+)?(%?)))?\s*?\)$/i,
    /* API */
    parse: (color) => {
        const charCode = color.charCodeAt(0);
        if (charCode !== 114 && charCode !== 82)
            return; // 'r'/'R'
        const match = color.match(RGB.re);
        if (!match)
            return;
        const [, r, isRedPercentage, g, isGreenPercentage, b, isBluePercentage, a, isAlphaPercentage] = match;
        return ChannelsReusable.set({
            r: _.channel.clamp.r(isRedPercentage ? parseFloat(r) * 2.55 : parseFloat(r)),
            g: _.channel.clamp.g(isGreenPercentage ? parseFloat(g) * 2.55 : parseFloat(g)),
            b: _.channel.clamp.b(isBluePercentage ? parseFloat(b) * 2.55 : parseFloat(b)),
            a: a ? _.channel.clamp.a(isAlphaPercentage ? parseFloat(a) / 100 : parseFloat(a)) : 1
        }, color);
    },
    stringify: (channels) => {
        const { r, g, b, a } = channels;
        if (a < 1) { // RGBA
            return `rgba(${_.lang.round(r)}, ${_.lang.round(g)}, ${_.lang.round(b)}, ${_.lang.round(a)})`;
        }
        else { // RGB
            return `rgb(${_.lang.round(r)}, ${_.lang.round(g)}, ${_.lang.round(b)})`;
        }
    }
};
/* EXPORT */
export default RGB;
