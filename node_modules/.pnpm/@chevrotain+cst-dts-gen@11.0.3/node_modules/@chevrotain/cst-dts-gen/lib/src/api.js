import { buildModel } from "./model.js";
import { genDts } from "./generate.js";
const defaultOptions = {
    includeVisitorInterface: true,
    visitorInterfaceName: "ICstNodeVisitor",
};
export function generateCstDts(productions, options) {
    const effectiveOptions = Object.assign(Object.assign({}, defaultOptions), options);
    const model = buildModel(productions);
    return genDts(model, effectiveOptions);
}
//# sourceMappingURL=api.js.map