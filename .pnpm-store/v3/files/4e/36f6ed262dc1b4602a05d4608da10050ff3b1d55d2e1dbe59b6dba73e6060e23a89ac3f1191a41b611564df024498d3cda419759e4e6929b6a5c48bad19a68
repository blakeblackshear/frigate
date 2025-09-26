declare class SankeyLink {
    source: SankeyNode;
    target: SankeyNode;
    value: number;
    constructor(source: SankeyNode, target: SankeyNode, value?: number);
}
declare class SankeyNode {
    ID: string;
    constructor(ID: string);
}
declare const _default: {
    nodesMap: Map<string, SankeyNode>;
    getConfig: () => import("../../config.type.js").SankeyDiagramConfig | undefined;
    getNodes: () => SankeyNode[];
    getLinks: () => SankeyLink[];
    getGraph: () => {
        nodes: {
            id: string;
        }[];
        links: {
            source: string;
            target: string;
            value: number;
        }[];
    };
    addLink: (source: SankeyNode, target: SankeyNode, value: number) => void;
    findOrCreateNode: (ID: string) => SankeyNode;
    getAccTitle: () => string;
    setAccTitle: (txt: string) => void;
    getAccDescription: () => string;
    setAccDescription: (txt: string) => void;
    getDiagramTitle: () => string;
    setDiagramTitle: (txt: string) => void;
    clear: () => void;
};
export default _default;
