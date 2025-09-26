import type { EtaConfig } from "./config.js";
export type TagType = "r" | "e" | "i" | "";
export interface TemplateObject {
    t: TagType;
    val: string;
}
export type AstObject = string | TemplateObject;
export default function parse(str: string, config: EtaConfig): Array<AstObject>;
//# sourceMappingURL=parse.d.ts.map