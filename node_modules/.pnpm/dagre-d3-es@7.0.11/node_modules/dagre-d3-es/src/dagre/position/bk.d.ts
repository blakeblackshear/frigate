export function positionX(g: any): {
    [x: string]: any;
};
export function findType1Conflicts(g: any, layering: any): {};
export function findType2Conflicts(g: any, layering: any): {};
export function addConflict(conflicts: any, v: any, w: any): void;
export function hasConflict(conflicts: any, v: any, w: any): any;
export function verticalAlignment(g: any, layering: any, conflicts: any, neighborFn: any): {
    root: {};
    align: {};
};
export function horizontalCompaction(g: any, layering: any, root: any, align: any, reverseSep: any): {};
export function alignCoordinates(xss: any, alignTo: any): void;
export function findSmallestWidthAlignment(g: any, xss: any): any;
export function balance(xss: any, align: any): {
    [x: string]: any;
};
