import i18n, { t } from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import { EventType } from "@/types/search";

export const getTranslatedLabel = (
  label: string,
  type: EventType = "object",
) => {
  if (!label) return "";

  if (type === "manual") return label;

  const normalize = (s: string) =>
    s
      .trim()
      .replace(/[-'\s]+/g, "_")
      .replace(/__+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();

  const key = normalize(label);

  const ns = type === "audio" ? "audio" : "objects";

  return t(key, { ns });
};

i18n
  .use(initReactI18next)
  .use(HttpBackend)
  .init({
    fallbackLng: "en", // use en if detected lng is not available

    backend: {
      loadPath: `locales/{{lng}}/{{ns}}.json?v=${import.meta.env.VITE_GIT_COMMIT_HASH || "unknown"}`,
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
      "config/global",
      "config/cameras",
      "config/validation",
      "config/groups",
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

      if (parts[0] === "time" && parts[1]?.includes("formattedTimestamp")) {
        // Extract the format type from the last part (12hour, 24hour)
        const formatType = parts[parts.length - 1];

        // Return actual date-fns format strings as fallbacks
        const formatDefaults: Record<string, string> = {
          "12hour": "h:mm aaa",
          "24hour": "HH:mm",
        };

        if (formatDefaults[formatType]) {
          return formatDefaults[formatType];
        }
      }

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

      // For single keys, just smart-capitalize and format
      return key
        .split("_")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");
    },
  });

export default i18n;
