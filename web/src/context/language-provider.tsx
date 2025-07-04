import { createContext, useContext, useState, useEffect, useMemo } from "react";
import i18next from "i18next";
import { supportedLanguageKeys } from "@/lib/const";

type LanguageProviderState = {
  language: string;
  setLanguage: (language: string) => void;
};

const initialState: LanguageProviderState = {
  language: i18next.language || "en",
  setLanguage: () => null,
};

const LanguageProviderContext =
  createContext<LanguageProviderState>(initialState);

export function LanguageProvider({
  children,
  defaultLanguage = "en",
  storageKey = "frigate-ui-language",
  ...props
}: {
  children: React.ReactNode;
  defaultLanguage?: string;
  storageKey?: string;
}) {
  const systemLanguage = useMemo<string>(() => {
    if (typeof window === "undefined") return defaultLanguage;

    const systemLanguage = window.navigator.language;

    if (supportedLanguageKeys.includes(systemLanguage)) {
      return systemLanguage;
    }

    // browser languages may include a -REGION (ex: en-US)
    if (systemLanguage.includes("-")) {
      const shortenedSystemLanguage = systemLanguage.split("-")[0];

      if (supportedLanguageKeys.includes(shortenedSystemLanguage)) {
        return shortenedSystemLanguage;
      }
    }

    return defaultLanguage;
  }, [defaultLanguage]);

  const [language, setLanguage] = useState<string>(() => {
    try {
      const storedData = localStorage.getItem(storageKey);
      const newLanguage = storedData || systemLanguage;
      i18next.changeLanguage(newLanguage);
      return newLanguage;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error retrieving language data from storage:", error);
      return defaultLanguage;
    }
  });

  useEffect(() => {
    // set document lang for smart capitalization
    document.documentElement.lang = language;

    if (language === systemLanguage) return;
    i18next.changeLanguage(language);
  }, [language, systemLanguage]);

  const value = {
    language,
    setLanguage: (language: string) => {
      localStorage.setItem(storageKey, language);
      setLanguage(language);
      window.location.reload();
    },
  };

  return (
    <LanguageProviderContext.Provider {...props} value={value}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageProviderContext);

  if (context === undefined)
    throw new Error("useLanguage must be used within a LanguageProvider");

  return context;
};
