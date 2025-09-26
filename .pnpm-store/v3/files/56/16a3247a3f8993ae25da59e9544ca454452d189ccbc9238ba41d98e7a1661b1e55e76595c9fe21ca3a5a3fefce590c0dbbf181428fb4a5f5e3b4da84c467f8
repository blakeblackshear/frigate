"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Posterize = void 0;
const Factory_1 = require("../Factory");
const Node_1 = require("../Node");
const Validators_1 = require("../Validators");
const Posterize = function (imageData) {
    const levels = Math.round(this.levels() * 254) + 1, data = imageData.data, len = data.length, scale = 255 / levels;
    for (let i = 0; i < len; i += 1) {
        data[i] = Math.floor(data[i] / scale) * scale;
    }
};
exports.Posterize = Posterize;
Factory_1.Factory.addGetterSetter(Node_1.Node, 'levels', 0.5, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
