import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { FrigateConfig } from "@/types/frigateConfig";
import Heading from "@/components/ui/heading";
import ActivityIndicator from "@/components/ui/activity-indicator";
import HistoryCard from "@/components/card/HistoryCard";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import axios from "axios";
import TimelinePlayerCard from "@/components/card/TimelineCardPlayer";

const API_LIMIT = 120;

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

    const cards: CardsData = {};
    timelinePages.forEach((hourlyTimeline) => {
      Object.keys(hourlyTimeline["hours"])
        .reverse()
        .forEach((hour) => {
          const day = new Date(parseInt(hour) * 1000);
          day.setHours(0, 0, 0, 0);
          const dayKey = (day.getTime() / 1000).toString();
          const source_to_types: { [key: string]: string[] } = {};
          Object.values(hourlyTimeline["hours"][hour]).forEach((i) => {
            const time = new Date(i.timestamp * 1000);
            time.setSeconds(0);
            time.setMilliseconds(0);
            const key = `${i.source_id}-${time.getMinutes()}`;
            if (key in source_to_types) {
              source_to_types[key].push(i.class_type);
            } else {
              source_to_types[key] = [i.class_type];
            }
          });

          if (!Object.keys(cards).includes(dayKey)) {
            cards[dayKey] = {};
          }
          cards[dayKey][hour] = {};
          Object.values(hourlyTimeline["hours"][hour]).forEach((i) => {
            const time = new Date(i.timestamp * 1000);
            const key = `${i.camera}-${time.getMinutes()}`;

            // detail level for saving items
            // detail level determines which timeline items for each moment is returned
            // values can be normal, extra, or full
            // normal: return all items except active / attribute / gone / stationary / visible unless that is the only item.
            // extra: return all items except attribute / gone / visible unless that is the only item
            // full: return all items

            let add = true;
            if (detailLevel == "normal") {
              if (
                source_to_types[`${i.source_id}-${time.getMinutes()}`].length >
                  1 &&
                [
                  "active",
                  "attribute",
                  "gone",
                  "stationary",
                  "visible",
                ].includes(i.class_type)
              ) {
                add = false;
              }
            } else if (detailLevel == "extra") {
              if (
                source_to_types[`${i.source_id}-${time.getMinutes()}`].length >
                  1 &&
                i.class_type in ["attribute", "gone", "visible"]
              ) {
                add = false;
              }
            }

            if (add) {
              if (key in cards[dayKey][hour]) {
                cards[dayKey][hour][key].entries.push(i);
              } else {
                cards[dayKey][hour][key] = {
                  camera: i.camera,
                  time: time.getTime() / 1000,
                  entries: [i],
                };
              }
            }
          });
        });
    });

    return cards;
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

  if (!config || !timelineCards || timelineCards.length == 0) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <Heading as="h2">Review</Heading>
      <div className="text-xs mb-4">
        Dates and times are based on the timezone {timezone}
      </div>

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
                <Heading as="h3">
                  {formatUnixTimestampToDateTime(parseInt(day), {
                    strftime_fmt: "%A %b %d",
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
                            strftime_fmt: "%I:00",
                          })}
                        </Heading>

                        <div className="flex flex-wrap">
                          {Object.entries(timelineHour).reverse().map(
                            ([key, timeline]) => {
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
                                />
                              );
                            }
                          )}
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
