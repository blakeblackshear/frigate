"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ring = void 0;
const Factory_1 = require("../Factory");
const Shape_1 = require("../Shape");
const Validators_1 = require("../Validators");
const Global_1 = require("../Global");
const PIx2 = Math.PI * 2;
class Ring extends Shape_1.Shape {
    _sceneFunc(context) {
        context.beginPath();
        context.arc(0, 0, this.innerRadius(), 0, PIx2, false);
        context.moveTo(this.outerRadius(), 0);
        context.arc(0, 0, this.outerRadius(), PIx2, 0, true);
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
}
exports.Ring = Ring;
Ring.prototype.className = 'Ring';
Ring.prototype._centroid = true;
Ring.prototype._attrsAffectingSize = ['innerRadius', 'outerRadius'];
(0, Global_1._registerNode)(Ring);
Factory_1.Factory.addGetterSetter(Ring, 'innerRadius', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Ring, 'outerRadius', 0, (0, Validators_1.getNumberValidator)());
