"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecompressionTable = void 0;
const JsonPackExtension_1 = require("../JsonPackExtension");
const isSafeInteger = Number.isSafeInteger;
class DecompressionTable {
    constructor() {
        this.table = [];
    }
    importTable(rleTable) {
        const length = rleTable.length;
        if (!length)
            return;
        const table = this.table;
        const first = rleTable[0];
        table.push(first);
        let i = 1;
        if (isSafeInteger(first)) {
            let prev = first;
            let value;
            while (i < length) {
                value = rleTable[i];
                if (isSafeInteger(value)) {
                    prev = prev + value;
                    table.push(prev);
                    i++;
                }
                else {
                    break;
                }
            }
        }
        while (i < length)
            table.push(rleTable[i++]);
    }
    getLiteral(index) {
        const table = this.table;
        return table[index];
    }
    decompress(value) {
        switch (typeof value) {
            case 'number': {
                return this.getLiteral(value);
            }
            case 'object': {
                if (!value)
                    return null;
                const constructor = value.constructor;
                switch (constructor) {
                    case Object: {
                        const obj = value;
                        const newObj = {};
                        for (const key in obj)
                            newObj[String(this.getLiteral(Number(key)))] = this.decompress(obj[key]);
                        return newObj;
                    }
                    case Array: {
                        const arr = value;
                        const newArr = [];
                        const len = arr.length;
                        for (let i = 0; i < len; i++)
                            newArr.push(this.decompress(arr[i]));
                        return newArr;
                    }
                    case Map: {
                        const map = value;
                        const newMap = new Map();
                        map.forEach((value, key) => {
                            newMap.set(this.decompress(key), this.decompress(value));
                        });
                        return newMap;
                    }
                    case Set: {
                        const set = value;
                        const newSet = new Set();
                        set.forEach((value) => {
                            newSet.add(this.decompress(value));
                        });
                        break;
                    }
                    case JsonPackExtension_1.JsonPackExtension: {
                        const ext = value;
                        const newExt = new JsonPackExtension_1.JsonPackExtension(Number(this.getLiteral(ext.tag)), this.decompress(ext.val));
                        return newExt;
                    }
                }
                return value;
            }
            default: {
                return value;
            }
        }
    }
}
exports.DecompressionTable = DecompressionTable;
//# sourceMappingURL=DecompressionTable.js.map