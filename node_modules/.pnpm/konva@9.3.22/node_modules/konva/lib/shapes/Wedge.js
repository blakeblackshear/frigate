"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wedge = void 0;
const Factory_1 = require("../Factory");
const Shape_1 = require("../Shape");
const Global_1 = require("../Global");
const Validators_1 = require("../Validators");
const Global_2 = require("../Global");
class Wedge extends Shape_1.Shape {
    _sceneFunc(context) {
        context.beginPath();
        context.arc(0, 0, this.radius(), 0, Global_1.Konva.getAngle(this.angle()), this.clockwise());
        context.lineTo(0, 0);
        context.closePath();
        context.fillStrokeShape(this);
    }
    getWidth() {
        return this.radius() * 2;
    }
    getHeight() {
        return this.radius() * 2;
    }
    setWidth(width) {
        this.radius(width / 2);
    }
    setHeight(height) {
        this.radius(height / 2);
    }
}
exports.Wedge = Wedge;
Wedge.prototype.className = 'Wedge';
Wedge.prototype._centroid = true;
Wedge.prototype._attrsAffectingSize = ['radius'];
(0, Global_2._registerNode)(Wedge);
Factory_1.Factory.addGetterSetter(Wedge, 'radius', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Wedge, 'angle', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Wedge, 'clockwise', false);
Factory_1.Factory.backCompat(Wedge, {
    angleDeg: 'angle',
    getAngleDeg: 'getAngle',
    setAngleDeg: 'setAngle',
});
