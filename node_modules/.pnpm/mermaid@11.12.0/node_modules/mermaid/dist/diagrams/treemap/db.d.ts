import type { DiagramDB } from '../../diagram-api/types.js';
import type { DiagramStyleClassDef } from '../../diagram-api/types.js';
import type { TreemapDiagramConfig, TreemapNode } from './types.js';
export declare class TreeMapDB implements DiagramDB {
    private nodes;
    private levels;
    private outerNodes;
    private classes;
    private root?;
    getNodes(): TreemapNode[];
    getConfig(): Required<TreemapDiagramConfig>;
    addNode(node: TreemapNode, level: number): void;
    getRoot(): {
        name: string;
        children: TreemapNode[];
    };
    addClass(id: string, _style: string): void;
    getClasses(): Map<string, DiagramStyleClassDef>;
    getStylesForClass(classSelector: string): string[];
    clear(): void;
    setAccTitle: (txt: string) => void;
    getAccTitle: () => string;
    setDiagramTitle: (txt: string) => void;
    getDiagramTitle: () => string;
    getAccDescription: () => string;
    setAccDescription: (txt: string) => void;
}
