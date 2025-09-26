import { CustomIconLoader } from "./types.js";
import { Awaitable } from "@antfu/utils";
/**
 * Returns CustomIconLoader for loading icons from a directory
 */
declare function FileSystemIconLoader(dir: string, transform?: (svg: string) => Awaitable<string>): CustomIconLoader;
export { FileSystemIconLoader };