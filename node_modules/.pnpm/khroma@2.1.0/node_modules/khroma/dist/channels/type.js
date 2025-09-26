/* IMPORT */
import { TYPE } from '../constants.js';
/* MAIN */
class Type {
    constructor() {
        /* VARIABLES */
        this.type = TYPE.ALL;
    }
    /* API */
    get() {
        return this.type;
    }
    set(type) {
        if (this.type && this.type !== type)
            throw new Error('Cannot change both RGB and HSL channels at the same time');
        this.type = type;
    }
    reset() {
        this.type = TYPE.ALL;
    }
    is(type) {
        return this.type === type;
    }
}
/* EXPORT */
export default Type;
