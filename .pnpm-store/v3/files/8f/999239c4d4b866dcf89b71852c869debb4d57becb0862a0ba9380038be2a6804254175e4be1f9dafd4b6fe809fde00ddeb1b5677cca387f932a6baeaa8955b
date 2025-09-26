define("vs/editor/editor.main", ["exports", "require", "vs/nls.messages-loader!", "../yaml.contribution.6f43d486", "../language/css/monaco.contribution", "../language/html/monaco.contribution", "../language/json/monaco.contribution", "../language/typescript/monaco.contribution", "../editor.api.001a2486"], function(exports, require, nls_messagesLoader_, yaml_contribution, language_css_monaco_contribution, language_html_monaco_contribution, language_json_monaco_contribution, language_typescript_monaco_contribution, editor_api) {
  "use strict";
  function _interopNamespace(e) {
    if (e && e.__esModule)
      return e;
    const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
    if (e) {
      for (const k in e) {
        if (k !== "default") {
          const d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: () => e[k]
          });
        }
      }
    }
    n.default = e;
    return Object.freeze(n);
  }
  const require__namespace = /* @__PURE__ */ _interopNamespace(require);
  const __worker_url_0__ = "" + new URL(require.toUrl("../assets/json.worker.32db31cb.js"), document.baseURI).href;
  const __worker_url_1__ = "" + new URL(require.toUrl("../assets/css.worker.4040859e.js"), document.baseURI).href;
  const __worker_url_2__ = "" + new URL(require.toUrl("../assets/html.worker.1a3caaf3.js"), document.baseURI).href;
  const __worker_url_3__ = "" + new URL(require.toUrl("../assets/ts.worker.77b7bdc2.js"), document.baseURI).href;
  const __worker_url_4__ = "" + new URL(require.toUrl("../assets/editor.worker.50c051c0.js"), document.baseURI).href;
  const editor_main = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    CancellationTokenSource: editor_api.CancellationTokenSource,
    Emitter: editor_api.Emitter,
    KeyCode: editor_api.KeyCode,
    KeyMod: editor_api.KeyMod,
    Position: editor_api.Position,
    Range: editor_api.Range,
    Selection: editor_api.Selection,
    SelectionDirection: editor_api.SelectionDirection,
    MarkerSeverity: editor_api.MarkerSeverity,
    MarkerTag: editor_api.MarkerTag,
    Uri: editor_api.Uri,
    Token: editor_api.Token,
    editor: editor_api.editor,
    languages: editor_api.languages
  }, Symbol.toStringTag, { value: "Module" }));
  self.MonacoEnvironment = {
    getWorker: function(_moduleId, label) {
      if (label === "json") {
        return new Worker(
          getWorkerBootstrapUrl(
            __worker_url_0__
          )
        );
      }
      if (label === "css" || label === "scss" || label === "less") {
        return new Worker(
          getWorkerBootstrapUrl(
            __worker_url_1__
          )
        );
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return new Worker(
          getWorkerBootstrapUrl(
            __worker_url_2__
          )
        );
      }
      if (label === "typescript" || label === "javascript") {
        return new Worker(
          getWorkerBootstrapUrl(
            __worker_url_3__
          )
        );
      }
      return new Worker(
        getWorkerBootstrapUrl(__worker_url_4__)
      );
    }
  };
  function getWorkerBootstrapUrl(workerScriptUrl) {
    const blob = new Blob(
      [
        [
          `const ttPolicy = globalThis.trustedTypes?.createPolicy('defaultWorkerFactory', { createScriptURL: value => value });`,
          `globalThis.workerttPolicy = ttPolicy;`,
          `importScripts(ttPolicy?.createScriptURL(${JSON.stringify(
            workerScriptUrl
          )}) ?? ${JSON.stringify(workerScriptUrl)});`,
          `globalThis.postMessage({ type: 'vscode-worker-ready' });`
        ].join("")
      ],
      { type: "application/javascript" }
    );
    return URL.createObjectURL(blob);
  }
  const styleSheetUrl = require__namespace.toUrl("vs/style.css");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = styleSheetUrl;
  document.head.appendChild(link);
  exports.m = editor_main;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
