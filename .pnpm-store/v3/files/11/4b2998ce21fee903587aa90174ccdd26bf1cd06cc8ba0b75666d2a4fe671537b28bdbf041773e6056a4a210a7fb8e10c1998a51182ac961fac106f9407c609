/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { SignatureHelp, SignatureHelpOptions, SignatureHelpParams } from 'vscode-languageserver';
import { CancellationToken } from '../utils/cancellation.js';
import type { AstNode } from '../syntax-tree.js';
import { findLeafNodeAtOffset } from '../utils/cst-utils.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';

/**
 * Language-specific service for handling signature help requests.
 */
export interface SignatureHelpProvider {
    /**
     * Handles a signature help request
     */
    provideSignatureHelp(document: LangiumDocument, params: SignatureHelpParams, cancelToken?: CancellationToken): MaybePromise<SignatureHelp | undefined>;
    /**
     * Options that determine the server capabilities for a signature help request. It contains the list of triggering characters.
     */
    get signatureHelpOptions(): SignatureHelpOptions;
}

export abstract class AbstractSignatureHelpProvider implements SignatureHelpProvider {
    provideSignatureHelp(document: LangiumDocument, params: SignatureHelpParams, cancelToken = CancellationToken.None): MaybePromise<SignatureHelp | undefined> {
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
     * Override this method to return the desired SignatureHelp
     */
    protected abstract getSignatureFromElement(element: AstNode, cancelToken: CancellationToken): MaybePromise<SignatureHelp | undefined>;

    /**
     * Override this getter to return the list of triggering characters for your language. To deactivate the signature help, return an empty object.
     */
    get signatureHelpOptions(): SignatureHelpOptions {
        return {
            triggerCharacters: ['('],
            retriggerCharacters: [',']
        };
    }
}

/**
 * Merges the SignatureHelpOptions of all languages
 */
export function mergeSignatureHelpOptions(options: Array<SignatureHelpOptions | undefined>): SignatureHelpOptions | undefined {
    const triggerCharacters: string[] = [];
    const retriggerCharacters: string[] = [];

    options.forEach(option => {
        if (option?.triggerCharacters) {
            triggerCharacters.push(...option.triggerCharacters);
        }
        if (option?.retriggerCharacters) {
            retriggerCharacters.push(...option.retriggerCharacters);
        }
    });

    const mergedOptions: SignatureHelpOptions = {
        triggerCharacters: triggerCharacters.length > 0 ? Array.from(new Set(triggerCharacters)).sort() : undefined,
        retriggerCharacters: retriggerCharacters.length > 0 ? Array.from(new Set(retriggerCharacters)).sort() : undefined
    };

    return mergedOptions.triggerCharacters ? mergedOptions : undefined;
}
