import { GAstVisitor, NonTerminal } from "@chevrotain/gast";
import { assign, flatten, groupBy, map, some, values } from "lodash-es";
export function buildModel(productions) {
    const generator = new CstNodeDefinitionGenerator();
    const allRules = values(productions);
    return map(allRules, (rule) => generator.visitRule(rule));
}
class CstNodeDefinitionGenerator extends GAstVisitor {
    visitRule(node) {
        const rawElements = this.visitEach(node.definition);
        const grouped = groupBy(rawElements, (el) => el.propertyName);
        const properties = map(grouped, (group, propertyName) => {
            const allNullable = !some(group, (el) => !el.canBeNull);
            // In an alternation with a label a property name can have
            // multiple types.
            let propertyType = group[0].type;
            if (group.length > 1) {
                propertyType = map(group, (g) => g.type);
            }
            return {
                name: propertyName,
                type: propertyType,
                optional: allNullable,
            };
        });
        return {
            name: node.name,
            properties: properties,
        };
    }
    visitAlternative(node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    }
    visitOption(node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    }
    visitRepetition(node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    }
    visitRepetitionMandatory(node) {
        return this.visitEach(node.definition);
    }
    visitRepetitionMandatoryWithSeparator(node) {
        return this.visitEach(node.definition).concat({
            propertyName: node.separator.name,
            canBeNull: true,
            type: getType(node.separator),
        });
    }
    visitRepetitionWithSeparator(node) {
        return this.visitEachAndOverrideWith(node.definition, {
            canBeNull: true,
        }).concat({
            propertyName: node.separator.name,
            canBeNull: true,
            type: getType(node.separator),
        });
    }
    visitAlternation(node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    }
    visitTerminal(node) {
        return [
            {
                propertyName: node.label || node.terminalType.name,
                canBeNull: false,
                type: getType(node),
            },
        ];
    }
    visitNonTerminal(node) {
        return [
            {
                propertyName: node.label || node.nonTerminalName,
                canBeNull: false,
                type: getType(node),
            },
        ];
    }
    visitEachAndOverrideWith(definition, override) {
        return map(this.visitEach(definition), (definition) => assign({}, definition, override));
    }
    visitEach(definition) {
        return flatten(map(definition, (definition) => this.visit(definition)));
    }
}
function getType(production) {
    if (production instanceof NonTerminal) {
        return {
            kind: "rule",
            name: production.referencedRule.name,
        };
    }
    return { kind: "token" };
}
//# sourceMappingURL=model.js.map