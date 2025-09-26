import type { Program } from 'typescript';
import type { Lib } from './lib';
type DebugLevel = ('eslint' | 'typescript-eslint' | 'typescript')[] | boolean;
type CacheDurationSeconds = number | 'Infinity';
type EcmaVersion = 3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 'latest' | undefined;
type SourceTypeClassic = 'module' | 'script';
type SourceType = SourceTypeClassic | 'commonjs';
type JSDocParsingMode = 'all' | 'none' | 'type-info';
interface ParserOptions {
    ecmaFeatures?: {
        globalReturn?: boolean | undefined;
        jsx?: boolean | undefined;
        [key: string]: unknown;
    } | undefined;
    ecmaVersion?: EcmaVersion;
    jsxPragma?: string | null;
    jsxFragmentName?: string | null;
    lib?: Lib[];
    emitDecoratorMetadata?: boolean;
    experimentalDecorators?: boolean;
    comment?: boolean;
    debugLevel?: DebugLevel;
    errorOnTypeScriptSyntacticAndSemanticIssues?: boolean;
    errorOnUnknownASTType?: boolean;
    EXPERIMENTAL_useProjectService?: boolean;
    EXPERIMENTAL_useSourceOfProjectReferenceRedirect?: boolean;
    extraFileExtensions?: string[];
    filePath?: string;
    jsDocParsingMode?: JSDocParsingMode;
    loc?: boolean;
    programs?: Program[] | null;
    project?: string[] | string | boolean | null;
    projectFolderIgnoreList?: string[];
    range?: boolean;
    sourceType?: SourceType | undefined;
    tokens?: boolean;
    tsconfigRootDir?: string;
    warnOnUnsupportedTypeScriptVersion?: boolean;
    cacheLifetime?: {
        glob?: CacheDurationSeconds;
    };
    [additionalProperties: string]: unknown;
}
export { CacheDurationSeconds, DebugLevel, EcmaVersion, JSDocParsingMode, ParserOptions, SourceType, };
//# sourceMappingURL=parser-options.d.ts.map