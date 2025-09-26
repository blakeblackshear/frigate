import type { Diagram } from '../../Diagram.js';
export declare const bounds: {
    data: {
        startx: undefined;
        stopx: undefined;
        starty: undefined;
        stopy: undefined;
    };
    verticalPos: number;
    sequenceItems: never[];
    activations: never[];
    models: {
        getHeight: () => any;
        clear: () => void;
        addBox: (boxModel: any) => void;
        addActor: (actorModel: any) => void;
        addLoop: (loopModel: any) => void;
        addMessage: (msgModel: any) => void;
        addNote: (noteModel: any) => void;
        lastActor: () => never;
        lastLoop: () => never;
        lastMessage: () => never;
        lastNote: () => never;
        actors: never[];
        boxes: never[];
        loops: never[];
        messages: never[];
        notes: never[];
    };
    init: () => void;
    updateVal: (obj: any, key: any, val: any, fun: any) => void;
    updateBounds: (startx: any, starty: any, stopx: any, stopy: any) => void;
    insert: (startx: any, starty: any, stopx: any, stopy: any) => void;
    newActivation: (message: any, diagram: any, actors: any) => void;
    endActivation: (message: any) => never;
    createLoop: (title: {
        message: undefined;
        wrap: boolean;
        width: undefined;
    } | undefined, fill: any) => {
        startx: undefined;
        starty: number;
        stopx: undefined;
        stopy: undefined;
        title: undefined;
        wrap: boolean;
        width: undefined;
        height: number;
        fill: any;
    };
    newLoop: (title: {
        message: undefined;
        wrap: boolean;
        width: undefined;
    } | undefined, fill: any) => void;
    endLoop: () => undefined;
    isLoopOverlap: () => any;
    addSectionToLoop: (message: any) => void;
    saveVerticalPos: () => void;
    resetVerticalPos: () => void;
    bumpVerticalPos: (bump: any) => void;
    getVerticalPos: () => number;
    getBounds: () => {
        bounds: {
            startx: undefined;
            stopx: undefined;
            starty: undefined;
            stopy: undefined;
        };
        models: {
            getHeight: () => any;
            clear: () => void;
            addBox: (boxModel: any) => void;
            addActor: (actorModel: any) => void;
            addLoop: (loopModel: any) => void;
            addMessage: (msgModel: any) => void;
            addNote: (noteModel: any) => void;
            lastActor: () => never;
            lastLoop: () => never;
            lastMessage: () => never;
            lastNote: () => never;
            actors: never[];
            boxes: never[];
            loops: never[];
            messages: never[];
            notes: never[];
        };
    };
};
export declare const drawActors: (diagram: any, actors: any, actorKeys: any, isFooter: any) => Promise<void>;
export declare const drawActorsPopup: (diagram: any, actors: any, actorKeys: any, doc: any) => {
    maxHeight: number;
    maxWidth: number;
};
export declare const setConf: (cnf: any) => void;
/**
 * Draws a sequenceDiagram in the tag with id: id based on the graph definition in text.
 *
 * @param _text - The text of the diagram
 * @param id - The id of the diagram which will be used as a DOM element id¨
 * @param _version - Mermaid version from package.json
 * @param diagObj - A standard diagram containing the db and the text and type etc of the diagram
 */
export declare const draw: (_text: string, id: string, _version: string, diagObj: Diagram) => Promise<void>;
declare const _default: {
    bounds: {
        data: {
            startx: undefined;
            stopx: undefined;
            starty: undefined;
            stopy: undefined;
        };
        verticalPos: number;
        sequenceItems: never[];
        activations: never[];
        models: {
            getHeight: () => any;
            clear: () => void;
            addBox: (boxModel: any) => void;
            addActor: (actorModel: any) => void;
            addLoop: (loopModel: any) => void;
            addMessage: (msgModel: any) => void;
            addNote: (noteModel: any) => void;
            lastActor: () => never;
            lastLoop: () => never;
            lastMessage: () => never;
            lastNote: () => never;
            actors: never[];
            boxes: never[];
            loops: never[];
            messages: never[];
            notes: never[];
        };
        init: () => void;
        updateVal: (obj: any, key: any, val: any, fun: any) => void;
        updateBounds: (startx: any, starty: any, stopx: any, stopy: any) => void;
        insert: (startx: any, starty: any, stopx: any, stopy: any) => void;
        newActivation: (message: any, diagram: any, actors: any) => void;
        endActivation: (message: any) => never;
        createLoop: (title: {
            message: undefined;
            wrap: boolean;
            width: undefined;
        } | undefined, fill: any) => {
            startx: undefined;
            starty: number;
            stopx: undefined;
            stopy: undefined;
            title: undefined;
            wrap: boolean;
            width: undefined;
            height: number;
            fill: any;
        };
        newLoop: (title: {
            message: undefined;
            wrap: boolean;
            width: undefined;
        } | undefined, fill: any) => void;
        endLoop: () => undefined;
        isLoopOverlap: () => any;
        addSectionToLoop: (message: any) => void;
        saveVerticalPos: () => void;
        resetVerticalPos: () => void;
        bumpVerticalPos: (bump: any) => void;
        getVerticalPos: () => number;
        getBounds: () => {
            bounds: {
                startx: undefined;
                stopx: undefined;
                starty: undefined;
                stopy: undefined;
            };
            models: {
                getHeight: () => any;
                clear: () => void;
                addBox: (boxModel: any) => void;
                addActor: (actorModel: any) => void;
                addLoop: (loopModel: any) => void;
                addMessage: (msgModel: any) => void;
                addNote: (noteModel: any) => void;
                lastActor: () => never;
                lastLoop: () => never;
                lastMessage: () => never;
                lastNote: () => never;
                actors: never[];
                boxes: never[];
                loops: never[];
                messages: never[];
                notes: never[];
            };
        };
    };
    drawActors: (diagram: any, actors: any, actorKeys: any, isFooter: any) => Promise<void>;
    drawActorsPopup: (diagram: any, actors: any, actorKeys: any, doc: any) => {
        maxHeight: number;
        maxWidth: number;
    };
    setConf: (cnf: any) => void;
    draw: (_text: string, id: string, _version: string, diagObj: Diagram) => Promise<void>;
};
export default _default;
