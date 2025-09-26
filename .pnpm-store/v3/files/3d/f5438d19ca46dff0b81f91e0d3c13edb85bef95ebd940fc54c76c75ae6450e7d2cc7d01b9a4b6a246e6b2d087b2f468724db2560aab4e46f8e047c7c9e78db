"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contrast = void 0;
const Factory_1 = require("../Factory");
const Node_1 = require("../Node");
const Validators_1 = require("../Validators");
const Contrast = function (imageData) {
    const adjust = Math.pow((this.contrast() + 100) / 100, 2);
    const data = imageData.data, nPixels = data.length;
    let red = 150, green = 150, blue = 150;
    for (let i = 0; i < nPixels; i += 4) {
        red = data[i];
        green = data[i + 1];
        blue = data[i + 2];
        red /= 255;
        red -= 0.5;
        red *= adjust;
        red += 0.5;
        red *= 255;
        green /= 255;
        green -= 0.5;
        green *= adjust;
        green += 0.5;
        green *= 255;
        blue /= 255;
        blue -= 0.5;
        blue *= adjust;
        blue += 0.5;
        blue *= 255;
        red = red < 0 ? 0 : red > 255 ? 255 : red;
        green = green < 0 ? 0 : green > 255 ? 255 : green;
        blue = blue < 0 ? 0 : blue > 255 ? 255 : blue;
        data[i] = red;
        data[i + 1] = green;
        data[i + 2] = blue;
    }
};
exports.Contrast = Contrast;
Factory_1.Factory.addGetterSetter(Node_1.Node, 'contrast', 0, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
