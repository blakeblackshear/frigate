import { SVGNS } from './core';
import { RoughGenerator } from './generator';
export class RoughSVG {
    constructor(svg, config) {
        this.svg = svg;
        this.gen = new RoughGenerator(config);
    }
    draw(drawable) {
        const sets = drawable.sets || [];
        const o = drawable.options || this.getDefaultOptions();
        const doc = this.svg.ownerDocument || window.document;
        const g = doc.createElementNS(SVGNS, 'g');
        const precision = drawable.options.fixedDecimalPlaceDigits;
        for (const drawing of sets) {
            let path = null;
            switch (drawing.type) {
                case 'path': {
                    path = doc.createElementNS(SVGNS, 'path');
                    path.setAttribute('d', this.opsToPath(drawing, precision));
                    path.setAttribute('stroke', o.stroke);
                    path.setAttribute('stroke-width', o.strokeWidth + '');
                    path.setAttribute('fill', 'none');
                    if (o.strokeLineDash) {
                        path.setAttribute('stroke-dasharray', o.strokeLineDash.join(' ').trim());
                    }
                    if (o.strokeLineDashOffset) {
                        path.setAttribute('stroke-dashoffset', `${o.strokeLineDashOffset}`);
                    }
                    break;
                }
                case 'fillPath': {
                    path = doc.createElementNS(SVGNS, 'path');
                    path.setAttribute('d', this.opsToPath(drawing, precision));
                    path.setAttribute('stroke', 'none');
                    path.setAttribute('stroke-width', '0');
                    path.setAttribute('fill', o.fill || '');
                    if (drawable.shape === 'curve' || drawable.shape === 'polygon') {
                        path.setAttribute('fill-rule', 'evenodd');
                    }
                    break;
                }
                case 'fillSketch': {
                    path = this.fillSketch(doc, drawing, o);
                    break;
                }
            }
            if (path) {
                g.appendChild(path);
            }
        }
        return g;
    }
    fillSketch(doc, drawing, o) {
        let fweight = o.fillWeight;
        if (fweight < 0) {
            fweight = o.strokeWidth / 2;
        }
        const path = doc.createElementNS(SVGNS, 'path');
        path.setAttribute('d', this.opsToPath(drawing, o.fixedDecimalPlaceDigits));
        path.setAttribute('stroke', o.fill || '');
        path.setAttribute('stroke-width', fweight + '');
        path.setAttribute('fill', 'none');
        if (o.fillLineDash) {
            path.setAttribute('stroke-dasharray', o.fillLineDash.join(' ').trim());
        }
        if (o.fillLineDashOffset) {
            path.setAttribute('stroke-dashoffset', `${o.fillLineDashOffset}`);
        }
        return path;
    }
    get generator() {
        return this.gen;
    }
    getDefaultOptions() {
        return this.gen.defaultOptions;
    }
    opsToPath(drawing, fixedDecimalPlaceDigits) {
        return this.gen.opsToPath(drawing, fixedDecimalPlaceDigits);
    }
    line(x1, y1, x2, y2, options) {
        const d = this.gen.line(x1, y1, x2, y2, options);
        return this.draw(d);
    }
    rectangle(x, y, width, height, options) {
        const d = this.gen.rectangle(x, y, width, height, options);
        return this.draw(d);
    }
    ellipse(x, y, width, height, options) {
        const d = this.gen.ellipse(x, y, width, height, options);
        return this.draw(d);
    }
    circle(x, y, diameter, options) {
        const d = this.gen.circle(x, y, diameter, options);
        return this.draw(d);
    }
    linearPath(points, options) {
        const d = this.gen.linearPath(points, options);
        return this.draw(d);
    }
    polygon(points, options) {
        const d = this.gen.polygon(points, options);
        return this.draw(d);
    }
    arc(x, y, width, height, start, stop, closed = false, options) {
        const d = this.gen.arc(x, y, width, height, start, stop, closed, options);
        return this.draw(d);
    }
    curve(points, options) {
        const d = this.gen.curve(points, options);
        return this.draw(d);
    }
    path(d, options) {
        const drawing = this.gen.path(d, options);
        return this.draw(drawing);
    }
}
