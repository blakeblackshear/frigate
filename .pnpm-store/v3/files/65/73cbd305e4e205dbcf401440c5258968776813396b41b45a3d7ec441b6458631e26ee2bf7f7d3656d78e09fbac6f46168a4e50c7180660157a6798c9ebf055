import type { EtaConfig } from "./config.js";
/**
 * Get the absolute path to an included template
 *
 * If this is called with an absolute path (for example, starting with '/' or 'C:\')
 * then Eta will attempt to resolve the absolute path within options.views. If it cannot,
 * Eta will fallback to options.root or '/'
 *
 * If this is called with a relative path, Eta will:
 * - Look relative to the current template (if the current template has the `filename` property)
 * - Look inside each directory in options.views
 *
 * Note: if Eta is unable to find a template using path and options, it will throw an error.
 *
 * @param path    specified path
 * @param options compilation options
 * @return absolute path to template
 */
declare function getPath(path: string, options: EtaConfig): string;
/**
 * Reads a file synchronously
 */
declare function readFile(filePath: string): string;
export { getPath, readFile };
//# sourceMappingURL=file-utils.d.ts.map