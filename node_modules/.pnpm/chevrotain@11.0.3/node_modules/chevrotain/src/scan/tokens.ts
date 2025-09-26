import {
  clone,
  compact,
  difference,
  flatten,
  forEach,
  has,
  includes,
  isArray,
  isEmpty,
  map,
} from "lodash-es";
import { IToken, TokenType } from "@chevrotain/types";

export function tokenStructuredMatcher(
  tokInstance: IToken,
  tokConstructor: TokenType,
) {
  const instanceType = tokInstance.tokenTypeIdx;
  if (instanceType === tokConstructor.tokenTypeIdx) {
    return true;
  } else {
    return (
      tokConstructor.isParent === true &&
      tokConstructor.categoryMatchesMap![instanceType] === true
    );
  }
}

// Optimized tokenMatcher in case our grammar does not use token categories
// Being so tiny it is much more likely to be in-lined and this avoid the function call overhead
export function tokenStructuredMatcherNoCategories(
  token: IToken,
  tokType: TokenType,
) {
  return token.tokenTypeIdx === tokType.tokenTypeIdx;
}

export let tokenShortNameIdx = 1;
export const tokenIdxToClass: { [tokenIdx: number]: TokenType } = {};

export function augmentTokenTypes(tokenTypes: TokenType[]): void {
  // collect the parent Token Types as well.
  const tokenTypesAndParents = expandCategories(tokenTypes);

  // add required tokenType and categoryMatches properties
  assignTokenDefaultProps(tokenTypesAndParents);

  // fill up the categoryMatches
  assignCategoriesMapProp(tokenTypesAndParents);
  assignCategoriesTokensProp(tokenTypesAndParents);

  forEach(tokenTypesAndParents, (tokType) => {
    tokType.isParent = tokType.categoryMatches!.length > 0;
  });
}

export function expandCategories(tokenTypes: TokenType[]): TokenType[] {
  let result = clone(tokenTypes);

  let categories = tokenTypes;
  let searching = true;
  while (searching) {
    categories = compact(
      flatten(map(categories, (currTokType) => currTokType.CATEGORIES)),
    );

    const newCategories = difference(categories, result);

    result = result.concat(newCategories);

    if (isEmpty(newCategories)) {
      searching = false;
    } else {
      categories = newCategories;
    }
  }
  return result;
}

export function assignTokenDefaultProps(tokenTypes: TokenType[]): void {
  forEach(tokenTypes, (currTokType) => {
    if (!hasShortKeyProperty(currTokType)) {
      tokenIdxToClass[tokenShortNameIdx] = currTokType;
      (<any>currTokType).tokenTypeIdx = tokenShortNameIdx++;
    }

    // CATEGORIES? : TokenType | TokenType[]
    if (
      hasCategoriesProperty(currTokType) &&
      !isArray(currTokType.CATEGORIES)
      // &&
      // !isUndefined(currTokType.CATEGORIES.PATTERN)
    ) {
      currTokType.CATEGORIES = [currTokType.CATEGORIES as unknown as TokenType];
    }

    if (!hasCategoriesProperty(currTokType)) {
      currTokType.CATEGORIES = [];
    }

    if (!hasExtendingTokensTypesProperty(currTokType)) {
      currTokType.categoryMatches = [];
    }

    if (!hasExtendingTokensTypesMapProperty(currTokType)) {
      currTokType.categoryMatchesMap = {};
    }
  });
}

export function assignCategoriesTokensProp(tokenTypes: TokenType[]): void {
  forEach(tokenTypes, (currTokType) => {
    // avoid duplications
    currTokType.categoryMatches = [];
    forEach(currTokType.categoryMatchesMap!, (val, key) => {
      currTokType.categoryMatches!.push(
        tokenIdxToClass[key as unknown as number].tokenTypeIdx!,
      );
    });
  });
}

export function assignCategoriesMapProp(tokenTypes: TokenType[]): void {
  forEach(tokenTypes, (currTokType) => {
    singleAssignCategoriesToksMap([], currTokType);
  });
}

export function singleAssignCategoriesToksMap(
  path: TokenType[],
  nextNode: TokenType,
): void {
  forEach(path, (pathNode) => {
    nextNode.categoryMatchesMap![pathNode.tokenTypeIdx!] = true;
  });

  forEach(nextNode.CATEGORIES, (nextCategory) => {
    const newPath = path.concat(nextNode);
    // avoids infinite loops due to cyclic categories.
    if (!includes(newPath, nextCategory)) {
      singleAssignCategoriesToksMap(newPath, nextCategory);
    }
  });
}

export function hasShortKeyProperty(tokType: TokenType): boolean {
  return has(tokType, "tokenTypeIdx");
}

export function hasCategoriesProperty(tokType: TokenType): boolean {
  return has(tokType, "CATEGORIES");
}

export function hasExtendingTokensTypesProperty(tokType: TokenType): boolean {
  return has(tokType, "categoryMatches");
}

export function hasExtendingTokensTypesMapProperty(
  tokType: TokenType,
): boolean {
  return has(tokType, "categoryMatchesMap");
}

export function isTokenType(tokType: TokenType): boolean {
  return has(tokType, "tokenTypeIdx");
}
