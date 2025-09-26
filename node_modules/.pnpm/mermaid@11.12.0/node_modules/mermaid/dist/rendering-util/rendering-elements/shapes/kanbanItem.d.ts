import type { Node, KanbanNode, ShapeRenderOptions } from '../../types.js';
import type { D3Selection } from '../../../types.js';
export declare function kanbanItem<T extends SVGGraphicsElement>(parent: D3Selection<T>, kanbanNode: Omit<Node, 'shape'> | Omit<KanbanNode, 'level' | 'shape'>, { config }: ShapeRenderOptions): Promise<import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>>;
