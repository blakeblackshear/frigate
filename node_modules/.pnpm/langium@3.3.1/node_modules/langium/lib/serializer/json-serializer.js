/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI } from 'vscode-uri';
import { isAstNode, isReference } from '../syntax-tree.js';
import { getDocument } from '../utils/ast-utils.js';
import { findNodesForProperty } from '../utils/grammar-utils.js';
export function isAstNodeWithComment(node) {
    return typeof node.$comment === 'string';
}
function isIntermediateReference(obj) {
    return typeof obj === 'object' && !!obj && ('$ref' in obj || '$error' in obj);
}
export class DefaultJsonSerializer {
    constructor(services) {
        /** The set of AstNode properties to be ignored by the serializer. */
        this.ignoreProperties = new Set(['$container', '$containerProperty', '$containerIndex', '$document', '$cstNode']);
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.astNodeLocator = services.workspace.AstNodeLocator;
        this.nameProvider = services.references.NameProvider;
        this.commentProvider = services.documentation.CommentProvider;
    }
    serialize(node, options) {
        const serializeOptions = options !== null && options !== void 0 ? options : {};
        const specificReplacer = options === null || options === void 0 ? void 0 : options.replacer;
        const defaultReplacer = (key, value) => this.replacer(key, value, serializeOptions);
        const replacer = specificReplacer ? (key, value) => specificReplacer(key, value, defaultReplacer) : defaultReplacer;
        try {
            this.currentDocument = getDocument(node);
            return JSON.stringify(node, replacer, options === null || options === void 0 ? void 0 : options.space);
        }
        finally {
            this.currentDocument = undefined;
        }
    }
    deserialize(content, options) {
        const deserializeOptions = options !== null && options !== void 0 ? options : {};
        const root = JSON.parse(content);
        this.linkNode(root, root, deserializeOptions);
        return root;
    }
    replacer(key, value, { refText, sourceText, textRegions, comments, uriConverter }) {
        var _a, _b, _c, _d;
        if (this.ignoreProperties.has(key)) {
            return undefined;
        }
        else if (isReference(value)) {
            const refValue = value.ref;
            const $refText = refText ? value.$refText : undefined;
            if (refValue) {
                const targetDocument = getDocument(refValue);
                let targetUri = '';
                if (this.currentDocument && this.currentDocument !== targetDocument) {
                    if (uriConverter) {
                        targetUri = uriConverter(targetDocument.uri, value);
                    }
                    else {
                        targetUri = targetDocument.uri.toString();
                    }
                }
                const targetPath = this.astNodeLocator.getAstNodePath(refValue);
                return {
                    $ref: `${targetUri}#${targetPath}`,
                    $refText
                };
            }
            else {
                return {
                    $error: (_b = (_a = value.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : 'Could not resolve reference',
                    $refText
                };
            }
        }
        else if (isAstNode(value)) {
            let astNode = undefined;
            if (textRegions) {
                astNode = this.addAstNodeRegionWithAssignmentsTo(Object.assign({}, value));
                if ((!key || value.$document) && (astNode === null || astNode === void 0 ? void 0 : astNode.$textRegion)) {
                    // The document URI is added to the root node of the resulting JSON tree
                    astNode.$textRegion.documentURI = (_c = this.currentDocument) === null || _c === void 0 ? void 0 : _c.uri.toString();
                }
            }
            if (sourceText && !key) {
                astNode !== null && astNode !== void 0 ? astNode : (astNode = Object.assign({}, value));
                astNode.$sourceText = (_d = value.$cstNode) === null || _d === void 0 ? void 0 : _d.text;
            }
            if (comments) {
                astNode !== null && astNode !== void 0 ? astNode : (astNode = Object.assign({}, value));
                const comment = this.commentProvider.getComment(value);
                if (comment) {
                    astNode.$comment = comment.replace(/\r/g, '');
                }
            }
            return astNode !== null && astNode !== void 0 ? astNode : value;
        }
        else {
            return value;
        }
    }
    addAstNodeRegionWithAssignmentsTo(node) {
        const createDocumentSegment = cstNode => ({
            offset: cstNode.offset,
            end: cstNode.end,
            length: cstNode.length,
            range: cstNode.range,
        });
        if (node.$cstNode) {
            const textRegion = node.$textRegion = createDocumentSegment(node.$cstNode);
            const assignments = textRegion.assignments = {};
            Object.keys(node).filter(key => !key.startsWith('$')).forEach(key => {
                const propertyAssignments = findNodesForProperty(node.$cstNode, key).map(createDocumentSegment);
                if (propertyAssignments.length !== 0) {
                    assignments[key] = propertyAssignments;
                }
            });
            return node;
        }
        return undefined;
    }
    linkNode(node, root, options, container, containerProperty, containerIndex) {
        for (const [propertyName, item] of Object.entries(node)) {
            if (Array.isArray(item)) {
                for (let index = 0; index < item.length; index++) {
                    const element = item[index];
                    if (isIntermediateReference(element)) {
                        item[index] = this.reviveReference(node, propertyName, root, element, options);
                    }
                    else if (isAstNode(element)) {
                        this.linkNode(element, root, options, node, propertyName, index);
                    }
                }
            }
            else if (isIntermediateReference(item)) {
                node[propertyName] = this.reviveReference(node, propertyName, root, item, options);
            }
            else if (isAstNode(item)) {
                this.linkNode(item, root, options, node, propertyName);
            }
        }
        const mutable = node;
        mutable.$container = container;
        mutable.$containerProperty = containerProperty;
        mutable.$containerIndex = containerIndex;
    }
    reviveReference(container, property, root, reference, options) {
        let refText = reference.$refText;
        let error = reference.$error;
        if (reference.$ref) {
            const ref = this.getRefNode(root, reference.$ref, options.uriConverter);
            if (isAstNode(ref)) {
                if (!refText) {
                    refText = this.nameProvider.getName(ref);
                }
                return {
                    $refText: refText !== null && refText !== void 0 ? refText : '',
                    ref
                };
            }
            else {
                error = ref;
            }
        }
        if (error) {
            const ref = {
                $refText: refText !== null && refText !== void 0 ? refText : ''
            };
            ref.error = {
                container,
                property,
                message: error,
                reference: ref
            };
            return ref;
        }
        else {
            return undefined;
        }
    }
    getRefNode(root, uri, uriConverter) {
        try {
            const fragmentIndex = uri.indexOf('#');
            if (fragmentIndex === 0) {
                const node = this.astNodeLocator.getAstNode(root, uri.substring(1));
                if (!node) {
                    return 'Could not resolve path: ' + uri;
                }
                return node;
            }
            if (fragmentIndex < 0) {
                const documentUri = uriConverter ? uriConverter(uri) : URI.parse(uri);
                const document = this.langiumDocuments.getDocument(documentUri);
                if (!document) {
                    return 'Could not find document for URI: ' + uri;
                }
                return document.parseResult.value;
            }
            const documentUri = uriConverter ? uriConverter(uri.substring(0, fragmentIndex)) : URI.parse(uri.substring(0, fragmentIndex));
            const document = this.langiumDocuments.getDocument(documentUri);
            if (!document) {
                return 'Could not find document for URI: ' + uri;
            }
            if (fragmentIndex === uri.length - 1) {
                return document.parseResult.value;
            }
            const node = this.astNodeLocator.getAstNode(document.parseResult.value, uri.substring(fragmentIndex + 1));
            if (!node) {
                return 'Could not resolve URI: ' + uri;
            }
            return node;
        }
        catch (err) {
            return String(err);
        }
    }
}
//# sourceMappingURL=json-serializer.js.map