const NAME = "name";

export function defineNameProp(obj: {}, nameValue: string): void {
  Object.defineProperty(obj, NAME, {
    enumerable: false,
    configurable: true,
    writable: false,
    value: nameValue,
  });
}
