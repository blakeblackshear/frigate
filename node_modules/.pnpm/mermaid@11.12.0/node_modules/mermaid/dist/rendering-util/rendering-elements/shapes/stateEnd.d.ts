import type { Node, ShapeRenderOptions } from '../../types.js';
import type { D3Selection } from '../../../types.js';
export declare function stateEnd<T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node, { config: { themeVariables } }: ShapeRenderOptions): import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>;
