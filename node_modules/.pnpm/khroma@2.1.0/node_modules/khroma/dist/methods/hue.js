/* IMPORT */
import channel from './channel.js';
/* MAIN */
const hue = (color) => {
    return channel(color, 'h');
};
/* EXPORT */
export default hue;
