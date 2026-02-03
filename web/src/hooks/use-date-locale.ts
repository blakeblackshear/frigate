import { useState, useEffect } from "react";
import { enUS, Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";

// Map of locale codes to dynamic import functions
const localeMap: Record<string, () => Promise<Locale>> = {
  "zh-CN": () => import("date-fns/locale/zh-CN").then((module) => module.zhCN),
  es: () => import("date-fns/locale/es").then((module) => module.es),
  hi: () => import("date-fns/locale/hi").then((module) => module.hi),
  fr: () => import("date-fns/locale/fr").then((module) => module.fr),
  ar: () => import("date-fns/locale/ar").then((module) => module.ar),
  pt: () => import("date-fns/locale/pt").then((module) => module.pt),
  "pt-BR": () => import("date-fns/locale/pt").then((module) => module.pt),
  ru: () => import("date-fns/locale/ru").then((module) => module.ru),
  de: () => import("date-fns/locale/de").then((module) => module.de),
  ja: () => import("date-fns/locale/ja").then((module) => module.ja),
  tr: () => import("date-fns/locale/tr").then((module) => module.tr),
  it: () => import("date-fns/locale/it").then((module) => module.it),
  nl: () => import("date-fns/locale/nl").then((module) => module.nl),
  sv: () => import("date-fns/locale/sv").then((module) => module.sv),
  cs: () => import("date-fns/locale/cs").then((module) => module.cs),
  "nb-NO": () => import("date-fns/locale/nb").then((module) => module.nb),
  ko: () => import("date-fns/locale/ko").then((module) => module.ko),
  vi: () => import("date-fns/locale/vi").then((module) => module.vi),
  fa: () => import("date-fns/locale/fa-IR").then((module) => module.faIR),
  pl: () => import("date-fns/locale/pl").then((module) => module.pl),
  uk: () => import("date-fns/locale/uk").then((module) => module.uk),
  he: () => import("date-fns/locale/he").then((module) => module.he),
  el: () => import("date-fns/locale/el").then((module) => module.el),
  ro: () => import("date-fns/locale/ro").then((module) => module.ro),
  hu: () => import("date-fns/locale/hu").then((module) => module.hu),
  fi: () => import("date-fns/locale/fi").then((module) => module.fi),
  da: () => import("date-fns/locale/da").then((module) => module.da),
  sk: () => import("date-fns/locale/sk").then((module) => module.sk),
  "yue-Hant": () =>
    import("date-fns/locale/zh-HK").then((module) => module.zhHK),
  lt: () => import("date-fns/locale/lt").then((module) => module.lt),
  th: () => import("date-fns/locale/th").then((module) => module.th),
  ca: () => import("date-fns/locale/ca").then((module) => module.ca),
  hr: () => import("date-fns/locale/hr").then((module) => module.hr),
};

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  const [locale, setLocale] = useState<Locale>(enUS);

  useEffect(() => {
    const loadLocale = async () => {
      if (i18n.language === "en") {
        setLocale(enUS);
        return;
      }

      const localeLoader = localeMap[i18n.language];
      if (localeLoader) {
        try {
          const loadedLocale = await localeLoader();
          setLocale(loadedLocale);
        } catch (error) {
          setLocale(enUS);
        }
      } else {
        setLocale(enUS);
      }
    };

    loadLocale();
  }, [i18n.language]);

  return locale;
}
