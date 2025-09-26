export declare enum SideNavStyleEnum {
    SummaryOnly = "summary-only",
    PathOnly = "path-only",
    IdOnly = "id-only"
}
export interface RedocRawOptions {
    scrollYOffset?: number | string | (() => number);
    hideHostname?: boolean | string;
    expandResponses?: string | "all";
    requiredPropsFirst?: boolean | string;
    sortPropsAlphabetically?: boolean | string;
    sortEnumValuesAlphabetically?: boolean | string;
    sortOperationsAlphabetically?: boolean | string;
    sortTagsAlphabetically?: boolean | string;
    nativeScrollbars?: boolean | string;
    pathInMiddlePanel?: boolean | string;
    untrustedSpec?: boolean | string;
    hideLoading?: boolean | string;
    hideDownloadButton?: boolean | string;
    downloadFileName?: string;
    downloadDefinitionUrl?: string;
    disableSearch?: boolean | string;
    onlyRequiredInSamples?: boolean | string;
    showExtensions?: boolean | string | string[];
    sideNavStyle?: SideNavStyleEnum;
    hideSingleRequestSampleTab?: boolean | string;
    menuToggle?: boolean | string;
    jsonSampleExpandLevel?: number | string | "all";
    hideSchemaTitles?: boolean | string;
    simpleOneOfTypeLabel?: boolean | string;
    payloadSampleIdx?: number;
    expandSingleSchemaField?: boolean | string;
    schemaExpansionLevel?: number | string | "all";
    showObjectSchemaExamples?: boolean | string;
    showSecuritySchemeType?: boolean;
    hideSecuritySection?: boolean;
    unstable_ignoreMimeParameters?: boolean;
    enumSkipQuotes?: boolean | string;
    expandDefaultServerVariables?: boolean;
    maxDisplayedEnumValues?: number;
    ignoreNamedSchemas?: string[] | string;
    hideSchemaPattern?: boolean;
    generatedPayloadSamplesMaxDepth?: number;
    nonce?: string;
    hideFab?: boolean;
    minCharacterLengthToInitSearch?: number;
    showWebhookVerb?: boolean;
}
export declare function argValueToBoolean(val?: string | boolean, defaultValue?: boolean): boolean;
export declare class RedocNormalizedOptions {
    static normalizeExpandResponses(value: RedocRawOptions["expandResponses"]): {};
    static normalizeHideHostname(value: RedocRawOptions["hideHostname"]): boolean;
    static normalizeShowExtensions(value: RedocRawOptions["showExtensions"]): string[] | boolean;
    static normalizeSideNavStyle(value: RedocRawOptions["sideNavStyle"]): SideNavStyleEnum;
    static normalizePayloadSampleIdx(value: RedocRawOptions["payloadSampleIdx"]): number;
    private static normalizeJsonSampleExpandLevel;
    private static normalizeGeneratedPayloadSamplesMaxDepth;
    hideHostname: boolean;
    expandResponses: {
        [code: string]: boolean;
    } | "all";
    requiredPropsFirst: boolean;
    sortPropsAlphabetically: boolean;
    sortEnumValuesAlphabetically: boolean;
    sortOperationsAlphabetically: boolean;
    sortTagsAlphabetically: boolean;
    nativeScrollbars: boolean;
    pathInMiddlePanel: boolean;
    untrustedSpec: boolean;
    hideDownloadButton: boolean;
    downloadFileName?: string;
    downloadDefinitionUrl?: string;
    disableSearch: boolean;
    onlyRequiredInSamples: boolean;
    showExtensions: boolean | string[];
    sideNavStyle: SideNavStyleEnum;
    hideSingleRequestSampleTab: boolean;
    menuToggle: boolean;
    jsonSampleExpandLevel: number;
    enumSkipQuotes: boolean;
    hideSchemaTitles: boolean;
    simpleOneOfTypeLabel: boolean;
    payloadSampleIdx: number;
    expandSingleSchemaField: boolean;
    schemaExpansionLevel: number;
    showObjectSchemaExamples: boolean;
    showSecuritySchemeType?: boolean;
    hideSecuritySection?: boolean;
    unstable_ignoreMimeParameters: boolean;
    expandDefaultServerVariables: boolean;
    maxDisplayedEnumValues?: number;
    ignoreNamedSchemas: Set<string>;
    hideSchemaPattern: boolean;
    generatedPayloadSamplesMaxDepth: number;
    hideFab: boolean;
    minCharacterLengthToInitSearch: number;
    showWebhookVerb: boolean;
    nonce?: string;
    constructor(raw: RedocRawOptions, defaults?: RedocRawOptions);
}
