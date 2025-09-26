define("vs/nls.messages-loader", ["exports"], function(exports) {
  "use strict";
  function load(name, req, load2, config) {
    var _a, _b;
    const requestedLanguage = (_b = (_a = config["vs/nls"]) == null ? void 0 : _a.availableLanguages) == null ? void 0 : _b["*"];
    if (!requestedLanguage || requestedLanguage === "en") {
      load2({});
    } else {
      req([`vs/nls.messages.${requestedLanguage}`], () => {
        load2({});
      });
    }
  }
  exports.load = load;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
