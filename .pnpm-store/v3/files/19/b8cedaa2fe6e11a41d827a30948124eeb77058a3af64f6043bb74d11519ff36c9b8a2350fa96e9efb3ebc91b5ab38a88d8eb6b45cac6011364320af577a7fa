"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConstrainedTypeAtLocation = getConstrainedTypeAtLocation;
/**
 * Resolves the given node's type. Will resolve to the type's generic constraint, if it has one.
 */
function getConstrainedTypeAtLocation(services, node) {
    const nodeType = services.getTypeAtLocation(node);
    const constrained = services.program
        .getTypeChecker()
        .getBaseConstraintOfType(nodeType);
    return constrained ?? nodeType;
}
//# sourceMappingURL=getConstrainedTypeAtLocation.js.map