"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByPointer = void 0;
const hasOwnProperty_1 = require("@jsonjoy.com/util/lib/hasOwnProperty");
const util_1 = require("../util");
const { isArray } = Array;
const findByPointer = (pointer, val) => {
    if (!pointer)
        return { val };
    let obj;
    let key;
    let indexOfSlash = 0;
    let indexAfterSlash = 1;
    while (indexOfSlash > -1) {
        indexOfSlash = pointer.indexOf('/', indexAfterSlash);
        const component = indexOfSlash > -1 ? pointer.substring(indexAfterSlash, indexOfSlash) : pointer.substring(indexAfterSlash);
        indexAfterSlash = indexOfSlash + 1;
        key = (0, util_1.unescapeComponent)(component);
        obj = val;
        if (isArray(obj)) {
            if (key === '-')
                key = obj.length;
            else {
                // if (!isValidIndex(key)) throw new Error('INVALID_INDEX');
                key = ~~key;
                if (key < 0)
                    throw new Error('INVALID_INDEX');
            }
            val = (0, hasOwnProperty_1.hasOwnProperty)(obj, key) ? obj[~~key] : undefined;
        }
        else if (typeof obj === 'object' && !!obj) {
            val = (0, hasOwnProperty_1.hasOwnProperty)(obj, key) ? obj[key] : undefined;
        }
        else
            throw new Error('NOT_FOUND');
    }
    return { val, obj, key };
};
exports.findByPointer = findByPointer;
