import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";

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
export const friendlyColorSchemeName = (
  className: string,
  t?: (key: string, options?: any) => string,
): string => {
  const words = className.split("-").slice(1);
  const key = "menu.theme." + words.join("");

  if (!t) {
    return key;
  }

  const fallback = words
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return t(key, { defaultValue: fallback });
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

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : []));

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

  const { data: customFiles } = useSWR<string[]>(
    "/api/config/themes",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const allColorSchemes = useMemo(() => {
    const customSchemes =
      customFiles
        ?.filter((f) => /^[a-zA-Z0-9._-]+\.css$/.test(f))
        .map((f) => {
          const base = f.replace(/\.css$/, "");
          return (base.startsWith("theme-")
            ? base
            : `theme-${base}`) as ColorScheme;
        }) ?? [];

    return [...colorSchemes, ...customSchemes];
  }, [customFiles]);

  const [themesReady, setThemesReady] = useState(false);

  useEffect(() => {
    if (!customFiles) {
      setThemesReady(true);
      return;
    }

    const links = customFiles
      .filter((f) => /^[a-zA-Z0-9._-]+\.css$/.test(f))
      .map((file) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `/config/themes/${file}`;
        document.head.appendChild(link);

        return new Promise<void>((resolve) => {
          link.onload = () => resolve();
          link.onerror = () => resolve();
        });
      });

    Promise.all(links).then(() => setThemesReady(true));
  }, [customFiles]);

  useEffect(() => {
    //localStorage.removeItem(storageKey);
    //console.log(localStorage.getItem(storageKey));
    if (!themesReady) {
      return;
    }

    const root = window.document.documentElement;

    root.classList.remove("light", "dark", "system", ...allColorSchemes);
    root.classList.add(theme, colorScheme);

    if (systemTheme) {
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme, colorScheme, systemTheme, themesReady, allColorSchemes]);

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
