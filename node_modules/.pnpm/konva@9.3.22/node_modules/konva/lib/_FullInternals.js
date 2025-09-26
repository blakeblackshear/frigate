"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Konva = void 0;
const _CoreInternals_1 = require("./_CoreInternals");
const Arc_1 = require("./shapes/Arc");
const Arrow_1 = require("./shapes/Arrow");
const Circle_1 = require("./shapes/Circle");
const Ellipse_1 = require("./shapes/Ellipse");
const Image_1 = require("./shapes/Image");
const Label_1 = require("./shapes/Label");
const Line_1 = require("./shapes/Line");
const Path_1 = require("./shapes/Path");
const Rect_1 = require("./shapes/Rect");
const RegularPolygon_1 = require("./shapes/RegularPolygon");
const Ring_1 = require("./shapes/Ring");
const Sprite_1 = require("./shapes/Sprite");
const Star_1 = require("./shapes/Star");
const Text_1 = require("./shapes/Text");
const TextPath_1 = require("./shapes/TextPath");
const Transformer_1 = require("./shapes/Transformer");
const Wedge_1 = require("./shapes/Wedge");
const Blur_1 = require("./filters/Blur");
const Brighten_1 = require("./filters/Brighten");
const Contrast_1 = require("./filters/Contrast");
const Emboss_1 = require("./filters/Emboss");
const Enhance_1 = require("./filters/Enhance");
const Grayscale_1 = require("./filters/Grayscale");
const HSL_1 = require("./filters/HSL");
const HSV_1 = require("./filters/HSV");
const Invert_1 = require("./filters/Invert");
const Kaleidoscope_1 = require("./filters/Kaleidoscope");
const Mask_1 = require("./filters/Mask");
const Noise_1 = require("./filters/Noise");
const Pixelate_1 = require("./filters/Pixelate");
const Posterize_1 = require("./filters/Posterize");
const RGB_1 = require("./filters/RGB");
const RGBA_1 = require("./filters/RGBA");
const Sepia_1 = require("./filters/Sepia");
const Solarize_1 = require("./filters/Solarize");
const Threshold_1 = require("./filters/Threshold");
exports.Konva = _CoreInternals_1.Konva.Util._assign(_CoreInternals_1.Konva, {
    Arc: Arc_1.Arc,
    Arrow: Arrow_1.Arrow,
    Circle: Circle_1.Circle,
    Ellipse: Ellipse_1.Ellipse,
    Image: Image_1.Image,
    Label: Label_1.Label,
    Tag: Label_1.Tag,
    Line: Line_1.Line,
    Path: Path_1.Path,
    Rect: Rect_1.Rect,
    RegularPolygon: RegularPolygon_1.RegularPolygon,
    Ring: Ring_1.Ring,
    Sprite: Sprite_1.Sprite,
    Star: Star_1.Star,
    Text: Text_1.Text,
    TextPath: TextPath_1.TextPath,
    Transformer: Transformer_1.Transformer,
    Wedge: Wedge_1.Wedge,
    Filters: {
        Blur: Blur_1.Blur,
        Brighten: Brighten_1.Brighten,
        Contrast: Contrast_1.Contrast,
        Emboss: Emboss_1.Emboss,
        Enhance: Enhance_1.Enhance,
        Grayscale: Grayscale_1.Grayscale,
        HSL: HSL_1.HSL,
        HSV: HSV_1.HSV,
        Invert: Invert_1.Invert,
        Kaleidoscope: Kaleidoscope_1.Kaleidoscope,
        Mask: Mask_1.Mask,
        Noise: Noise_1.Noise,
        Pixelate: Pixelate_1.Pixelate,
        Posterize: Posterize_1.Posterize,
        RGB: RGB_1.RGB,
        RGBA: RGBA_1.RGBA,
        Sepia: Sepia_1.Sepia,
        Solarize: Solarize_1.Solarize,
        Threshold: Threshold_1.Threshold,
    },
});
