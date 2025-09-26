/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export function isDeclared(type) {
    return type && 'declared' in type;
}
export function isInferred(type) {
    return type && 'inferred' in type;
}
export function isInferredAndDeclared(type) {
    return type && 'inferred' in type && 'declared' in type;
}
//# sourceMappingURL=documents.js.map