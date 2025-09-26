export function getCompilationHooks(
  compilation: Compilation,
): MiniCssExtractPluginCompilationHooks;
export type Compilation = import("webpack").Compilation;
export type VarNames = {
  tag: string;
  chunkId: string;
  href: string;
  resolve: string;
  reject: string;
};
export type MiniCssExtractPluginCompilationHooks = {
  beforeTagInsert: import("tapable").SyncWaterfallHook<
    [string, VarNames],
    string
  >;
};
