import type { EtaConfig } from "./config.js";
interface GenericData {
    [index: string]: any;
}
/**
 * Called with `includeFile(path, data)`
 */
export declare function includeFileHelper(this: EtaConfig, path: string, data: GenericData): string;
export {};
//# sourceMappingURL=file-helpers.d.ts.map