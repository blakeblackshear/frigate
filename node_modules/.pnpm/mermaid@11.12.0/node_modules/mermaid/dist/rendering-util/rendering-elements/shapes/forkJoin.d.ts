import type { Node, ShapeRenderOptions } from '../../types.js';
import type { D3Selection } from '../../../types.js';
export declare function forkJoin<T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node, { dir, config: { state, themeVariables } }: ShapeRenderOptions): import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>;
