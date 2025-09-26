/* IMPORT */
import _ from './utils/index.js';
/* MAIN */
const DEC2HEX = {};
for (let i = 0; i <= 255; i++)
    DEC2HEX[i] = _.unit.dec2hex(i); // Populating dynamically, striking a balance between code size and performance
const TYPE = {
    ALL: 0,
    RGB: 1,
    HSL: 2
};
/* EXPORT */
export { DEC2HEX, TYPE };
