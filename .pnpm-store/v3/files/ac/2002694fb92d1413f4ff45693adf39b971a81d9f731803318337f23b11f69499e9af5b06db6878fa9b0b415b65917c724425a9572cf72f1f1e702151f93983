"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Image = void 0;
const Util_1 = require("../Util");
const Factory_1 = require("../Factory");
const Shape_1 = require("../Shape");
const Global_1 = require("../Global");
const Validators_1 = require("../Validators");
class Image extends Shape_1.Shape {
    constructor(attrs) {
        super(attrs);
        this._loadListener = () => {
            this._requestDraw();
        };
        this.on('imageChange.konva', (props) => {
            this._removeImageLoad(props.oldVal);
            this._setImageLoad();
        });
        this._setImageLoad();
    }
    _setImageLoad() {
        const image = this.image();
        if (image && image.complete) {
            return;
        }
        if (image && image.readyState === 4) {
            return;
        }
        if (image && image['addEventListener']) {
            image['addEventListener']('load', this._loadListener);
        }
    }
    _removeImageLoad(image) {
        if (image && image['removeEventListener']) {
            image['removeEventListener']('load', this._loadListener);
        }
    }
    destroy() {
        this._removeImageLoad(this.image());
        super.destroy();
        return this;
    }
    _useBufferCanvas() {
        const hasCornerRadius = !!this.cornerRadius();
        const hasShadow = this.hasShadow();
        if (hasCornerRadius && hasShadow) {
            return true;
        }
        return super._useBufferCanvas(true);
    }
    _sceneFunc(context) {
        const width = this.getWidth();
        const height = this.getHeight();
        const cornerRadius = this.cornerRadius();
        const image = this.attrs.image;
        let params;
        if (image) {
            const cropWidth = this.attrs.cropWidth;
            const cropHeight = this.attrs.cropHeight;
            if (cropWidth && cropHeight) {
                params = [
                    image,
                    this.cropX(),
                    this.cropY(),
                    cropWidth,
                    cropHeight,
                    0,
                    0,
                    width,
                    height,
                ];
            }
            else {
                params = [image, 0, 0, width, height];
            }
        }
        if (this.hasFill() || this.hasStroke() || cornerRadius) {
            context.beginPath();
            cornerRadius
                ? Util_1.Util.drawRoundedRectPath(context, width, height, cornerRadius)
                : context.rect(0, 0, width, height);
            context.closePath();
            context.fillStrokeShape(this);
        }
        if (image) {
            if (cornerRadius) {
                context.clip();
            }
            context.drawImage.apply(context, params);
        }
    }
    _hitFunc(context) {
        const width = this.width(), height = this.height(), cornerRadius = this.cornerRadius();
        context.beginPath();
        if (!cornerRadius) {
            context.rect(0, 0, width, height);
        }
        else {
            Util_1.Util.drawRoundedRectPath(context, width, height, cornerRadius);
        }
        context.closePath();
        context.fillStrokeShape(this);
    }
    getWidth() {
        var _a, _b;
        return (_a = this.attrs.width) !== null && _a !== void 0 ? _a : (_b = this.image()) === null || _b === void 0 ? void 0 : _b.width;
    }
    getHeight() {
        var _a, _b;
        return (_a = this.attrs.height) !== null && _a !== void 0 ? _a : (_b = this.image()) === null || _b === void 0 ? void 0 : _b.height;
    }
    static fromURL(url, callback, onError = null) {
        const img = Util_1.Util.createImageElement();
        img.onload = function () {
            const image = new Image({
                image: img,
            });
            callback(image);
        };
        img.onerror = onError;
        img.crossOrigin = 'Anonymous';
        img.src = url;
    }
}
exports.Image = Image;
Image.prototype.className = 'Image';
(0, Global_1._registerNode)(Image);
Factory_1.Factory.addGetterSetter(Image, 'cornerRadius', 0, (0, Validators_1.getNumberOrArrayOfNumbersValidator)(4));
Factory_1.Factory.addGetterSetter(Image, 'image');
Factory_1.Factory.addComponentsGetterSetter(Image, 'crop', ['x', 'y', 'width', 'height']);
Factory_1.Factory.addGetterSetter(Image, 'cropX', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Image, 'cropY', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Image, 'cropWidth', 0, (0, Validators_1.getNumberValidator)());
Factory_1.Factory.addGetterSetter(Image, 'cropHeight', 0, (0, Validators_1.getNumberValidator)());
