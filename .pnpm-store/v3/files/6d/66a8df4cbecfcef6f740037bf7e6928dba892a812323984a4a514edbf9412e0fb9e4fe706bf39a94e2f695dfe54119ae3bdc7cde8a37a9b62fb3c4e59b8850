/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { findAssignment } from '../utils/grammar-utils.js';
import { isReference } from '../syntax-tree.js';
import { getDocument } from '../utils/ast-utils.js';
import { isChildNode, toDocumentSegment } from '../utils/cst-utils.js';
import { stream } from '../utils/stream.js';
import { UriUtils } from '../utils/uri-utils.js';
export class DefaultReferences {
    constructor(services) {
        this.nameProvider = services.references.NameProvider;
        this.index = services.shared.workspace.IndexManager;
        this.nodeLocator = services.workspace.AstNodeLocator;
    }
    findDeclaration(sourceCstNode) {
        if (sourceCstNode) {
            const assignment = findAssignment(sourceCstNode);
            const nodeElem = sourceCstNode.astNode;
            if (assignment && nodeElem) {
                const reference = nodeElem[assignment.feature];
                if (isReference(reference)) {
                    return reference.ref;
                }
                else if (Array.isArray(reference)) {
                    for (const ref of reference) {
                        if (isReference(ref) && ref.$refNode
                            && ref.$refNode.offset <= sourceCstNode.offset
                            && ref.$refNode.end >= sourceCstNode.end) {
                            return ref.ref;
                        }
                    }
                }
            }
            if (nodeElem) {
                const nameNode = this.nameProvider.getNameNode(nodeElem);
                // Only return the targeted node in case the targeted cst node is the name node or part of it
                if (nameNode && (nameNode === sourceCstNode || isChildNode(sourceCstNode, nameNode))) {
                    return nodeElem;
                }
            }
        }
        return undefined;
    }
    findDeclarationNode(sourceCstNode) {
        const astNode = this.findDeclaration(sourceCstNode);
        if (astNode === null || astNode === void 0 ? void 0 : astNode.$cstNode) {
            const targetNode = this.nameProvider.getNameNode(astNode);
            return targetNode !== null && targetNode !== void 0 ? targetNode : astNode.$cstNode;
        }
        return undefined;
    }
    findReferences(targetNode, options) {
        const refs = [];
        if (options.includeDeclaration) {
            const ref = this.getReferenceToSelf(targetNode);
            if (ref) {
                refs.push(ref);
            }
        }
        let indexReferences = this.index.findAllReferences(targetNode, this.nodeLocator.getAstNodePath(targetNode));
        if (options.documentUri) {
            indexReferences = indexReferences.filter(ref => UriUtils.equals(ref.sourceUri, options.documentUri));
        }
        refs.push(...indexReferences);
        return stream(refs);
    }
    getReferenceToSelf(targetNode) {
        const nameNode = this.nameProvider.getNameNode(targetNode);
        if (nameNode) {
            const doc = getDocument(targetNode);
            const path = this.nodeLocator.getAstNodePath(targetNode);
            return {
                sourceUri: doc.uri,
                sourcePath: path,
                targetUri: doc.uri,
                targetPath: path,
                segment: toDocumentSegment(nameNode),
                local: true
            };
        }
        return undefined;
    }
}
//# sourceMappingURL=references.js.map