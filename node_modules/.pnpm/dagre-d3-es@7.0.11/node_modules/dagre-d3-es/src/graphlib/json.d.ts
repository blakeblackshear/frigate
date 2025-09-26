export function write(g: any): {
    options: {
        directed: any;
        multigraph: any;
        compound: any;
    };
    nodes: {
        v: any;
    }[];
    edges: {
        v: any;
        w: any;
    }[];
};
export function read(json: any): Graph;
import { Graph } from './graph.js';
