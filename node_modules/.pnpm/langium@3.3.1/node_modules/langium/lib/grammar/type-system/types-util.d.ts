/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { References } from '../../references/references.js';
import type { AstNodeLocator } from '../../workspace/ast-node-locator.js';
import type { LangiumDocuments } from '../../workspace/documents.js';
import type { Interface, Type, AbstractType } from '../../languages/generated/ast.js';
import type { PlainInterface, PlainProperty } from './type-collector/plain-types.js';
import type { AstTypes, InterfaceType, PropertyType, TypeOption } from './type-collector/types.js';
import { MultiMap } from '../../utils/collections.js';
/**
 * Collects all properties of all interface types. Includes super type properties.
 * @param interfaces A topologically sorted array of interfaces.
 */
export declare function collectAllPlainProperties(interfaces: PlainInterface[]): MultiMap<string, PlainProperty>;
export declare function distinctAndSorted<T>(list: T[], compareFn?: (a: T, b: T) => number): T[];
export declare function collectChildrenTypes(interfaceNode: Interface, references: References, langiumDocuments: LangiumDocuments, nodeLocator: AstNodeLocator): Set<Interface | Type>;
export declare function collectTypeHierarchy(types: TypeOption[]): {
    superTypes: MultiMap<string, string>;
    subTypes: MultiMap<string, string>;
};
export declare function collectSuperTypes(ruleNode: AbstractType): Set<Interface>;
export declare function mergeInterfaces(inferred: AstTypes, declared: AstTypes): InterfaceType[];
export declare function mergeTypesAndInterfaces(astTypes: AstTypes): TypeOption[];
/**
 * Performs topological sorting on the generated interfaces.
 * @param interfaces The interfaces to sort topologically.
 * @returns A topologically sorted set of interfaces.
 */
export declare function sortInterfacesTopologically(interfaces: PlainInterface[]): PlainInterface[];
export declare function hasArrayType(type: PropertyType): boolean;
export declare function hasBooleanType(type: PropertyType): boolean;
export declare function findReferenceTypes(type: PropertyType): string[];
export declare function findAstTypes(type: PropertyType): string[];
export declare function isAstType(type: PropertyType): boolean;
export declare function isAstTypeInternal(type: PropertyType, visited: Map<PropertyType, boolean>): boolean;
export declare function escapeQuotes(str: string, type?: '"' | "'"): string;
//# sourceMappingURL=types-util.d.ts.map