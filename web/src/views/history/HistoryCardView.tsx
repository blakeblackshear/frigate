import HistoryCard from "@/components/card/HistoryCard";
import ActivityIndicator from "@/components/ui/activity-indicator";
import Heading from "@/components/ui/heading";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  formatUnixTimestampToDateTime,
  getRangeForTimestamp,
} from "@/utils/dateUtil";
import { useCallback, useRef } from "react";
import useSWR from "swr";

type HistoryCardViewProps = {
  timelineCards: CardsData | never[];
  allPreviews: Preview[] | undefined;
  isMobile: boolean;
  isValidating: boolean;
  isDone: boolean;
  onNextPage: () => void;
  onDelete: (card: Card) => void;
  onItemSelected: (item: TimelinePlayback) => void;
};

export default function HistoryCardView({
  timelineCards,
  allPreviews,
  isMobile,
  isValidating,
  isDone,
  onNextPage,
  onDelete,
  onItemSelected,
}: HistoryCardViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // hooks for infinite scroll
  const observer = useRef<IntersectionObserver | null>();
  const lastTimelineRef = useCallback(
    (node: HTMLElement | null) => {
      if (isValidating) return;
      if (observer.current) observer.current.disconnect();
      try {
        observer.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !isDone) {
            onNextPage();
          }
        });
        if (node) observer.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [isValidating, isDone]
  );

  return (
    <>
      {Object.entries(timelineCards)
        .reverse()
        .map(([day, timelineDay], dayIdx) => {
          return (
            <div key={day}>
              <Heading
                className="sticky py-2 -top-4 left-0 bg-background w-full z-20"
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
                  const previewMap: { [key: string]: Preview | undefined } = {};

                  return (
                    <div key={hour} ref={lastRow ? lastTimelineRef : null}>
                      <Heading as="h4">
                        {formatUnixTimestampToDateTime(parseInt(hour), {
                          strftime_fmt:
                            config?.ui.time_format == "24hour"
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
                                isMobile={isMobile}
                                relevantPreview={relevantPreview}
                                onClick={() => {
                                  onItemSelected({
                                    camera: timeline.camera,
                                    range: getRangeForTimestamp(timeline.time),
                                    timelineItems: Object.values(
                                      timelineHour
                                    ).flatMap((card) =>
                                      card.camera == timeline.camera
                                        ? card.entries
                                        : []
                                    ),
                                    relevantPreview: relevantPreview,
                                  });
                                }}
                                onDelete={() => onDelete(timeline)}
                              />
                            );
                          })}
                      </div>
                      {lastRow && !isDone && <ActivityIndicator />}
                    </div>
                  );
                }
              )}
            </div>
          );
        })}
    </>
  );
}
