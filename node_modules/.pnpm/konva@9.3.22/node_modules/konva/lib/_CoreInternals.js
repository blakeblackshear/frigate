"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Konva = void 0;
const Global_1 = require("./Global");
const Util_1 = require("./Util");
const Node_1 = require("./Node");
const Container_1 = require("./Container");
const Stage_1 = require("./Stage");
const Layer_1 = require("./Layer");
const FastLayer_1 = require("./FastLayer");
const Group_1 = require("./Group");
const DragAndDrop_1 = require("./DragAndDrop");
const Shape_1 = require("./Shape");
const Animation_1 = require("./Animation");
const Tween_1 = require("./Tween");
const Context_1 = require("./Context");
const Canvas_1 = require("./Canvas");
exports.Konva = Util_1.Util._assign(Global_1.Konva, {
    Util: Util_1.Util,
    Transform: Util_1.Transform,
    Node: Node_1.Node,
    Container: Container_1.Container,
    Stage: Stage_1.Stage,
    stages: Stage_1.stages,
    Layer: Layer_1.Layer,
    FastLayer: FastLayer_1.FastLayer,
    Group: Group_1.Group,
    DD: DragAndDrop_1.DD,
    Shape: Shape_1.Shape,
    shapes: Shape_1.shapes,
    Animation: Animation_1.Animation,
    Tween: Tween_1.Tween,
    Easings: Tween_1.Easings,
    Context: Context_1.Context,
    Canvas: Canvas_1.Canvas,
});
exports.default = exports.Konva;
