/* IMPORT */
import adjustChannel from './adjust_channel.js';
/* MAIN */
const lighten = (color, amount) => {
    return adjustChannel(color, 'l', amount);
};
/* EXPORT */
export default lighten;
