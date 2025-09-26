"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedocNormalizedOptions = exports.SideNavStyleEnum = void 0;
exports.argValueToBoolean = argValueToBoolean;
// @ts-nocheck
const helpers_1 = require("../utils/helpers");
var SideNavStyleEnum;
(function (SideNavStyleEnum) {
    SideNavStyleEnum["SummaryOnly"] = "summary-only";
    SideNavStyleEnum["PathOnly"] = "path-only";
    SideNavStyleEnum["IdOnly"] = "id-only";
})(SideNavStyleEnum || (exports.SideNavStyleEnum = SideNavStyleEnum = {}));
function argValueToBoolean(val, defaultValue) {
    if (val === undefined) {
        return defaultValue || false;
    }
    if (typeof val === "string") {
        return val !== "false";
    }
    return val;
}
function argValueToNumber(value) {
    if (typeof value === "string") {
        return parseInt(value, 10);
    }
    if (typeof value === "number") {
        return value;
    }
}
function argValueToExpandLevel(value, defaultValue = 0) {
    if (value === "all")
        return Infinity;
    return argValueToNumber(value) || defaultValue;
}
class RedocNormalizedOptions {
    static normalizeExpandResponses(value) {
        if (value === "all") {
            return "all";
        }
        if (typeof value === "string") {
            const res = {};
            value.split(",").forEach((code) => {
                res[code.trim()] = true;
            });
            return res;
        }
        else if (value !== undefined) {
            console.warn(`expandResponses must be a string but received value "${value}" of type ${typeof value}`);
        }
        return {};
    }
    static normalizeHideHostname(value) {
        return !!value;
    }
    static normalizeShowExtensions(value) {
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
    static normalizeSideNavStyle(value) {
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
    static normalizePayloadSampleIdx(value) {
        if (typeof value === "number") {
            return Math.max(0, value); // always greater or equal than 0
        }
        if (typeof value === "string") {
            return isFinite(value) ? parseInt(value, 10) : 0;
        }
        return 0;
    }
    static normalizeJsonSampleExpandLevel(level) {
        if (level === "all") {
            return +Infinity;
        }
        if (!isNaN(Number(level))) {
            return Math.ceil(Number(level));
        }
        return 2;
    }
    static normalizeGeneratedPayloadSamplesMaxDepth(value) {
        if (!isNaN(Number(value))) {
            return Math.max(0, Number(value));
        }
        return 10;
    }
    constructor(raw, defaults = {}) {
        var _a;
        raw = { ...defaults, ...raw };
        this.hideHostname = RedocNormalizedOptions.normalizeHideHostname(raw.hideHostname);
        this.expandResponses = RedocNormalizedOptions.normalizeExpandResponses(raw.expandResponses);
        this.requiredPropsFirst = argValueToBoolean(raw.requiredPropsFirst);
        this.sortPropsAlphabetically = argValueToBoolean(raw.sortPropsAlphabetically);
        this.sortEnumValuesAlphabetically = argValueToBoolean(raw.sortEnumValuesAlphabetically);
        this.sortOperationsAlphabetically = argValueToBoolean(raw.sortOperationsAlphabetically);
        this.sortTagsAlphabetically = argValueToBoolean(raw.sortTagsAlphabetically);
        this.nativeScrollbars = argValueToBoolean(raw.nativeScrollbars);
        this.pathInMiddlePanel = argValueToBoolean(raw.pathInMiddlePanel);
        this.untrustedSpec = argValueToBoolean(raw.untrustedSpec);
        this.hideDownloadButton = argValueToBoolean(raw.hideDownloadButton);
        this.downloadFileName = raw.downloadFileName;
        this.downloadDefinitionUrl = raw.downloadDefinitionUrl;
        this.disableSearch = argValueToBoolean(raw.disableSearch);
        this.onlyRequiredInSamples = argValueToBoolean(raw.onlyRequiredInSamples);
        this.showExtensions = RedocNormalizedOptions.normalizeShowExtensions(raw.showExtensions);
        this.sideNavStyle = RedocNormalizedOptions.normalizeSideNavStyle(raw.sideNavStyle);
        this.hideSingleRequestSampleTab = argValueToBoolean(raw.hideSingleRequestSampleTab);
        this.menuToggle = argValueToBoolean(raw.menuToggle, true);
        this.jsonSampleExpandLevel =
            RedocNormalizedOptions.normalizeJsonSampleExpandLevel(raw.jsonSampleExpandLevel);
        this.enumSkipQuotes = argValueToBoolean(raw.enumSkipQuotes);
        this.hideSchemaTitles = argValueToBoolean(raw.hideSchemaTitles);
        this.simpleOneOfTypeLabel = argValueToBoolean(raw.simpleOneOfTypeLabel);
        this.payloadSampleIdx = RedocNormalizedOptions.normalizePayloadSampleIdx(raw.payloadSampleIdx);
        this.expandSingleSchemaField = argValueToBoolean(raw.expandSingleSchemaField);
        this.schemaExpansionLevel = argValueToExpandLevel(raw.schemaExpansionLevel);
        this.showObjectSchemaExamples = argValueToBoolean(raw.showObjectSchemaExamples);
        this.showSecuritySchemeType = argValueToBoolean(raw.showSecuritySchemeType);
        this.hideSecuritySection = argValueToBoolean(raw.hideSecuritySection);
        this.unstable_ignoreMimeParameters = argValueToBoolean(raw.unstable_ignoreMimeParameters);
        this.expandDefaultServerVariables = argValueToBoolean(raw.expandDefaultServerVariables);
        this.maxDisplayedEnumValues = argValueToNumber(raw.maxDisplayedEnumValues);
        const ignoreNamedSchemas = (0, helpers_1.isArray)(raw.ignoreNamedSchemas)
            ? raw.ignoreNamedSchemas
            : (_a = raw.ignoreNamedSchemas) === null || _a === void 0 ? void 0 : _a.split(",").map((s) => s.trim());
        this.ignoreNamedSchemas = new Set(ignoreNamedSchemas);
        this.hideSchemaPattern = argValueToBoolean(raw.hideSchemaPattern);
        this.generatedPayloadSamplesMaxDepth =
            RedocNormalizedOptions.normalizeGeneratedPayloadSamplesMaxDepth(raw.generatedPayloadSamplesMaxDepth);
        this.nonce = raw.nonce;
        this.hideFab = argValueToBoolean(raw.hideFab);
        this.minCharacterLengthToInitSearch =
            argValueToNumber(raw.minCharacterLengthToInitSearch) || 3;
        this.showWebhookVerb = argValueToBoolean(raw.showWebhookVerb);
    }
}
exports.RedocNormalizedOptions = RedocNormalizedOptions;
