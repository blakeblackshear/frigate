import type { TemplateFunction } from "./compile.js";
import type { Cacher } from "./storage.js";
type trimConfig = "nl" | "slurp" | false;
export interface EtaConfig {
    /** Whether or not to automatically XML-escape interpolations. Default true */
    autoEscape: boolean;
    /** Configure automatic whitespace trimming. Default `[false, 'nl']` */
    autoTrim: trimConfig | [trimConfig, trimConfig];
    /** Compile to async function */
    async: boolean;
    /** Whether or not to cache templates if `name` or `filename` is passed */
    cache: boolean;
    /** XML-escaping function */
    e: (str: string) => string;
    /** Parsing options. NOTE: "-" and "_" may not be used, since they are reserved for whitespace trimming. */
    parse: {
        /** Which prefix to use for evaluation. Default `""` */
        exec: string;
        /** Which prefix to use for interpolation. Default `"="` */
        interpolate: string;
        /** Which prefix to use for raw interpolation. Default `"~"` */
        raw: string;
    };
    /** Array of plugins */
    plugins: Array<{
        processFnString?: Function;
        processAST?: Function;
        processTemplate?: Function;
    }>;
    /** Remove all safe-to-remove whitespace */
    rmWhitespace: boolean;
    /** Delimiters: by default `['<%', '%>']` */
    tags: [string, string];
    /** Holds template cache */
    templates: Cacher<TemplateFunction>;
    /** Name of the data object. Default `it` */
    varName: string;
    /** Absolute path to template file */
    filename?: string;
    /** Holds cache of resolved filepaths. Set to `false` to disable */
    filepathCache?: Record<string, string> | false;
    /** A filter function applied to every interpolation or raw interpolation */
    filter?: Function;
    /** Function to include templates by name */
    include?: Function;
    /** Function to include templates by filepath */
    includeFile?: Function;
    /** Name of template */
    name?: string;
    /** Where should absolute paths begin? Default '/' */
    root?: string;
    /** Make data available on the global object instead of varName */
    useWith?: boolean;
    /** Whether or not to cache templates if `name` or `filename` is passed: duplicate of `cache` */
    "view cache"?: boolean;
    /** Directory or directories that contain templates */
    views?: string | Array<string>;
    [index: string]: any;
}
export interface EtaConfigWithFilename extends EtaConfig {
    filename: string;
}
export type PartialConfig = Partial<EtaConfig>;
export type PartialAsyncConfig = PartialConfig & {
    async: true;
};
/** Eta's base (global) configuration */
declare const config: EtaConfig;
/**
 * Takes one or two partial (not necessarily complete) configuration objects, merges them 1 layer deep into eta.config, and returns the result
 *
 * @param override Partial configuration object
 * @param baseConfig Partial configuration object to merge before `override`
 *
 * **Example**
 *
 * ```js
 * let customConfig = getConfig({tags: ['!#', '#!']})
 * ```
 */
declare function getConfig(override: PartialConfig, baseConfig?: EtaConfig): EtaConfig;
/** Update Eta's base config */
declare function configure(options: PartialConfig): Partial<EtaConfig>;
export { config, getConfig, configure };
//# sourceMappingURL=config.d.ts.map