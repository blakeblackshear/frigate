var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
define("vs/language/css/monaco.contribution", ["require", "exports", "../../editor.api.001a2486"], function(require2, exports, editor_api) {
  "use strict";
  class LanguageServiceDefaultsImpl {
    constructor(languageId, options, modeConfiguration) {
      __publicField(this, "_onDidChange", new editor_api.Emitter());
      __publicField(this, "_options");
      __publicField(this, "_modeConfiguration");
      __publicField(this, "_languageId");
      this._languageId = languageId;
      this.setOptions(options);
      this.setModeConfiguration(modeConfiguration);
    }
    get onDidChange() {
      return this._onDidChange.event;
    }
    get languageId() {
      return this._languageId;
    }
    get modeConfiguration() {
      return this._modeConfiguration;
    }
    get diagnosticsOptions() {
      return this.options;
    }
    get options() {
      return this._options;
    }
    setOptions(options) {
      this._options = options || /* @__PURE__ */ Object.create(null);
      this._onDidChange.fire(this);
    }
    setDiagnosticsOptions(options) {
      this.setOptions(options);
    }
    setModeConfiguration(modeConfiguration) {
      this._modeConfiguration = modeConfiguration || /* @__PURE__ */ Object.create(null);
      this._onDidChange.fire(this);
    }
  }
  const optionsDefault = {
    validate: true,
    lint: {
      compatibleVendorPrefixes: "ignore",
      vendorPrefix: "warning",
      duplicateProperties: "warning",
      emptyRules: "warning",
      importStatement: "ignore",
      boxModel: "ignore",
      universalSelector: "ignore",
      zeroUnits: "ignore",
      fontFaceProperties: "warning",
      hexColorLength: "error",
      argumentsInColorFunction: "error",
      unknownProperties: "warning",
      ieHack: "ignore",
      unknownVendorSpecificProperties: "ignore",
      propertyIgnoredDueToDisplay: "warning",
      important: "ignore",
      float: "ignore",
      idSelector: "ignore"
    },
    data: { useDefaultDataProvider: true },
    format: {
      newlineBetweenSelectors: true,
      newlineBetweenRules: true,
      spaceAroundSelectorSeparator: false,
      braceStyle: "collapse",
      maxPreserveNewLines: void 0,
      preserveNewLines: true
    }
  };
  const modeConfigurationDefault = {
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    definitions: true,
    references: true,
    documentHighlights: true,
    rename: true,
    colors: true,
    foldingRanges: true,
    diagnostics: true,
    selectionRanges: true,
    documentFormattingEdits: true,
    documentRangeFormattingEdits: true
  };
  const cssDefaults = new LanguageServiceDefaultsImpl(
    "css",
    optionsDefault,
    modeConfigurationDefault
  );
  const scssDefaults = new LanguageServiceDefaultsImpl(
    "scss",
    optionsDefault,
    modeConfigurationDefault
  );
  const lessDefaults = new LanguageServiceDefaultsImpl(
    "less",
    optionsDefault,
    modeConfigurationDefault
  );
  editor_api.languages.css = { cssDefaults, lessDefaults, scssDefaults };
  function getMode() {
    {
      return new Promise((resolve, reject) => require2(["../../cssMode.71dc3162"], resolve, reject));
    }
  }
  editor_api.languages.onLanguage("less", () => {
    getMode().then((mode2) => mode2.setupMode(lessDefaults));
  });
  editor_api.languages.onLanguage("scss", () => {
    getMode().then((mode2) => mode2.setupMode(scssDefaults));
  });
  editor_api.languages.onLanguage("css", () => {
    getMode().then((mode2) => mode2.setupMode(cssDefaults));
  });
  exports.cssDefaults = cssDefaults;
  exports.lessDefaults = lessDefaults;
  exports.scssDefaults = scssDefaults;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
