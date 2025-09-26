export function drawRect(elem: any, rectData: any): any;
export function drawFace(element: any, faceData: any): any;
export function drawCircle(element: any, circleData: any): any;
export function drawText(elem: any, textData: any): any;
export function drawLabel(elem: any, txtObject: any): void;
export function drawSection(elem: any, section: any, conf: any): void;
export function drawTask(elem: any, task: any, conf: any): void;
export function drawBackgroundRect(elem: any, bounds: any): void;
export function getTextObj(): {
    x: number;
    y: number;
    fill: undefined;
    'text-anchor': string;
    width: number;
    height: number;
    textMargin: number;
    rx: number;
    ry: number;
};
export function getNoteRect(): {
    x: number;
    y: number;
    width: number;
    anchor: string;
    height: number;
    rx: number;
    ry: number;
};
export function drawNode(elem: any, node: any, fullSection: any, conf: any): any;
export function getVirtualNodeHeight(elem: any, node: any, conf: any): any;
declare namespace _default {
    export { drawRect };
    export { drawCircle };
    export { drawSection };
    export { drawText };
    export { drawLabel };
    export { drawTask };
    export { drawBackgroundRect };
    export { getTextObj };
    export { getNoteRect };
    export { initGraphics };
    export { drawNode };
    export { getVirtualNodeHeight };
}
export default _default;
declare function initGraphics(graphics: any): void;
