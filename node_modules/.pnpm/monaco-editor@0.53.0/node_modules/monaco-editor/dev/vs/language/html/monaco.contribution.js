var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
define("vs/language/html/monaco.contribution", ["require", "exports", "../../editor.api.001a2486"], function(require2, exports, editor_api) {
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
    get options() {
      return this._options;
    }
    get modeConfiguration() {
      return this._modeConfiguration;
    }
    setOptions(options) {
      this._options = options || /* @__PURE__ */ Object.create(null);
      this._onDidChange.fire(this);
    }
    setModeConfiguration(modeConfiguration) {
      this._modeConfiguration = modeConfiguration || /* @__PURE__ */ Object.create(null);
      this._onDidChange.fire(this);
    }
  }
  const formatDefaults = {
    tabSize: 4,
    insertSpaces: false,
    wrapLineLength: 120,
    unformatted: 'default": "a, abbr, acronym, b, bdo, big, br, button, cite, code, dfn, em, i, img, input, kbd, label, map, object, q, samp, select, small, span, strong, sub, sup, textarea, tt, var',
    contentUnformatted: "pre",
    indentInnerHtml: false,
    preserveNewLines: true,
    maxPreserveNewLines: void 0,
    indentHandlebars: false,
    endWithNewline: false,
    extraLiners: "head, body, /html",
    wrapAttributes: "auto"
  };
  const optionsDefault = {
    format: formatDefaults,
    suggest: {},
    data: { useDefaultDataProvider: true }
  };
  function getConfigurationDefault(languageId) {
    return {
      completionItems: true,
      hovers: true,
      documentSymbols: true,
      links: true,
      documentHighlights: true,
      rename: true,
      colors: true,
      foldingRanges: true,
      selectionRanges: true,
      diagnostics: languageId === htmlLanguageId,
      documentFormattingEdits: languageId === htmlLanguageId,
      documentRangeFormattingEdits: languageId === htmlLanguageId
    };
  }
  const htmlLanguageId = "html";
  const handlebarsLanguageId = "handlebars";
  const razorLanguageId = "razor";
  const htmlLanguageService = registerHTMLLanguageService(
    htmlLanguageId,
    optionsDefault,
    getConfigurationDefault(htmlLanguageId)
  );
  const htmlDefaults = htmlLanguageService.defaults;
  const handlebarLanguageService = registerHTMLLanguageService(
    handlebarsLanguageId,
    optionsDefault,
    getConfigurationDefault(handlebarsLanguageId)
  );
  const handlebarDefaults = handlebarLanguageService.defaults;
  const razorLanguageService = registerHTMLLanguageService(
    razorLanguageId,
    optionsDefault,
    getConfigurationDefault(razorLanguageId)
  );
  const razorDefaults = razorLanguageService.defaults;
  editor_api.languages.html = {
    htmlDefaults,
    razorDefaults,
    handlebarDefaults,
    htmlLanguageService,
    handlebarLanguageService,
    razorLanguageService,
    registerHTMLLanguageService
  };
  function getMode() {
    {
      return new Promise((resolve, reject) => require2(["../../htmlMode.57de31b3"], resolve, reject));
    }
  }
  function registerHTMLLanguageService(languageId, options = optionsDefault, modeConfiguration = getConfigurationDefault(languageId)) {
    const defaults = new LanguageServiceDefaultsImpl(languageId, options, modeConfiguration);
    let mode2;
    const onLanguageListener = editor_api.languages.onLanguage(languageId, async () => {
      mode2 = (await getMode()).setupMode(defaults);
    });
    return {
      defaults,
      dispose() {
        onLanguageListener.dispose();
        mode2 == null ? void 0 : mode2.dispose();
        mode2 = void 0;
      }
    };
  }
  exports.handlebarDefaults = handlebarDefaults;
  exports.handlebarLanguageService = handlebarLanguageService;
  exports.htmlDefaults = htmlDefaults;
  exports.htmlLanguageService = htmlLanguageService;
  exports.razorDefaults = razorDefaults;
  exports.razorLanguageService = razorLanguageService;
  exports.registerHTMLLanguageService = registerHTMLLanguageService;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
