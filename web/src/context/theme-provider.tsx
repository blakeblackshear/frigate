import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";
type ColorScheme =
  | "theme-blue"
  | "theme-green"
  | "theme-nord"
  | "theme-red"
  | "theme-high-contrast"
  | "theme-default";

// eslint-disable-next-line react-refresh/only-export-components
export const colorSchemes: ColorScheme[] = [
  "theme-blue",
  "theme-green",
  "theme-nord",
  "theme-red",
  "theme-high-contrast",
  "theme-default",
];

// Helper function to generate friendly color scheme names
// eslint-disable-next-line react-refresh/only-export-components
export const friendlyColorSchemeName = (className: string): string => {
  const words = className.split("-").slice(1); // Exclude the first word (e.g., 'theme')
  return "menu.theme." + words.join(".");
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorScheme?: ColorScheme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  systemTheme?: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  systemTheme: undefined,
  colorScheme: "theme-default",
  setTheme: () => null,
  setColorScheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultColorScheme = "theme-default",
  storageKey = "frigate-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const storedData = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return storedData.theme || defaultTheme;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error parsing theme data from storage:", error);
      return defaultTheme;
    }
  });

  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    try {
      const storedData = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return storedData.colorScheme === "default"
        ? defaultColorScheme
        : storedData.colorScheme || defaultColorScheme;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error parsing color scheme data from storage:", error);
      return defaultColorScheme;
    }
  });

  const systemTheme = useMemo<Theme | undefined>(() => {
    if (theme != "system") {
      return undefined;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, [theme]);

  useEffect(() => {
    //localStorage.removeItem(storageKey);
    //console.log(localStorage.getItem(storageKey));
    const root = window.document.documentElement;

    root.classList.remove("light", "dark", "system", ...colorSchemes);

    root.classList.add(theme, colorScheme);

    if (systemTheme) {
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme, colorScheme, systemTheme]);

  const value = {
    theme,
    systemTheme,
    colorScheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, JSON.stringify({ theme, colorScheme }));
      setTheme(theme);
    },
    setColorScheme: (colorScheme: ColorScheme) => {
      localStorage.setItem(storageKey, JSON.stringify({ theme, colorScheme }));
      setColorScheme(colorScheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
