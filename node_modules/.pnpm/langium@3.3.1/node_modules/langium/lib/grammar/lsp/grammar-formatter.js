/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { AbstractFormatter, Formatting } from '../../lsp/formatter.js';
import * as ast from '../../languages/generated/ast.js';
const indentOrSpace = Formatting.fit(Formatting.oneSpace(), Formatting.indent());
export class LangiumGrammarFormatter extends AbstractFormatter {
    format(node) {
        if (ast.isCrossReference(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.properties('type', 'terminal').surround(Formatting.noSpace());
        }
        else if (ast.isParserRule(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.keywords('entry', 'fragment', 'returns').append(Formatting.oneSpace());
            if ((node.inferredType || node.returnType || node.dataType) && node.parameters.length === 0) {
                formatter.property('name').append(Formatting.oneSpace());
            }
            else {
                formatter.property('name').append(Formatting.noSpace());
            }
            formatter.properties('parameters').append(Formatting.noSpace());
            formatter.keywords(',').append(Formatting.oneSpace());
            formatter.keywords('<').append(Formatting.noSpace());
            const semicolon = formatter.keyword(';');
            const colon = formatter.keyword(':');
            colon.prepend(Formatting.noSpace());
            formatter.interior(colon, semicolon).prepend(Formatting.indent());
            semicolon.prepend(Formatting.fit(Formatting.noSpace(), Formatting.newLine()));
            formatter.node(node).prepend(Formatting.noIndent());
        }
        else if (ast.isTerminalRule(node)) {
            const formatter = this.getNodeFormatter(node);
            if (node.type) {
                formatter.property('name').append(Formatting.oneSpace());
                formatter.keyword('returns').append(Formatting.oneSpace());
            }
            formatter.keywords('hidden', 'terminal', 'fragment').append(Formatting.oneSpace());
            formatter.keyword(':').prepend(Formatting.noSpace());
            formatter.keyword(';').prepend(Formatting.fit(Formatting.noSpace(), Formatting.newLine()));
            formatter.node(node).prepend(Formatting.noIndent());
        }
        else if (ast.isAction(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.keyword('{').append(Formatting.noSpace());
            formatter.keywords('.', '+=', '=').surround(Formatting.noSpace());
            formatter.keyword('}').prepend(Formatting.noSpace());
        }
        else if (ast.isInferredType(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.keywords('infer', 'infers').append(Formatting.oneSpace());
        }
        else if (ast.isAssignment(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.keywords('=', '+=', '?=').surround(Formatting.noSpace());
        }
        else if (ast.isRuleCall(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.keyword('<').surround(Formatting.noSpace());
            formatter.keyword(',').append(Formatting.oneSpace());
            formatter.properties('arguments').append(Formatting.noSpace());
        }
        else if (ast.isInterface(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.keyword('interface').append(Formatting.oneSpace());
            formatter.keyword('extends').prepend(Formatting.oneSpace()).append(indentOrSpace);
            formatter.keywords(',').prepend(Formatting.noSpace()).append(indentOrSpace);
            const bracesOpen = formatter.keyword('{');
            bracesOpen.prepend(Formatting.fit(Formatting.oneSpace(), Formatting.newLine()));
            const bracesClose = formatter.keyword('}');
            bracesClose.prepend(Formatting.newLine());
            formatter.interior(bracesOpen, bracesClose).prepend(Formatting.indent());
        }
        else if (ast.isType(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.keyword('type').append(Formatting.oneSpace());
            formatter.keyword('=').prepend(Formatting.oneSpace()).append(indentOrSpace);
            formatter.keyword(';').prepend(Formatting.noSpace()).append(Formatting.newLine());
        }
        else if (ast.isGrammar(node)) {
            const formatter = this.getNodeFormatter(node);
            const nodes = formatter.nodes(...node.rules, ...node.interfaces, ...node.types, ...node.imports);
            nodes.prepend(Formatting.noIndent());
            formatter.keyword('grammar').prepend(Formatting.noSpace()).append(Formatting.oneSpace());
        }
        if (ast.isAbstractElement(node)) {
            const formatter = this.getNodeFormatter(node);
            formatter.property('cardinality').prepend(Formatting.noSpace());
        }
    }
}
//# sourceMappingURL=grammar-formatter.js.map