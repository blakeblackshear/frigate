"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAst = exports.AnnotationAstNode = exports.ObjAstNode = exports.ArrAstNode = exports.BinAstNode = exports.StrAstNode = exports.FloatAstNode = exports.NintAstNode = exports.UintAstNode = exports.BoolAstNode = exports.NullAstNode = void 0;
const utf8_1 = require("@jsonjoy.com/util/lib/strings/utf8");
class NullAstNode {
    constructor() {
        this.val = null;
        this.len = 1;
    }
    byteLength() {
        return 1;
    }
}
exports.NullAstNode = NullAstNode;
class BoolAstNode {
    constructor(val) {
        this.val = val;
        this.len = 1;
    }
    byteLength() {
        return 1;
    }
}
exports.BoolAstNode = BoolAstNode;
class UintAstNode {
    constructor(val) {
        this.val = val;
        if (!val)
            this.len = 0;
        else if (val <= 0xff)
            this.len = 1;
        else if (val <= 0xffff)
            this.len = 2;
        else if (val <= 0xffffff)
            this.len = 3;
        else if (val <= 0xffffffff)
            this.len = 4;
        else if (val <= 0xffffffffff)
            this.len = 5;
        else if (val <= 0xffffffffffff)
            this.len = 6;
        else
            this.len = 7;
    }
    byteLength() {
        return 1 + this.len;
    }
}
exports.UintAstNode = UintAstNode;
class NintAstNode {
    constructor(val) {
        this.val = val;
        const uint = -val;
        if (!uint)
            this.len = 0;
        else if (uint <= 0xff)
            this.len = 1;
        else if (uint <= 0xffff)
            this.len = 2;
        else if (uint <= 0xffffff)
            this.len = 3;
        else if (uint <= 0xffffffff)
            this.len = 4;
        else if (uint <= 0xffffffffff)
            this.len = 5;
        else if (uint <= 0xffffffffffff)
            this.len = 6;
        else
            this.len = 7;
    }
    byteLength() {
        return 1 + this.len;
    }
}
exports.NintAstNode = NintAstNode;
class FloatAstNode {
    constructor(val) {
        this.val = val;
        this.len = 8;
    }
    byteLength() {
        return 1 + this.len;
    }
}
exports.FloatAstNode = FloatAstNode;
const vUintLen = (num) => {
    if (num <= 0b1111111)
        return 1;
    else if (num <= 16383)
        return 2;
    else if (num <= 2097151)
        return 3;
    else if (num <= 268435455)
        return 4;
    else if (num <= 34359738367)
        return 5;
    else
        return 6;
};
class StrAstNode {
    constructor(val) {
        this.val = val;
        this.len = (0, utf8_1.utf8Size)(val);
    }
    byteLength() {
        return this.len < 14 ? 1 + this.len : 1 + vUintLen(this.len) + this.len;
    }
}
exports.StrAstNode = StrAstNode;
class BinAstNode {
    constructor(val) {
        this.val = val;
        this.len = val.length;
    }
    byteLength() {
        return this.len < 14 ? 1 + this.len : 1 + vUintLen(this.len) + this.len;
    }
}
exports.BinAstNode = BinAstNode;
class ArrAstNode {
    constructor(val) {
        this.val = val;
        if (val === null) {
            this.len = 1;
        }
        else {
            if (!val.length)
                this.len = 0;
            else {
                let elementLength = 0;
                for (let i = 0; i < val.length; i++)
                    elementLength += val[i].byteLength();
                this.len = elementLength;
            }
        }
    }
    byteLength() {
        return this.len < 14 ? 1 + this.len : 1 + vUintLen(this.len) + this.len;
    }
}
exports.ArrAstNode = ArrAstNode;
class ObjAstNode {
    constructor(val) {
        this.val = val;
        if (val === null) {
            this.len = 1;
        }
        else {
            if (!val.size)
                this.len = 0;
            else {
                let len = 0;
                val.forEach((node, symbolId) => {
                    len += vUintLen(symbolId) + node.byteLength();
                });
                this.len = len;
            }
        }
    }
    byteLength() {
        return this.len < 14 ? 1 + this.len : 1 + vUintLen(this.len) + this.len;
    }
}
exports.ObjAstNode = ObjAstNode;
class AnnotationAstNode {
    constructor(val, annotations) {
        this.val = val;
        this.annotations = annotations;
        let len = 0;
        for (let i = 0; i < annotations.length; i++)
            len += vUintLen(annotations[i]);
        this.annotationLen = len;
        len += vUintLen(len);
        len += val.byteLength();
        this.len = len;
    }
    byteLength() {
        return this.len < 14 ? 1 + this.len : 1 + vUintLen(this.len) + this.len;
    }
}
exports.AnnotationAstNode = AnnotationAstNode;
const isSafeInteger = Number.isSafeInteger;
const toAst = (val, symbols) => {
    if (val === null)
        return new NullAstNode();
    if (val instanceof Array)
        return new ArrAstNode(val.map((el) => (0, exports.toAst)(el, symbols)));
    if (val instanceof Uint8Array)
        return new BinAstNode(val);
    switch (typeof val) {
        case 'boolean':
            return new BoolAstNode(val);
        case 'number': {
            if (isSafeInteger(val))
                return val >= 0 ? new UintAstNode(val) : new NintAstNode(val);
            else
                return new FloatAstNode(val);
        }
        case 'string':
            return new StrAstNode(val);
        case 'object': {
            const struct = new Map();
            for (const key in val) {
                const symbolId = symbols.add(key);
                struct.set(symbolId, (0, exports.toAst)(val[key], symbols));
            }
            return new ObjAstNode(struct);
        }
    }
    throw new Error('UNKNOWN_TYPE');
};
exports.toAst = toAst;
//# sourceMappingURL=ast.js.map