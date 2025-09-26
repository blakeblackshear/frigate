/* IMPORT */
import alpha from './alpha.js';
/* MAIN */
const isTransparent = (color) => {
    return !alpha(color);
};
/* EXPORT */
export default isTransparent;
