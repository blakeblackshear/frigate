"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAncestors = getAncestors;
exports.getCwd = getCwd;
exports.getDeclaredVariables = getDeclaredVariables;
exports.getFilename = getFilename;
exports.getScope = getScope;
exports.getSourceCode = getSourceCode;
/** @deprecated use `context.sourceCode.getAncestors(node)` */
function getAncestors(context) {
    return context.getAncestors();
}
/** @deprecated use `context.sourceCode.getCwd()` */
function getCwd(context) {
    return context.getCwd();
}
/** @deprecated use `context.sourceCode.getDeclaredVariables(node)` */
function getDeclaredVariables(context, node) {
    return context.sourceCode.getDeclaredVariables(node);
}
/** @deprecated use `context.filename` */
function getFilename(context) {
    return context.filename;
}
/** @deprecated use `context.sourceCode.getScope(node) */
function getScope(context) {
    return context.getScope();
}
/** @deprecated use `context.sourceCode` */
function getSourceCode(context) {
    return context.sourceCode;
}
//# sourceMappingURL=context.js.map