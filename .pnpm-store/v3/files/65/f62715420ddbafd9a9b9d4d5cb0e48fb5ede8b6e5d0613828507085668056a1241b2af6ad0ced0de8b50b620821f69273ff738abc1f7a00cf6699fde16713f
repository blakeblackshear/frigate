/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Node } from 'unist';
import type { MdxjsEsm, MdxJsxTextElement } from 'mdast-util-mdx';
import type { TOCItems } from './types';
import type { Program, ImportDeclaration, ImportSpecifier } from 'estree';
import type { Heading, PhrasingContent } from 'mdast';
export declare function getImportDeclarations(program: Program): ImportDeclaration[];
export declare function isMarkdownImport(node: Node): node is ImportDeclaration;
export declare function findDefaultImportName(importDeclaration: ImportDeclaration): string | undefined;
export declare function findNamedImportSpecifier(importDeclaration: ImportDeclaration, localName: string): ImportSpecifier | undefined;
export declare function addTocSliceImportIfNeeded({ importDeclaration, tocExportName, tocSliceImportName, }: {
    importDeclaration: ImportDeclaration;
    tocExportName: string;
    tocSliceImportName: string;
}): void;
export declare function isNamedExport(node: Node, exportName: string): node is MdxjsEsm;
export declare function createTOCExportNodeAST({ tocExportName, tocItems, }: {
    tocExportName: string;
    tocItems: TOCItems;
}): Promise<MdxjsEsm>;
export declare function toHeadingHTMLValue(node: PhrasingContent | Heading | MdxJsxTextElement, toString: (param: unknown) => string): string;
//# sourceMappingURL=utils.d.ts.map