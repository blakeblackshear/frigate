/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export declare function expandToStringWithNL(staticParts: TemplateStringsArray, ...substitutions: unknown[]): string;
export declare function expandToStringLFWithNL(staticParts: TemplateStringsArray, ...substitutions: unknown[]): string;
/**
 * A tag function that automatically aligns embedded multiline strings.
 * Multiple lines are joined with the platform-specific line separator.
 *
 * @param staticParts the static parts of a tagged template literal
 * @param substitutions the variable parts of a tagged template literal
 * @returns an aligned string that consists of the given parts
 */
export declare function expandToString(staticParts: TemplateStringsArray, ...substitutions: unknown[]): string;
/**
 * A tag function that automatically aligns embedded multiline strings.
 * Multiple lines are joined with the LINE_FEED (`\n`) line separator.
 *
 * @param staticParts the static parts of a tagged template literal
 * @param substitutions the variable parts of a tagged template literal
 * @returns an aligned string that consists of the given parts
 */
export declare function expandToStringLF(staticParts: TemplateStringsArray, ...substitutions: unknown[]): string;
export declare const SNLE: string;
export declare function findIndentation(lines: string[]): number;
export declare function normalizeEOL(input: string): string;
//# sourceMappingURL=template-string.d.ts.map