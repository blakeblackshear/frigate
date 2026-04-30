import { useApiHost } from "@/api";
import useSWR from "swr";
import {
  Recording,
  RecordingPlaybackPreference,
} from "@/types/record";
import { useCallback, useMemo } from "react";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import usePlaybackCapabilities from "@/hooks/use-playback-capabilities";
import {
  buildDirectUrl,
  chooseRecordingPlayback,
  getFallbackVariantForPreference,
  RecordingPlaybackDecision,
} from "@/utils/recordingPlayback";

type RecordingPlaybackSourceOptions = {
  camera: string;
  after: number;
  before: number;
  vodPath: string;
  preference?: RecordingPlaybackPreference;
  enabled?: boolean;
};

export type RecordingPlaybackSource = {
  decision?: RecordingPlaybackDecision;
  preference: RecordingPlaybackPreference;
  setPreference: (value: RecordingPlaybackPreference) => void;
  url: string;
  variant: string;
};

export default function useRecordingPlaybackSource({
  camera,
  after,
  before,
  vodPath,
  preference,
  enabled = true,
}: RecordingPlaybackSourceOptions) {
  const apiHost = useApiHost();
  const [storedPreference, setStoredPreference, preferenceLoaded] =
    useUserPersistence<RecordingPlaybackPreference>(
    `${camera}-recording-playback-v2`,
    "sub",
    );
  const { data: recordings } = useSWR<Recording[]>(
    enabled ? [`${camera}/recordings`, { after, before, variant: "all" }] : null,
    { revalidateOnFocus: false },
  );

  const codecNames = useMemo(
    () =>
      Array.from(
        new Set((recordings ?? []).map((recording) => recording.codec_name)),
      ),
    [recordings],
  );
  const capabilities = usePlaybackCapabilities(codecNames);
  const activePreference = preference ?? storedPreference ?? "sub";
  const setPreferenceValue = useCallback(
    (value: RecordingPlaybackPreference) => {
      if (preference !== undefined) {
        return;
      }

      setStoredPreference(value);
    },
    [preference, setStoredPreference],
  );

  return useMemo(() => {
    if (!preferenceLoaded) {
      return undefined;
    }

    if (!recordings?.length) {
      const fallbackVariant = getFallbackVariantForPreference(activePreference);

      return {
        preference: activePreference,
        setPreference: setPreferenceValue,
        url: buildDirectUrl(apiHost, vodPath, fallbackVariant),
        variant: fallbackVariant,
      };
    }

    const decision = chooseRecordingPlayback({
      apiHost,
      recordings,
      preference: activePreference,
      vodPath,
      capabilities,
    });

    return {
      decision,
      preference: activePreference,
      setPreference: setPreferenceValue,
      url: decision.url,
      variant: decision.variant,
    };
  }, [
    activePreference,
    apiHost,
    capabilities,
    preferenceLoaded,
    recordings,
    setPreferenceValue,
    vodPath,
  ]);
}
