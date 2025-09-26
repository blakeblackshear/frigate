"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompressionTable = void 0;
const JsonPackExtension_1 = require("../JsonPackExtension");
const isSafeInteger = Number.isSafeInteger;
class CompressionTable {
    constructor() {
        this.integers = new Set();
        this.nonIntegers = new Set();
        this.table = [];
        this.map = new Map();
    }
    static create(value) {
        const table = new CompressionTable();
        table.walk(value);
        table.finalize();
        return table;
    }
    addInteger(int) {
        this.integers.add(int);
    }
    addLiteral(value) {
        if (isSafeInteger(value)) {
            this.addInteger(value);
            return;
        }
        this.nonIntegers.add(value);
    }
    walk(value) {
        switch (typeof value) {
            case 'object': {
                if (!value)
                    return this.addLiteral(null);
                const constructor = value.constructor;
                switch (constructor) {
                    case Object: {
                        const obj = value;
                        for (const key in obj) {
                            this.addLiteral(key);
                            this.walk(obj[key]);
                        }
                        break;
                    }
                    case Array: {
                        const arr = value;
                        const len = arr.length;
                        for (let i = 0; i < len; i++)
                            this.walk(arr[i]);
                        break;
                    }
                    case Map: {
                        const map = value;
                        map.forEach((value, key) => {
                            this.walk(key);
                            this.walk(value);
                        });
                        break;
                    }
                    case Set: {
                        const set = value;
                        set.forEach((value) => {
                            this.walk(value);
                        });
                        break;
                    }
                    case JsonPackExtension_1.JsonPackExtension: {
                        const ext = value;
                        this.addInteger(ext.tag);
                        this.walk(ext.val);
                    }
                }
                return;
            }
            default:
                return this.addLiteral(value);
        }
    }
    finalize() {
        const integers = Array.from(this.integers);
        integers.sort((a, b) => a - b);
        const len = integers.length;
        const table = this.table;
        const map = this.map;
        if (len > 0) {
            const first = integers[0];
            table.push(first);
            map.set(first, 0);
            let last = first;
            for (let i = 1; i < len; i++) {
                const int = integers[i];
                table.push(int - last);
                map.set(int, i);
                last = int;
            }
        }
        const nonIntegers = Array.from(this.nonIntegers);
        nonIntegers.sort();
        const lenNonIntegers = nonIntegers.length;
        for (let i = 0; i < lenNonIntegers; i++) {
            const value = nonIntegers[i];
            table.push(value);
            map.set(value, len + i);
        }
        this.integers.clear();
        this.nonIntegers.clear();
    }
    getIndex(value) {
        const index = this.map.get(value);
        if (index === undefined)
            throw new Error(`Value [${value}] not found in compression table.`);
        return index;
    }
    getTable() {
        return this.table;
    }
    compress(value) {
        switch (typeof value) {
            case 'object': {
                if (!value)
                    return this.getIndex(null);
                const constructor = value.constructor;
                switch (constructor) {
                    case Object: {
                        const obj = value;
                        const newObj = {};
                        for (const key in obj)
                            newObj[this.getIndex(key)] = this.compress(obj[key]);
                        return newObj;
                    }
                    case Array: {
                        const arr = value;
                        const newArr = [];
                        const len = arr.length;
                        for (let i = 0; i < len; i++)
                            newArr.push(this.compress(arr[i]));
                        return newArr;
                    }
                    case Map: {
                        const map = value;
                        const newMap = new Map();
                        map.forEach((value, key) => {
                            newMap.set(this.compress(key), this.compress(value));
                        });
                        return newMap;
                    }
                    case Set: {
                        const set = value;
                        const newSet = new Set();
                        set.forEach((value) => {
                            newSet.add(this.compress(value));
                        });
                        break;
                    }
                    case JsonPackExtension_1.JsonPackExtension: {
                        const ext = value;
                        const newExt = new JsonPackExtension_1.JsonPackExtension(this.getIndex(ext.tag), this.compress(ext.val));
                        return newExt;
                    }
                }
                throw new Error('UNEXPECTED_OBJECT');
            }
            default: {
                return this.getIndex(value);
            }
        }
    }
}
exports.CompressionTable = CompressionTable;
//# sourceMappingURL=CompressionTable.js.map