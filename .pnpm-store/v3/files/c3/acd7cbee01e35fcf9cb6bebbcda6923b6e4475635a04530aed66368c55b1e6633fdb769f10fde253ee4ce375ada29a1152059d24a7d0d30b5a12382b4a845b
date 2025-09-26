/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export class ErrorWithLocation extends Error {
    constructor(node, message) {
        super(node ? `${message} at ${node.range.start.line}:${node.range.start.character}` : message);
    }
}
export function assertUnreachable(_) {
    throw new Error('Error! The input value was not handled.');
}
//# sourceMappingURL=errors.js.map