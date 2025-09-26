/* IMPORT */
import _ from '../utils/index.js';
import Color from '../color/index.js';
/* MAIN */
const adjustChannel = (color, channel, amount) => {
    const channels = Color.parse(color);
    const amountCurrent = channels[channel];
    const amountNext = _.channel.clamp[channel](amountCurrent + amount);
    if (amountCurrent !== amountNext)
        channels[channel] = amountNext;
    return Color.stringify(channels);
};
/* EXPORT */
export default adjustChannel;
