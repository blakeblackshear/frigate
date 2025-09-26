/* IMPORT */
import adjustChannel from './adjust_channel.js';
/* MAIN */
const saturate = (color, amount) => {
    return adjustChannel(color, 's', amount);
};
/* EXPORT */
export default saturate;
