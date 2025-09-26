"use strict";
/* tslint:disable no-string-throw */
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
        key = indexOfSlash > -1 ? pointer.substring(indexAfterSlash, indexOfSlash) : pointer.substring(indexAfterSlash);
        indexAfterSlash = indexOfSlash + 1;
        obj = val;
        if (isArray(obj)) {
            const length = obj.length;
            if (key === '-')
                key = length;
            else {
                const key2 = ~~key;
                if ('' + key2 !== key)
                    throw new Error('INVALID_INDEX');
                key = key2;
                if (key < 0)
                    throw 'INVALID_INDEX';
            }
            val = obj[key];
        }
        else if (typeof obj === 'object' && !!obj) {
            key = (0, util_1.unescapeComponent)(key);
            val = (0, hasOwnProperty_1.hasOwnProperty)(obj, key) ? obj[key] : undefined;
        }
        else
            throw 'NOT_FOUND';
    }
    return { val, obj, key };
};
exports.findByPointer = findByPointer;
