/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { isLinkingError } from '../syntax-tree.js';
import { getDocument, streamAst, streamReferences } from '../utils/ast-utils.js';
import { toDocumentSegment } from '../utils/cst-utils.js';
import { interruptAndCheck } from '../utils/promise-utils.js';
import { UriUtils } from '../utils/uri-utils.js';
export class DefaultAstNodeDescriptionProvider {
    constructor(services) {
        this.astNodeLocator = services.workspace.AstNodeLocator;
        this.nameProvider = services.references.NameProvider;
    }
    createDescription(node, name, document) {
        const doc = document !== null && document !== void 0 ? document : getDocument(node);
        name !== null && name !== void 0 ? name : (name = this.nameProvider.getName(node));
        const path = this.astNodeLocator.getAstNodePath(node);
        if (!name) {
            throw new Error(`Node at path ${path} has no name.`);
        }
        let nameNodeSegment;
        const nameSegmentGetter = () => { var _a; return nameNodeSegment !== null && nameNodeSegment !== void 0 ? nameNodeSegment : (nameNodeSegment = toDocumentSegment((_a = this.nameProvider.getNameNode(node)) !== null && _a !== void 0 ? _a : node.$cstNode)); };
        return {
            node,
            name,
            get nameSegment() {
                return nameSegmentGetter();
            },
            selectionSegment: toDocumentSegment(node.$cstNode),
            type: node.$type,
            documentUri: doc.uri,
            path
        };
    }
}
export class DefaultReferenceDescriptionProvider {
    constructor(services) {
        this.nodeLocator = services.workspace.AstNodeLocator;
    }
    async createDescriptions(document, cancelToken = CancellationToken.None) {
        const descr = [];
        const rootNode = document.parseResult.value;
        for (const astNode of streamAst(rootNode)) {
            await interruptAndCheck(cancelToken);
            streamReferences(astNode).filter(refInfo => !isLinkingError(refInfo)).forEach(refInfo => {
                // TODO: Consider logging a warning or throw an exception when DocumentState is < than Linked
                const description = this.createDescription(refInfo);
                if (description) {
                    descr.push(description);
                }
            });
        }
        return descr;
    }
    createDescription(refInfo) {
        const targetNodeDescr = refInfo.reference.$nodeDescription;
        const refCstNode = refInfo.reference.$refNode;
        if (!targetNodeDescr || !refCstNode) {
            return undefined;
        }
        const docUri = getDocument(refInfo.container).uri;
        return {
            sourceUri: docUri,
            sourcePath: this.nodeLocator.getAstNodePath(refInfo.container),
            targetUri: targetNodeDescr.documentUri,
            targetPath: targetNodeDescr.path,
            segment: toDocumentSegment(refCstNode),
            local: UriUtils.equals(targetNodeDescr.documentUri, docUri)
        };
    }
}
//# sourceMappingURL=ast-descriptions.js.map