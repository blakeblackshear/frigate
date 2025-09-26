import type { MermaidConfig } from '../../config.type.js';
interface BaseStmt {
    stmt: 'applyClass' | 'classDef' | 'dir' | 'relation' | 'state' | 'style' | 'root' | 'default' | 'click';
}
interface ApplyClassStmt extends BaseStmt {
    stmt: 'applyClass';
    id: string;
    styleClass: string;
}
interface ClassDefStmt extends BaseStmt {
    stmt: 'classDef';
    id: string;
    classes: string;
}
interface DirectionStmt extends BaseStmt {
    stmt: 'dir';
    value: 'TB' | 'BT' | 'RL' | 'LR';
}
interface RelationStmt extends BaseStmt {
    stmt: 'relation';
    state1: StateStmt;
    state2: StateStmt;
    description?: string;
}
export interface StateStmt extends BaseStmt {
    stmt: 'state' | 'default';
    id: string;
    type: 'default' | 'fork' | 'join' | 'choice' | 'divider' | 'start' | 'end';
    description?: string;
    descriptions?: string[];
    doc?: Stmt[];
    note?: Note;
    start?: boolean;
    classes?: string[];
    styles?: string[];
    textStyles?: string[];
}
interface StyleStmt extends BaseStmt {
    stmt: 'style';
    id: string;
    styleClass: string;
}
export interface RootStmt {
    id: 'root';
    stmt: 'root';
    doc?: Stmt[];
}
export interface ClickStmt extends BaseStmt {
    stmt: 'click';
    id: string;
    url: string;
    tooltip: string;
}
interface Note {
    position?: 'left of' | 'right of';
    text: string;
}
export type Stmt = ApplyClassStmt | ClassDefStmt | DirectionStmt | RelationStmt | StateStmt | StyleStmt | RootStmt | ClickStmt;
interface DiagramEdge {
    id1: string;
    id2: string;
    relationTitle?: string;
}
export interface StyleClass {
    id: string;
    styles: string[];
    textStyles: string[];
}
export interface NodeData {
    labelStyle?: string;
    shape: string;
    label?: string | string[];
    cssClasses: string;
    cssCompiledStyles?: string[];
    cssStyles: string[];
    id: string;
    dir?: string;
    domId?: string;
    type?: string;
    isGroup?: boolean;
    padding?: number;
    rx?: number;
    ry?: number;
    look?: MermaidConfig['look'];
    parentId?: string;
    centerLabel?: boolean;
    position?: string;
    description?: string | string[];
}
export interface Edge {
    id: string;
    start: string;
    end: string;
    arrowhead: string;
    arrowTypeEnd: string;
    style: string;
    labelStyle: string;
    label?: string;
    arrowheadStyle: string;
    labelpos: string;
    labelType: string;
    thickness: string;
    classes: string;
    look: MermaidConfig['look'];
}
export declare class StateDB {
    private version;
    private nodes;
    private edges;
    private rootDoc;
    private classes;
    private documents;
    private currentDocument;
    private startEndCount;
    private dividerCnt;
    private links;
    static readonly relationType: {
        readonly AGGREGATION: 0;
        readonly EXTENSION: 1;
        readonly COMPOSITION: 2;
        readonly DEPENDENCY: 3;
    };
    constructor(version: 1 | 2);
    /**
     * Convert all of the statements (stmts) that were parsed into states and relationships.
     * This is done because a state diagram may have nested sections,
     * where each section is a 'document' and has its own set of statements.
     * Ex: the section within a fork has its own statements, and incoming and outgoing statements
     * refer to the fork as a whole (document).
     * See the parser grammar:  the definition of a document is a document then a 'line', where a line can be a statement.
     * This will push the statement into the list of statements for the current document.
     */
    extract(statements: Stmt[] | {
        doc: Stmt[];
    }): void;
    private handleStyleDef;
    setRootDoc(o: Stmt[]): void;
    docTranslator(parent: RootStmt | StateStmt, node: Stmt, first: boolean): void;
    private getRootDocV2;
    /**
     * Function called by parser when a node definition has been found.
     *
     * @param descr - description for the state. Can be a string or a list or strings
     * @param classes - class styles to apply to this state. Can be a string (1 style) or an array of styles. If it's just 1 class, convert it to an array of that 1 class.
     * @param styles - styles to apply to this state. Can be a string (1 style) or an array of styles. If it's just 1 style, convert it to an array of that 1 style.
     * @param textStyles - text styles to apply to this state. Can be a string (1 text test) or an array of text styles. If it's just 1 text style, convert it to an array of that 1 text style.
     */
    addState(id: string, type?: StateStmt['type'], doc?: Stmt[] | undefined, descr?: string | string[] | undefined, note?: Note | undefined, classes?: string | string[] | undefined, styles?: string | string[] | undefined, textStyles?: string | string[] | undefined): void;
    clear(saveCommon?: boolean): void;
    getState(id: string): StateStmt | undefined;
    getStates(): Map<string, StateStmt>;
    logDocuments(): void;
    getRelations(): DiagramEdge[];
    /**
     * Adds a clickable link to a state.
     */
    addLink(stateId: string, url: string, tooltip: string): void;
    /**
     * Get all registered links.
     */
    getLinks(): Map<string, {
        url: string;
        tooltip: string;
    }>;
    /**
     * If the id is a start node ( [*] ), then return a new id constructed from
     * the start node name and the current start node count.
     * else return the given id
     */
    startIdIfNeeded(id?: string): string;
    /**
     * If the id is a start node ( [*] ), then return the start type ('start')
     * else return the given type
     */
    startTypeIfNeeded(id?: string, type?: StateStmt['type']): "join" | "default" | "start" | "end" | "divider" | "choice" | "fork";
    /**
     * If the id is an end node ( [*] ), then return a new id constructed from
     * the end node name and the current start_end node count.
     * else return the given id
     */
    endIdIfNeeded(id?: string): string;
    /**
     * If the id is an end node ( [*] ), then return the end type
     * else return the given type
     *
     */
    endTypeIfNeeded(id?: string, type?: StateStmt['type']): "join" | "default" | "start" | "end" | "divider" | "choice" | "fork";
    addRelationObjs(item1: StateStmt, item2: StateStmt, relationTitle?: string): void;
    /**
     * Add a relation between two items.  The items may be full objects or just the string id of a state.
     */
    addRelation(item1: string | StateStmt, item2: string | StateStmt, title?: string): void;
    addDescription(id: string, descr: string): void;
    cleanupLabel(label: string): string;
    getDividerId(): string;
    /**
     * Called when the parser comes across a (style) class definition
     * @example classDef my-style fill:#f96;
     *
     * @param id - the id of this (style) class
     * @param styleAttributes - the string with 1 or more style attributes (each separated by a comma)
     */
    addStyleClass(id: string, styleAttributes?: string): void;
    getClasses(): Map<string, StyleClass>;
    /**
     * Add a (style) class or css class to a state with the given id.
     * If the state isn't already in the list of known states, add it.
     * Might be called by parser when a style class or CSS class should be applied to a state
     *
     * @param itemIds - The id or a list of ids of the item(s) to apply the css class to
     * @param cssClassName - CSS class name
     */
    setCssClass(itemIds: string, cssClassName: string): void;
    /**
     * Add a style to a state with the given id.
     * @example style stateId fill:#f9f,stroke:#333,stroke-width:4px
     *   where 'style' is the keyword
     *   stateId is the id of a state
     *   the rest of the string is the styleText (all of the attributes to be applied to the state)
     *
     * @param itemId - The id of item to apply the style to
     * @param styleText - the text of the attributes for the style
     */
    setStyle(itemId: string, styleText: string): void;
    /**
     * Add a text style to a state with the given id
     *
     * @param itemId - The id of item to apply the css class to
     * @param cssClassName - CSS class name
     */
    setTextStyle(itemId: string, cssClassName: string): void;
    /**
     * Finds the direction statement in the root document.
     * @returns the direction statement if present
     */
    private getDirectionStatement;
    getDirection(): "TB" | "BT" | "LR" | "RL";
    setDirection(dir: DirectionStmt['value']): void;
    trimColon(str: string): string;
    getData(): {
        nodes: NodeData[];
        edges: Edge[];
        other: {};
        config: MermaidConfig;
        direction: string;
    };
    getConfig(): import("../../config.type.js").StateDiagramConfig | undefined;
    getAccTitle: () => string;
    setAccTitle: (txt: string) => void;
    getAccDescription: () => string;
    setAccDescription: (txt: string) => void;
    setDiagramTitle: (txt: string) => void;
    getDiagramTitle: () => string;
}
export {};
