export function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach((baseCtor) => {
        const baseProto = baseCtor.prototype;
        Object.getOwnPropertyNames(baseProto).forEach((propName) => {
            if (propName === "constructor") {
                return;
            }
            const basePropDescriptor = Object.getOwnPropertyDescriptor(baseProto, propName);
            // Handle Accessors
            if (basePropDescriptor &&
                (basePropDescriptor.get || basePropDescriptor.set)) {
                Object.defineProperty(derivedCtor.prototype, propName, basePropDescriptor);
            }
            else {
                derivedCtor.prototype[propName] = baseCtor.prototype[propName];
            }
        });
    });
}
//# sourceMappingURL=apply_mixins.js.map