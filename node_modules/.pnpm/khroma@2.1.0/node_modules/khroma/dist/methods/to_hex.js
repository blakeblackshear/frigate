/* IMPORT */
import Color from '../color/index.js';
/* MAIN */
const toHex = (color) => {
    return Color.format.hex.stringify(Color.parse(color));
};
/* EXPORT */
export default toHex;
