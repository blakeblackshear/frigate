import type { ClassRelation, ClassNode, ClassNote, ClassMap, NamespaceMap, NamespaceNode } from './classTypes.js';
import type { Node, Edge } from '../../rendering-util/types.js';
import type { DiagramDB } from '../../diagram-api/types.js';
export declare class ClassDB implements DiagramDB {
    private relations;
    private classes;
    private readonly styleClasses;
    private notes;
    private interfaces;
    private namespaces;
    private namespaceCounter;
    private functions;
    constructor();
    private splitClassNameAndType;
    setClassLabel(_id: string, label: string): void;
    /**
     * Function called by parser when a node definition has been found.
     *
     * @param id - ID of the class to add
     * @public
     */
    addClass(_id: string): void;
    private addInterface;
    /**
     * Function to lookup domId from id in the graph definition.
     *
     * @param id - class ID to lookup
     * @public
     */
    lookUpDomId(_id: string): string;
    clear(): void;
    getClass(id: string): ClassNode;
    getClasses(): ClassMap;
    getRelations(): ClassRelation[];
    getNotes(): ClassNote[];
    addRelation(classRelation: ClassRelation): void;
    /**
     * Adds an annotation to the specified class Annotations mark special properties of the given type
     * (like 'interface' or 'service')
     *
     * @param className - The class name
     * @param annotation - The name of the annotation without any brackets
     * @public
     */
    addAnnotation(className: string, annotation: string): void;
    /**
     * Adds a member to the specified class
     *
     * @param className - The class name
     * @param member - The full name of the member. If the member is enclosed in `<<brackets>>` it is
     *   treated as an annotation If the member is ending with a closing bracket ) it is treated as a
     *   method Otherwise the member will be treated as a normal property
     * @public
     */
    addMember(className: string, member: string): void;
    addMembers(className: string, members: string[]): void;
    addNote(text: string, className: string): void;
    cleanupLabel(label: string): string;
    /**
     * Called by parser when assigning cssClass to a class
     *
     * @param ids - Comma separated list of ids
     * @param className - Class to add
     */
    setCssClass(ids: string, className: string): void;
    defineClass(ids: string[], style: string[]): void;
    /**
     * Called by parser when a tooltip is found, e.g. a clickable element.
     *
     * @param ids - Comma separated list of ids
     * @param tooltip - Tooltip to add
     */
    setTooltip(ids: string, tooltip?: string): void;
    getTooltip(id: string, namespace?: string): string | undefined;
    /**
     * Called by parser when a link is found. Adds the URL to the vertex data.
     *
     * @param ids - Comma separated list of ids
     * @param linkStr - URL to create a link for
     * @param target - Target of the link, _blank by default as originally defined in the svgDraw.js file
     */
    setLink(ids: string, linkStr: string, target: string): void;
    /**
     * Called by parser when a click definition is found. Registers an event handler.
     *
     * @param ids - Comma separated list of ids
     * @param functionName - Function to be called on click
     * @param functionArgs - Function args the function should be called with
     */
    setClickEvent(ids: string, functionName: string, functionArgs: string): void;
    private setClickFunc;
    bindFunctions(element: Element): void;
    readonly lineType: {
        LINE: number;
        DOTTED_LINE: number;
    };
    readonly relationType: {
        AGGREGATION: number;
        EXTENSION: number;
        COMPOSITION: number;
        DEPENDENCY: number;
        LOLLIPOP: number;
    };
    private readonly setupToolTips;
    private direction;
    getDirection(): string;
    setDirection(dir: string): void;
    /**
     * Function called by parser when a namespace definition has been found.
     *
     * @param id - ID of the namespace to add
     * @public
     */
    addNamespace(id: string): void;
    getNamespace(name: string): NamespaceNode;
    getNamespaces(): NamespaceMap;
    /**
     * Function called by parser when a namespace definition has been found.
     *
     * @param id - ID of the namespace to add
     * @param classNames - IDs of the class to add
     * @public
     */
    addClassesToNamespace(id: string, classNames: string[]): void;
    setCssStyle(id: string, styles: string[]): void;
    /**
     * Gets the arrow marker for a type index
     *
     * @param type - The type to look for
     * @returns The arrow marker
     */
    private getArrowMarker;
    getData(): {
        nodes: Node[];
        edges: Edge[];
        other: {};
        config: import("../../config.type.js").MermaidConfig;
        direction: string;
    };
    setAccTitle: (txt: string) => void;
    getAccTitle: () => string;
    setAccDescription: (txt: string) => void;
    getAccDescription: () => string;
    setDiagramTitle: (txt: string) => void;
    getDiagramTitle: () => string;
    getConfig: () => import("../../config.type.js").ClassDiagramConfig | undefined;
}
