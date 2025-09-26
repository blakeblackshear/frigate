import type { SVG } from '../diagram-api/types.js';
import type { InternalHelpers } from '../internals.js';
import type { LayoutData } from './types.js';
export interface RenderOptions {
    algorithm?: string;
}
export interface LayoutAlgorithm {
    render(layoutData: LayoutData, svg: SVG, helpers: InternalHelpers, options?: RenderOptions): Promise<void>;
}
export type LayoutLoader = () => Promise<LayoutAlgorithm>;
export interface LayoutLoaderDefinition {
    name: string;
    loader: LayoutLoader;
    algorithm?: string;
}
export declare const registerLayoutLoaders: (loaders: LayoutLoaderDefinition[]) => void;
export declare const render: (data4Layout: LayoutData, svg: SVG) => Promise<void>;
/**
 * Get the registered layout algorithm. If the algorithm is not registered, use the fallback algorithm.
 */
export declare const getRegisteredLayoutAlgorithm: (algorithm?: string, { fallback }?: {
    fallback?: string | undefined;
}) => string;
