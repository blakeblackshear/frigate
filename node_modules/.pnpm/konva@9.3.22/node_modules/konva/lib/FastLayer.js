"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastLayer = void 0;
const Util_1 = require("./Util");
const Layer_1 = require("./Layer");
const Global_1 = require("./Global");
class FastLayer extends Layer_1.Layer {
    constructor(attrs) {
        super(attrs);
        this.listening(false);
        Util_1.Util.warn('Konva.Fast layer is deprecated. Please use "new Konva.Layer({ listening: false })" instead.');
    }
}
exports.FastLayer = FastLayer;
FastLayer.prototype.nodeType = 'FastLayer';
(0, Global_1._registerNode)(FastLayer);
