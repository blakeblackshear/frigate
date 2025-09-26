/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { isParserRule } from '../languages/generated/ast.js';
import { getContainerOfType } from '../utils/ast-utils.js';
export function generateCoverageReport(info) {
    let total = 0;
    let covered = 0;
    const rules = new Map();
    const coveredRules = new Map();
    const ruleCoverage = new Map();
    for (const [element, isCovered] of info) {
        const rule = getContainerOfType(element, isParserRule);
        if (rule) {
            let count = rules.get(rule) || 0;
            rules.set(rule, ++count);
            total++;
            let coveredCount = coveredRules.get(rule) || 0;
            if (isCovered) {
                coveredRules.set(rule, ++coveredCount);
                covered++;
            }
            ruleCoverage.set(rule, {
                covered: coveredCount,
                total: count,
                ratio: count === 0 ? 0 : coveredCount / count,
                rule
            });
        }
    }
    return {
        full: {
            total,
            covered,
            ratio: total === 0 ? 0 : covered / total
        },
        rules: Array.from(ruleCoverage.values())
    };
}
//# sourceMappingURL=grammar-coverage.js.map