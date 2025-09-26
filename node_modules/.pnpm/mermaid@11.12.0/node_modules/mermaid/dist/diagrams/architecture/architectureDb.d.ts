import type { ArchitectureDiagramConfig } from '../../config.type.js';
import type { DiagramDB } from '../../diagram-api/types.js';
import type { D3Element } from '../../types.js';
import type { ArchitectureEdge, ArchitectureGroup, ArchitectureJunction, ArchitectureNode, ArchitectureService } from './architectureTypes.js';
export declare class ArchitectureDB implements DiagramDB {
    private nodes;
    private groups;
    private edges;
    private registeredIds;
    private dataStructures?;
    private elements;
    constructor();
    clear(): void;
    addService({ id, icon, in: parent, title, iconText, }: Omit<ArchitectureService, 'edges'>): void;
    getServices(): ArchitectureService[];
    addJunction({ id, in: parent }: Omit<ArchitectureJunction, 'edges'>): void;
    getJunctions(): ArchitectureJunction[];
    getNodes(): ArchitectureNode[];
    getNode(id: string): ArchitectureNode | null;
    addGroup({ id, icon, in: parent, title }: ArchitectureGroup): void;
    getGroups(): ArchitectureGroup[];
    addEdge({ lhsId, rhsId, lhsDir, rhsDir, lhsInto, rhsInto, lhsGroup, rhsGroup, title, }: ArchitectureEdge): void;
    getEdges(): ArchitectureEdge[];
    /**
     * Returns the current diagram's adjacency list, spatial map, & group alignments.
     * If they have not been created, run the algorithms to generate them.
     * @returns
     */
    getDataStructures(): import("./architectureTypes.js").ArchitectureDataStructures;
    setElementForId(id: string, element: D3Element): void;
    getElementById(id: string): D3Element;
    getConfig(): Required<ArchitectureDiagramConfig>;
    getConfigField<T extends keyof ArchitectureDiagramConfig>(field: T): Required<ArchitectureDiagramConfig>[T];
    setAccTitle: (txt: string) => void;
    getAccTitle: () => string;
    setDiagramTitle: (txt: string) => void;
    getDiagramTitle: () => string;
    getAccDescription: () => string;
    setAccDescription: (txt: string) => void;
}
/**
 * Typed wrapper for resolving an architecture diagram's config fields. Returns the default value if undefined
 * @param field - the config field to access
 * @returns
 */
