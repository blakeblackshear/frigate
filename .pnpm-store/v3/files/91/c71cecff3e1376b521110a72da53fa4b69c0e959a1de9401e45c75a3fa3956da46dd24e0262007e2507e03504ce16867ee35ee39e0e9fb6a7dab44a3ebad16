const fs = require("fs");
const path = require("path");

module.exports = (context) => {
  const {
    siteConfig: {
      themeConfig: { inkeepConfig },
    },
  } = context;
  const { listenerFunction } = require("../shared/listener");
  const { WIDGET_VERSION, INTEGRITY_SHA } = require("../shared/consts");
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
      // this function only runs when a production build is created
      fs.writeFileSync(path.join(outDir, "inkeepSearchBar.js"), scriptContent);
    },
    injectHtmlTags: () => {
      const baseUrl = context.baseUrl || '/';
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
       </script>`,
      ];
      if (process.env.NODE_ENV === "production") {
        postBodyTags = [
          ...postBodyTags,
          `<script src="${baseUrl}inkeepSearchBar.js" type="module"></script>`,
        ];
      } else {
        postBodyTags = [...postBodyTags, `<script>${scriptContent}</script>`];
      }
      return {
        postBodyTags,
      };
    },
    getThemePath: () => "./src/theme",
    getTypeScriptThemePath: () => "./src/theme",
    getSwizzleComponentList: () => ["SearchBar"],
  };
};
