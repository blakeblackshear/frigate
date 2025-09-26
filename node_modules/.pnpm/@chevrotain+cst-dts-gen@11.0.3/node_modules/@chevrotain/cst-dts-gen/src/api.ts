import { GenerateDtsOptions, Rule } from "@chevrotain/types";
import { buildModel } from "./model.js";
import { genDts } from "./generate.js";

const defaultOptions: Required<GenerateDtsOptions> = {
  includeVisitorInterface: true,
  visitorInterfaceName: "ICstNodeVisitor",
};

export function generateCstDts(
  productions: Record<string, Rule>,
  options?: GenerateDtsOptions,
): string {
  const effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  const model = buildModel(productions);

  return genDts(model, effectiveOptions);
}
