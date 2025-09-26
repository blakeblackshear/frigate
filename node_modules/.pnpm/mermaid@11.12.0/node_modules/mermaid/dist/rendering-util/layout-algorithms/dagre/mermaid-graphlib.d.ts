export let clusterDb: Map<any, any>;
export function clear(): void;
export function extractDescendants(id: any, graph: any): any[];
export function validate(graph: any): boolean;
export function findNonClusterChild(id: any, graph: any, clusterId: any): any;
export function adjustClustersAndEdges(graph: any, depth: any): void;
export function extractor(graph: any, depth: any): void;
export function sortNodesByHierarchy(graph: any): any;
