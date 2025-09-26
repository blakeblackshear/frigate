import { TypeHierarchyItem, Disposable, TypeHierarchyPrepareParams, TypeHierarchySupertypesParams, TypeHierarchySubtypesParams } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the type hierarchy feature
 *
 * @since 3.17.0
 */
export interface TypeHierarchyFeatureShape {
    typeHierarchy: {
        onPrepare(handler: ServerRequestHandler<TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, never, void>): Disposable;
        onSupertypes(handler: ServerRequestHandler<TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): Disposable;
        onSubtypes(handler: ServerRequestHandler<TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): Disposable;
    };
}
export declare const TypeHierarchyFeature: Feature<_Languages, TypeHierarchyFeatureShape>;
