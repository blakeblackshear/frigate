"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Solarize = void 0;
const Solarize = function (imageData) {
    const data = imageData.data, w = imageData.width, h = imageData.height, w4 = w * 4;
    let y = h;
    do {
        const offsetY = (y - 1) * w4;
        let x = w;
        do {
            const offset = offsetY + (x - 1) * 4;
            let r = data[offset];
            let g = data[offset + 1];
            let b = data[offset + 2];
            if (r > 127) {
                r = 255 - r;
            }
            if (g > 127) {
                g = 255 - g;
            }
            if (b > 127) {
                b = 255 - b;
            }
            data[offset] = r;
            data[offset + 1] = g;
            data[offset + 2] = b;
        } while (--x);
    } while (--y);
};
exports.Solarize = Solarize;
