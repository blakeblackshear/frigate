"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const getESLintCoreRule_1 = require("../util/getESLintCoreRule");
const baseRule = (0, getESLintCoreRule_1.getESLintCoreRule)('no-loss-of-precision');
exports.default = (0, util_1.createRule)({
    name: 'no-loss-of-precision',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow literal numbers that lose precision',
            recommended: 'recommended',
            extendsBaseRule: true,
        },
        hasSuggestions: baseRule.meta.hasSuggestions,
        schema: [],
        messages: baseRule.meta.messages,
    },
    defaultOptions: [],
    create(context) {
        const rules = baseRule.create(context);
        function isSeparatedNumeric(node) {
            return typeof node.value === 'number' && node.raw.includes('_');
        }
        return {
            Literal(node) {
                rules.Literal({
                    ...node,
                    raw: isSeparatedNumeric(node) ? node.raw.replace(/_/g, '') : node.raw,
                });
            },
        };
    },
});
//# sourceMappingURL=no-loss-of-precision.js.map