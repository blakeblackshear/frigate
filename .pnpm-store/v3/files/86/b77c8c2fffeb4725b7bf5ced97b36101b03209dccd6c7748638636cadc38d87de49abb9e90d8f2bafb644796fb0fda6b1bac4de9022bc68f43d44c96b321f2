declare type PM = "npm" | "yarn" | "pnpm" | "bun";
declare const detect: ({ cwd, includeGlobalBun, }?: {
    cwd?: string | undefined;
    includeGlobalBun?: boolean | undefined;
}) => Promise<PM>;

declare function getNpmVersion(pm: PM): Promise<string>;
declare function clearCache(): void;

export { PM, clearCache, detect, getNpmVersion };
