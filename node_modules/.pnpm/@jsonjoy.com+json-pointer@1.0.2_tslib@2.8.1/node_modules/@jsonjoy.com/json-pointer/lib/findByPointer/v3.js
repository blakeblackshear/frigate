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
    pointer = pointer.substr(1);
    while (pointer) {
        indexOfSlash = pointer.indexOf('/');
        let component;
        if (indexOfSlash > -1) {
            component = pointer.substring(0, indexOfSlash);
            pointer = pointer.substring(indexOfSlash + 1);
        }
        else {
            component = pointer;
            pointer = '';
        }
        key = (0, util_1.unescapeComponent)(component);
        obj = val;
        if (isArray(obj)) {
            if (key === '-')
                key = obj.length;
            else {
                if (!(0, util_1.isInteger)(key))
                    throw new Error('INVALID_INDEX');
                key = Number(key);
                if (key < 0)
                    throw new Error('INVALID_INDEX');
            }
            val = (0, hasOwnProperty_1.hasOwnProperty)(obj, String(key)) ? obj[key] : undefined;
        }
        else if (typeof obj === 'object' && !!obj) {
            val = (0, hasOwnProperty_1.hasOwnProperty)(obj, String(key)) ? obj[key] : undefined;
        }
        else
            throw new Error('NOT_FOUND');
    }
    return { val, obj, key };
};
exports.findByPointer = findByPointer;
