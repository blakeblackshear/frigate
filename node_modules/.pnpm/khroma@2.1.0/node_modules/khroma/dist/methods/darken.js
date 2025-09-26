/* IMPORT */
import adjustChannel from './adjust_channel.js';
/* MAIN */
const darken = (color, amount) => {
    return adjustChannel(color, 'l', -amount);
};
/* EXPORT */
export default darken;
