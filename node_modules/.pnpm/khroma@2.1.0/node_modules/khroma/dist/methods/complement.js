/* IMPORT */
import adjustChannel from './adjust_channel.js';
/* MAIN */
const complement = (color) => {
    return adjustChannel(color, 'h', 180);
};
/* EXPORT */
export default complement;
