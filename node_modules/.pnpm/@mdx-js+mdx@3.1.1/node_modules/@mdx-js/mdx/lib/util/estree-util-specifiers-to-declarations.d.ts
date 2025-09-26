/**
 * @param {ReadonlyArray<Readonly<ExportSpecifier> | Readonly<ImportDefaultSpecifier> | Readonly<ImportNamespaceSpecifier> | Readonly<ImportSpecifier>>} specifiers
 *   Specifiers.
 * @param {Readonly<Expression>} init
 *   Initializer.
 * @returns {Array<VariableDeclarator>}
 *   Declarations.
 */
export function specifiersToDeclarations(specifiers: ReadonlyArray<Readonly<ExportSpecifier> | Readonly<ImportDefaultSpecifier> | Readonly<ImportNamespaceSpecifier> | Readonly<ImportSpecifier>>, init: Readonly<Expression>): Array<VariableDeclarator>;
import type { ExportSpecifier } from 'estree-jsx';
import type { ImportDefaultSpecifier } from 'estree-jsx';
import type { ImportNamespaceSpecifier } from 'estree-jsx';
import type { ImportSpecifier } from 'estree-jsx';
import type { Expression } from 'estree-jsx';
import type { VariableDeclarator } from 'estree-jsx';
//# sourceMappingURL=estree-util-specifiers-to-declarations.d.ts.map