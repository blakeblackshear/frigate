import type { LoadContext, Plugin } from "@docusaurus/types";
import type { LoadedContent, PluginOptions } from "./types";
export declare function isURL(str: string): boolean;
export declare function getDocsPluginConfig(presetsPlugins: any[], plugin: string, pluginId: string): Object | undefined;
declare function pluginOpenAPIDocs(context: LoadContext, options: PluginOptions): Plugin<LoadedContent>;
declare namespace pluginOpenAPIDocs {
    var validateOptions: ({ options, validate }: any) => any;
}
export default pluginOpenAPIDocs;
