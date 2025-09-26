"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rect = void 0;
const Factory_1 = require("../Factory");
const Shape_1 = require("../Shape");
const Global_1 = require("../Global");
const Util_1 = require("../Util");
const Validators_1 = require("../Validators");
class Rect extends Shape_1.Shape {
    _sceneFunc(context) {
        const cornerRadius = this.cornerRadius(), width = this.width(), height = this.height();
        context.beginPath();
        if (!cornerRadius) {
            context.rect(0, 0, width, height);
        }
        else {
            Util_1.Util.drawRoundedRectPath(context, width, height, cornerRadius);
        }
        context.closePath();
        context.fillStrokeShape(this);
    }
}
exports.Rect = Rect;
Rect.prototype.className = 'Rect';
(0, Global_1._registerNode)(Rect);
Factory_1.Factory.addGetterSetter(Rect, 'cornerRadius', 0, (0, Validators_1.getNumberOrArrayOfNumbersValidator)(4));
