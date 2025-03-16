import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

i18n
  .use(initReactI18next)
  .use(HttpBackend)
  .init({
    fallbackLng: "en", // use en if detected lng is not available

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    ns: [
      "common",
      "objects",
      "audio",
      "components/camera",
      "components/dialog",
      "components/filter",
      "components/icons",
      "components/player",
      "views/events",
      "views/explore",
      "views/live",
      "views/settings",
      "views/system",
      "views/exports",
      "views/explore",
    ],
    defaultNS: "common",

    react: {
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: [
        "br",
        "strong",
        "i",
        "em",
        "li",
        "p",
        "code",
        "span",
        "p",
        "ul",
        "li",
        "ol",
      ],
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    keySeparator: ".",
    parseMissingKeyHandler: (key: string) => {
      const parts = key.split(".");

      // Handle special cases for objects and audio
      if (parts[0] === "object" || parts[0] === "audio") {
        return (
          parts[1]
            ?.split("_")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(" ") || key
        );
      }

      // For nested keys, try to make them more readable
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        return lastPart
          .split("_")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      }

      // For single keys, just capitalize and format
      return key
        .split("_")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");
    },
  });

export default i18n;
