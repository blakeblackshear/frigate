"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Arc = void 0;
const Factory_1 = require("../Factory");
const Shape_1 = require("../Shape");
const Global_1 = require("../Global");
const Validators_1 = require("../Validators");
const Global_2 = require("../Global");
class Arc extends Shape_1.Shape {
    _sceneFunc(context) {
        const angle = Global_1.Konva.getAngle(this.angle()), clockwise = this.clockwise();
        context.beginPath();
        context.arc(0, 0, this.outerRadius(), 0, angle, clockwise);
        context.arc(0, 0, this.innerRadius(), angle, 0, !clockwise);
        context.closePath();
        context.fillStrokeShape(this);
    }
    getWidth() {
        return this.outerRadius() * 2;
    }
    getHeight() {
        return this.outerRadius() * 2;
    }
    setWidth(width) {
        this.outerRadius(width / 2);
    }
    setHeight(height) {
        this.outerRadius(height / 2);
    }
    getSelfRect() {
        const innerRadius = this.innerRadius();
        const outerRadius = this.outerRadius();
        const clockwise = this.clockwise();
        const angle = Global_1.Konva.getAngle(clockwise ? 360 - this.angle() : this.angle());
        const boundLeftRatio = Math.cos(Math.min(angle, Math.PI));
        const boundRightRatio = 1;
        const boundTopRatio = Math.sin(Math.min(Math.max(Math.PI, angle), (3 * Math.PI) / 2));
        const boundBottomRatio = Math.sin(Math.min(angle, Math.PI / 2));
        const boundLeft = boundLeftRatio * (boundLeftRatio > 0 ? innerRadius : outerRadius);
        const boundRight = boundRightRatio * (boundRightRatio > 0 ? outerRadius : innerRadius);
        const boundTop = boundTopRatio * (boundTopRatio > 0 ? innerRadius : outerRadius);
        const boundBottom = boundBottomRatio * (boundBottomRatio > 0 ? outerRadius : innerRadius);
        return {
            x: boundLeft,
            y: clockwise ? -1 * boundBottom : boundTop,
            width: boundRight - boundLeft,
            height: boundBottom - boundTop,
        };
    }
}
exports.Arc = Arc;
Arc.prototype._centroid = true;
Arc.prototype.className = 'Arc';
Arc.prototype._attrsAffectingSize = [
    'innerRadius',
    'outerRadius',
    'angle',
    'clockwise',
];
(0, Global_2._registerNode)(Arc);
Factory_1.Factory.addGetterSetter(Arc, 'innerRadius', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Arc, 'outerRadius', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Arc, 'angle', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Arc, 'clockwise', false, (0, Validators_1.getBooleanValidator)());
