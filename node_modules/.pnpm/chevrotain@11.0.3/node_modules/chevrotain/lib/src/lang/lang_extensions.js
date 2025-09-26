const NAME = "name";
export function defineNameProp(obj, nameValue) {
    Object.defineProperty(obj, NAME, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: nameValue,
    });
}
//# sourceMappingURL=lang_extensions.js.map