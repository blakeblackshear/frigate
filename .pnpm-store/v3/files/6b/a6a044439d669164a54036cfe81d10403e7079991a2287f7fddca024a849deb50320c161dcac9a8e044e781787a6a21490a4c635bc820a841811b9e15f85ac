import type { EtaConfig, PartialConfig } from "./config.js";
import type { TemplateFunction } from "./compile.js";
export type CallbackFn = (err: Error | null, str?: string) => void;
interface DataObj {
    [key: string]: any;
}
interface PartialConfigWithFilename extends Partial<EtaConfig> {
    filename: string;
}
/**
 * Reads a template, compiles it into a function, caches it if caching isn't disabled, returns the function
 *
 * @param filePath Absolute path to template file
 * @param options Eta configuration overrides
 * @param noCache Optionally, make Eta not cache the template
 */
export declare function loadFile(filePath: string, options: PartialConfigWithFilename, noCache?: boolean): TemplateFunction;
/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * This returns a template function and the config object with which that template function should be called.
 *
 * @remarks
 *
 * It's important that this returns a config object with `filename` set.
 * Otherwise, the included file would not be able to use relative paths
 *
 * @param path path for the specified file (if relative, specify `views` on `options`)
 * @param options compilation options
 * @return [Eta template function, new config object]
 */
declare function includeFile(path: string, options: EtaConfig): [TemplateFunction, EtaConfig];
/**
 * Render a template from a filepath.
 *
 * @param filepath Path to template file. If relative, specify `views` on the config object
 *
 * This can take two different function signatures:
 *
 * - `renderFile(filename, data, [cb])`
 * - `renderFile(filename, data, [config], [cb])`
 *
 * Note that renderFile does not immediately return the rendered result. If you pass in a callback function, it will be called with `(err, res)`. Otherwise, `renderFile` will return a `Promise` that resolves to the render result.
 *
 * **Examples**
 *
 * ```js
 * eta.renderFile("./template.eta", data, {cache: true}, function (err, rendered) {
 *   if (err) console.log(err)
 *   console.log(rendered)
 * })
 *
 * let rendered = await eta.renderFile("./template.eta", data, {cache: true})
 *
 * ```
 */
declare function renderFile(filename: string, data: DataObj, config?: PartialConfig): Promise<string>;
declare function renderFile(filename: string, data: DataObj, config: PartialConfig, cb: CallbackFn): void;
declare function renderFile(filename: string, data: DataObj, config?: PartialConfig, cb?: CallbackFn): Promise<string> | void;
declare function renderFile(filename: string, data: DataObj, cb: CallbackFn): void;
/**
 * Render a template from a filepath asynchronously.
 *
 * @param filepath Path to template file. If relative, specify `views` on the config object
 *
 * This can take two different function signatures:
 *
 * - `renderFile(filename, data, [cb])`
 * - `renderFile(filename, data, [config], [cb])`
 *
 * Note that renderFile does not immediately return the rendered result. If you pass in a callback function, it will be called with `(err, res)`. Otherwise, `renderFile` will return a `Promise` that resolves to the render result.
 *
 * **Examples**
 *
 * ```js
 * eta.renderFile("./template.eta", data, {cache: true}, function (err, rendered) {
 *   if (err) console.log(err)
 *   console.log(rendered)
 * })
 *
 * let rendered = await eta.renderFile("./template.eta", data, {cache: true})
 *
 * ```
 */
declare function renderFileAsync(filename: string, data: DataObj, config?: PartialConfig): Promise<string>;
declare function renderFileAsync(filename: string, data: DataObj, config: PartialConfig, cb: CallbackFn): void;
declare function renderFileAsync(filename: string, data: DataObj, config?: PartialConfig, cb?: CallbackFn): Promise<string> | void;
declare function renderFileAsync(filename: string, data: DataObj, cb: CallbackFn): void;
export { includeFile, renderFile, renderFileAsync };
//# sourceMappingURL=file-handlers.d.ts.map