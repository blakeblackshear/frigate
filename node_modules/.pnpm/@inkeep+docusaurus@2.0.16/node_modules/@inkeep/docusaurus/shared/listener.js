function listenerFunction({ inkeepConfig, componentType }) {
  if (!inkeepConfig) {
    throw new Error(
      "Configuration Error: inkeepConfig is missing in the Docusaurus configuration file."
    );
  }

  let inkeepWidget = null;
  const isChatButtonType = componentType === "ChatButton";

  const renderWidgets = () => {
    const inkeepWidgetContainer = isChatButtonType ? undefined : document.getElementById("inkeepSearchBar");

    if (isChatButtonType) {
      const backToTopButtonOffset =
        inkeepConfig.chatButtonType === "RECTANGLE_SHORTCUT"
          ? "6.8rem"
          : "5.4rem";
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
        isDarkModeCallback: (observedElement) =>
          observedElement.dataset.theme === "dark",
        colorModeAttribute: "data-theme",
      },
      properties: {
        ...inkeepConfig,
        baseSettings: {
          ...inkeepConfig.baseSettings,
          theme: {
            ...(inkeepConfig.baseSettings?.theme || {}),
            components: {
              SearchBarTrigger: {
                defaultProps: {
                  size: "shrink",
                },
              },
              ...(inkeepConfig.baseSettings?.theme?.components || {}),
            },
          },
        },
        modalSettings: inkeepConfig.modalSettings,
        searchSettings: inkeepConfig.searchSettings,
        aiChatSettings: inkeepConfig.aiChatSettings,
      },
    };

    if (shouldRender) {
      inkeepWidget = Inkeep().embed(config);
    }
  };

  renderWidgets();

  // not totally sure this is necessary anymore but leaving for now just in case
  const observer = new MutationObserver(() => {
    renderWidgets();
  });

  observer.observe(document.documentElement, { attributes: true });
}

module.exports = {
  listenerFunction,
};
