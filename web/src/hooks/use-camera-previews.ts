import { Preview } from "@/types/preview";
import { TimeRange } from "@/types/timeline";
import { useEffect, useState } from "react";
import useSWR from "swr";

type OptionalCameraPreviewProps = {
  camera?: string;
  autoRefresh?: boolean;
  fetchPreviews?: boolean;
};

export function useCameraPreviews(
  initialTimeRange: TimeRange,
  {
    camera = "all",
    autoRefresh = true,
    fetchPreviews = true,
  }: OptionalCameraPreviewProps,
) {
  const [timeRange, setTimeRange] = useState(initialTimeRange);

  useEffect(() => {
    setTimeRange(initialTimeRange);
  }, [initialTimeRange]);

  const { data: allPreviews } = useSWR<Preview[]>(
    fetchPreviews
      ? `preview/${camera}/start/${timeRange.after}/end/${timeRange.before}`
      : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  // Set a timeout to update previews on the hour
  useEffect(() => {
    if (!autoRefresh || !fetchPreviews || !allPreviews) {
      return;
    }

    const callback = () => {
      const nextPreviewStart = new Date(
        allPreviews[allPreviews.length - 1].end * 1000,
      );
      nextPreviewStart.setHours(nextPreviewStart.getHours() + 1);

      if (Date.now() > nextPreviewStart.getTime()) {
        setTimeRange({ after: timeRange.after, before: Date.now() / 1000 });
      }
    };
    document.addEventListener("focusin", callback);

    return () => {
      document.removeEventListener("focusin", callback);
    };
  }, [allPreviews, autoRefresh, fetchPreviews, timeRange]);

  return allPreviews;
}
