import { Preview } from "@/types/preview";
import { TimeRange } from "@/types/timeline";
import { useEffect, useMemo, useState } from "react";
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

// we need to add a buffer of 5 seconds to the end preview times
// this ensures that if preview generation is running slowly
// and the previews are generated 1-5 seconds late
// it is not falsely thrown out.
const PREVIEW_END_BUFFER = 5; // seconds

export function getPreviewForTimeRange(
  allPreviews: Preview[],
  camera: string,
  timeRange: TimeRange,
) {
  return allPreviews.find(
    (preview) =>
      preview.camera == camera &&
      Math.ceil(preview.start) >= timeRange.after &&
      Math.floor(preview.end) <= timeRange.before + PREVIEW_END_BUFFER,
  );
}

export function usePreviewForTimeRange(
  allPreviews: Preview[],
  camera: string,
  timeRange: TimeRange,
) {
  return useMemo(
    () => getPreviewForTimeRange(allPreviews, camera, timeRange),
    [allPreviews, camera, timeRange],
  );
}
