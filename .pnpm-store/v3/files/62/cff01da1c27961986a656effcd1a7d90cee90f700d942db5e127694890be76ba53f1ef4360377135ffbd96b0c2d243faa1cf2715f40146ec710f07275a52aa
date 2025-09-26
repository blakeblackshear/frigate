"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kaleidoscope = void 0;
const Factory_1 = require("../Factory");
const Node_1 = require("../Node");
const Util_1 = require("../Util");
const Validators_1 = require("../Validators");
const ToPolar = function (src, dst, opt) {
    const srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2;
    let rMax = Math.sqrt(xMid * xMid + yMid * yMid);
    let x = xSize - xMid;
    let y = ySize - yMid;
    const rad = Math.sqrt(x * x + y * y);
    rMax = rad > rMax ? rad : rMax;
    const rSize = ySize, tSize = xSize;
    const conversion = ((360 / tSize) * Math.PI) / 180;
    for (let theta = 0; theta < tSize; theta += 1) {
        const sin = Math.sin(theta * conversion);
        const cos = Math.cos(theta * conversion);
        for (let radius = 0; radius < rSize; radius += 1) {
            x = Math.floor(xMid + ((rMax * radius) / rSize) * cos);
            y = Math.floor(yMid + ((rMax * radius) / rSize) * sin);
            let i = (y * xSize + x) * 4;
            const r = srcPixels[i + 0];
            const g = srcPixels[i + 1];
            const b = srcPixels[i + 2];
            const a = srcPixels[i + 3];
            i = (theta + radius * xSize) * 4;
            dstPixels[i + 0] = r;
            dstPixels[i + 1] = g;
            dstPixels[i + 2] = b;
            dstPixels[i + 3] = a;
        }
    }
};
const FromPolar = function (src, dst, opt) {
    const srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2;
    let rMax = Math.sqrt(xMid * xMid + yMid * yMid);
    let x = xSize - xMid;
    let y = ySize - yMid;
    const rad = Math.sqrt(x * x + y * y);
    rMax = rad > rMax ? rad : rMax;
    const rSize = ySize, tSize = xSize, phaseShift = opt.polarRotation || 0;
    let x1, y1;
    for (x = 0; x < xSize; x += 1) {
        for (y = 0; y < ySize; y += 1) {
            const dx = x - xMid;
            const dy = y - yMid;
            const radius = (Math.sqrt(dx * dx + dy * dy) * rSize) / rMax;
            let theta = ((Math.atan2(dy, dx) * 180) / Math.PI + 360 + phaseShift) % 360;
            theta = (theta * tSize) / 360;
            x1 = Math.floor(theta);
            y1 = Math.floor(radius);
            let i = (y1 * xSize + x1) * 4;
            const r = srcPixels[i + 0];
            const g = srcPixels[i + 1];
            const b = srcPixels[i + 2];
            const a = srcPixels[i + 3];
            i = (y * xSize + x) * 4;
            dstPixels[i + 0] = r;
            dstPixels[i + 1] = g;
            dstPixels[i + 2] = b;
            dstPixels[i + 3] = a;
        }
    }
};
const Kaleidoscope = function (imageData) {
    const xSize = imageData.width, ySize = imageData.height;
    let x, y, xoff, i, r, g, b, a, srcPos, dstPos;
    let power = Math.round(this.kaleidoscopePower());
    const angle = Math.round(this.kaleidoscopeAngle());
    const offset = Math.floor((xSize * (angle % 360)) / 360);
    if (power < 1) {
        return;
    }
    const tempCanvas = Util_1.Util.createCanvasElement();
    tempCanvas.width = xSize;
    tempCanvas.height = ySize;
    const scratchData = tempCanvas
        .getContext('2d')
        .getImageData(0, 0, xSize, ySize);
    Util_1.Util.releaseCanvas(tempCanvas);
    ToPolar(imageData, scratchData, {
        polarCenterX: xSize / 2,
        polarCenterY: ySize / 2,
    });
    let minSectionSize = xSize / Math.pow(2, power);
    while (minSectionSize <= 8) {
        minSectionSize = minSectionSize * 2;
        power -= 1;
    }
    minSectionSize = Math.ceil(minSectionSize);
    let sectionSize = minSectionSize;
    let xStart = 0, xEnd = sectionSize, xDelta = 1;
    if (offset + minSectionSize > xSize) {
        xStart = sectionSize;
        xEnd = 0;
        xDelta = -1;
    }
    for (y = 0; y < ySize; y += 1) {
        for (x = xStart; x !== xEnd; x += xDelta) {
            xoff = Math.round(x + offset) % xSize;
            srcPos = (xSize * y + xoff) * 4;
            r = scratchData.data[srcPos + 0];
            g = scratchData.data[srcPos + 1];
            b = scratchData.data[srcPos + 2];
            a = scratchData.data[srcPos + 3];
            dstPos = (xSize * y + x) * 4;
            scratchData.data[dstPos + 0] = r;
            scratchData.data[dstPos + 1] = g;
            scratchData.data[dstPos + 2] = b;
            scratchData.data[dstPos + 3] = a;
        }
    }
    for (y = 0; y < ySize; y += 1) {
        sectionSize = Math.floor(minSectionSize);
        for (i = 0; i < power; i += 1) {
            for (x = 0; x < sectionSize + 1; x += 1) {
                srcPos = (xSize * y + x) * 4;
                r = scratchData.data[srcPos + 0];
                g = scratchData.data[srcPos + 1];
                b = scratchData.data[srcPos + 2];
                a = scratchData.data[srcPos + 3];
                dstPos = (xSize * y + sectionSize * 2 - x - 1) * 4;
                scratchData.data[dstPos + 0] = r;
                scratchData.data[dstPos + 1] = g;
                scratchData.data[dstPos + 2] = b;
                scratchData.data[dstPos + 3] = a;
            }
            sectionSize *= 2;
        }
    }
    FromPolar(scratchData, imageData, { polarRotation: 0 });
};
exports.Kaleidoscope = Kaleidoscope;
Factory_1.Factory.addGetterSetter(Node_1.Node, 'kaleidoscopePower', 2, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
Factory_1.Factory.addGetterSetter(Node_1.Node, 'kaleidoscopeAngle', 0, (0, Validators_1.getNumberValidator)(), Factory_1.Factory.afterSetFilter);
