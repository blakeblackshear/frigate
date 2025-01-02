import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

i18n
  .use(initReactI18next)
  .use(HttpBackend)
  .init({
    fallbackLng: "en", // use en if detected lng is not available
    //lng: "zh-Hans", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

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
      ],
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    keySeparator: false,
    parseMissingKeyHandler: (key: string) => {
      const parts = key.split(".");
      if (parts.length > 1) {
        if (parts[0] === "object" || parts[0] === "audio") {
          return (
            parts[1].replaceAll("_", " ").charAt(0).toUpperCase() +
            parts[1].slice(1)
          );
        }
        return parts[parts.length - 1];
      }
      return key;
    },
  });

export default i18n;
