import { RoughGenerator } from './generator';
export class RoughCanvas {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.gen = new RoughGenerator(config);
    }
    draw(drawable) {
        const sets = drawable.sets || [];
        const o = drawable.options || this.getDefaultOptions();
        const ctx = this.ctx;
        const precision = drawable.options.fixedDecimalPlaceDigits;
        for (const drawing of sets) {
            switch (drawing.type) {
                case 'path':
                    ctx.save();
                    ctx.strokeStyle = o.stroke === 'none' ? 'transparent' : o.stroke;
                    ctx.lineWidth = o.strokeWidth;
                    if (o.strokeLineDash) {
                        ctx.setLineDash(o.strokeLineDash);
                    }
                    if (o.strokeLineDashOffset) {
                        ctx.lineDashOffset = o.strokeLineDashOffset;
                    }
                    this._drawToContext(ctx, drawing, precision);
                    ctx.restore();
                    break;
                case 'fillPath': {
                    ctx.save();
                    ctx.fillStyle = o.fill || '';
                    const fillRule = (drawable.shape === 'curve' || drawable.shape === 'polygon' || drawable.shape === 'path') ? 'evenodd' : 'nonzero';
                    this._drawToContext(ctx, drawing, precision, fillRule);
                    ctx.restore();
                    break;
                }
                case 'fillSketch':
                    this.fillSketch(ctx, drawing, o);
                    break;
            }
        }
    }
    fillSketch(ctx, drawing, o) {
        let fweight = o.fillWeight;
        if (fweight < 0) {
            fweight = o.strokeWidth / 2;
        }
        ctx.save();
        if (o.fillLineDash) {
            ctx.setLineDash(o.fillLineDash);
        }
        if (o.fillLineDashOffset) {
            ctx.lineDashOffset = o.fillLineDashOffset;
        }
        ctx.strokeStyle = o.fill || '';
        ctx.lineWidth = fweight;
        this._drawToContext(ctx, drawing, o.fixedDecimalPlaceDigits);
        ctx.restore();
    }
    _drawToContext(ctx, drawing, fixedDecimals, rule = 'nonzero') {
        ctx.beginPath();
        for (const item of drawing.ops) {
            const data = ((typeof fixedDecimals === 'number') && fixedDecimals >= 0) ? (item.data.map((d) => +d.toFixed(fixedDecimals))) : item.data;
            switch (item.op) {
                case 'move':
                    ctx.moveTo(data[0], data[1]);
                    break;
                case 'bcurveTo':
                    ctx.bezierCurveTo(data[0], data[1], data[2], data[3], data[4], data[5]);
                    break;
                case 'lineTo':
                    ctx.lineTo(data[0], data[1]);
                    break;
            }
        }
        if (drawing.type === 'fillPath') {
            ctx.fill(rule);
        }
        else {
            ctx.stroke();
        }
    }
    get generator() {
        return this.gen;
    }
    getDefaultOptions() {
        return this.gen.defaultOptions;
    }
    line(x1, y1, x2, y2, options) {
        const d = this.gen.line(x1, y1, x2, y2, options);
        this.draw(d);
        return d;
    }
    rectangle(x, y, width, height, options) {
        const d = this.gen.rectangle(x, y, width, height, options);
        this.draw(d);
        return d;
    }
    ellipse(x, y, width, height, options) {
        const d = this.gen.ellipse(x, y, width, height, options);
        this.draw(d);
        return d;
    }
    circle(x, y, diameter, options) {
        const d = this.gen.circle(x, y, diameter, options);
        this.draw(d);
        return d;
    }
    linearPath(points, options) {
        const d = this.gen.linearPath(points, options);
        this.draw(d);
        return d;
    }
    polygon(points, options) {
        const d = this.gen.polygon(points, options);
        this.draw(d);
        return d;
    }
    arc(x, y, width, height, start, stop, closed = false, options) {
        const d = this.gen.arc(x, y, width, height, start, stop, closed, options);
        this.draw(d);
        return d;
    }
    curve(points, options) {
        const d = this.gen.curve(points, options);
        this.draw(d);
        return d;
    }
    path(d, options) {
        const drawing = this.gen.path(d, options);
        this.draw(drawing);
        return drawing;
    }
}
