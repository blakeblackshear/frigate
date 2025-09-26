/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { findLeafNodeAtOffset } from '../utils/cst-utils.js';
export class AbstractSignatureHelpProvider {
    provideSignatureHelp(document, params, cancelToken = CancellationToken.None) {
        const rootNode = document.parseResult.value;
        const cst = rootNode.$cstNode;
        if (cst) {
            const sourceCstNode = findLeafNodeAtOffset(cst, document.textDocument.offsetAt(params.position));
            if (sourceCstNode) {
                return this.getSignatureFromElement(sourceCstNode.astNode, cancelToken);
            }
        }
        return undefined;
    }
    /**
     * Override this getter to return the list of triggering characters for your language. To deactivate the signature help, return an empty object.
     */
    get signatureHelpOptions() {
        return {
            triggerCharacters: ['('],
            retriggerCharacters: [',']
        };
    }
}
/**
 * Merges the SignatureHelpOptions of all languages
 */
export function mergeSignatureHelpOptions(options) {
    const triggerCharacters = [];
    const retriggerCharacters = [];
    options.forEach(option => {
        if (option === null || option === void 0 ? void 0 : option.triggerCharacters) {
            triggerCharacters.push(...option.triggerCharacters);
        }
        if (option === null || option === void 0 ? void 0 : option.retriggerCharacters) {
            retriggerCharacters.push(...option.retriggerCharacters);
        }
    });
    const mergedOptions = {
        triggerCharacters: triggerCharacters.length > 0 ? Array.from(new Set(triggerCharacters)).sort() : undefined,
        retriggerCharacters: retriggerCharacters.length > 0 ? Array.from(new Set(retriggerCharacters)).sort() : undefined
    };
    return mergedOptions.triggerCharacters ? mergedOptions : undefined;
}
//# sourceMappingURL=signature-help-provider.js.map