"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Brighten = void 0;
const Factory_1 = require("../Factory");
const Node_1 = require("../Node");
const Validators_1 = require("../Validators");
const Brighten = function (imageData) {
    const brightness = this.brightness() * 255, data = imageData.data, len = data.length;
    for (let i = 0; i < len; i += 4) {
        data[i] += brightness;
        data[i + 1] += brightness;
        data[i + 2] += brightness;
    }
};
exports.Brighten = Brighten;
Factory_1.Factory.addGetterSetter(Node_1.Node, 'brightness', 0, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
