export function drawRect(elem: any, rectData: any): import("../common/commonTypes.js").D3RectElement;
export function drawImage(elem: any, width: any, height: any, x: any, y: any, link: any): void;
export function drawRels(elem: any, rels: any, conf: any): void;
export function drawC4Shape(elem: any, c4Shape: any, conf: any): any;
export function insertDatabaseIcon(elem: any): void;
export function insertComputerIcon(elem: any): void;
export function insertClockIcon(elem: any): void;
export function insertArrowHead(elem: any): void;
export function insertArrowEnd(elem: any): void;
export function insertArrowFilledHead(elem: any): void;
export function insertDynamicNumber(elem: any): void;
export function insertArrowCrossHead(elem: any): void;
declare namespace _default {
    export { drawRect };
    export { drawBoundary };
    export { drawC4Shape };
    export { drawRels };
    export { drawImage };
    export { insertArrowHead };
    export { insertArrowEnd };
    export { insertArrowFilledHead };
    export { insertDynamicNumber };
    export { insertArrowCrossHead };
    export { insertDatabaseIcon };
    export { insertComputerIcon };
    export { insertClockIcon };
}
export default _default;
/**
 * Draws a boundary in the diagram
 *
 * @param {any} elem - The diagram we'll draw to.
 * @param {any} boundary - The boundary to draw.
 * @param {any} conf - DrawText implementation discriminator object
 */
declare function drawBoundary(elem: any, boundary: any, conf: any): void;
