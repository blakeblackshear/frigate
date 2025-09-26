/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { DefaultFoldingRangeProvider } from '../../lsp/folding-range-provider.js';
import { isParserRule } from '../../languages/generated/ast.js';
/**
 * A specialized folding range provider for the grammar language
 */
export class LangiumGrammarFoldingRangeProvider extends DefaultFoldingRangeProvider {
    shouldProcessContent(node) {
        // Exclude parser rules from folding
        return !isParserRule(node);
    }
}
//# sourceMappingURL=grammar-folding-ranges.js.map