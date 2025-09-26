"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const getESLintCoreRule_1 = require("../util/getESLintCoreRule");
const baseRule = (0, getESLintCoreRule_1.getESLintCoreRule)('no-extra-semi');
exports.default = (0, util_1.createRule)({
    name: 'no-extra-semi',
    meta: {
        deprecated: true,
        replacedBy: ['@stylistic/ts/no-extra-semi'],
        type: 'suggestion',
        docs: {
            description: 'Disallow unnecessary semicolons',
            extendsBaseRule: true,
        },
        fixable: 'code',
        hasSuggestions: baseRule.meta.hasSuggestions,
        schema: baseRule.meta.schema,
        messages: baseRule.meta.messages,
    },
    defaultOptions: [],
    create(context) {
        const rules = baseRule.create(context);
        return {
            ...rules,
            'TSAbstractMethodDefinition, TSAbstractPropertyDefinition'(node) {
                rules['MethodDefinition, PropertyDefinition, StaticBlock'](node);
            },
        };
    },
});
//# sourceMappingURL=no-extra-semi.js.map