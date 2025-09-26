/* IMPORT */
import _ from '../utils/index.js';
import Color from '../color/index.js';
/* MAIN */
const channel = (color, channel) => {
    return _.lang.round(Color.parse(color)[channel]);
};
/* EXPORT */
export default channel;
