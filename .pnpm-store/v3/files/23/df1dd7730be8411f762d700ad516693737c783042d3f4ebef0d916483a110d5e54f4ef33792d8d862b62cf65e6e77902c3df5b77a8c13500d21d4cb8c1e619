"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pixelate = void 0;
const Factory_1 = require("../Factory");
const Util_1 = require("../Util");
const Node_1 = require("../Node");
const Validators_1 = require("../Validators");
const Pixelate = function (imageData) {
    let pixelSize = Math.ceil(this.pixelSize()), width = imageData.width, height = imageData.height, nBinsX = Math.ceil(width / pixelSize), nBinsY = Math.ceil(height / pixelSize), data = imageData.data;
    if (pixelSize <= 0) {
        Util_1.Util.error('pixelSize value can not be <= 0');
        return;
    }
    for (let xBin = 0; xBin < nBinsX; xBin += 1) {
        for (let yBin = 0; yBin < nBinsY; yBin += 1) {
            let red = 0;
            let green = 0;
            let blue = 0;
            let alpha = 0;
            const xBinStart = xBin * pixelSize;
            const xBinEnd = xBinStart + pixelSize;
            const yBinStart = yBin * pixelSize;
            const yBinEnd = yBinStart + pixelSize;
            let pixelsInBin = 0;
            for (let x = xBinStart; x < xBinEnd; x += 1) {
                if (x >= width) {
                    continue;
                }
                for (let y = yBinStart; y < yBinEnd; y += 1) {
                    if (y >= height) {
                        continue;
                    }
                    const i = (width * y + x) * 4;
                    red += data[i + 0];
                    green += data[i + 1];
                    blue += data[i + 2];
                    alpha += data[i + 3];
                    pixelsInBin += 1;
                }
            }
            red = red / pixelsInBin;
            green = green / pixelsInBin;
            blue = blue / pixelsInBin;
            alpha = alpha / pixelsInBin;
            for (let x = xBinStart; x < xBinEnd; x += 1) {
                if (x >= width) {
                    continue;
                }
                for (let y = yBinStart; y < yBinEnd; y += 1) {
                    if (y >= height) {
                        continue;
                    }
                    const i = (width * y + x) * 4;
                    data[i + 0] = red;
                    data[i + 1] = green;
                    data[i + 2] = blue;
                    data[i + 3] = alpha;
                }
            }
        }
    }
};
exports.Pixelate = Pixelate;
Factory_1.Factory.addGetterSetter(Node_1.Node, 'pixelSize', 8, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
