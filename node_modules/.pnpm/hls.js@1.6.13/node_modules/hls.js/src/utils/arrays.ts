export function arrayValuesMatch(
  a: (string | number)[] | Uint8Array,
  b: (string | number)[] | Uint8Array,
): boolean {
  if (a.length === b.length) {
    return !a.some((value: string | number, i: number) => value !== b[i]);
  }
  return false;
}

export function optionalArrayValuesMatch(
  a: (string | number)[] | Uint8Array | null | undefined,
  b: (string | number)[] | Uint8Array | null | undefined,
): boolean {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return arrayValuesMatch(a, b);
}
