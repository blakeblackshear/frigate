import { useEffect, useMemo, useRef, useState } from "react";
import { TrackingDetailsSequence } from "@/types/timeline";
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
import { EventType } from "@/types/search";
import { getIconForLabel } from "@/utils/iconUtil";
import { REVIEW_PADDING, ReviewSegment } from "@/types/review";
import { LuChevronDown, LuCircle, LuChevronRight } from "react-icons/lu";
import { getTranslatedLabel } from "@/utils/i18n";
import EventMenu from "@/components/timeline/EventMenu";
import { FrigatePlusDialog } from "@/components/overlay/dialog/FrigatePlusDialog";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { isDesktop, isIOS, isMobile } from "react-device-detect";
import { resolveZoneName } from "@/hooks/use-zone-friendly-name";
import { PiSlidersHorizontalBold } from "react-icons/pi";
import { MdAutoAwesome } from "react-icons/md";
import { isPWA } from "@/utils/isPWA";
import { isInIframe } from "@/utils/isIFrame";
import { GenAISummaryDialog } from "../overlay/chip/GenAISummaryChip";

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

  const effectiveTime = currentTime - annotationOffset / 1000;
  const [upload, setUpload] = useState<Event | undefined>(undefined);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [alwaysExpandActive, setAlwaysExpandActive] = useUserPersistence(
    "detailStreamActiveExpanded",
    true,
  );

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

  // Initial scroll to active review (runs immediately when user selects, not during playback)
  useEffect(() => {
    if (!scrollRef.current || !activeReviewId || userInteracting || isPlaying)
      return;

    const element = scrollRef.current.querySelector(
      `[data-review-id="${activeReviewId}"]`,
    ) as HTMLElement;

    if (element) {
      setProgrammaticScroll();
      scrollIntoView(element, {
        scrollMode: "if-needed",
        behavior: isMobile && isIOS && !isPWA && isInIframe ? "auto" : "smooth",
      });
    }
  }, [activeReviewId, setProgrammaticScroll, userInteracting, isPlaying]);

  // Auto-scroll to current time during playback
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
            behavior:
              isMobile && isIOS && !isPWA && isInIframe ? "auto" : "smooth",
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
    <>
      <FrigatePlusDialog
        upload={upload}
        onClose={() => setUpload(undefined)}
        onEventUploaded={() => {
          if (upload) {
            upload.plus_id = "new_upload";
          }
        }}
      />

      <div className="relative flex h-full flex-col">
        <div
          ref={scrollRef}
          className="scrollbar-container flex-1 overflow-y-auto overflow-x-hidden pb-14"
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
                    annotationOffset={annotationOffset}
                    isActive={activeReviewId == id}
                    onActivate={() => setActiveReviewId(id)}
                    onOpenUpload={(e) => setUpload(e)}
                    alwaysExpandActive={alwaysExpandActive}
                  />
                );
              })
            )}
          </div>
        </div>

        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-30 rounded-t-md border border-secondary-highlight bg-background_alt shadow-md",
            isDesktop && "border-b-0",
          )}
        >
          <button
            onClick={() => setControlsExpanded(!controlsExpanded)}
            className="flex w-full items-center justify-between p-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <PiSlidersHorizontalBold className="size-4" />
              <span>{t("detail.settings")}</span>
            </div>
            {controlsExpanded ? (
              <LuChevronDown className="size-4 text-primary-variant" />
            ) : (
              <LuChevronRight className="size-4 text-primary-variant" />
            )}
          </button>
          {controlsExpanded && (
            <div className="space-y-3 px-3 pb-3">
              <AnnotationOffsetSlider />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t("detail.alwaysExpandActive.title")}
                  </label>
                  <Switch
                    checked={alwaysExpandActive}
                    onCheckedChange={setAlwaysExpandActive}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("detail.alwaysExpandActive.desc")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
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
  annotationOffset: number;
  alwaysExpandActive?: boolean;
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
  annotationOffset,
  alwaysExpandActive = false,
}: ReviewGroupProps) {
  const { t } = useTranslation("views/events");
  const [open, setOpen] = useState(false);
  const start = review.start_time ?? 0;
  // review.start_time is in detect time, convert to record for seeking
  const startRecord = start + annotationOffset / 1000;

  // Auto-expand when this review becomes active and alwaysExpandActive is enabled
  useEffect(() => {
    if (isActive && alwaysExpandActive) {
      setOpen(true);
    }
  }, [isActive, alwaysExpandActive]);

  const displayTime = formatUnixTimestampToDateTime(start, {
    timezone: config.ui.timezone,
    date_format:
      config.ui.time_format == "24hour"
        ? t("time.formattedTimestampHourMinuteSecond.24hour", { ns: "common" })
        : t("time.formattedTimestampHourMinuteSecond.12hour", { ns: "common" }),
    time_style: "medium",
    date_style: "medium",
  });

  const shouldFetchEvents = open && review?.data?.detections?.length > 0;

  const { data: fetchedEvents, isValidating } = useSWR<Event[]>(
    shouldFetchEvents
      ? ["event_ids", { ids: review.data.detections.join(",") }]
      : null,
  );

  const rawIconLabels: Array<{ label: string; type: EventType }> = [
    ...(fetchedEvents
      ? fetchedEvents.map((e) => ({
          label: e.sub_label ? e.label + "-verified" : e.label,
          type: e.data.type,
        }))
      : (review.data?.objects ?? []).map((obj) => ({
          label: obj,
          type: "object" as EventType,
        }))),
    ...(review.data?.audio ?? []).map((audio) => ({
      label: audio,
      type: "audio" as EventType,
    })),
  ];

  // limit to 5 icons
  const seen = new Set<string>();
  const iconLabels: Array<{ label: string; type: EventType }> = [];
  for (const item of rawIconLabels) {
    if (!seen.has(item.label)) {
      seen.add(item.label);
      iconLabels.push(item);
      if (iconLabels.length >= 5) break;
    }
  }

  const reviewInfo = useMemo(() => {
    const detectionsCount =
      review.data?.detections?.length ?? (review.data?.objects ?? []).length;
    const objectCount = fetchedEvents ? fetchedEvents.length : detectionsCount;

    return `${t("detail.trackedObject", { count: objectCount })}`;
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
      className={`mx-1 cursor-pointer rounded-lg bg-secondary px-0 py-3 outline outline-[2px] -outline-offset-[1.8px] ${
        isActive
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500"
      }`}
    >
      <div
        className={cn(
          "flex items-start",
          open && "border-b border-secondary-highlight pb-4",
        )}
        onClick={() => {
          onActivate?.();
          onSeek(startRecord);
        }}
      >
        <div className="ml-4 mr-2 mt-1.5 flex flex-row items-start">
          <LuCircle
            className={cn(
              "size-3 duration-500",
              review.severity == "alert"
                ? "fill-severity_alert text-severity_alert"
                : "fill-severity_detection text-severity_detection",
            )}
          />
        </div>
        <div className="mr-3 grid w-full grid-cols-[1fr_auto] gap-2">
          <div className="ml-1 flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-row gap-3">
              <div className="text-sm font-medium">{displayTime}</div>
              <div className="relative flex items-center gap-2 text-white">
                {iconLabels.slice(0, 5).map(({ label: lbl, type }, idx) => (
                  <div
                    key={`${lbl}-${idx}`}
                    className="rounded-full bg-muted-foreground p-1"
                  >
                    {getIconForLabel(lbl, type, "size-3 text-white")}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {review.data.metadata?.title && (
                <div className="mb-1 flex min-w-0 items-center gap-1 text-sm text-primary-variant">
                  <Tooltip>
                    <TooltipTrigger>
                      <MdAutoAwesome className="size-3 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {review.data.metadata.title}
                    </TooltipContent>
                  </Tooltip>
                  <GenAISummaryDialog
                    review={review}
                    onOpen={(open) => {
                      if (open) {
                        onSeek(review.start_time, false);
                      }
                    }}
                  >
                    <span className="truncate hover:underline">
                      {review.data.metadata.title}
                    </span>
                  </GenAISummaryDialog>
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
            className="inline-flex items-center justify-center self-center rounded p-1 hover:bg-secondary/10"
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
                    review={review}
                    effectiveTime={effectiveTime}
                    annotationOffset={annotationOffset}
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
                        "audio",
                        "size-3 text-white",
                      )}
                    </div>
                    <span>{getTranslatedLabel(audioLabel, "audio")}</span>
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
  review: ReviewSegment;
  effectiveTime?: number;
  annotationOffset: number;
  onSeek: (ts: number, play?: boolean) => void;
  onOpenUpload?: (e: Event) => void;
};
function EventList({
  event,
  review,
  effectiveTime,
  annotationOffset,
  onSeek,
  onOpenUpload,
}: EventListProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const { selectedObjectIds, setSelectedObjectIds, toggleObjectSelection } =
    useDetailStream();

  const isSelected = selectedObjectIds.includes(event.id);

  const label =
    event.sub_label || getTranslatedLabel(event.label, event.data.type);

  const handleObjectSelect = (event: Event | undefined) => {
    if (event) {
      setSelectedObjectIds([]);
      setSelectedObjectIds([event.id]);
      // event.start_time is detect time, convert to record
      const recordTime = event.start_time + annotationOffset / 1000;
      onSeek(recordTime);
    } else {
      setSelectedObjectIds([]);
    }
  };

  const handleTimelineClick = (ts: number, play?: boolean) => {
    setSelectedObjectIds([]);
    setSelectedObjectIds([event.id]);
    onSeek(ts, play);
  };

  // Clear selection when effectiveTime has passed this event's end_time
  useEffect(() => {
    if (isSelected && effectiveTime && event.end_time) {
      if (effectiveTime >= event.end_time) {
        toggleObjectSelection(event.id);
      }
    }
  }, [
    isSelected,
    event.id,
    event.end_time,
    effectiveTime,
    toggleObjectSelection,
  ]);

  return (
    <>
      <div
        className={cn(
          "rounded-md bg-secondary p-2",
          isSelected
            ? "bg-secondary-highlight"
            : "outline-transparent duration-500",
        )}
      >
        <div className="ml-1.5 flex w-full items-end justify-between">
          <div className="flex flex-1 items-center gap-2 text-sm font-medium">
            <div
              className={cn(
                "relative rounded-full p-1 text-white",
                (effectiveTime ?? 0) >= (event.start_time ?? 0) - 0.5 &&
                  (effectiveTime ?? 0) <=
                    (event.end_time ?? event.start_time ?? 0) + 0.5
                  ? "bg-selected"
                  : "bg-muted-foreground",
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleObjectSelect(event);
              }}
              role="button"
            >
              {getIconForLabel(
                event.sub_label ? event.label + "-verified" : event.label,
                event.data.type,
                "size-3 text-white",
              )}
            </div>
            <div
              className="flex flex-1 items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                handleObjectSelect(event);
              }}
              role="button"
            >
              <div className="flex gap-2">
                <span className="capitalize">{label}</span>
                {event.data?.recognized_license_plate && (
                  <>
                    <span className="text-secondary-foreground">·</span>
                    <div className="text-sm text-secondary-foreground">
                      <Link
                        to={`/explore?recognized_license_plate=${event.data.recognized_license_plate}`}
                        className="text-sm"
                      >
                        {event.data.recognized_license_plate}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mr-2 flex flex-row justify-end">
            <EventMenu
              event={event}
              config={config}
              onOpenUpload={(e) => onOpenUpload?.(e)}
              isSelected={isSelected}
              onToggleSelection={handleObjectSelect}
            />
          </div>
        </div>

        <div className="mt-2">
          <ObjectTimeline
            review={review}
            eventId={event.id}
            onSeek={handleTimelineClick}
            effectiveTime={effectiveTime}
            annotationOffset={annotationOffset}
            startTime={event.start_time}
            endTime={event.end_time}
          />
        </div>
      </div>
    </>
  );
}

type LifecycleItemProps = {
  item: TrackingDetailsSequence;
  isActive?: boolean;
  onSeek?: (timestamp: number, play?: boolean) => void;
  effectiveTime?: number;
  annotationOffset: number;
  isTimelineActive?: boolean;
};

function LifecycleItem({
  item,
  isActive,
  onSeek,
  effectiveTime,
  annotationOffset,
  isTimelineActive = false,
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

  const ratio = useMemo(
    () =>
      Array.isArray(item?.data.box) && item?.data.box.length >= 4
        ? (aspectRatio * (item?.data.box[2] / item?.data.box[3])).toFixed(2)
        : "N/A",
    [aspectRatio, item],
  );

  const areaPx = useMemo(
    () =>
      Array.isArray(item?.data.box) && item?.data.box.length >= 4
        ? Math.round(
            (config?.cameras[item?.camera]?.detect?.width ?? 0) *
              (config?.cameras[item?.camera]?.detect?.height ?? 0) *
              (item?.data.box[2] * item?.data.box[3]),
          )
        : undefined,
    [config, item],
  );

  const areaPct = useMemo(
    () =>
      Array.isArray(item?.data.box) && item?.data.box.length >= 4
        ? (item?.data.box[2] * item?.data.box[3] * 100).toFixed(2)
        : undefined,
    [item],
  );

  const attributeAreaPx = useMemo(
    () =>
      Array.isArray(item?.data.attribute_box) &&
      item?.data.attribute_box.length >= 4
        ? Math.round(
            (config?.cameras[item?.camera]?.detect?.width ?? 0) *
              (config?.cameras[item?.camera]?.detect?.height ?? 0) *
              (item?.data.attribute_box[2] * item?.data.attribute_box[3]),
          )
        : undefined,
    [config, item],
  );

  const attributeAreaPct = useMemo(
    () =>
      Array.isArray(item?.data.attribute_box) &&
      item?.data.attribute_box.length >= 4
        ? (
            item?.data.attribute_box[2] *
            item?.data.attribute_box[3] *
            100
          ).toFixed(2)
        : undefined,
    [item],
  );

  const score = useMemo(() => {
    if (item?.data?.score !== undefined) {
      return (item.data.score * 100).toFixed(0) + "%";
    }
    return "N/A";
  }, [item?.data?.score]);

  return (
    <div
      role="button"
      onClick={() => {
        const recordTimestamp = item.timestamp + annotationOffset / 1000;
        onSeek?.(recordTimestamp, false);
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
            "relative z-10 size-2.5 fill-secondary-foreground stroke-none",
            (isActive || (effectiveTime ?? 0) >= (item?.timestamp ?? 0)) &&
              isTimelineActive &&
              "fill-selected duration-300",
          )}
        />
      </div>

      <div className="ml-0.5 flex min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-start break-words text-left">
              {getLifecycleItemDescription(item)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="mt-1 flex flex-wrap items-start gap-3 text-sm text-secondary-foreground">
              <div className="flex flex-col gap-1">
                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground">
                    {t("trackingDetails.lifecycleItemDesc.header.score", {
                      ns: "views/explore",
                    })}
                  </span>
                  <span className="font-medium text-foreground">{score}</span>
                </div>

                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground">
                    {t("trackingDetails.lifecycleItemDesc.header.ratio", {
                      ns: "views/explore",
                    })}
                  </span>
                  <span className="font-medium text-foreground">{ratio}</span>
                </div>

                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground">
                    {t("trackingDetails.lifecycleItemDesc.header.area", {
                      ns: "views/explore",
                    })}{" "}
                    {attributeAreaPx !== undefined &&
                      attributeAreaPct !== undefined && (
                        <span className="text-muted-foreground">
                          ({getTranslatedLabel(item.data.label)})
                        </span>
                      )}
                  </span>
                  {areaPx !== undefined && areaPct !== undefined ? (
                    <span className="font-medium text-foreground">
                      {t("information.pixels", { ns: "common", area: areaPx })}{" "}
                      <span className="text-secondary-foreground">·</span>{" "}
                      {areaPct}%
                    </span>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>

                {attributeAreaPx !== undefined &&
                  attributeAreaPct !== undefined && (
                    <div className="flex items-start gap-1">
                      <span className="text-muted-foreground">
                        {t("trackingDetails.lifecycleItemDesc.header.area", {
                          ns: "views/explore",
                        })}{" "}
                        {attributeAreaPx !== undefined &&
                          attributeAreaPct !== undefined && (
                            <span className="text-muted-foreground">
                              ({getTranslatedLabel(item.data.attribute)})
                            </span>
                          )}
                      </span>
                      <span className="font-medium text-foreground">
                        {attributeAreaPx}{" "}
                        {t("information.pixels", {
                          ns: "common",
                          area: attributeAreaPx,
                        })}{" "}
                        <span className="text-secondary-foreground">·</span>{" "}
                        {attributeAreaPct}%
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-3 flex-shrink-0 px-1 text-right text-xs text-primary-variant">
        <div className="whitespace-nowrap">{formattedEventTimestamp}</div>
      </div>
    </div>
  );
}

// Fetch and render timeline entries for a single event id on demand.
function ObjectTimeline({
  review,
  eventId,
  onSeek,
  effectiveTime,
  annotationOffset,
  startTime,
  endTime,
}: {
  review: ReviewSegment;
  eventId: string;
  onSeek: (ts: number, play?: boolean) => void;
  effectiveTime?: number;
  annotationOffset: number;
  startTime?: number;
  endTime?: number;
}) {
  const { t } = useTranslation("views/events");
  const { data: fullTimeline, isValidating } = useSWR<
    TrackingDetailsSequence[]
  >([
    "timeline",
    {
      source_id: eventId,
    },
  ]);

  const { data: config } = useSWR<FrigateConfig>("config");
  const timeline = useMemo(() => {
    if (!fullTimeline) {
      return fullTimeline;
    }

    return fullTimeline
      .filter(
        (t) =>
          t.timestamp >= review.start_time - REVIEW_PADDING &&
          (review.end_time == undefined ||
            t.timestamp <= review.end_time + REVIEW_PADDING),
      )
      .map((event) => ({
        ...event,
        data: {
          ...event.data,
          zones_friendly_names: event.data?.zones?.map((zone) =>
            resolveZoneName(config, zone),
          ),
        },
      }));
  }, [config, fullTimeline, review]);

  if (isValidating && (!timeline || timeline.length === 0)) {
    return <ActivityIndicator className="ml-2.5 size-3" />;
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="ml-8 text-sm text-muted-foreground">
        {t("detail.noObjectDetailData")}
      </div>
    );
  }

  // Check if current time is within the event's start/stop range
  const isWithinEventRange =
    effectiveTime !== undefined &&
    startTime !== undefined &&
    endTime !== undefined &&
    effectiveTime >= startTime &&
    effectiveTime <= endTime;

  // Calculate how far down the blue line should extend based on effectiveTime
  const calculateLineHeight = () => {
    if (!timeline || timeline.length === 0 || !isWithinEventRange) return 0;

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

  const activeLineHeight = calculateLineHeight();

  return (
    <div className="-pb-2 relative mx-2">
      <div className="absolute -top-2 bottom-2 left-2 z-0 w-0.5 -translate-x-1/2 bg-secondary-foreground" />
      {isWithinEventRange && (
        <div
          className={cn(
            "absolute left-2 top-2 z-[5] max-h-[calc(100%-1rem)] w-0.5 -translate-x-1/2 bg-selected transition-all duration-300",
          )}
          style={{ height: `${activeLineHeight}%` }}
        />
      )}
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
              annotationOffset={annotationOffset}
              isTimelineActive={isWithinEventRange}
            />
          );
        })}
      </div>
    </div>
  );
}
