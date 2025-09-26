export declare const setConf: (cnf: any) => void;
export declare const draw: (text: any, id: any, version: any, diagObj: any) => void;
export declare const bounds: {
    data: {
        startx: undefined;
        stopx: undefined;
        starty: undefined;
        stopy: undefined;
    };
    verticalPos: number;
    sequenceItems: never[];
    init: () => void;
    updateVal: (obj: any, key: any, val: any, fun: any) => void;
    updateBounds: (startx: any, starty: any, stopx: any, stopy: any) => void;
    insert: (startx: any, starty: any, stopx: any, stopy: any) => void;
    bumpVerticalPos: (bump: any) => void;
    getVerticalPos: () => number;
    getBounds: () => {
        startx: undefined;
        stopx: undefined;
        starty: undefined;
        stopy: undefined;
    };
};
export declare const drawTasks: (diagram: any, tasks: any, verticalPos: any) => void;
declare const _default: {
    setConf: (cnf: any) => void;
    draw: (text: any, id: any, version: any, diagObj: any) => void;
};
export default _default;
