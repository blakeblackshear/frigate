import { useCallback, useEffect, useRef } from "react";
import { isHevcSupported } from "@/utils/codecUtil";
import axios from "axios";

interface TranscodeResponse {
  success: boolean;
  playlist?: string;
  message?: string;
}

/**
 * Resolves an HLS playlist URL, requesting server-side H.265->H.264
 * transcoding when the browser does not support HEVC natively.
 *
 * When HEVC is supported, returns the original VOD URL unchanged.
 */
export function useTranscodedPlayback(apiHost: string) {
  const activeSessionRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeSessionRef.current) {
        axios
          .delete(`${apiHost}api/transcode/${activeSessionRef.current}`)
          .catch(() => {});
      }
    };
  }, [apiHost]);

  const resolvePlaylistUrl = useCallback(
    async (vodUrl: string, camera: string, startTs: number, endTs: number) => {
      if (isHevcSupported()) {
        return vodUrl;
      }

      // Clean up previous session
      if (activeSessionRef.current) {
        axios
          .delete(`${apiHost}api/transcode/${activeSessionRef.current}`)
          .catch(() => {});
        activeSessionRef.current = null;
      }

      try {
        const resp = await axios.get<TranscodeResponse>(
          `${apiHost}api/transcode/${camera}/start/${startTs}/end/${endTs}`,
        );

        if (resp.data.success && resp.data.playlist) {
          const sessionId = resp.data.playlist.split("/").at(-2) ?? null;
          activeSessionRef.current = sessionId;
          return `${apiHost}${resp.data.playlist.replace(/^\//, "")}`;
        }
      } catch (err) {
        console.warn("Transcode request failed, falling back to native HLS", err);
      }

      // Fallback to original URL
      return vodUrl;
    },
    [apiHost],
  );

  return { resolvePlaylistUrl };
}
