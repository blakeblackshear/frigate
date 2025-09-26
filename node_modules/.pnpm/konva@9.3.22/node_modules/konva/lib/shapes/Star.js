"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Star = void 0;
const Factory_1 = require("../Factory");
const Shape_1 = require("../Shape");
const Validators_1 = require("../Validators");
const Global_1 = require("../Global");
class Star extends Shape_1.Shape {
    _sceneFunc(context) {
        const innerRadius = this.innerRadius(), outerRadius = this.outerRadius(), numPoints = this.numPoints();
        context.beginPath();
        context.moveTo(0, 0 - outerRadius);
        for (let n = 1; n < numPoints * 2; n++) {
            const radius = n % 2 === 0 ? outerRadius : innerRadius;
            const x = radius * Math.sin((n * Math.PI) / numPoints);
            const y = -1 * radius * Math.cos((n * Math.PI) / numPoints);
            context.lineTo(x, y);
        }
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
exports.Star = Star;
Star.prototype.className = 'Star';
Star.prototype._centroid = true;
Star.prototype._attrsAffectingSize = ['innerRadius', 'outerRadius'];
(0, Global_1._registerNode)(Star);
Factory_1.Factory.addGetterSetter(Star, 'numPoints', 5, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Star, 'innerRadius', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Star, 'outerRadius', 0, (0, Validators_1.getNumberValidator)());
