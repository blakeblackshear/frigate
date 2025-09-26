/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

// @ts-nocheck

import { isArray } from "../utils/helpers";

export enum SideNavStyleEnum {
  SummaryOnly = "summary-only",
  PathOnly = "path-only",
  IdOnly = "id-only",
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

export function argValueToBoolean(
  val?: string | boolean,
  defaultValue?: boolean
): boolean {
  if (val === undefined) {
    return defaultValue || false;
  }
  if (typeof val === "string") {
    return val !== "false";
  }
  return val;
}

function argValueToNumber(
  value: number | string | undefined
): number | undefined {
  if (typeof value === "string") {
    return parseInt(value, 10);
  }

  if (typeof value === "number") {
    return value;
  }
}

function argValueToExpandLevel(
  value?: number | string | undefined,
  defaultValue = 0
): number {
  if (value === "all") return Infinity;

  return argValueToNumber(value) || defaultValue;
}

export class RedocNormalizedOptions {
  static normalizeExpandResponses(value: RedocRawOptions["expandResponses"]) {
    if (value === "all") {
      return "all";
    }
    if (typeof value === "string") {
      const res = {};
      value.split(",").forEach((code) => {
        res[code.trim()] = true;
      });
      return res;
    } else if (value !== undefined) {
      console.warn(
        `expandResponses must be a string but received value "${value}" of type ${typeof value}`
      );
    }
    return {};
  }

  static normalizeHideHostname(
    value: RedocRawOptions["hideHostname"]
  ): boolean {
    return !!value;
  }

  static normalizeShowExtensions(
    value: RedocRawOptions["showExtensions"]
  ): string[] | boolean {
    if (typeof value === "undefined") {
      return false;
    }
    if (value === "") {
      return true;
    }

    if (typeof value !== "string") {
      return value;
    }

    switch (value) {
      case "true":
        return true;
      case "false":
        return false;
      default:
        return value.split(",").map((ext) => ext.trim());
    }
  }

  static normalizeSideNavStyle(
    value: RedocRawOptions["sideNavStyle"]
  ): SideNavStyleEnum {
    const defaultValue = SideNavStyleEnum.SummaryOnly;
    if (typeof value !== "string") {
      return defaultValue;
    }

    switch (value) {
      case defaultValue:
        return value;
      case SideNavStyleEnum.PathOnly:
        return SideNavStyleEnum.PathOnly;
      case SideNavStyleEnum.IdOnly:
        return SideNavStyleEnum.IdOnly;
      default:
        return defaultValue;
    }
  }

  static normalizePayloadSampleIdx(
    value: RedocRawOptions["payloadSampleIdx"]
  ): number {
    if (typeof value === "number") {
      return Math.max(0, value); // always greater or equal than 0
    }

    if (typeof value === "string") {
      return isFinite(value) ? parseInt(value, 10) : 0;
    }

    return 0;
  }

  private static normalizeJsonSampleExpandLevel(
    level?: number | string | "all"
  ): number {
    if (level === "all") {
      return +Infinity;
    }
    if (!isNaN(Number(level))) {
      return Math.ceil(Number(level));
    }
    return 2;
  }

  private static normalizeGeneratedPayloadSamplesMaxDepth(
    value?: number | string | undefined
  ): number {
    if (!isNaN(Number(value))) {
      return Math.max(0, Number(value));
    }

    return 10;
  }

  hideHostname: boolean;
  expandResponses: { [code: string]: boolean } | "all";
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

  /* tslint:disable-next-line */
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

  constructor(raw: RedocRawOptions, defaults: RedocRawOptions = {}) {
    raw = { ...defaults, ...raw };

    this.hideHostname = RedocNormalizedOptions.normalizeHideHostname(
      raw.hideHostname
    );
    this.expandResponses = RedocNormalizedOptions.normalizeExpandResponses(
      raw.expandResponses
    );
    this.requiredPropsFirst = argValueToBoolean(raw.requiredPropsFirst);
    this.sortPropsAlphabetically = argValueToBoolean(
      raw.sortPropsAlphabetically
    );
    this.sortEnumValuesAlphabetically = argValueToBoolean(
      raw.sortEnumValuesAlphabetically
    );
    this.sortOperationsAlphabetically = argValueToBoolean(
      raw.sortOperationsAlphabetically
    );
    this.sortTagsAlphabetically = argValueToBoolean(raw.sortTagsAlphabetically);
    this.nativeScrollbars = argValueToBoolean(raw.nativeScrollbars);
    this.pathInMiddlePanel = argValueToBoolean(raw.pathInMiddlePanel);
    this.untrustedSpec = argValueToBoolean(raw.untrustedSpec);
    this.hideDownloadButton = argValueToBoolean(raw.hideDownloadButton);
    this.downloadFileName = raw.downloadFileName;
    this.downloadDefinitionUrl = raw.downloadDefinitionUrl;
    this.disableSearch = argValueToBoolean(raw.disableSearch);
    this.onlyRequiredInSamples = argValueToBoolean(raw.onlyRequiredInSamples);
    this.showExtensions = RedocNormalizedOptions.normalizeShowExtensions(
      raw.showExtensions
    );
    this.sideNavStyle = RedocNormalizedOptions.normalizeSideNavStyle(
      raw.sideNavStyle
    );
    this.hideSingleRequestSampleTab = argValueToBoolean(
      raw.hideSingleRequestSampleTab
    );
    this.menuToggle = argValueToBoolean(raw.menuToggle, true);
    this.jsonSampleExpandLevel =
      RedocNormalizedOptions.normalizeJsonSampleExpandLevel(
        raw.jsonSampleExpandLevel
      );
    this.enumSkipQuotes = argValueToBoolean(raw.enumSkipQuotes);
    this.hideSchemaTitles = argValueToBoolean(raw.hideSchemaTitles);
    this.simpleOneOfTypeLabel = argValueToBoolean(raw.simpleOneOfTypeLabel);
    this.payloadSampleIdx = RedocNormalizedOptions.normalizePayloadSampleIdx(
      raw.payloadSampleIdx
    );
    this.expandSingleSchemaField = argValueToBoolean(
      raw.expandSingleSchemaField
    );
    this.schemaExpansionLevel = argValueToExpandLevel(raw.schemaExpansionLevel);
    this.showObjectSchemaExamples = argValueToBoolean(
      raw.showObjectSchemaExamples
    );
    this.showSecuritySchemeType = argValueToBoolean(raw.showSecuritySchemeType);
    this.hideSecuritySection = argValueToBoolean(raw.hideSecuritySection);

    this.unstable_ignoreMimeParameters = argValueToBoolean(
      raw.unstable_ignoreMimeParameters
    );

    this.expandDefaultServerVariables = argValueToBoolean(
      raw.expandDefaultServerVariables
    );
    this.maxDisplayedEnumValues = argValueToNumber(raw.maxDisplayedEnumValues);
    const ignoreNamedSchemas = isArray(raw.ignoreNamedSchemas)
      ? raw.ignoreNamedSchemas
      : raw.ignoreNamedSchemas?.split(",").map((s) => s.trim());
    this.ignoreNamedSchemas = new Set(ignoreNamedSchemas);
    this.hideSchemaPattern = argValueToBoolean(raw.hideSchemaPattern);
    this.generatedPayloadSamplesMaxDepth =
      RedocNormalizedOptions.normalizeGeneratedPayloadSamplesMaxDepth(
        raw.generatedPayloadSamplesMaxDepth
      );
    this.nonce = raw.nonce;
    this.hideFab = argValueToBoolean(raw.hideFab);
    this.minCharacterLengthToInitSearch =
      argValueToNumber(raw.minCharacterLengthToInitSearch) || 3;
    this.showWebhookVerb = argValueToBoolean(raw.showWebhookVerb);
  }
}
