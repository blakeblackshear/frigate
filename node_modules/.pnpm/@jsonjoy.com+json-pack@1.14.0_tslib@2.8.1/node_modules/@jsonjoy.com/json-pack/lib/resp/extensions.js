"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespVerbatimString = exports.RespAttributes = exports.RespPush = void 0;
const JsonPackExtension_1 = require("../JsonPackExtension");
class RespPush extends JsonPackExtension_1.JsonPackExtension {
    constructor(val) {
        super(1, val);
        this.val = val;
    }
}
exports.RespPush = RespPush;
class RespAttributes extends JsonPackExtension_1.JsonPackExtension {
    constructor(val) {
        super(2, val);
        this.val = val;
    }
}
exports.RespAttributes = RespAttributes;
class RespVerbatimString extends JsonPackExtension_1.JsonPackExtension {
    constructor(val) {
        super(3, val);
        this.val = val;
    }
}
exports.RespVerbatimString = RespVerbatimString;
//# sourceMappingURL=extensions.js.map