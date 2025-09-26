import {
  compact,
  filter,
  forEach,
  isArray,
  isEmpty,
  isFunction,
  isUndefined,
  keys,
  map,
} from "lodash-es";
import { defineNameProp } from "../../lang/lang_extensions.js";
import { CstNode, ICstVisitor } from "@chevrotain/types";

export function defaultVisit<IN>(ctx: any, param: IN): void {
  const childrenNames = keys(ctx);
  const childrenNamesLength = childrenNames.length;
  for (let i = 0; i < childrenNamesLength; i++) {
    const currChildName = childrenNames[i];
    const currChildArray = ctx[currChildName];
    const currChildArrayLength = currChildArray.length;
    for (let j = 0; j < currChildArrayLength; j++) {
      const currChild: any = currChildArray[j];
      // distinction between Tokens Children and CstNode children
      if (currChild.tokenTypeIdx === undefined) {
        this[currChild.name](currChild.children, param);
      }
    }
  }
  // defaultVisit does not support generic out param
}

export function createBaseSemanticVisitorConstructor(
  grammarName: string,
  ruleNames: string[],
): {
  new (...args: any[]): ICstVisitor<any, any>;
} {
  const derivedConstructor: any = function () {};

  // can be overwritten according to:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/
  // name?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FFunction%2Fname
  defineNameProp(derivedConstructor, grammarName + "BaseSemantics");

  const semanticProto = {
    visit: function (cstNode: CstNode | CstNode[], param: any) {
      // enables writing more concise visitor methods when CstNode has only a single child
      if (isArray(cstNode)) {
        // A CST Node's children dictionary can never have empty arrays as values
        // If a key is defined there will be at least one element in the corresponding value array.
        cstNode = cstNode[0];
      }

      // enables passing optional CstNodes concisely.
      if (isUndefined(cstNode)) {
        return undefined;
      }

      return this[cstNode.name](cstNode.children, param);
    },

    validateVisitor: function () {
      const semanticDefinitionErrors = validateVisitor(this, ruleNames);
      if (!isEmpty(semanticDefinitionErrors)) {
        const errorMessages = map(
          semanticDefinitionErrors,
          (currDefError) => currDefError.msg,
        );
        throw Error(
          `Errors Detected in CST Visitor <${this.constructor.name}>:\n\t` +
            `${errorMessages.join("\n\n").replace(/\n/g, "\n\t")}`,
        );
      }
    },
  };

  derivedConstructor.prototype = semanticProto;
  derivedConstructor.prototype.constructor = derivedConstructor;

  derivedConstructor._RULE_NAMES = ruleNames;

  return derivedConstructor;
}

export function createBaseVisitorConstructorWithDefaults(
  grammarName: string,
  ruleNames: string[],
  baseConstructor: Function,
): {
  new (...args: any[]): ICstVisitor<any, any>;
} {
  const derivedConstructor: any = function () {};

  // can be overwritten according to:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/
  // name?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FFunction%2Fname
  defineNameProp(derivedConstructor, grammarName + "BaseSemanticsWithDefaults");

  const withDefaultsProto = Object.create(baseConstructor.prototype);
  forEach(ruleNames, (ruleName) => {
    withDefaultsProto[ruleName] = defaultVisit;
  });

  derivedConstructor.prototype = withDefaultsProto;
  derivedConstructor.prototype.constructor = derivedConstructor;

  return derivedConstructor;
}

export enum CstVisitorDefinitionError {
  REDUNDANT_METHOD,
  MISSING_METHOD,
}

export interface IVisitorDefinitionError {
  msg: string;
  type: CstVisitorDefinitionError;
  methodName: string;
}

export function validateVisitor(
  visitorInstance: ICstVisitor<unknown, unknown>,
  ruleNames: string[],
): IVisitorDefinitionError[] {
  const missingErrors = validateMissingCstMethods(visitorInstance, ruleNames);

  return missingErrors;
}

export function validateMissingCstMethods(
  visitorInstance: ICstVisitor<unknown, unknown>,
  ruleNames: string[],
): IVisitorDefinitionError[] {
  const missingRuleNames = filter(ruleNames, (currRuleName) => {
    return isFunction((visitorInstance as any)[currRuleName]) === false;
  });

  const errors: IVisitorDefinitionError[] = map(
    missingRuleNames,
    (currRuleName) => {
      return {
        msg: `Missing visitor method: <${currRuleName}> on ${<any>(
          visitorInstance.constructor.name
        )} CST Visitor.`,
        type: CstVisitorDefinitionError.MISSING_METHOD,
        methodName: currRuleName,
      };
    },
  );

  return compact<IVisitorDefinitionError>(errors);
}
