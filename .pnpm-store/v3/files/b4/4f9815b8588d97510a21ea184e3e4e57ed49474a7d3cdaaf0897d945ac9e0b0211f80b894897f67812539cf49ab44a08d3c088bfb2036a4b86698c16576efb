"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genShallowReader = void 0;
const Codegen_1 = require("@jsonjoy.com/codegen/lib/Codegen");
const toUtf8 = (str) => {
    const arr = [];
    const length = str.length;
    let curr = 0;
    while (curr < length) {
        let value = str.charCodeAt(curr++);
        if ((value & 0xffffff80) === 0) {
            arr.push(value);
            continue;
        }
        else if ((value & 0xfffff800) === 0) {
            arr.push(((value >> 6) & 0x1f) | 0xc0);
        }
        else {
            if (value >= 0xd800 && value <= 0xdbff) {
                if (curr < length) {
                    const extra = str.charCodeAt(curr);
                    if ((extra & 0xfc00) === 0xdc00) {
                        curr++;
                        value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                    }
                }
            }
            if ((value & 0xffff0000) === 0) {
                arr.push(((value >> 12) & 0x0f) | 0xe0);
                arr.push(((value >> 6) & 0x3f) | 0x80);
            }
            else {
                arr.push(((value >> 18) & 0x07) | 0xf0);
                arr.push(((value >> 12) & 0x3f) | 0x80);
                arr.push(((value >> 6) & 0x3f) | 0x80);
            }
        }
        arr.push((value & 0x3f) | 0x80);
    }
    return arr;
};
const genShallowReader = (path) => {
    const codegen = new Codegen_1.Codegen({
        args: ['dec'],
        name: 'readShallow',
        prologue: 'var r = dec.reader;',
        epilogue: 'return r.x;',
    });
    for (let i = 0; i < path.length; i++) {
        const step = path[i];
        switch (typeof step) {
            case 'string': {
                const rObj = codegen.getRegister();
                const rIter = codegen.getRegister();
                const rFound = codegen.getRegister();
                codegen.js(`var ${rObj} = dec.readObjHdr();`);
                codegen.js(`var ${rFound} = false;`);
                codegen.js(`for(var ${rIter} = 0; ${rIter} < ${rObj}; ${rIter}++) {`);
                const utf8Arr = toUtf8(step);
                const length = utf8Arr.length;
                const rKey = codegen.getRegister();
                codegen.js(`var ${rKey} = dec.readStrHdr();`);
                codegen.js(`if (${rKey} !== ${length}) { r.x += ${rKey}; dec.skipAny(); continue; };`);
                while (utf8Arr.length > 0) {
                    if (utf8Arr.length >= 4) {
                        const word = utf8Arr.splice(0, 4);
                        const utf8Chunk = '0x' + word.map((x) => x.toString(16)).join('');
                        codegen.js(`if (r.u32() !== ${utf8Chunk}) { ${utf8Arr.length ? `r.x += ${utf8Arr.length}; ` : ''}dec.skipAny(); continue; }`);
                    }
                    else if (utf8Arr.length >= 2) {
                        const word = utf8Arr.splice(0, 2);
                        const utf8Chunk = '0x' + word.map((x) => x.toString(16)).join('');
                        codegen.js(`if (r.u16() !== ${utf8Chunk}) { ${utf8Arr.length ? `r.x += ${utf8Arr.length}; ` : ''}dec.skipAny(); continue; }`);
                    }
                    else {
                        const [octet] = utf8Arr.splice(0, 1);
                        codegen.js(`if (r.u8() !== ${octet}) { ${utf8Arr.length ? `r.x += ${utf8Arr.length}; ` : ''}dec.skipAny(); continue; }`);
                    }
                }
                codegen.js(`${rFound} = true;`);
                codegen.js(`break;`);
                codegen.js(`}`);
                codegen.js(`if (!${rFound}) throw new Error('KEY_NOT_FOUND');`);
                break;
            }
            case 'number': {
                const rObj = codegen.getRegister();
                codegen.js(`var ${rObj} = dec.readArrHdr();`);
                codegen.js(`if(${rObj} <= ${step}) throw new Error('INDEX_OUT_OF_BOUNDS');`);
                for (let i = 0; i < step; i++)
                    codegen.js(`dec.skipAny();`);
                break;
            }
            default: {
                throw new Error('INVALID_PATH_STEP');
            }
        }
    }
    return codegen.compile();
};
exports.genShallowReader = genShallowReader;
//# sourceMappingURL=shallow-read.js.map