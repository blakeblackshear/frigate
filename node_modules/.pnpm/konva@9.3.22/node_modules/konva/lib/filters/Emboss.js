"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Emboss = void 0;
const Factory_1 = require("../Factory");
const Node_1 = require("../Node");
const Util_1 = require("../Util");
const Validators_1 = require("../Validators");
const Emboss = function (imageData) {
    const strength = this.embossStrength() * 10, greyLevel = this.embossWhiteLevel() * 255, direction = this.embossDirection(), blend = this.embossBlend(), data = imageData.data, w = imageData.width, h = imageData.height, w4 = w * 4;
    let dirY = 0, dirX = 0, y = h;
    switch (direction) {
        case 'top-left':
            dirY = -1;
            dirX = -1;
            break;
        case 'top':
            dirY = -1;
            dirX = 0;
            break;
        case 'top-right':
            dirY = -1;
            dirX = 1;
            break;
        case 'right':
            dirY = 0;
            dirX = 1;
            break;
        case 'bottom-right':
            dirY = 1;
            dirX = 1;
            break;
        case 'bottom':
            dirY = 1;
            dirX = 0;
            break;
        case 'bottom-left':
            dirY = 1;
            dirX = -1;
            break;
        case 'left':
            dirY = 0;
            dirX = -1;
            break;
        default:
            Util_1.Util.error('Unknown emboss direction: ' + direction);
    }
    do {
        const offsetY = (y - 1) * w4;
        let otherY = dirY;
        if (y + otherY < 1) {
            otherY = 0;
        }
        if (y + otherY > h) {
            otherY = 0;
        }
        const offsetYOther = (y - 1 + otherY) * w * 4;
        let x = w;
        do {
            const offset = offsetY + (x - 1) * 4;
            let otherX = dirX;
            if (x + otherX < 1) {
                otherX = 0;
            }
            if (x + otherX > w) {
                otherX = 0;
            }
            const offsetOther = offsetYOther + (x - 1 + otherX) * 4;
            const dR = data[offset] - data[offsetOther];
            const dG = data[offset + 1] - data[offsetOther + 1];
            const dB = data[offset + 2] - data[offsetOther + 2];
            let dif = dR;
            const absDif = dif > 0 ? dif : -dif;
            const absG = dG > 0 ? dG : -dG;
            const absB = dB > 0 ? dB : -dB;
            if (absG > absDif) {
                dif = dG;
            }
            if (absB > absDif) {
                dif = dB;
            }
            dif *= strength;
            if (blend) {
                const r = data[offset] + dif;
                const g = data[offset + 1] + dif;
                const b = data[offset + 2] + dif;
                data[offset] = r > 255 ? 255 : r < 0 ? 0 : r;
                data[offset + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
                data[offset + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
            }
            else {
                let grey = greyLevel - dif;
                if (grey < 0) {
                    grey = 0;
                }
                else if (grey > 255) {
                    grey = 255;
                }
                data[offset] = data[offset + 1] = data[offset + 2] = grey;
            }
        } while (--x);
    } while (--y);
};
exports.Emboss = Emboss;
Factory_1.Factory.addGetterSetter(Node_1.Node, 'embossStrength', 0.5, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
Factory_1.Factory.addGetterSetter(Node_1.Node, 'embossWhiteLevel', 0.5, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
Factory_1.Factory.addGetterSetter(Node_1.Node, 'embossDirection', 'top-left', undefined, Factory_1.Factory.afterSetFilter);
Factory_1.Factory.addGetterSetter(Node_1.Node, 'embossBlend', false, undefined, Factory_1.Factory.afterSetFilter);
