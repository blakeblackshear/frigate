/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CstNode } from '../syntax-tree.js';
export declare class ErrorWithLocation extends Error {
    constructor(node: CstNode | undefined, message: string);
}
export declare function assertUnreachable(_: never): never;
//# sourceMappingURL=errors.d.ts.map