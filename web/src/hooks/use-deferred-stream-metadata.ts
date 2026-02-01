import { baseUrl } from "@/api/baseUrl";
import { useCallback, useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { LiveStreamMetadata } from "@/types/live";

const FETCH_TIMEOUT_MS = 10000;
const DEFER_DELAY_MS = 2000;

/**
 * Hook that fetches go2rtc stream metadata with deferred loading.
 *
 * Metadata fetching is delayed to prevent blocking initial page load
 * and camera image requests.
 *
 * @param streamNames - Array of stream names to fetch metadata for
 * @returns Object containing stream metadata keyed by stream name
 */
export default function useDeferredStreamMetadata(streamNames: string[]) {
  const [fetchEnabled, setFetchEnabled] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFetchEnabled(true);
    }, DEFER_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  const swrKey = useMemo(() => {
    if (!fetchEnabled || streamNames.length === 0) return null;
    // Use spread to avoid mutating the original array
    return `deferred-streams:${[...streamNames].sort().join(",")}`;
  }, [fetchEnabled, streamNames]);

  const fetcher = useCallback(async (key: string) => {
    // Extract stream names from key (remove prefix)
    const names = key.replace("deferred-streams:", "").split(",");

    const promises = names.map(async (streamName) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${baseUrl}api/go2rtc/streams/${streamName}`,
          {
            priority: "low",
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return { streamName, data };
        }
        return { streamName, data: null };
      } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.error(`Failed to fetch metadata for ${streamName}:`, error);
        }
        return { streamName, data: null };
      }
    });

    const results = await Promise.allSettled(promises);

    const metadata: { [key: string]: LiveStreamMetadata } = {};
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.data) {
        metadata[result.value.streamName] = result.value.data;
      }
    });

    return metadata;
  }, []);

  const { data: metadata = {} } = useSWR<{
    [key: string]: LiveStreamMetadata;
  }>(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  });

  return metadata;
}
