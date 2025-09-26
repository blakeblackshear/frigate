import { flatten, isArray, map, reduce, uniq, upperFirst } from "lodash-es";
export function genDts(model, options) {
    let contentParts = [];
    contentParts = contentParts.concat(`import type { CstNode, ICstVisitor, IToken } from "chevrotain";`);
    contentParts = contentParts.concat(flatten(map(model, (node) => genCstNodeTypes(node))));
    if (options.includeVisitorInterface) {
        contentParts = contentParts.concat(genVisitor(options.visitorInterfaceName, model));
    }
    return contentParts.join("\n\n") + "\n";
}
function genCstNodeTypes(node) {
    const nodeCstInterface = genNodeInterface(node);
    const nodeChildrenInterface = genNodeChildrenType(node);
    return [nodeCstInterface, nodeChildrenInterface];
}
function genNodeInterface(node) {
    const nodeInterfaceName = getNodeInterfaceName(node.name);
    const childrenTypeName = getNodeChildrenTypeName(node.name);
    return `export interface ${nodeInterfaceName} extends CstNode {
  name: "${node.name}";
  children: ${childrenTypeName};
}`;
}
function genNodeChildrenType(node) {
    const typeName = getNodeChildrenTypeName(node.name);
    return `export type ${typeName} = {
  ${map(node.properties, (property) => genChildProperty(property)).join("\n  ")}
};`;
}
function genChildProperty(prop) {
    const typeName = buildTypeString(prop.type);
    return `${prop.name}${prop.optional ? "?" : ""}: ${typeName}[];`;
}
function genVisitor(name, nodes) {
    return `export interface ${name}<IN, OUT> extends ICstVisitor<IN, OUT> {
  ${map(nodes, (node) => genVisitorFunction(node)).join("\n  ")}
}`;
}
function genVisitorFunction(node) {
    const childrenTypeName = getNodeChildrenTypeName(node.name);
    return `${node.name}(children: ${childrenTypeName}, param?: IN): OUT;`;
}
function buildTypeString(type) {
    if (isArray(type)) {
        const typeNames = uniq(map(type, (t) => getTypeString(t)));
        const typeString = reduce(typeNames, (sum, t) => sum + " | " + t);
        return "(" + typeString + ")";
    }
    else {
        return getTypeString(type);
    }
}
function getTypeString(type) {
    if (type.kind === "token") {
        return "IToken";
    }
    return getNodeInterfaceName(type.name);
}
function getNodeInterfaceName(ruleName) {
    return upperFirst(ruleName) + "CstNode";
}
function getNodeChildrenTypeName(ruleName) {
    return upperFirst(ruleName) + "CstChildren";
}
//# sourceMappingURL=generate.js.map