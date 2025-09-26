"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UbjsonDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const JsonPackExtension_1 = require("../JsonPackExtension");
class UbjsonDecoder {
    constructor() {
        this.reader = new Reader_1.Reader();
    }
    read(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    decode(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    readAny() {
        const reader = this.reader;
        const octet = reader.u8();
        switch (octet) {
            case 0x5a:
                return null;
            case 0x54:
                return true;
            case 0x46:
                return false;
            case 0x55:
                return reader.u8();
            case 0x69:
                return reader.i8();
            case 0x49: {
                const int = reader.view.getInt16(reader.x, false);
                reader.x += 2;
                return int;
            }
            case 0x6c: {
                const int = reader.view.getInt32(reader.x, false);
                reader.x += 4;
                return int;
            }
            case 0x64: {
                const num = reader.view.getFloat32(reader.x, false);
                reader.x += 4;
                return num;
            }
            case 0x44: {
                const num = reader.view.getFloat64(reader.x, false);
                reader.x += 8;
                return num;
            }
            case 0x4c: {
                const num = reader.view.getBigInt64(reader.x, false);
                reader.x += 8;
                return num;
            }
            case 0x53:
                return reader.utf8(+this.readAny());
            case 0x43:
                return String.fromCharCode(reader.u8());
            case 0x5b: {
                const uint8 = reader.uint8;
                const x = reader.x;
                if (uint8[x] === 0x24 && uint8[x + 1] === 0x55 && uint8[x + 2] === 0x23) {
                    reader.x += 3;
                    const size = +this.readAny();
                    return reader.buf(size);
                }
                let type = -1;
                if (uint8[x] === 0x24) {
                    reader.x++;
                    type = reader.u8();
                }
                let count = -1;
                if (uint8[x] === 0x23) {
                    reader.x++;
                    count = reader.u8();
                }
                if (uint8[x] === 0x24) {
                    reader.x++;
                    type = reader.u8();
                }
                if (count >= 0) {
                    let wordSize = 1;
                    switch (type) {
                        case 0x49:
                            wordSize = 2;
                            break;
                        case 0x6c:
                        case 0x64:
                            wordSize = 4;
                            break;
                        case 0x44:
                        case 0x4c:
                            wordSize = 8;
                            break;
                    }
                    return new JsonPackExtension_1.JsonPackExtension(type, reader.buf(count * wordSize));
                }
                else {
                    const arr = [];
                    while (uint8[reader.x] !== 0x5d)
                        arr.push(this.readAny());
                    reader.x++;
                    return arr;
                }
            }
            case 0x7b: {
                const uint8 = reader.uint8;
                const obj = {};
                while (uint8[reader.x] !== 0x7d) {
                    const keySize = +this.readAny();
                    const key = reader.utf8(keySize);
                    if (key === '__proto__')
                        throw 6;
                    obj[key] = this.readAny();
                }
                reader.x++;
                return obj;
            }
            case 0x4e:
                return undefined;
        }
        return;
    }
}
exports.UbjsonDecoder = UbjsonDecoder;
//# sourceMappingURL=UbjsonDecoder.js.map