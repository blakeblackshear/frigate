"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Threshold = void 0;
const Factory_1 = require("../Factory");
const Node_1 = require("../Node");
const Validators_1 = require("../Validators");
const Threshold = function (imageData) {
    const level = this.threshold() * 255, data = imageData.data, len = data.length;
    for (let i = 0; i < len; i += 1) {
        data[i] = data[i] < level ? 0 : 255;
    }
};
exports.Threshold = Threshold;
Factory_1.Factory.addGetterSetter(Node_1.Node, 'threshold', 0.5, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
