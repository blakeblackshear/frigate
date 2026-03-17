import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  Recording,
  RecordingPlaybackPreference,
} from "@/types/record";
import { useMemo } from "react";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import usePlaybackCapabilities from "@/hooks/use-playback-capabilities";
import { chooseRecordingPlayback } from "@/utils/recordingPlayback";

type RecordingPlaybackSourceOptions = {
  camera: string;
  after: number;
  before: number;
  vodPath: string;
  preference?: RecordingPlaybackPreference;
  enabled?: boolean;
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
  const { data: config } = useSWR<FrigateConfig>("config");
  const [storedPreference] = useUserPersistence<RecordingPlaybackPreference>(
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

  return useMemo(() => {
    if (!recordings?.length) {
      return undefined;
    }

    return chooseRecordingPlayback({
      apiHost,
      config,
      recordings,
      preference: preference ?? storedPreference ?? "sub",
      vodPath,
      capabilities,
    }).url;
  }, [
    apiHost,
    capabilities,
    config,
    preference,
    recordings,
    storedPreference,
    vodPath,
  ]);
}
