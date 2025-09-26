export function getC4Type(): any;
export function setC4Type(c4TypeParam: any): void;
export function addRel(type: any, from: any, to: any, label: any, techn: any, descr: any, sprite: any, tags: any, link: any): void;
export function addPersonOrSystem(typeC4Shape: any, alias: any, label: any, descr: any, sprite: any, tags: any, link: any): void;
export function addContainer(typeC4Shape: any, alias: any, label: any, techn: any, descr: any, sprite: any, tags: any, link: any): void;
export function addComponent(typeC4Shape: any, alias: any, label: any, techn: any, descr: any, sprite: any, tags: any, link: any): void;
export function addPersonOrSystemBoundary(alias: any, label: any, type: any, tags: any, link: any): void;
export function addContainerBoundary(alias: any, label: any, type: any, tags: any, link: any): void;
export function addDeploymentNode(nodeType: any, alias: any, label: any, type: any, descr: any, sprite: any, tags: any, link: any): void;
export function popBoundaryParseStack(): void;
export function updateElStyle(typeC4Shape: any, elementName: any, bgColor: any, fontColor: any, borderColor: any, shadowing: any, shape: any, sprite: any, techn: any, legendText: any, legendSprite: any): void;
export function updateRelStyle(typeC4Shape: any, from: any, to: any, textColor: any, lineColor: any, offsetX: any, offsetY: any): void;
export function updateLayoutConfig(typeC4Shape: any, c4ShapeInRowParam: any, c4BoundaryInRowParam: any): void;
export function getC4ShapeInRow(): number;
export function getC4BoundaryInRow(): number;
export function getCurrentBoundaryParse(): string;
export function getParentBoundaryParse(): string;
export function getC4ShapeArray(parentBoundary: any): any[];
export function getC4Shape(alias: any): any;
export function getC4ShapeKeys(parentBoundary: any): string[];
export function getBoundaries(parentBoundary: any): {
    alias: string;
    label: {
        text: string;
    };
    type: {
        text: string;
    };
    tags: null;
    link: null;
    parentBoundary: string;
}[];
export function getBoundarys(parentBoundary: any): {
    alias: string;
    label: {
        text: string;
    };
    type: {
        text: string;
    };
    tags: null;
    link: null;
    parentBoundary: string;
}[];
export function getRels(): any[];
export function getTitle(): string;
export function setWrap(wrapSetting: any): void;
export function autoWrap(): boolean;
export function clear(): void;
export namespace LINETYPE {
    let SOLID: number;
    let DOTTED: number;
    let NOTE: number;
    let SOLID_CROSS: number;
    let DOTTED_CROSS: number;
    let SOLID_OPEN: number;
    let DOTTED_OPEN: number;
    let LOOP_START: number;
    let LOOP_END: number;
    let ALT_START: number;
    let ALT_ELSE: number;
    let ALT_END: number;
    let OPT_START: number;
    let OPT_END: number;
    let ACTIVE_START: number;
    let ACTIVE_END: number;
    let PAR_START: number;
    let PAR_AND: number;
    let PAR_END: number;
    let RECT_START: number;
    let RECT_END: number;
    let SOLID_POINT: number;
    let DOTTED_POINT: number;
}
export namespace ARROWTYPE {
    let FILLED: number;
    let OPEN: number;
}
export namespace PLACEMENT {
    let LEFTOF: number;
    let RIGHTOF: number;
    let OVER: number;
}
export function setTitle(txt: any): void;
declare namespace _default {
    export { addPersonOrSystem };
    export { addPersonOrSystemBoundary };
    export { addContainer };
    export { addContainerBoundary };
    export { addComponent };
    export { addDeploymentNode };
    export { popBoundaryParseStack };
    export { addRel };
    export { updateElStyle };
    export { updateRelStyle };
    export { updateLayoutConfig };
    export { autoWrap };
    export { setWrap };
    export { getC4ShapeArray };
    export { getC4Shape };
    export { getC4ShapeKeys };
    export { getBoundaries };
    export { getBoundarys };
    export { getCurrentBoundaryParse };
    export { getParentBoundaryParse };
    export { getRels };
    export { getTitle };
    export { getC4Type };
    export { getC4ShapeInRow };
    export { getC4BoundaryInRow };
    export { setAccTitle };
    export { getAccTitle };
    export { getAccDescription };
    export { setAccDescription };
    export function getConfig(): import("../../config.type.js").C4DiagramConfig | undefined;
    export { clear };
    export { LINETYPE };
    export { ARROWTYPE };
    export { PLACEMENT };
    export { setTitle };
    export { setC4Type };
}
export default _default;
import { setAccTitle } from '../common/commonDb.js';
import { getAccTitle } from '../common/commonDb.js';
import { getAccDescription } from '../common/commonDb.js';
import { setAccDescription } from '../common/commonDb.js';
