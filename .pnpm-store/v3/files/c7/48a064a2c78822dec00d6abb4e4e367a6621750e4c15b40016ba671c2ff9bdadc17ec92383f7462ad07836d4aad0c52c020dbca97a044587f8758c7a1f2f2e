import type { DiagramDB } from '../../diagram-api/types.js';
import type { Actor, AddMessageParams, Box, Message } from './types.js';
declare const LINETYPE: {
    readonly SOLID: 0;
    readonly DOTTED: 1;
    readonly NOTE: 2;
    readonly SOLID_CROSS: 3;
    readonly DOTTED_CROSS: 4;
    readonly SOLID_OPEN: 5;
    readonly DOTTED_OPEN: 6;
    readonly LOOP_START: 10;
    readonly LOOP_END: 11;
    readonly ALT_START: 12;
    readonly ALT_ELSE: 13;
    readonly ALT_END: 14;
    readonly OPT_START: 15;
    readonly OPT_END: 16;
    readonly ACTIVE_START: 17;
    readonly ACTIVE_END: 18;
    readonly PAR_START: 19;
    readonly PAR_AND: 20;
    readonly PAR_END: 21;
    readonly RECT_START: 22;
    readonly RECT_END: 23;
    readonly SOLID_POINT: 24;
    readonly DOTTED_POINT: 25;
    readonly AUTONUMBER: 26;
    readonly CRITICAL_START: 27;
    readonly CRITICAL_OPTION: 28;
    readonly CRITICAL_END: 29;
    readonly BREAK_START: 30;
    readonly BREAK_END: 31;
    readonly PAR_OVER_START: 32;
    readonly BIDIRECTIONAL_SOLID: 33;
    readonly BIDIRECTIONAL_DOTTED: 34;
};
declare const ARROWTYPE: {
    readonly FILLED: 0;
    readonly OPEN: 1;
};
declare const PLACEMENT: {
    readonly LEFTOF: 0;
    readonly RIGHTOF: 1;
    readonly OVER: 2;
};
export declare const PARTICIPANT_TYPE: {
    readonly ACTOR: "actor";
    readonly BOUNDARY: "boundary";
    readonly COLLECTIONS: "collections";
    readonly CONTROL: "control";
    readonly DATABASE: "database";
    readonly ENTITY: "entity";
    readonly PARTICIPANT: "participant";
    readonly QUEUE: "queue";
};
export declare class SequenceDB implements DiagramDB {
    private readonly state;
    constructor();
    addBox(data: {
        text: string;
        color: string;
        wrap: boolean;
    }): void;
    addActor(id: string, name: string, description: {
        text: string;
        wrap?: boolean | null;
        type: string;
    }, type: string, metadata?: any): void;
    private activationCount;
    addMessage(idFrom: Message['from'], idTo: Message['to'], message: {
        text: string;
        wrap?: boolean;
    }, answer: Message['answer']): void;
    addSignal(idFrom?: Message['from'], idTo?: Message['to'], message?: {
        text: string;
        wrap: boolean;
    }, messageType?: number, activate?: boolean): boolean;
    hasAtLeastOneBox(): boolean;
    hasAtLeastOneBoxWithTitle(): boolean;
    getMessages(): Message[];
    getBoxes(): Box[];
    getActors(): Map<string, Actor>;
    getCreatedActors(): Map<string, number>;
    getDestroyedActors(): Map<string, number>;
    getActor(id: string): Actor;
    getActorKeys(): string[];
    enableSequenceNumbers(): void;
    disableSequenceNumbers(): void;
    showSequenceNumbers(): boolean;
    setWrap(wrapSetting?: boolean): void;
    private extractWrap;
    autoWrap(): boolean;
    clear(): void;
    parseMessage(str: string): {
        text: string | undefined;
        wrap: boolean | undefined;
    };
    parseBoxData(str: string): {
        text: string | undefined;
        color: string;
        wrap: boolean | undefined;
    };
    readonly LINETYPE: typeof LINETYPE;
    readonly ARROWTYPE: typeof ARROWTYPE;
    readonly PLACEMENT: typeof PLACEMENT;
    addNote(actor: {
        actor: string;
    }, placement: Message['placement'], message: {
        text: string;
        wrap?: boolean;
    }): void;
    addLinks(actorId: string, text: {
        text: string;
    }): void;
    addALink(actorId: string, text: {
        text: string;
    }): void;
    private insertLinks;
    addProperties(actorId: string, text: {
        text: string;
    }): void;
    private insertProperties;
    private boxEnd;
    addDetails(actorId: string, text: {
        text: string;
    }): void;
    getActorProperty(actor: Actor, key: string): unknown;
    apply(param: any | AddMessageParams | AddMessageParams[]): void;
    setAccTitle: (txt: string) => void;
    setAccDescription: (txt: string) => void;
    setDiagramTitle: (txt: string) => void;
    getAccTitle: () => string;
    getAccDescription: () => string;
    getDiagramTitle: () => string;
    getConfig(): import("../../config.type.js").SequenceDiagramConfig | undefined;
}
export {};
