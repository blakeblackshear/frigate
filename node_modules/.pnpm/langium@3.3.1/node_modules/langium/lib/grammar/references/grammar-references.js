/******************************************************************************
* Copyright 2021 TypeFox GmbH
* This program and the accompanying materials are made available under the
* terms of the MIT License, which is available in the project root.
******************************************************************************/
import { DefaultReferences } from '../../references/references.js';
import { getContainerOfType, getDocument } from '../../utils/ast-utils.js';
import { toDocumentSegment } from '../../utils/cst-utils.js';
import { findAssignment, findNodeForProperty, getActionAtElement } from '../../utils/grammar-utils.js';
import { stream } from '../../utils/stream.js';
import { UriUtils } from '../../utils/uri-utils.js';
import { isAction, isAssignment, isInterface, isParserRule, isType, isTypeAttribute } from '../../languages/generated/ast.js';
import { extractAssignments } from '../internal-grammar-util.js';
import { collectChildrenTypes, collectSuperTypes } from '../type-system/types-util.js';
export class LangiumGrammarReferences extends DefaultReferences {
    constructor(services) {
        super(services);
        this.documents = services.shared.workspace.LangiumDocuments;
    }
    findDeclaration(sourceCstNode) {
        const nodeElem = sourceCstNode.astNode;
        const assignment = findAssignment(sourceCstNode);
        if (assignment && assignment.feature === 'feature') {
            // Only search for a special declaration if the cst node is the feature property of the action/assignment
            if (isAssignment(nodeElem)) {
                return this.findAssignmentDeclaration(nodeElem);
            }
            else if (isAction(nodeElem)) {
                return this.findActionDeclaration(nodeElem);
            }
        }
        return super.findDeclaration(sourceCstNode);
    }
    findReferences(targetNode, options) {
        var _a;
        if (isTypeAttribute(targetNode)) {
            return this.findReferencesToTypeAttribute(targetNode, (_a = options.includeDeclaration) !== null && _a !== void 0 ? _a : false);
        }
        else {
            return super.findReferences(targetNode, options);
        }
    }
    findReferencesToTypeAttribute(targetNode, includeDeclaration) {
        const refs = [];
        const interfaceNode = getContainerOfType(targetNode, isInterface);
        if (interfaceNode) {
            if (includeDeclaration) {
                const ref = this.getReferenceToSelf(targetNode);
                if (ref) {
                    refs.push(ref);
                }
            }
            const interfaces = collectChildrenTypes(interfaceNode, this, this.documents, this.nodeLocator);
            const targetRules = [];
            interfaces.forEach(interf => {
                const rules = this.findRulesWithReturnType(interf);
                targetRules.push(...rules);
            });
            targetRules.forEach(rule => {
                const references = this.createReferencesToAttribute(rule, targetNode);
                refs.push(...references);
            });
        }
        return stream(refs);
    }
    createReferencesToAttribute(ruleOrAction, attribute) {
        const refs = [];
        if (isParserRule(ruleOrAction)) {
            const assignment = extractAssignments(ruleOrAction.definition).find(a => a.feature === attribute.name);
            if (assignment === null || assignment === void 0 ? void 0 : assignment.$cstNode) {
                const leaf = this.nameProvider.getNameNode(assignment);
                if (leaf) {
                    refs.push({
                        sourceUri: getDocument(assignment).uri,
                        sourcePath: this.nodeLocator.getAstNodePath(assignment),
                        targetUri: getDocument(attribute).uri,
                        targetPath: this.nodeLocator.getAstNodePath(attribute),
                        segment: toDocumentSegment(leaf),
                        local: UriUtils.equals(getDocument(assignment).uri, getDocument(attribute).uri)
                    });
                }
            }
        }
        else {
            // If the action references the attribute directly
            if (ruleOrAction.feature === attribute.name) {
                const leaf = findNodeForProperty(ruleOrAction.$cstNode, 'feature');
                if (leaf) {
                    refs.push({
                        sourceUri: getDocument(ruleOrAction).uri,
                        sourcePath: this.nodeLocator.getAstNodePath(ruleOrAction),
                        targetUri: getDocument(attribute).uri,
                        targetPath: this.nodeLocator.getAstNodePath(attribute),
                        segment: toDocumentSegment(leaf),
                        local: UriUtils.equals(getDocument(ruleOrAction).uri, getDocument(attribute).uri)
                    });
                }
            }
            // Find all references within the parser rule that contains this action
            const parserRule = getContainerOfType(ruleOrAction, isParserRule);
            refs.push(...this.createReferencesToAttribute(parserRule, attribute));
        }
        return refs;
    }
    findAssignmentDeclaration(assignment) {
        var _a;
        const parserRule = getContainerOfType(assignment, isParserRule);
        const action = getActionAtElement(assignment);
        if (action) {
            const actionDeclaration = this.findActionDeclaration(action, assignment.feature);
            if (actionDeclaration) {
                return actionDeclaration;
            }
        }
        if ((_a = parserRule === null || parserRule === void 0 ? void 0 : parserRule.returnType) === null || _a === void 0 ? void 0 : _a.ref) {
            if (isInterface(parserRule.returnType.ref) || isType(parserRule.returnType.ref)) {
                const interfaces = collectSuperTypes(parserRule.returnType.ref);
                for (const interf of interfaces) {
                    const typeAttribute = interf.attributes.find(att => att.name === assignment.feature);
                    if (typeAttribute) {
                        return typeAttribute;
                    }
                }
            }
        }
        return assignment;
    }
    findActionDeclaration(action, featureName) {
        var _a;
        if ((_a = action.type) === null || _a === void 0 ? void 0 : _a.ref) {
            const feature = featureName !== null && featureName !== void 0 ? featureName : action.feature;
            const interfaces = collectSuperTypes(action.type.ref);
            for (const interf of interfaces) {
                const typeAttribute = interf.attributes.find(att => att.name === feature);
                if (typeAttribute) {
                    return typeAttribute;
                }
            }
        }
        return undefined;
    }
    findRulesWithReturnType(interf) {
        const rules = [];
        const refs = this.index.findAllReferences(interf, this.nodeLocator.getAstNodePath(interf));
        for (const ref of refs) {
            const doc = this.documents.getDocument(ref.sourceUri);
            if (doc) {
                const astNode = this.nodeLocator.getAstNode(doc.parseResult.value, ref.sourcePath);
                if (isParserRule(astNode) || isAction(astNode)) {
                    rules.push(astNode);
                }
            }
        }
        return rules;
    }
}
//# sourceMappingURL=grammar-references.js.map