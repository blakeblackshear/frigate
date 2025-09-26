export interface GetSet<Type, This> {
    (): Type;
    (v: Type | null | undefined): This;
}
export interface Vector2d {
    x: number;
    y: number;
}
export interface PathSegment {
    command: 'm' | 'M' | 'l' | 'L' | 'v' | 'V' | 'h' | 'H' | 'z' | 'Z' | 'c' | 'C' | 'q' | 'Q' | 't' | 'T' | 's' | 'S' | 'a' | 'A';
    start: Vector2d;
    points: number[];
    pathLength: number;
}
export interface IRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface IFrame {
    time: number;
    timeDiff: number;
    lastTime: number;
    frameRate: number;
}
export type AnimationFn = (frame?: IFrame) => boolean | void;
export declare enum KonvaNodeEvent {
    mouseover = "mouseover",
    mouseout = "mouseout",
    mousemove = "mousemove",
    mouseleave = "mouseleave",
    mouseenter = "mouseenter",
    mousedown = "mousedown",
    mouseup = "mouseup",
    wheel = "wheel",
    contextmenu = "contextmenu",
    click = "click",
    dblclick = "dblclick",
    touchstart = "touchstart",
    touchmove = "touchmove",
    touchend = "touchend",
    tap = "tap",
    dbltap = "dbltap",
    dragstart = "dragstart",
    dragmove = "dragmove",
    dragend = "dragend"
}
export interface RGB {
    r: number;
    g: number;
    b: number;
}
export interface RGBA extends RGB {
    a: number;
}
