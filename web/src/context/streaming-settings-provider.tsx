import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import { AllGroupsStreamingSettings } from "@/types/frigateConfig";
import { useUserPersistence } from "@/hooks/use-user-persistence";

type StreamingSettingsContextType = {
  allGroupsStreamingSettings: AllGroupsStreamingSettings;
  setAllGroupsStreamingSettings: (settings: AllGroupsStreamingSettings) => void;
  isPersistedStreamingSettingsLoaded: boolean;
};

const StreamingSettingsContext =
  createContext<StreamingSettingsContextType | null>(null);

export function StreamingSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [allGroupsStreamingSettings, setAllGroupsStreamingSettings] =
    useState<AllGroupsStreamingSettings>({});

  const [
    persistedGroupStreamingSettings,
    setPersistedGroupStreamingSettings,
    isPersistedStreamingSettingsLoaded,
  ] = useUserPersistence<AllGroupsStreamingSettings>("streaming-settings");

  useEffect(() => {
    if (isPersistedStreamingSettingsLoaded) {
      setAllGroupsStreamingSettings(persistedGroupStreamingSettings ?? {});
    }
  }, [isPersistedStreamingSettingsLoaded, persistedGroupStreamingSettings]);

  useEffect(() => {
    if (Object.keys(allGroupsStreamingSettings).length) {
      setPersistedGroupStreamingSettings(allGroupsStreamingSettings);
    }
  }, [allGroupsStreamingSettings, setPersistedGroupStreamingSettings]);

  return (
    <StreamingSettingsContext.Provider
      value={{
        allGroupsStreamingSettings,
        setAllGroupsStreamingSettings,
        isPersistedStreamingSettingsLoaded,
      }}
    >
      {children}
    </StreamingSettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStreamingSettings() {
  const context = useContext(StreamingSettingsContext);
  if (!context) {
    throw new Error(
      "useStreamingSettings must be used within a StreamingSettingsProvider",
    );
  }
  return context;
}
