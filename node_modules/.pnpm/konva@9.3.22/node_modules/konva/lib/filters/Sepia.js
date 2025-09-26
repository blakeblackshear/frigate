"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sepia = void 0;
const Sepia = function (imageData) {
    const data = imageData.data, nPixels = data.length;
    for (let i = 0; i < nPixels; i += 4) {
        const r = data[i + 0];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i + 0] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
};
exports.Sepia = Sepia;
