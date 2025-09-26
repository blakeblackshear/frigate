import * as db from './timelineDb.js';
export declare const diagram: {
    db: typeof db;
    renderer: {
        setConf: () => void;
        draw: (text: string, id: string, version: string, diagObj: import("../../Diagram.js").Diagram) => void;
    };
    parser: any;
    styles: (options: any) => string;
};
