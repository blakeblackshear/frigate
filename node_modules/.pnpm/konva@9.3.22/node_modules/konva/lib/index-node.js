"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _FullInternals_1 = require("./_FullInternals");
const Canvas = require("canvas");
const canvas = Canvas['default'] || Canvas;
global.DOMMatrix = canvas.DOMMatrix;
const isNode = typeof global.document === 'undefined';
if (isNode) {
    _FullInternals_1.Konva.Util['createCanvasElement'] = () => {
        const node = canvas.createCanvas(300, 300);
        if (!node['style']) {
            node['style'] = {};
        }
        return node;
    };
    _FullInternals_1.Konva.Util.createImageElement = () => {
        const node = new canvas.Image();
        return node;
    };
}
module.exports = _FullInternals_1.Konva;
