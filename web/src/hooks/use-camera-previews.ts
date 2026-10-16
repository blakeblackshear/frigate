import { Preview } from "@/types/preview";
import { TimeRange } from "@/types/timeline";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useHourRollover } from "@/hooks/use-hour-rollover";

type OptionalCameraPreviewProps = {
  camera?: string;
  autoRefresh?: boolean;
  fetchPreviews?: boolean;
  refreshOnHourRollover?: boolean;
};
export function useCameraPreviews(
  initialTimeRange: TimeRange,
  {
    camera = "all",
    autoRefresh = true,
    fetchPreviews = true,
    refreshOnHourRollover = false,
  }: OptionalCameraPreviewProps,
) {
  const [timeRange, setTimeRange] = useState(initialTimeRange);

  useEffect(() => {
    setTimeRange(initialTimeRange);
  }, [initialTimeRange]);

  const { data: allPreviews, mutate: refreshPreviews } = useSWR<Preview[]>(
    fetchPreviews
      ? `preview/${camera}/start/${Math.round(timeRange.after)}/end/${Math.round(timeRange.before)}`
      : null,
    { revalidateOnFocus: autoRefresh, revalidateOnReconnect: autoRefresh },
  );

  // an hour's mp4 is written after that hour ends, so it is never in the
  // response the page loaded with
  useHourRollover(refreshPreviews, refreshOnHourRollover && fetchPreviews);

  return fetchPreviews ? allPreviews : [];
}

export function getPreviewForTimeRange(
  allPreviews: Preview[],
  camera: string,
  timeRange: TimeRange,
) {
  let best: Preview | undefined = undefined;
  let bestOverlap = 0;

  for (const preview of allPreviews) {
    // a preview belongs to the hour it starts in. a camera whose feed drops
    // across the boundary produces one ending minutes into the next hour, and
    // without this it would claim that hour's slot as well.
    if (
      preview.camera != camera ||
      Math.ceil(preview.start) < timeRange.after
    ) {
      continue;
    }

    // the slot for the live hour is stamped at page load and never grows, so
    // an hour-long preview never fits inside it. rank by overlap instead.
    const overlap =
      Math.min(preview.end, timeRange.before) -
      Math.max(preview.start, timeRange.after);

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = preview;
    }
  }

  return best;
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
