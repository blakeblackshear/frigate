import { useEffect, useMemo, useRef, useState } from "react";
import { ObjectLifecycleSequence } from "@/types/timeline";
import { getLifecycleItemDescription } from "@/utils/lifecycleUtil";
import { useDetailStream } from "@/context/detail-stream-context";
import scrollIntoView from "scroll-into-view-if-needed";
import useUserInteraction from "@/hooks/use-user-interaction";
import {
  formatUnixTimestampToDateTime,
  getDurationFromTimestamps,
} from "@/utils/dateUtil";
import { useTranslation } from "react-i18next";
import AnnotationOffsetSlider from "@/components/overlay/detail/AnnotationOffsetSlider";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";
import { Event } from "@/types/event";
import { getIconForLabel } from "@/utils/iconUtil";
import { ReviewSegment } from "@/types/review";
import { LuChevronDown, LuCircle, LuChevronRight } from "react-icons/lu";
import { getTranslatedLabel } from "@/utils/i18n";
import EventMenu from "@/components/timeline/EventMenu";
import { FrigatePlusDialog } from "@/components/overlay/dialog/FrigatePlusDialog";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type DetailStreamProps = {
  reviewItems?: ReviewSegment[];
  currentTime: number;
  isPlaying?: boolean;
  onSeek: (timestamp: number, play?: boolean) => void;
};

export default function DetailStream({
  reviewItems,
  currentTime,
  isPlaying = false,
  onSeek,
}: DetailStreamProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation("views/events");
  const { annotationOffset } = useDetailStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [activeReviewId, setActiveReviewId] = useState<string | undefined>(
    undefined,
  );
  const { userInteracting, setProgrammaticScroll } = useUserInteraction({
    elementRef: scrollRef,
  });

  const effectiveTime = currentTime + annotationOffset / 1000;
  const [upload, setUpload] = useState<Event | undefined>(undefined);

  const onSeekCheckPlaying = (timestamp: number) => {
    onSeek(timestamp, isPlaying);
  };

  // Ensure we initialize the active review when reviewItems first arrive.
  // This helps when the component mounts while the video is already
  // playing — it guarantees the matching review is highlighted right
  // away instead of waiting for a future effectiveTime change.
  useEffect(() => {
    if (!reviewItems || reviewItems.length === 0) return;
    if (activeReviewId) return;

    let target: ReviewSegment | undefined;
    let closest: { r: ReviewSegment; diff: number } | undefined;

    for (const r of reviewItems) {
      const start = r.start_time ?? 0;
      const end = r.end_time ?? r.start_time ?? start;
      if (effectiveTime >= start && effectiveTime <= end) {
        target = r;
        break;
      }
      const mid = (start + end) / 2;
      const diff = Math.abs(effectiveTime - mid);
      if (!closest || diff < closest.diff) closest = { r, diff };
    }

    if (!target && closest) target = closest.r;

    if (target) {
      const start = target.start_time ?? 0;
      setActiveReviewId(
        `review-${target.id ?? target.start_time ?? Math.floor(start)}`,
      );
    }
  }, [reviewItems, activeReviewId, effectiveTime]);

  // Auto-scroll to current time
  useEffect(() => {
    if (!scrollRef.current || userInteracting || !isPlaying) return;
    // Prefer the review whose range contains the effectiveTime. If none
    // contains it, pick the nearest review (by mid-point distance). This is
    // robust to unordered reviewItems and avoids always picking the last
    // element.
    const items = reviewItems ?? [];
    if (items.length === 0) return;

    let target: ReviewSegment | undefined;
    let closest: { r: ReviewSegment; diff: number } | undefined;

    for (const r of items) {
      const start = r.start_time ?? 0;
      const end = r.end_time ?? r.start_time ?? start;
      if (effectiveTime >= start && effectiveTime <= end) {
        target = r;
        break;
      }
      const mid = (start + end) / 2;
      const diff = Math.abs(effectiveTime - mid);
      if (!closest || diff < closest.diff) closest = { r, diff };
    }

    if (!target && closest) target = closest.r;

    if (target) {
      const start = target.start_time ?? 0;
      const id = `review-${target.id ?? target.start_time ?? Math.floor(start)}`;
      const element = scrollRef.current.querySelector(
        `[data-review-id="${id}"]`,
      ) as HTMLElement;
      if (element) {
        // Only scroll if element is completely out of view
        const containerRect = scrollRef.current.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const isFullyInvisible =
          elementRect.bottom < containerRect.top ||
          elementRect.top > containerRect.bottom;

        if (isFullyInvisible) {
          setProgrammaticScroll();
          scrollIntoView(element, {
            scrollMode: "if-needed",
            behavior: "smooth",
          });
        }
      }
    }
  }, [
    reviewItems,
    effectiveTime,
    annotationOffset,
    userInteracting,
    setProgrammaticScroll,
    isPlaying,
  ]);

  // Auto-select active review based on effectiveTime (if inside a review range)
  useEffect(() => {
    if (!reviewItems || reviewItems.length === 0) return;
    for (const r of reviewItems) {
      const start = r.start_time ?? 0;
      const end = r.end_time ?? r.start_time ?? start;
      if (effectiveTime >= start && effectiveTime <= end) {
        setActiveReviewId(
          `review-${r.id ?? r.start_time ?? Math.floor(start)}`,
        );
        return;
      }
    }
  }, [effectiveTime, reviewItems]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="relative">
      <FrigatePlusDialog
        upload={upload}
        onClose={() => setUpload(undefined)}
        onEventUploaded={() => setUpload(undefined)}
      />

      <div
        ref={scrollRef}
        className="scrollbar-container h-[calc(100vh-70px)] overflow-y-auto"
      >
        <div className="space-y-4 py-2">
          {reviewItems?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("detail.noDataFound")}
            </div>
          ) : (
            reviewItems?.map((review: ReviewSegment) => {
              const id = `review-${review.id ?? review.start_time ?? Math.floor(review.start_time ?? 0)}`;
              return (
                <ReviewGroup
                  key={id}
                  id={id}
                  review={review}
                  config={config}
                  onSeek={onSeekCheckPlaying}
                  effectiveTime={effectiveTime}
                  isActive={activeReviewId == id}
                  onActivate={() => setActiveReviewId(id)}
                  onOpenUpload={(e) => setUpload(e)}
                />
              );
            })
          )}
        </div>
      </div>

      <AnnotationOffsetSlider />
    </div>
  );
}

type ReviewGroupProps = {
  review: ReviewSegment;
  id: string;
  config: FrigateConfig;
  onSeek: (timestamp: number, play?: boolean) => void;
  isActive?: boolean;
  onActivate?: () => void;
  onOpenUpload?: (e: Event) => void;
  effectiveTime?: number;
};

function ReviewGroup({
  review,
  id,
  config,
  onSeek,
  isActive = false,
  onActivate,
  onOpenUpload,
  effectiveTime,
}: ReviewGroupProps) {
  const { t } = useTranslation("views/events");
  const [open, setOpen] = useState(false);
  const start = review.start_time ?? 0;

  const displayTime = formatUnixTimestampToDateTime(start, {
    timezone: config.ui.timezone,
    date_format:
      config.ui.time_format == "24hour"
        ? t("time.formattedTimestampHourMinuteSecond.24hour", { ns: "common" })
        : t("time.formattedTimestampHourMinuteSecond.12hour", { ns: "common" }),
    time_style: "medium",
    date_style: "medium",
  });

  const shouldFetchEvents = review?.data?.detections?.length > 0;

  const { data: fetchedEvents, isValidating } = useSWR<Event[]>(
    shouldFetchEvents
      ? ["event_ids", { ids: review.data.detections.join(",") }]
      : null,
  );

  const rawIconLabels: string[] = [
    ...(fetchedEvents
      ? fetchedEvents.map((e) => e.label)
      : (review.data?.objects ?? [])),
    ...(review.data?.audio ?? []),
  ];

  // limit to 5 icons
  const seen = new Set<string>();
  const iconLabels: string[] = [];
  for (const lbl of rawIconLabels) {
    if (!seen.has(lbl)) {
      seen.add(lbl);
      iconLabels.push(lbl);
      if (iconLabels.length >= 5) break;
    }
  }

  const reviewInfo = useMemo(() => {
    const objectCount = fetchedEvents
      ? fetchedEvents.length
      : (review.data.objects ?? []).length;

    return `${objectCount} ${t("detail.trackedObject", { count: objectCount })}`;
  }, [review, t, fetchedEvents]);

  const reviewDuration = useMemo(
    () =>
      getDurationFromTimestamps(
        review.start_time,
        review.end_time ?? null,
        true,
      ),
    [review.start_time, review.end_time],
  );

  return (
    <div
      data-review-id={id}
      className="cursor-pointer rounded-lg bg-secondary py-3"
    >
      <div
        className={cn(
          "flex items-start",
          open && "border-b border-secondary-highlight pb-4",
        )}
        onClick={() => {
          onActivate?.();
          onSeek(start);
        }}
      >
        <div className="ml-4 mr-2 mt-1.5 flex flex-row items-start">
          <LuCircle
            className={cn(
              "size-3",
              isActive
                ? "fill-selected text-selected"
                : "fill-secondary-highlight text-secondary-highlight duration-500",
            )}
          />
        </div>
        <div className="mr-3 flex w-full justify-between">
          <div className="ml-1 flex flex-col items-start gap-1.5">
            <div className="flex flex-row gap-3">
              <div className="text-sm font-medium">{displayTime}</div>
              <div className="flex items-center gap-2">
                {iconLabels.slice(0, 5).map((lbl, idx) => (
                  <div
                    key={`${lbl}-${idx}`}
                    className="rounded-full bg-muted-foreground p-1"
                  >
                    {getIconForLabel(
                      lbl,
                      "size-3 text-primary dark:text-white",
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {review.data.metadata?.title && (
                <div className="mb-1 text-sm text-primary-variant">
                  {review.data.metadata.title}
                </div>
              )}
              <div className="flex flex-row items-center gap-1.5">
                <div className="text-xs text-primary-variant">{reviewInfo}</div>

                {reviewDuration && (
                  <>
                    <span className="text-[5px] text-primary-variant">•</span>
                    <div className="text-xs text-primary-variant">
                      {reviewDuration}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="ml-2 inline-flex items-center justify-center rounded p-1 hover:bg-secondary/10"
          >
            {open ? (
              <LuChevronDown className="size-4 text-primary-variant" />
            ) : (
              <LuChevronRight className="size-4 text-primary-variant" />
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-0.5">
          {shouldFetchEvents && isValidating && !fetchedEvents ? (
            <ActivityIndicator />
          ) : (
            (fetchedEvents || []).map((event, index) => {
              return (
                <div
                  key={`event-${event.id}-${index}`}
                  className="border-b border-secondary-highlight pb-0.5 last:border-0 last:pb-0"
                >
                  <EventList
                    key={event.id}
                    event={event}
                    effectiveTime={effectiveTime}
                    onSeek={onSeek}
                    onOpenUpload={onOpenUpload}
                  />
                </div>
              );
            })
          )}
          {review.data.audio && review.data.audio.length > 0 && (
            <div className="space-y-1">
              {review.data.audio.map((audioLabel) => (
                <div
                  key={audioLabel}
                  className="rounded-md bg-secondary p-2 outline outline-[3px] -outline-offset-[2.8px] outline-transparent duration-500"
                >
                  <div className="ml-1.5 flex items-center gap-2 text-sm font-medium">
                    <div className="rounded-full bg-muted-foreground p-1">
                      {getIconForLabel(
                        audioLabel,
                        "size-3 text-primary dark:text-white",
                      )}
                    </div>
                    <span>{getTranslatedLabel(audioLabel)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type EventListProps = {
  event: Event;
  effectiveTime?: number;
  onSeek: (ts: number, play?: boolean) => void;
  onOpenUpload?: (e: Event) => void;
};
function EventList({
  event,
  effectiveTime,
  onSeek,
  onOpenUpload,
}: EventListProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const { selectedObjectId, setSelectedObjectId } = useDetailStream();

  const handleObjectSelect = (event: Event | undefined) => {
    if (event) {
      onSeek(event.start_time ?? 0);
      setSelectedObjectId(event.id);
    } else {
      setSelectedObjectId(undefined);
    }
  };

  // Clear selectedObjectId when effectiveTime has passed this event's end_time
  useEffect(() => {
    if (selectedObjectId === event.id && effectiveTime && event.end_time) {
      if (effectiveTime >= event.end_time) {
        setSelectedObjectId(undefined);
      }
    }
  }, [
    selectedObjectId,
    event.id,
    event.end_time,
    effectiveTime,
    setSelectedObjectId,
  ]);

  return (
    <>
      <div
        className={cn(
          "rounded-md bg-secondary p-2",
          event.id == selectedObjectId
            ? "bg-secondary-highlight"
            : "outline-transparent duration-500",
          event.id != selectedObjectId &&
            (effectiveTime ?? 0) >= (event.start_time ?? 0) - 0.5 &&
            (effectiveTime ?? 0) <=
              (event.end_time ?? event.start_time ?? 0) + 0.5 &&
            "bg-secondary-highlight",
        )}
      >
        <div className="ml-1.5 flex w-full items-center justify-between">
          <div
            className="flex items-center gap-2 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              handleObjectSelect(
                event.id == selectedObjectId ? undefined : event,
              );
            }}
            role="button"
          >
            <div
              className={cn(
                "rounded-full p-1",
                event.id == selectedObjectId
                  ? "bg-selected"
                  : "bg-muted-foreground",
              )}
            >
              {getIconForLabel(
                event.label,
                "size-3 text-primary dark:text-white",
              )}
            </div>
            <div className="flex items-end gap-2">
              <span>{getTranslatedLabel(event.label)}</span>
            </div>
          </div>
          <div className="mr-2 flex flex-1 flex-row justify-end">
            <EventMenu
              event={event}
              config={config}
              onOpenUpload={(e) => onOpenUpload?.(e)}
              selectedObjectId={selectedObjectId}
              setSelectedObjectId={handleObjectSelect}
            />
          </div>
        </div>

        <div className="mt-2">
          <ObjectTimeline
            eventId={event.id}
            onSeek={onSeek}
            effectiveTime={effectiveTime}
          />
        </div>
      </div>
    </>
  );
}

type LifecycleItemProps = {
  item: ObjectLifecycleSequence;
  isActive?: boolean;
  onSeek?: (timestamp: number, play?: boolean) => void;
  effectiveTime?: number;
};

function LifecycleItem({
  item,
  isActive,
  onSeek,
  effectiveTime,
}: LifecycleItemProps) {
  const { t } = useTranslation("views/events");
  const { data: config } = useSWR<FrigateConfig>("config");

  const aspectRatio = useMemo(() => {
    if (!config || !item?.camera) {
      return 16 / 9;
    }

    return (
      config.cameras[item.camera].detect.width /
      config.cameras[item.camera].detect.height
    );
  }, [config, item]);

  const formattedEventTimestamp = config
    ? formatUnixTimestampToDateTime(item?.timestamp ?? 0, {
        timezone: config.ui.timezone,
        date_format:
          config.ui.time_format == "24hour"
            ? t("time.formattedTimestampHourMinuteSecond.24hour", {
                ns: "common",
              })
            : t("time.formattedTimestampHourMinuteSecond.12hour", {
                ns: "common",
              }),
        time_style: "medium",
        date_style: "medium",
      })
    : "";

  const ratio =
    Array.isArray(item?.data.box) && item?.data.box.length >= 4
      ? (aspectRatio * (item?.data.box[2] / item?.data.box[3])).toFixed(2)
      : "N/A";
  const areaPx =
    Array.isArray(item?.data.box) && item?.data.box.length >= 4
      ? Math.round(
          (config?.cameras[item?.camera]?.detect?.width ?? 0) *
            (config?.cameras[item?.camera]?.detect?.height ?? 0) *
            (item?.data.box[2] * item?.data.box[3]),
        )
      : undefined;
  const areaPct =
    Array.isArray(item?.data.box) && item?.data.box.length >= 4
      ? (item?.data.box[2] * item?.data.box[3]).toFixed(4)
      : undefined;

  return (
    <div
      role="button"
      onClick={() => {
        onSeek?.(item.timestamp ?? 0, false);
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm text-primary-variant",
        isActive
          ? "font-semibold text-primary dark:font-normal"
          : "duration-500",
      )}
    >
      <div className="relative flex size-4 items-center justify-center">
        <LuCircle
          className={cn(
            "relative z-10 ml-[1px] size-2.5 fill-secondary-foreground stroke-none",
            (isActive || (effectiveTime ?? 0) >= (item?.timestamp ?? 0)) &&
              "fill-selected duration-300",
          )}
        />
      </div>
      <div className="flex w-full flex-row justify-between">
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-start text-left">
              {getLifecycleItemDescription(item)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="mt-1 flex flex-wrap items-start gap-3 text-sm text-secondary-foreground">
              <div className="flex flex-col gap-1">
                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground">
                    {t("objectLifecycle.lifecycleItemDesc.header.ratio")}
                  </span>
                  <span className="font-medium text-foreground">{ratio}</span>
                </div>

                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground">
                    {t("objectLifecycle.lifecycleItemDesc.header.area")}
                  </span>
                  {areaPx !== undefined && areaPct !== undefined ? (
                    <span className="font-medium text-foreground">
                      {areaPx} {t("pixels", { ns: "common" })} · {areaPct}%
                    </span>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        <div className={cn("p-1 text-xs")}>{formattedEventTimestamp}</div>
      </div>
    </div>
  );
}

// Fetch and render timeline entries for a single event id on demand.
function ObjectTimeline({
  eventId,
  onSeek,
  effectiveTime,
}: {
  eventId: string;
  onSeek: (ts: number, play?: boolean) => void;
  effectiveTime?: number;
}) {
  const { t } = useTranslation("views/events");
  const { data: timeline, isValidating } = useSWR<ObjectLifecycleSequence[]>([
    "timeline",
    {
      source_id: eventId,
    },
  ]);

  if (isValidating && (!timeline || timeline.length === 0)) {
    return <ActivityIndicator className="ml-2 size-3" />;
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="py-2 text-sm text-muted-foreground">
        {t("detail.noObjectDetailData")}
      </div>
    );
  }

  // Calculate how far down the blue line should extend based on effectiveTime
  const calculateLineHeight = () => {
    if (!timeline || timeline.length === 0) return 0;

    const currentTime = effectiveTime ?? 0;

    // Find which events have been passed
    let lastPassedIndex = -1;
    for (let i = 0; i < timeline.length; i++) {
      if (currentTime >= (timeline[i].timestamp ?? 0)) {
        lastPassedIndex = i;
      } else {
        break;
      }
    }

    // No events passed yet
    if (lastPassedIndex < 0) return 0;

    // All events passed
    if (lastPassedIndex >= timeline.length - 1) return 100;

    // Calculate percentage based on item position, not time
    // Each item occupies an equal visual space regardless of time gaps
    const itemPercentage = 100 / (timeline.length - 1);

    // Find progress between current and next event for smooth transition
    const currentEvent = timeline[lastPassedIndex];
    const nextEvent = timeline[lastPassedIndex + 1];
    const currentTimestamp = currentEvent.timestamp ?? 0;
    const nextTimestamp = nextEvent.timestamp ?? 0;

    // Calculate interpolation between the two events
    const timeBetween = nextTimestamp - currentTimestamp;
    const timeElapsed = currentTime - currentTimestamp;
    const interpolation = timeBetween > 0 ? timeElapsed / timeBetween : 0;

    // Base position plus interpolated progress to next item
    return Math.min(
      100,
      lastPassedIndex * itemPercentage + interpolation * itemPercentage,
    );
  };

  const blueLineHeight = calculateLineHeight();

  return (
    <div className="-pb-2 relative mx-2">
      <div className="absolute -top-2 bottom-2 left-2 z-0 w-0.5 -translate-x-1/2 bg-secondary-foreground" />
      <div
        className="absolute left-2 top-2 z-[5] max-h-[calc(100%-1rem)] w-0.5 -translate-x-1/2 bg-selected transition-all duration-300"
        style={{ height: `${blueLineHeight}%` }}
      />
      <div className="space-y-2">
        {timeline.map((event, idx) => {
          const isActive =
            Math.abs((effectiveTime ?? 0) - (event.timestamp ?? 0)) <= 0.5;

          return (
            <LifecycleItem
              key={`${event.timestamp}-${event.source_id ?? ""}-${idx}`}
              item={event}
              onSeek={onSeek}
              isActive={isActive}
              effectiveTime={effectiveTime}
            />
          );
        })}
      </div>
    </div>
  );
}
