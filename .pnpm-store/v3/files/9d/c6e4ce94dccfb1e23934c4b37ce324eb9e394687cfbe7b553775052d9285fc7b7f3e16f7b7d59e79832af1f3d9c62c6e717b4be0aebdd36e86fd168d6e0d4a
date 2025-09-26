"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Arrow = void 0;
const Factory_1 = require("../Factory");
const Line_1 = require("./Line");
const Validators_1 = require("../Validators");
const Global_1 = require("../Global");
const Path_1 = require("./Path");
class Arrow extends Line_1.Line {
    _sceneFunc(ctx) {
        super._sceneFunc(ctx);
        const PI2 = Math.PI * 2;
        const points = this.points();
        let tp = points;
        const fromTension = this.tension() !== 0 && points.length > 4;
        if (fromTension) {
            tp = this.getTensionPoints();
        }
        const length = this.pointerLength();
        const n = points.length;
        let dx, dy;
        if (fromTension) {
            const lp = [
                tp[tp.length - 4],
                tp[tp.length - 3],
                tp[tp.length - 2],
                tp[tp.length - 1],
                points[n - 2],
                points[n - 1],
            ];
            const lastLength = Path_1.Path.calcLength(tp[tp.length - 4], tp[tp.length - 3], 'C', lp);
            const previous = Path_1.Path.getPointOnQuadraticBezier(Math.min(1, 1 - length / lastLength), lp[0], lp[1], lp[2], lp[3], lp[4], lp[5]);
            dx = points[n - 2] - previous.x;
            dy = points[n - 1] - previous.y;
        }
        else {
            dx = points[n - 2] - points[n - 4];
            dy = points[n - 1] - points[n - 3];
        }
        const radians = (Math.atan2(dy, dx) + PI2) % PI2;
        const width = this.pointerWidth();
        if (this.pointerAtEnding()) {
            ctx.save();
            ctx.beginPath();
            ctx.translate(points[n - 2], points[n - 1]);
            ctx.rotate(radians);
            ctx.moveTo(0, 0);
            ctx.lineTo(-length, width / 2);
            ctx.lineTo(-length, -width / 2);
            ctx.closePath();
            ctx.restore();
            this.__fillStroke(ctx);
        }
        if (this.pointerAtBeginning()) {
            ctx.save();
            ctx.beginPath();
            ctx.translate(points[0], points[1]);
            if (fromTension) {
                dx = (tp[0] + tp[2]) / 2 - points[0];
                dy = (tp[1] + tp[3]) / 2 - points[1];
            }
            else {
                dx = points[2] - points[0];
                dy = points[3] - points[1];
            }
            ctx.rotate((Math.atan2(-dy, -dx) + PI2) % PI2);
            ctx.moveTo(0, 0);
            ctx.lineTo(-length, width / 2);
            ctx.lineTo(-length, -width / 2);
            ctx.closePath();
            ctx.restore();
            this.__fillStroke(ctx);
        }
    }
    __fillStroke(ctx) {
        const isDashEnabled = this.dashEnabled();
        if (isDashEnabled) {
            this.attrs.dashEnabled = false;
            ctx.setLineDash([]);
        }
        ctx.fillStrokeShape(this);
        if (isDashEnabled) {
            this.attrs.dashEnabled = true;
        }
    }
    getSelfRect() {
        const lineRect = super.getSelfRect();
        const offset = this.pointerWidth() / 2;
        return {
            x: lineRect.x,
            y: lineRect.y - offset,
            width: lineRect.width,
            height: lineRect.height + offset * 2,
        };
    }
}
exports.Arrow = Arrow;
Arrow.prototype.className = 'Arrow';
(0, Global_1._registerNode)(Arrow);
Factory_1.Factory.addGetterSetter(Arrow, 'pointerLength', 10, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Arrow, 'pointerWidth', 10, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Arrow, 'pointerAtBeginning', false);
Factory_1.Factory.addGetterSetter(Arrow, 'pointerAtEnding', true);
