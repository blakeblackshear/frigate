import type { Character, IRegExpAST, RegExpFlags } from "../types";

export function cc(char: string): number {
  return char.charCodeAt(0);
}

export function insertToSet<T>(item: T | T[], set: T[]) {
  if (Array.isArray(item)) {
    item.forEach(function (subItem) {
      set.push(subItem);
    });
  } else {
    set.push(item);
  }
}

export function addFlag(
  flagObj: RegExpFlags,
  flagKey: keyof Omit<RegExpFlags, keyof IRegExpAST>,
) {
  if (flagObj[flagKey] === true) {
    throw "duplicate flag " + flagKey;
  }

  const x: boolean = flagObj[flagKey];
  flagObj[flagKey] = true;
}

export function ASSERT_EXISTS<T = Object>(obj: any): obj is T {
  // istanbul ignore next
  if (obj === undefined) {
    throw Error("Internal Error - Should never get here!");
  }
  return true;
}

// istanbul ignore next
export function ASSERT_NEVER_REACH_HERE(): any {
  throw Error("Internal Error - Should never get here!");
}

export function isCharacter(obj: { type: string }): obj is Character {
  return obj["type"] === "Character";
}
