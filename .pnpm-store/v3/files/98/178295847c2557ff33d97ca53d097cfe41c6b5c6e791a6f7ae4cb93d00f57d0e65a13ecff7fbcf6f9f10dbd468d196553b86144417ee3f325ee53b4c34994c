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
      // this function only runs when a production build is created
      fs.writeFileSync(path.join(outDir, "inkeepChatButton.js"), scriptContent);
    },
    injectHtmlTags: () => {
      const baseUrl = context.baseUrl || '/';
      let postBodyTags = [];
      if (process.env.NODE_ENV === "production") {
        postBodyTags = [
          `<script src="${baseUrl}inkeepChatButton.js" type="module"></script>`,
        ];
      } else {
        postBodyTags = [`<script>${scriptContent}</script>`];
      }
      return {
        postBodyTags,
      };
    },
  };
};
