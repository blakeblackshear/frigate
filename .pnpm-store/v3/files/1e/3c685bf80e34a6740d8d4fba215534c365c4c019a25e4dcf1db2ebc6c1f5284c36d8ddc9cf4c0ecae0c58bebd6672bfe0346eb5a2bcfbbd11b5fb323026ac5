/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { LocationLink, Range } from 'vscode-languageserver';
import { DefaultDefinitionProvider } from '../../lsp/index.js';
import { streamContents } from '../../utils/ast-utils.js';
import { findAssignment } from '../../utils/grammar-utils.js';
import { isGrammarImport } from '../../languages/generated/ast.js';
import { resolveImport } from '../internal-grammar-util.js';
export class LangiumGrammarDefinitionProvider extends DefaultDefinitionProvider {
    constructor(services) {
        super(services);
        this.documents = services.shared.workspace.LangiumDocuments;
    }
    collectLocationLinks(sourceCstNode, _params) {
        var _a, _b, _c, _d, _e, _f;
        const pathFeature = 'path';
        if (isGrammarImport(sourceCstNode.astNode) && ((_a = findAssignment(sourceCstNode)) === null || _a === void 0 ? void 0 : _a.feature) === pathFeature) {
            const importedGrammar = resolveImport(this.documents, sourceCstNode.astNode);
            if (importedGrammar === null || importedGrammar === void 0 ? void 0 : importedGrammar.$document) {
                const targetObject = (_b = this.findTargetObject(importedGrammar)) !== null && _b !== void 0 ? _b : importedGrammar;
                const selectionRange = (_d = (_c = this.nameProvider.getNameNode(targetObject)) === null || _c === void 0 ? void 0 : _c.range) !== null && _d !== void 0 ? _d : Range.create(0, 0, 0, 0);
                const previewRange = (_f = (_e = targetObject.$cstNode) === null || _e === void 0 ? void 0 : _e.range) !== null && _f !== void 0 ? _f : Range.create(0, 0, 0, 0);
                return [
                    LocationLink.create(importedGrammar.$document.uri.toString(), previewRange, selectionRange, sourceCstNode.range)
                ];
            }
            return undefined;
        }
        return super.collectLocationLinks(sourceCstNode, _params);
    }
    findTargetObject(importedGrammar) {
        // Jump to grammar name or the first element
        if (importedGrammar.isDeclared) {
            return importedGrammar;
        }
        return streamContents(importedGrammar).head();
    }
}
//# sourceMappingURL=grammar-definition.js.map