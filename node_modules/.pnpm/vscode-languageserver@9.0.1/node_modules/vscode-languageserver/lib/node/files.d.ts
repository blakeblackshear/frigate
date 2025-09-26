/**
 * @deprecated Use the `vscode-uri` npm module which provides a more
 * complete implementation of handling VS Code URIs.
 */
export declare function uriToFilePath(uri: string): string | undefined;
export declare function resolve(moduleName: string, nodePath: string | undefined, cwd: string | undefined, tracer: (message: string, verbose?: string) => void): Promise<string>;
/**
 * Resolve the global npm package path.
 * @deprecated Since this depends on the used package manager and their version the best is that servers
 * implement this themselves since they know best what kind of package managers to support.
 * @param tracer the tracer to use
 */
export declare function resolveGlobalNodePath(tracer?: (message: string) => void): string | undefined;
export declare function resolveGlobalYarnPath(tracer?: (message: string) => void): string | undefined;
export declare namespace FileSystem {
    function isCaseSensitive(): boolean;
    function isParent(parent: string, child: string): boolean;
}
export declare function resolveModulePath(workspaceRoot: string, moduleName: string, nodePath: string, tracer: (message: string, verbose?: string) => void): Promise<string>;
