/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { type AbstractElement, type ParserRule } from '../languages/generated/ast.js';
export type CoverageInfo = Map<AbstractElement, boolean>;
export interface CoverageReport {
    full: Coverage;
    rules: RuleCoverage[];
}
export interface Coverage {
    total: number;
    covered: number;
    ratio: number;
}
export interface RuleCoverage extends Coverage {
    rule: ParserRule;
}
export declare function generateCoverageReport(info: CoverageInfo): CoverageReport;
//# sourceMappingURL=grammar-coverage.d.ts.map