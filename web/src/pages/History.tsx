import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { FrigateConfig } from "@/types/frigateConfig";
import Heading from "@/components/ui/heading";
import ActivityIndicator from "@/components/ui/activity-indicator";
import HistoryCard from "@/components/card/HistoryCard";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import axios from "axios";
import TimelinePlayerCard from "@/components/card/TimelinePlayerCard";
import { getHourlyTimelineData } from "@/utils/historyUtil";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_LIMIT = 200;

function History() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useMemo(
    () =>
      config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    [config]
  );
  const timelineFetcher = useCallback((key: any) => {
    const [path, params] = Array.isArray(key) ? key : [key, undefined];
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const getKey = useCallback((index: number, prevData: HourlyTimeline) => {
    if (index > 0) {
      const lastDate = prevData.end;
      const pagedParams = { before: lastDate, timezone, limit: API_LIMIT };
      return ["timeline/hourly", pagedParams];
    }

    return ["timeline/hourly", { timezone, limit: API_LIMIT }];
  }, []);

  const {
    data: timelinePages,
    mutate: updateHistory,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<HourlyTimeline>(getKey, timelineFetcher);
  const { data: allPreviews } = useSWR<Preview[]>(
    timelinePages
      ? `preview/all/start/${timelinePages?.at(0)
          ?.start}/end/${timelinePages?.at(-1)?.end}`
      : null,
    { revalidateOnFocus: false }
  );

  const [detailLevel, _] = useState<"normal" | "extra" | "full">("normal");
  const [playback, setPlayback] = useState<Card | undefined>();

  const shouldAutoPlay = useMemo(() => {
    return playback == undefined && window.innerWidth < 480;
  }, [playback]);

  const timelineCards: CardsData | never[] = useMemo(() => {
    if (!timelinePages) {
      return [];
    }

    return getHourlyTimelineData(timelinePages, detailLevel);
  }, [detailLevel, timelinePages]);

  const isDone =
    (timelinePages?.[timelinePages.length - 1]?.count ?? 0) < API_LIMIT;

  // hooks for infinite scroll
  const observer = useRef<IntersectionObserver | null>();
  const lastTimelineRef = useCallback(
    (node: HTMLElement | null) => {
      if (isValidating) return;
      if (observer.current) observer.current.disconnect();
      try {
        observer.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !isDone) {
            setSize(size + 1);
          }
        });
        if (node) observer.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [size, setSize, isValidating, isDone]
  );

  const [itemsToDelete, setItemsToDelete] = useState<string[] | null>(null);
  const onDelete = useCallback(
    async (timeline: Card) => {
      if (timeline.entries.length > 1) {
        const uniqueEvents = new Set(
          timeline.entries.map((entry) => entry.source_id)
        );
        setItemsToDelete(new Array(...uniqueEvents));
      } else {
        const response = await axios.delete(
          `events/${timeline.entries[0].source_id}`
        );
        if (response.status === 200) {
          updateHistory();
        }
      }
    },
    [updateHistory]
  );
  const onDeleteMulti = useCallback(async () => {
    if (!itemsToDelete) {
      return;
    }

    const responses = itemsToDelete.map(async (id) => {
      return axios.delete(`events/${id}`);
    });

    if ((await responses[0]).status == 200) {
      updateHistory();
      setItemsToDelete(null);
    }
  }, [itemsToDelete, updateHistory]);

  if (!config || !timelineCards || timelineCards.length == 0) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <Heading as="h2">Review</Heading>

      <AlertDialog
        open={itemsToDelete != null}
        onOpenChange={(_) => setItemsToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete ${itemsToDelete?.length} events?`}</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all events associated with these objects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemsToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500"
              onClick={() => onDeleteMulti()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TimelinePlayerCard
        timeline={playback}
        onDismiss={() => setPlayback(undefined)}
      />

      <div>
        {Object.entries(timelineCards)
          .reverse()
          .map(([day, timelineDay], dayIdx) => {
            return (
              <div key={day}>
                <Heading
                  className="sticky py-2 -top-4 left-0 bg-background w-full z-10"
                  as="h3"
                >
                  {formatUnixTimestampToDateTime(parseInt(day), {
                    strftime_fmt: "%A %b %d",
                    time_style: "medium",
                    date_style: "medium",
                  })}
                </Heading>
                {Object.entries(timelineDay).map(
                  ([hour, timelineHour], hourIdx) => {
                    if (Object.values(timelineHour).length == 0) {
                      return <div key={hour}></div>;
                    }

                    const lastRow =
                      dayIdx == Object.values(timelineCards).length - 1 &&
                      hourIdx == Object.values(timelineDay).length - 1;
                    const previewMap: { [key: string]: Preview | undefined } =
                      {};

                    return (
                      <div key={hour} ref={lastRow ? lastTimelineRef : null}>
                        <Heading as="h4">
                          {formatUnixTimestampToDateTime(parseInt(hour), {
                            strftime_fmt:
                              config.ui.time_format == "24hour"
                                ? "%H:00"
                                : "%I:00 %p",
                            time_style: "medium",
                            date_style: "medium",
                          })}
                        </Heading>

                        <div className="flex flex-wrap">
                          {Object.entries(timelineHour)
                            .reverse()
                            .map(([key, timeline]) => {
                              const startTs = Object.values(timeline.entries)[0]
                                .timestamp;
                              let relevantPreview = previewMap[timeline.camera];

                              if (relevantPreview == undefined) {
                                relevantPreview = previewMap[timeline.camera] =
                                  Object.values(allPreviews || []).find(
                                    (preview) =>
                                      preview.camera == timeline.camera &&
                                      preview.start < startTs &&
                                      preview.end > startTs
                                  );
                              }

                              return (
                                <HistoryCard
                                  key={key}
                                  timeline={timeline}
                                  shouldAutoPlay={shouldAutoPlay}
                                  relevantPreview={relevantPreview}
                                  onClick={() => {
                                    setPlayback(timeline);
                                  }}
                                  onDelete={() => onDelete(timeline)}
                                />
                              );
                            })}
                        </div>
                        {lastRow && <ActivityIndicator />}
                      </div>
                    );
                  }
                )}
              </div>
            );
          })}
      </div>
    </>
  );
}

export default History;
