/* IMPORT */
import channel from './channel.js';
/* MAIN */
const alpha = (color) => {
    return channel(color, 'a');
};
/* EXPORT */
export default alpha;
