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
      ? `preview/${camera}/start/${Math.round(timeRange.after)}/end/${Math.round(timeRange.before)}`
      : null,
    { revalidateOnFocus: autoRefresh, revalidateOnReconnect: autoRefresh },
  );

  return allPreviews;
}
