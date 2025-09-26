import { CstNode, CstNodeLocation, IToken } from "@chevrotain/types";

/**
 * This nodeLocation tracking is not efficient and should only be used
 * when error recovery is enabled or the Token Vector contains virtual Tokens
 * (e.g, Python Indent/Outdent)
 * As it executes the calculation for every single terminal/nonTerminal
 * and does not rely on the fact the token vector is **sorted**
 */
export function setNodeLocationOnlyOffset(
  currNodeLocation: CstNodeLocation,
  newLocationInfo: Required<Pick<IToken, "startOffset" | "endOffset">>,
): void {
  // First (valid) update for this cst node
  if (isNaN(currNodeLocation.startOffset) === true) {
    // assumption1: Token location information is either NaN or a valid number
    // assumption2: Token location information is fully valid if it exist
    // (both start/end offsets exist and are numbers).
    currNodeLocation.startOffset = newLocationInfo.startOffset;
    currNodeLocation.endOffset = newLocationInfo.endOffset;
  }
  // Once the startOffset has been updated with a valid number it should never receive
  // any farther updates as the Token vector is sorted.
  // We still have to check this this condition for every new possible location info
  // because with error recovery enabled we may encounter invalid tokens (NaN location props)
  else if (currNodeLocation.endOffset! < newLocationInfo.endOffset === true) {
    currNodeLocation.endOffset = newLocationInfo.endOffset;
  }
}

/**
 * This nodeLocation tracking is not efficient and should only be used
 * when error recovery is enabled or the Token Vector contains virtual Tokens
 * (e.g, Python Indent/Outdent)
 * As it executes the calculation for every single terminal/nonTerminal
 * and does not rely on the fact the token vector is **sorted**
 */
export function setNodeLocationFull(
  currNodeLocation: CstNodeLocation,
  newLocationInfo: CstNodeLocation,
): void {
  // First (valid) update for this cst node
  if (isNaN(currNodeLocation.startOffset) === true) {
    // assumption1: Token location information is either NaN or a valid number
    // assumption2: Token location information is fully valid if it exist
    // (all start/end props exist and are numbers).
    currNodeLocation.startOffset = newLocationInfo.startOffset;
    currNodeLocation.startColumn = newLocationInfo.startColumn;
    currNodeLocation.startLine = newLocationInfo.startLine;
    currNodeLocation.endOffset = newLocationInfo.endOffset;
    currNodeLocation.endColumn = newLocationInfo.endColumn;
    currNodeLocation.endLine = newLocationInfo.endLine;
  }
  // Once the start props has been updated with a valid number it should never receive
  // any farther updates as the Token vector is sorted.
  // We still have to check this this condition for every new possible location info
  // because with error recovery enabled we may encounter invalid tokens (NaN location props)
  else if (currNodeLocation.endOffset! < newLocationInfo.endOffset! === true) {
    currNodeLocation.endOffset = newLocationInfo.endOffset;
    currNodeLocation.endColumn = newLocationInfo.endColumn;
    currNodeLocation.endLine = newLocationInfo.endLine;
  }
}

export function addTerminalToCst(
  node: CstNode,
  token: IToken,
  tokenTypeName: string,
): void {
  if (node.children[tokenTypeName] === undefined) {
    node.children[tokenTypeName] = [token];
  } else {
    node.children[tokenTypeName].push(token);
  }
}

export function addNoneTerminalToCst(
  node: CstNode,
  ruleName: string,
  ruleResult: any,
): void {
  if (node.children[ruleName] === undefined) {
    node.children[ruleName] = [ruleResult];
  } else {
    node.children[ruleName].push(ruleResult);
  }
}
