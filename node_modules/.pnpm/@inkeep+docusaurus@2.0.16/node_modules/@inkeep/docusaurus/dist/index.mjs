var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// shared/listener.js
var require_listener = __commonJS({
  "shared/listener.js"(exports, module) {
    function listenerFunction({ inkeepConfig, componentType }) {
      if (!inkeepConfig) {
        throw new Error(
          "Configuration Error: inkeepConfig is missing in the Docusaurus configuration file."
        );
      }
      let inkeepWidget = null;
      const isChatButtonType = componentType === "ChatButton";
      const renderWidgets = () => {
        var _a, _b, _c;
        const inkeepWidgetContainer = isChatButtonType ? void 0 : document.getElementById("inkeepSearchBar");
        if (isChatButtonType) {
          const backToTopButtonOffset = inkeepConfig.chatButtonType === "RECTANGLE_SHORTCUT" ? "6.8rem" : "5.4rem";
          const backToTopButton = document.querySelector(
            ".theme-back-to-top-button"
          );
          if (backToTopButton) {
            backToTopButton.style.bottom = backToTopButtonOffset;
          }
        }
        const shouldRender = !inkeepWidget && (isChatButtonType || inkeepWidgetContainer);
        const config = {
          componentType,
          targetElement: inkeepWidgetContainer,
          colorModeSync: {
            observedElement: document.documentElement,
            isDarkModeCallback: (observedElement) => observedElement.dataset.theme === "dark",
            colorModeAttribute: "data-theme"
          },
          properties: {
            ...inkeepConfig,
            baseSettings: {
              ...inkeepConfig.baseSettings,
              theme: {
                ...((_a = inkeepConfig.baseSettings) == null ? void 0 : _a.theme) || {},
                components: {
                  SearchBarTrigger: {
                    defaultProps: {
                      size: "shrink"
                    }
                  },
                  ...((_c = (_b = inkeepConfig.baseSettings) == null ? void 0 : _b.theme) == null ? void 0 : _c.components) || {}
                }
              }
            },
            modalSettings: inkeepConfig.modalSettings,
            searchSettings: inkeepConfig.searchSettings,
            aiChatSettings: inkeepConfig.aiChatSettings
          }
        };
        if (shouldRender) {
          inkeepWidget = Inkeep().embed(config);
        }
      };
      renderWidgets();
      const observer = new MutationObserver(() => {
        renderWidgets();
      });
      observer.observe(document.documentElement, { attributes: true });
    }
    module.exports = {
      listenerFunction
    };
  }
});

// shared/consts.js
var require_consts = __commonJS({
  "shared/consts.js"(exports, module) {
    var WIDGET_VERSION = "0.3.19";
    var INTEGRITY_SHA = "sha384-NrApcNv8E5NXyoaHq8Zbyi9byJkCkCJ7BZJRlZ+8ELzfp0qgixQYy4FXfkJcVkn3";
    module.exports = {
      WIDGET_VERSION,
      INTEGRITY_SHA
    };
  }
});

// chatButton/index.js
var require_chatButton = __commonJS({
  "chatButton/index.js"(exports, module) {
    var fs = __require("fs");
    var path = __require("path");
    module.exports = (context) => {
      const {
        siteConfig: {
          themeConfig: { inkeepConfig }
        }
      } = context;
      const { listenerFunction } = require_listener();
      const { WIDGET_VERSION, INTEGRITY_SHA } = require_consts();
      const scriptContent = `
    const inkeepChatButtonScript = document.createElement("script");
    inkeepChatButtonScript.type = "module";
    inkeepChatButtonScript.src = 'https://unpkg.com/@inkeep/uikit-js@${WIDGET_VERSION}/dist/embed.js';
    inkeepChatButtonScript.integrity = '${INTEGRITY_SHA}';
    inkeepChatButtonScript.crossOrigin = "anonymous";
    document.body.appendChild(inkeepChatButtonScript);
    inkeepChatButtonScript.addEventListener("load", function () {
      const inkeepConfigChatButton = ${JSON.stringify(inkeepConfig)};
      (${listenerFunction.toString()})({
        inkeepConfig: inkeepConfigChatButton,
        componentType: 'ChatButton',
      })
    })
  `;
      return {
        name: "inkeep-chat-button",
        postBuild: async ({ outDir }) => {
          fs.writeFileSync(path.join(outDir, "inkeepChatButton.js"), scriptContent);
        },
        injectHtmlTags: () => {
          const baseUrl = context.baseUrl || "/";
          let postBodyTags = [];
          if (process.env.NODE_ENV === "production") {
            postBodyTags = [
              `<script src="${baseUrl}inkeepChatButton.js" type="module"></script>`
            ];
          } else {
            postBodyTags = [`<script>${scriptContent}</script>`];
          }
          return {
            postBodyTags
          };
        }
      };
    };
  }
});

// searchBar/index.js
var require_searchBar = __commonJS({
  "searchBar/index.js"(exports, module) {
    var fs = __require("fs");
    var path = __require("path");
    module.exports = (context) => {
      const {
        siteConfig: {
          themeConfig: { inkeepConfig }
        }
      } = context;
      const { listenerFunction } = require_listener();
      const { WIDGET_VERSION, INTEGRITY_SHA } = require_consts();
      const scriptContent = `
    const inkeepSearchBarScript = document.createElement("script");
    inkeepSearchBarScript.type = "module";
    inkeepSearchBarScript.src = 'https://unpkg.com/@inkeep/uikit-js@${WIDGET_VERSION}/dist/embed.js';
    inkeepSearchBarScript.integrity = '${INTEGRITY_SHA}';
    inkeepSearchBarScript.crossOrigin = "anonymous";
    document.body.appendChild(inkeepSearchBarScript);
    inkeepSearchBarScript.addEventListener("load", function () {
      const inkeepConfigSearchBar = ${JSON.stringify(inkeepConfig)};
      (${listenerFunction.toString()})({
        inkeepConfig: inkeepConfigSearchBar,
        componentType: 'SearchBar',
      })
    })
  `;
      return {
        name: "inkeep-search-bar",
        postBuild: async ({ outDir }) => {
          fs.writeFileSync(path.join(outDir, "inkeepSearchBar.js"), scriptContent);
        },
        injectHtmlTags: () => {
          const baseUrl = context.baseUrl || "/";
          let postBodyTags = [
            `<div id='inkeepSearchBar'></div>`,
            `<script>
          (() => {
            const inkeepWidgetContainer = document.getElementById("inkeepSearchBar");

            const observer = new MutationObserver((mutationsList) => {
              const inkeep = document.getElementById('inkeep');
              if (inkeep) {
                inkeep.appendChild(inkeepWidgetContainer)
              }
            });
            observer.observe(document.documentElement, { attributes: true });
          })()
       </script>`
          ];
          if (process.env.NODE_ENV === "production") {
            postBodyTags = [
              ...postBodyTags,
              `<script src="${baseUrl}inkeepSearchBar.js" type="module"></script>`
            ];
          } else {
            postBodyTags = [...postBodyTags, `<script>${scriptContent}</script>`];
          }
          return {
            postBodyTags
          };
        },
        getThemePath: () => "./src/theme",
        getTypeScriptThemePath: () => "./src/theme",
        getSwizzleComponentList: () => ["SearchBar"]
      };
    };
  }
});

// index.js
var chatButton = __toESM(require_chatButton());
var searchBar = __toESM(require_searchBar());
export {
  chatButton,
  searchBar
};
