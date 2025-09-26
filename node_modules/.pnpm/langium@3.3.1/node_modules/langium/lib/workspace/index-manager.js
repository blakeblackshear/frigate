/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { getDocument } from '../utils/ast-utils.js';
import { ContextCache } from '../utils/caching.js';
import { CancellationToken } from '../utils/cancellation.js';
import { stream } from '../utils/stream.js';
import { UriUtils } from '../utils/uri-utils.js';
export class DefaultIndexManager {
    constructor(services) {
        /**
         * The symbol index stores all `AstNodeDescription` items exported by a document.
         * The key used in this map is the string representation of the specific document URI.
         */
        this.symbolIndex = new Map();
        /**
         * This is a cache for the `allElements()` method.
         * It caches the descriptions from `symbolIndex` grouped by types.
         */
        this.symbolByTypeIndex = new ContextCache();
        /**
         * This index keeps track of all `ReferenceDescription` items exported by a document.
         * This is used to compute which elements are affected by a document change
         * and for finding references to an AST node.
         */
        this.referenceIndex = new Map();
        this.documents = services.workspace.LangiumDocuments;
        this.serviceRegistry = services.ServiceRegistry;
        this.astReflection = services.AstReflection;
    }
    findAllReferences(targetNode, astNodePath) {
        const targetDocUri = getDocument(targetNode).uri;
        const result = [];
        this.referenceIndex.forEach(docRefs => {
            docRefs.forEach(refDescr => {
                if (UriUtils.equals(refDescr.targetUri, targetDocUri) && refDescr.targetPath === astNodePath) {
                    result.push(refDescr);
                }
            });
        });
        return stream(result);
    }
    allElements(nodeType, uris) {
        let documentUris = stream(this.symbolIndex.keys());
        if (uris) {
            documentUris = documentUris.filter(uri => !uris || uris.has(uri));
        }
        return documentUris
            .map(uri => this.getFileDescriptions(uri, nodeType))
            .flat();
    }
    getFileDescriptions(uri, nodeType) {
        var _a;
        if (!nodeType) {
            return (_a = this.symbolIndex.get(uri)) !== null && _a !== void 0 ? _a : [];
        }
        const descriptions = this.symbolByTypeIndex.get(uri, nodeType, () => {
            var _a;
            const allFileDescriptions = (_a = this.symbolIndex.get(uri)) !== null && _a !== void 0 ? _a : [];
            return allFileDescriptions.filter(e => this.astReflection.isSubtype(e.type, nodeType));
        });
        return descriptions;
    }
    remove(uri) {
        const uriString = uri.toString();
        this.symbolIndex.delete(uriString);
        this.symbolByTypeIndex.clear(uriString);
        this.referenceIndex.delete(uriString);
    }
    async updateContent(document, cancelToken = CancellationToken.None) {
        const services = this.serviceRegistry.getServices(document.uri);
        const exports = await services.references.ScopeComputation.computeExports(document, cancelToken);
        const uri = document.uri.toString();
        this.symbolIndex.set(uri, exports);
        this.symbolByTypeIndex.clear(uri);
    }
    async updateReferences(document, cancelToken = CancellationToken.None) {
        const services = this.serviceRegistry.getServices(document.uri);
        const indexData = await services.workspace.ReferenceDescriptionProvider.createDescriptions(document, cancelToken);
        this.referenceIndex.set(document.uri.toString(), indexData);
    }
    isAffected(document, changedUris) {
        const references = this.referenceIndex.get(document.uri.toString());
        if (!references) {
            return false;
        }
        return references.some(ref => !ref.local && changedUris.has(ref.targetUri.toString()));
    }
}
//# sourceMappingURL=index-manager.js.map