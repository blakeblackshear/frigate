"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EjsonDecoder = void 0;
const values_1 = require("../bson/values");
const JsonDecoder_1 = require("../json/JsonDecoder");
const JsonDecoder_2 = require("../json/JsonDecoder");
class EjsonDecoder extends JsonDecoder_1.JsonDecoder {
    constructor(options = {}) {
        super();
        this.options = options;
    }
    decodeFromString(json) {
        const bytes = new TextEncoder().encode(json);
        return this.decode(bytes);
    }
    readAny() {
        this.skipWhitespace();
        const reader = this.reader;
        const uint8 = reader.uint8;
        const char = uint8[reader.x];
        switch (char) {
            case 34:
                return this.readStr();
            case 91:
                return this.readArr();
            case 102:
                return this.readFalse();
            case 110:
                return this.readNull();
            case 116:
                return this.readTrue();
            case 123:
                return this.readObjWithEjsonSupport();
            default:
                if ((char >= 48 && char <= 57) || char === 45)
                    return this.readNum();
                throw new Error('Invalid JSON');
        }
    }
    readArr() {
        const reader = this.reader;
        if (reader.u8() !== 0x5b)
            throw new Error('Invalid JSON');
        const arr = [];
        const uint8 = reader.uint8;
        let first = true;
        while (true) {
            this.skipWhitespace();
            const char = uint8[reader.x];
            if (char === 0x5d)
                return reader.x++, arr;
            if (char === 0x2c)
                reader.x++;
            else if (!first)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            arr.push(this.readAny());
            first = false;
        }
    }
    readObjWithEjsonSupport() {
        const reader = this.reader;
        if (reader.u8() !== 0x7b)
            throw new Error('Invalid JSON');
        const obj = {};
        const uint8 = reader.uint8;
        let first = true;
        while (true) {
            this.skipWhitespace();
            let char = uint8[reader.x];
            if (char === 0x7d) {
                reader.x++;
                return this.transformEjsonObject(obj);
            }
            if (char === 0x2c)
                reader.x++;
            else if (!first)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            char = uint8[reader.x++];
            if (char !== 0x22)
                throw new Error('Invalid JSON');
            const key = (0, JsonDecoder_2.readKey)(reader);
            if (key === '__proto__')
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            if (reader.u8() !== 0x3a)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            obj[key] = this.readValue();
            first = false;
        }
    }
    readValue() {
        this.skipWhitespace();
        const reader = this.reader;
        const uint8 = reader.uint8;
        const char = uint8[reader.x];
        switch (char) {
            case 34:
                return this.readStr();
            case 91:
                return this.readArr();
            case 102:
                return this.readFalse();
            case 110:
                return this.readNull();
            case 116:
                return this.readTrue();
            case 123:
                return this.readRawObj();
            default:
                if ((char >= 48 && char <= 57) || char === 45)
                    return this.readNum();
                throw new Error('Invalid JSON');
        }
    }
    readRawObj() {
        const reader = this.reader;
        if (reader.u8() !== 0x7b)
            throw new Error('Invalid JSON');
        const obj = {};
        const uint8 = reader.uint8;
        let first = true;
        while (true) {
            this.skipWhitespace();
            let char = uint8[reader.x];
            if (char === 0x7d) {
                reader.x++;
                return obj;
            }
            if (char === 0x2c)
                reader.x++;
            else if (!first)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            char = uint8[reader.x++];
            if (char !== 0x22)
                throw new Error('Invalid JSON');
            const key = (0, JsonDecoder_2.readKey)(reader);
            if (key === '__proto__')
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            if (reader.u8() !== 0x3a)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            obj[key] = this.readValue();
            first = false;
        }
    }
    transformEjsonObject(obj) {
        const keys = Object.keys(obj);
        const hasExactKeys = (expectedKeys) => {
            if (keys.length !== expectedKeys.length)
                return false;
            return expectedKeys.every((key) => keys.includes(key));
        };
        const specialKeys = keys.filter((key) => key.startsWith('$'));
        if (specialKeys.length > 0) {
            if (specialKeys.includes('$oid')) {
                if (!hasExactKeys(['$oid'])) {
                    throw new Error('Invalid ObjectId format: extra keys not allowed');
                }
                const oidStr = obj.$oid;
                if (typeof oidStr === 'string' && /^[0-9a-fA-F]{24}$/.test(oidStr)) {
                    return this.parseObjectId(oidStr);
                }
                throw new Error('Invalid ObjectId format');
            }
            if (specialKeys.includes('$numberInt')) {
                if (!hasExactKeys(['$numberInt'])) {
                    throw new Error('Invalid Int32 format: extra keys not allowed');
                }
                const intStr = obj.$numberInt;
                if (typeof intStr === 'string') {
                    const value = parseInt(intStr, 10);
                    if (!isNaN(value) && value >= -2147483648 && value <= 2147483647) {
                        return new values_1.BsonInt32(value);
                    }
                }
                throw new Error('Invalid Int32 format');
            }
            if (specialKeys.includes('$numberLong')) {
                if (!hasExactKeys(['$numberLong'])) {
                    throw new Error('Invalid Int64 format: extra keys not allowed');
                }
                const longStr = obj.$numberLong;
                if (typeof longStr === 'string') {
                    const value = parseFloat(longStr);
                    if (!isNaN(value)) {
                        return new values_1.BsonInt64(value);
                    }
                }
                throw new Error('Invalid Int64 format');
            }
            if (specialKeys.includes('$numberDouble')) {
                if (!hasExactKeys(['$numberDouble'])) {
                    throw new Error('Invalid Double format: extra keys not allowed');
                }
                const doubleStr = obj.$numberDouble;
                if (typeof doubleStr === 'string') {
                    if (doubleStr === 'Infinity')
                        return new values_1.BsonFloat(Infinity);
                    if (doubleStr === '-Infinity')
                        return new values_1.BsonFloat(-Infinity);
                    if (doubleStr === 'NaN')
                        return new values_1.BsonFloat(NaN);
                    const value = parseFloat(doubleStr);
                    if (!isNaN(value)) {
                        return new values_1.BsonFloat(value);
                    }
                }
                throw new Error('Invalid Double format');
            }
            if (specialKeys.includes('$numberDecimal')) {
                if (!hasExactKeys(['$numberDecimal'])) {
                    throw new Error('Invalid Decimal128 format: extra keys not allowed');
                }
                const decimalStr = obj.$numberDecimal;
                if (typeof decimalStr === 'string') {
                    return new values_1.BsonDecimal128(new Uint8Array(16));
                }
                throw new Error('Invalid Decimal128 format');
            }
            if (specialKeys.includes('$binary')) {
                if (!hasExactKeys(['$binary'])) {
                    throw new Error('Invalid Binary format: extra keys not allowed');
                }
                const binaryObj = obj.$binary;
                if (typeof binaryObj === 'object' && binaryObj !== null) {
                    const binaryKeys = Object.keys(binaryObj);
                    if (binaryKeys.length === 2 && binaryKeys.includes('base64') && binaryKeys.includes('subType')) {
                        const base64 = binaryObj.base64;
                        const subType = binaryObj.subType;
                        if (typeof base64 === 'string' && typeof subType === 'string') {
                            const data = this.base64ToUint8Array(base64);
                            const subtype = parseInt(subType, 16);
                            return new values_1.BsonBinary(subtype, data);
                        }
                    }
                }
                throw new Error('Invalid Binary format');
            }
            if (specialKeys.includes('$uuid')) {
                if (!hasExactKeys(['$uuid'])) {
                    throw new Error('Invalid UUID format: extra keys not allowed');
                }
                const uuidStr = obj.$uuid;
                if (typeof uuidStr === 'string' && this.isValidUuid(uuidStr)) {
                    const data = this.uuidToBytes(uuidStr);
                    return new values_1.BsonBinary(4, data);
                }
                throw new Error('Invalid UUID format');
            }
            if (specialKeys.includes('$code') && !specialKeys.includes('$scope')) {
                if (!hasExactKeys(['$code'])) {
                    throw new Error('Invalid Code format: extra keys not allowed');
                }
                const code = obj.$code;
                if (typeof code === 'string') {
                    return new values_1.BsonJavascriptCode(code);
                }
                throw new Error('Invalid Code format');
            }
            if (specialKeys.includes('$code') && specialKeys.includes('$scope')) {
                if (!hasExactKeys(['$code', '$scope'])) {
                    throw new Error('Invalid CodeWScope format: extra keys not allowed');
                }
                const code = obj.$code;
                const scope = obj.$scope;
                if (typeof code === 'string' && typeof scope === 'object' && scope !== null) {
                    return new values_1.BsonJavascriptCodeWithScope(code, this.transformEjsonObject(scope));
                }
                throw new Error('Invalid CodeWScope format');
            }
            if (specialKeys.includes('$symbol')) {
                if (!hasExactKeys(['$symbol'])) {
                    throw new Error('Invalid Symbol format: extra keys not allowed');
                }
                const symbol = obj.$symbol;
                if (typeof symbol === 'string') {
                    return new values_1.BsonSymbol(symbol);
                }
                throw new Error('Invalid Symbol format');
            }
            if (specialKeys.includes('$timestamp')) {
                if (!hasExactKeys(['$timestamp'])) {
                    throw new Error('Invalid Timestamp format: extra keys not allowed');
                }
                const timestampObj = obj.$timestamp;
                if (typeof timestampObj === 'object' && timestampObj !== null) {
                    const timestampKeys = Object.keys(timestampObj);
                    if (timestampKeys.length === 2 && timestampKeys.includes('t') && timestampKeys.includes('i')) {
                        const t = timestampObj.t;
                        const i = timestampObj.i;
                        if (typeof t === 'number' && typeof i === 'number' && t >= 0 && i >= 0) {
                            return new values_1.BsonTimestamp(i, t);
                        }
                    }
                }
                throw new Error('Invalid Timestamp format');
            }
            if (specialKeys.includes('$regularExpression')) {
                if (!hasExactKeys(['$regularExpression'])) {
                    throw new Error('Invalid RegularExpression format: extra keys not allowed');
                }
                const regexObj = obj.$regularExpression;
                if (typeof regexObj === 'object' && regexObj !== null) {
                    const regexKeys = Object.keys(regexObj);
                    if (regexKeys.length === 2 && regexKeys.includes('pattern') && regexKeys.includes('options')) {
                        const pattern = regexObj.pattern;
                        const options = regexObj.options;
                        if (typeof pattern === 'string' && typeof options === 'string') {
                            return new RegExp(pattern, options);
                        }
                    }
                }
                throw new Error('Invalid RegularExpression format');
            }
            if (specialKeys.includes('$dbPointer')) {
                if (!hasExactKeys(['$dbPointer'])) {
                    throw new Error('Invalid DBPointer format: extra keys not allowed');
                }
                const dbPointerObj = obj.$dbPointer;
                if (typeof dbPointerObj === 'object' && dbPointerObj !== null) {
                    const dbPointerKeys = Object.keys(dbPointerObj);
                    if (dbPointerKeys.length === 2 && dbPointerKeys.includes('$ref') && dbPointerKeys.includes('$id')) {
                        const ref = dbPointerObj.$ref;
                        const id = dbPointerObj.$id;
                        if (typeof ref === 'string' && id !== undefined) {
                            const transformedId = this.transformEjsonObject(id);
                            if (transformedId instanceof values_1.BsonObjectId) {
                                return new values_1.BsonDbPointer(ref, transformedId);
                            }
                        }
                    }
                }
                throw new Error('Invalid DBPointer format');
            }
            if (specialKeys.includes('$date')) {
                if (!hasExactKeys(['$date'])) {
                    throw new Error('Invalid Date format: extra keys not allowed');
                }
                const dateValue = obj.$date;
                if (typeof dateValue === 'string') {
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
                else if (typeof dateValue === 'object' && dateValue !== null) {
                    const longObj = dateValue;
                    const longKeys = Object.keys(longObj);
                    if (longKeys.length === 1 && longKeys[0] === '$numberLong' && typeof longObj.$numberLong === 'string') {
                        const timestamp = parseFloat(longObj.$numberLong);
                        if (!isNaN(timestamp)) {
                            return new Date(timestamp);
                        }
                    }
                }
                throw new Error('Invalid Date format');
            }
            if (specialKeys.includes('$minKey')) {
                if (!hasExactKeys(['$minKey'])) {
                    throw new Error('Invalid MinKey format: extra keys not allowed');
                }
                if (obj.$minKey === 1) {
                    return new values_1.BsonMinKey();
                }
                throw new Error('Invalid MinKey format');
            }
            if (specialKeys.includes('$maxKey')) {
                if (!hasExactKeys(['$maxKey'])) {
                    throw new Error('Invalid MaxKey format: extra keys not allowed');
                }
                if (obj.$maxKey === 1) {
                    return new values_1.BsonMaxKey();
                }
                throw new Error('Invalid MaxKey format');
            }
            if (specialKeys.includes('$undefined')) {
                if (!hasExactKeys(['$undefined'])) {
                    throw new Error('Invalid Undefined format: extra keys not allowed');
                }
                if (obj.$undefined === true) {
                    return undefined;
                }
                throw new Error('Invalid Undefined format');
            }
        }
        if (keys.includes('$ref') && keys.includes('$id')) {
            const ref = obj.$ref;
            const id = this.transformEjsonObject(obj.$id);
            const result = { $ref: ref, $id: id };
            if (keys.includes('$db')) {
                result.$db = obj.$db;
            }
            for (const key of keys) {
                if (key !== '$ref' && key !== '$id' && key !== '$db') {
                    result[key] = this.transformEjsonObject(obj[key]);
                }
            }
            return result;
        }
        const result = {};
        for (const [key, val] of Object.entries(obj)) {
            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                result[key] = this.transformEjsonObject(val);
            }
            else if (Array.isArray(val)) {
                result[key] = val.map((item) => typeof item === 'object' && item !== null && !Array.isArray(item)
                    ? this.transformEjsonObject(item)
                    : item);
            }
            else {
                result[key] = val;
            }
        }
        return result;
    }
    parseObjectId(hex) {
        const timestamp = parseInt(hex.slice(0, 8), 16);
        const process = parseInt(hex.slice(8, 18), 16);
        const counter = parseInt(hex.slice(18, 24), 16);
        return new values_1.BsonObjectId(timestamp, process, counter);
    }
    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    isValidUuid(uuid) {
        const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        return uuidPattern.test(uuid);
    }
    uuidToBytes(uuid) {
        const hex = uuid.replace(/-/g, '');
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }
}
exports.EjsonDecoder = EjsonDecoder;
//# sourceMappingURL=EjsonDecoder.js.map