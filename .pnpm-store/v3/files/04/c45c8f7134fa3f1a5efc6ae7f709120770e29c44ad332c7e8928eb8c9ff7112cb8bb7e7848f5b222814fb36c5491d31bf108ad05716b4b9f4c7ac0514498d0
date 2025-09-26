const omitCircularRefsReplacer = (
  replacer: ((this: any, key: string, value: any) => any) | undefined,
) => {
  const known = new WeakSet();
  return (_, value) => {
    if (replacer) {
      value = replacer(_, value);
    }
    if (typeof value === 'object' && value !== null) {
      if (known.has(value)) {
        return;
      }
      known.add(value);
    }
    return value;
  };
};

export const stringify = <T>(
  object: T,
  replacer?: (this: any, key: string, value: any) => any,
): string => JSON.stringify(object, omitCircularRefsReplacer(replacer));
