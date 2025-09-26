// the purpose of that file is very stupid
// I was not able to generate correct typescript declarations from the main source code
// because right now Konva is an object. Typescript can not define types from object like this:
// const stage : Konva.Stage = new Konva.Stage();
// we can convert Konva to namespace
// but I was not able to find a way to extend it
// so here we just need to define full API of Konva manually

// filters
import { Blur } from './filters/Blur.js';
import { Brighten } from './filters/Brighten.js';
import { Contrast } from './filters/Contrast.js';
import { Emboss } from './filters/Emboss.js';
import { Enhance } from './filters/Enhance.js';
import { Grayscale } from './filters/Grayscale.js';
import { HSL } from './filters/HSL.js';
import { HSV } from './filters/HSV.js';
import { Invert } from './filters/Invert.js';
import { Kaleidoscope } from './filters/Kaleidoscope.js';
import { Mask } from './filters/Mask.js';
import { Noise } from './filters/Noise.js';
import { Pixelate } from './filters/Pixelate.js';
import { Posterize } from './filters/Posterize.js';
import { RGB } from './filters/RGB.js';
import { RGBA } from './filters/RGBA.js';
import { Sepia } from './filters/Sepia.js';
import { Solarize } from './filters/Solarize.js';
import { Threshold } from './filters/Threshold.js';

declare namespace Konva {
  export let enableTrace: number;
  export let pixelRatio: number;
  export let autoDrawEnabled: boolean;
  export let dragDistance: number;
  export let angleDeg: boolean;
  export let showWarnings: boolean;
  export let capturePointerEventsEnabled: boolean;
  export let dragButtons: Array<number>;
  export let hitOnDragEnabled: boolean;
  export const isDragging: () => boolean;
  export const isDragReady: () => boolean;
  export const getAngle: (angle: number) => number;

  export type Vector2d = import('./types.js').Vector2d;

  export const Node: typeof import('./Node.js').Node;
  export type Node = import('./Node.js').Node;
  export type NodeConfig = import('./Node.js').NodeConfig;

  export type KonvaEventObject<EventType> =
    import('./Node.js').KonvaEventObject<EventType>;

  export type KonvaPointerEvent = import('./PointerEvents.js').KonvaPointerEvent;

  export type KonvaEventListener<This, EventType> =
    import('./Node.js').KonvaEventListener<This, EventType>;

  export const Container: typeof import('./Container.js').Container;
  export type Container = import('./Container.js').Container<Node>;
  export type ContainerConfig = import('./Container.js').ContainerConfig;

  export const Transform: typeof import('./Util.js').Transform;
  export type Transform = import('./Util.js').Transform;

  export const Util: typeof import('./Util.js').Util;

  export const Context: typeof import('./Context.js').Context;
  export type Context = import('./Context.js').Context;

  export const Stage: typeof import('./Stage.js').Stage;
  export type Stage = import('./Stage.js').Stage;
  export type StageConfig = import('./Stage.js').StageConfig;
  export const stages: typeof import('./Stage.js').stages;

  export const Layer: typeof import('./Layer.js').Layer;
  export type Layer = import('./Layer.js').Layer;
  export type LayerConfig = import('./Layer.js').LayerConfig;

  export const FastLayer: typeof import('./FastLayer.js').FastLayer;
  export type FastLayer = import('./FastLayer.js').FastLayer;

  export const Group: typeof import('./Group.js').Group;
  export type Group = import('./Group.js').Group;
  export type GroupConfig = import('./Group.js').GroupConfig;

  export const DD: typeof import('./DragAndDrop.js').DD;

  export const Shape: typeof import('./Shape.js').Shape;
  export type Shape = import('./Shape.js').Shape;
  export type ShapeConfig = import('./Shape.js').ShapeConfig;
  export const shapes: typeof import('./Shape.js').shapes;

  export const Animation: typeof import('./Animation.js').Animation;
  export type Animation = import('./Animation.js').Animation;

  export const Tween: typeof import('./Tween.js').Tween;
  export type Tween = import('./Tween.js').Tween;
  export type TweenConfig = import('./Tween.js').TweenConfig;
  export const Easings: typeof import('./Tween.js').Easings;

  export const Arc: typeof import('./shapes/Arc.js').Arc;
  export type Arc = import('./shapes/Arc.js').Arc;
  export type ArcConfig = import('./shapes/Arc.js').ArcConfig;
  export const Arrow: typeof import('./shapes/Arrow.js').Arrow;
  export type Arrow = import('./shapes/Arrow.js').Arrow;
  export type ArrowConfig = import('./shapes/Arrow.js').ArrowConfig;
  export const Circle: typeof import('./shapes/Circle.js').Circle;
  export type Circle = import('./shapes/Circle.js').Circle;
  export type CircleConfig = import('./shapes/Circle.js').CircleConfig;
  export const Ellipse: typeof import('./shapes/Ellipse.js').Ellipse;
  export type Ellipse = import('./shapes/Ellipse.js').Ellipse;
  export type EllipseConfig = import('./shapes/Ellipse.js').EllipseConfig;
  export const Image: typeof import('./shapes/Image.js').Image;
  export type Image = import('./shapes/Image.js').Image;
  export type ImageConfig = import('./shapes/Image.js').ImageConfig;
  export const Label: typeof import('./shapes/Label.js').Label;
  export type Label = import('./shapes/Label.js').Label;
  export type LabelConfig = import('./shapes/Label.js').LabelConfig;
  export const Tag: typeof import('./shapes/Label.js').Tag;
  export type Tag = import('./shapes/Label.js').Tag;
  export type TagConfig = import('./shapes/Label.js').TagConfig;
  export const Line: typeof import('./shapes/Line.js').Line;
  export type Line = import('./shapes/Line.js').Line;
  export type LineConfig = import('./shapes/Line.js').LineConfig;
  export const Path: typeof import('./shapes/Path.js').Path;
  export type Path = import('./shapes/Path.js').Path;
  export type PathConfig = import('./shapes/Path.js').PathConfig;
  export const Rect: typeof import('./shapes/Rect.js').Rect;
  export type Rect = import('./shapes/Rect.js').Rect;
  export type RectConfig = import('./shapes/Rect.js').RectConfig;
  export const RegularPolygon: typeof import('./shapes/RegularPolygon.js').RegularPolygon;
  export type RegularPolygon = import('./shapes/RegularPolygon.js').RegularPolygon;
  export type RegularPolygonConfig =
    import('./shapes/RegularPolygon.js').RegularPolygonConfig;
  export const Ring: typeof import('./shapes/Ring.js').Ring;
  export type Ring = import('./shapes/Ring.js').Ring;
  export type RingConfig = import('./shapes/Ring.js').RingConfig;
  export const Sprite: typeof import('./shapes/Sprite.js').Sprite;
  export type Sprite = import('./shapes/Sprite.js').Sprite;
  export type SpriteConfig = import('./shapes/Sprite.js').SpriteConfig;
  export const Star: typeof import('./shapes/Star.js').Star;
  export type Star = import('./shapes/Star.js').Star;
  export type StarConfig = import('./shapes/Star.js').StarConfig;
  export const Text: typeof import('./shapes/Text.js').Text;
  export type Text = import('./shapes/Text.js').Text;
  export type TextConfig = import('./shapes/Text.js').TextConfig;
  export const TextPath: typeof import('./shapes/TextPath.js').TextPath;
  export type TextPath = import('./shapes/TextPath.js').TextPath;
  export type TextPathConfig = import('./shapes/TextPath.js').TextPathConfig;
  export const Transformer: typeof import('./shapes/Transformer.js').Transformer;
  export type Transformer = import('./shapes/Transformer.js').Transformer;
  export type TransformerConfig =
    import('./shapes/Transformer.js').TransformerConfig;
  export const Wedge: typeof import('./shapes/Wedge.js').Wedge;
  export type Wedge = import('./shapes/Wedge.js').Wedge;
  export type WedgeConfig = import('./shapes/Wedge.js').WedgeConfig;

  export const Filters: {
    Blur: typeof Blur;
    Brighten: typeof Brighten;
    Contrast: typeof Contrast;
    Emboss: typeof Emboss;
    Enhance: typeof Enhance;
    Grayscale: typeof Grayscale;
    HSL: typeof HSL;
    HSV: typeof HSV;
    Invert: typeof Invert;
    Kaleidoscope: typeof Kaleidoscope;
    Mask: typeof Mask;
    Noise: typeof Noise;
    Pixelate: typeof Pixelate;
    Posterize: typeof Posterize;
    RGB: typeof RGB;
    RGBA: typeof RGBA;
    Sepia: typeof Sepia;
    Solarize: typeof Solarize;
    Threshold: typeof Threshold;
  };
}

export default Konva;
