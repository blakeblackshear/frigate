import { useEffect, useRef, useState } from "react";
import { ObjectLifecycleSequence } from "@/types/timeline";
import { LifecycleIcon } from "@/components/overlay/detail/ObjectLifecycle";
import { getLifecycleItemDescription } from "@/utils/lifecycleUtil";
import { useDetailStream } from "@/context/detail-stream-context";
import scrollIntoView from "scroll-into-view-if-needed";
import useUserInteraction from "@/hooks/use-user-interaction";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useTranslation } from "react-i18next";
import AnnotationOffsetSlider from "@/components/overlay/detail/AnnotationOffsetSlider";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";
import { Event } from "@/types/event";
import { getIconForLabel } from "@/utils/iconUtil";
import { ReviewSegment, REVIEW_PADDING } from "@/types/review";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";
import { getTranslatedLabel } from "@/utils/i18n";
import EventMenu from "@/components/timeline/EventMenu";
import { FrigatePlusDialog } from "@/components/overlay/dialog/FrigatePlusDialog";
import { cn } from "@/lib/utils";

type DetailStreamProps = {
  reviewItems?: ReviewSegment[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
};

export default function DetailStream({
  reviewItems,
  currentTime,
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
  const PAD = 0; // REVIEW_PADDING ?? 2;
  const [upload, setUpload] = useState<Event | undefined>(undefined);

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
      const start = (r.start_time ?? 0) - PAD;
      const end = (r.end_time ?? r.start_time ?? start) + PAD;
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
      const start = (target.start_time ?? 0) - PAD;
      setActiveReviewId(
        `review-${target.id ?? target.start_time ?? Math.floor(start)}`,
      );
    }
  }, [reviewItems, activeReviewId, effectiveTime, PAD]);

  // Auto-scroll to current time
  useEffect(() => {
    if (!scrollRef.current || userInteracting) return;
    // Prefer the review whose range contains the effectiveTime. If none
    // contains it, pick the nearest review (by mid-point distance). This is
    // robust to unordered reviewItems and avoids always picking the last
    // element.
    const items = reviewItems ?? [];
    if (items.length === 0) return;

    let target: ReviewSegment | undefined;
    let closest: { r: ReviewSegment; diff: number } | undefined;

    for (const r of items) {
      const start = (r.start_time ?? 0) - PAD;
      const end = (r.end_time ?? r.start_time ?? start) + PAD;
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
      const start = (target.start_time ?? 0) - PAD;
      const id = `review-${target.id ?? target.start_time ?? Math.floor(start)}`;
      const element = scrollRef.current.querySelector(
        `[data-review-id="${id}"]`,
      ) as HTMLElement;
      if (element) {
        setProgrammaticScroll();
        scrollIntoView(element, {
          scrollMode: "if-needed",
          behavior: "smooth",
        });
      }
    }
  }, [
    reviewItems,
    effectiveTime,
    annotationOffset,
    userInteracting,
    setProgrammaticScroll,
    PAD,
  ]);

  // Auto-select active review based on effectiveTime (if inside a review range)
  useEffect(() => {
    if (!reviewItems || reviewItems.length === 0) return;
    for (const r of reviewItems) {
      const start = (r.start_time ?? 0) - PAD;
      const end = (r.end_time ?? r.start_time ?? start) + PAD;
      if (effectiveTime >= start && effectiveTime <= end) {
        setActiveReviewId(
          `review-${r.id ?? r.start_time ?? Math.floor(start)}`,
        );
        return;
      }
    }
  }, [effectiveTime, reviewItems, PAD]);

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
        className="scrollbar-container h-[calc(100vh-70px)] overflow-y-auto bg-secondary"
      >
        <div className="space-y-2 p-4">
          {reviewItems?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("activity.noActivitiesFound")}
            </div>
          ) : (
            reviewItems?.map((review: ReviewSegment) => {
              const id = `review-${review.id ?? review.start_time ?? Math.floor((review.start_time ?? 0) - PAD)}`;
              return (
                <ReviewGroup
                  key={id}
                  id={id}
                  review={review}
                  config={config}
                  onSeek={onSeek}
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
  onSeek: (timestamp: number) => void;
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
  const PAD = REVIEW_PADDING ?? 2;

  // derive start timestamp from the review
  const start = (review.start_time ?? 0) - PAD;

  // display time first in the header
  const displayTime = formatUnixTimestampToDateTime(start, {
    timezone: config.ui.timezone,
    date_format:
      config.ui.time_format == "24hour"
        ? t("time.formattedTimestamp.24hour", { ns: "common" })
        : t("time.formattedTimestamp.12hour", { ns: "common" }),
    time_style: "medium",
    date_style: "medium",
  });

  const { data: fetchedEvents } = useSWR<Event[]>(
    review?.data?.detections?.length
      ? ["event_ids", { ids: review.data.detections.join(",") }]
      : null,
  );

  const rawIconLabels: string[] = fetchedEvents
    ? fetchedEvents.map((e) => e.label)
    : (review.data?.objects ?? []);

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
  return (
    <div
      data-review-id={id}
      className={`cursor-pointer rounded-lg border bg-background p-3 outline outline-[3px] -outline-offset-[2.8px] ${
        isActive
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500"
      }`}
    >
      <div
        className="flex items-center justify-between"
        onClick={() => {
          onActivate?.();
          onSeek(start);
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="text-sm font-medium">{displayTime}</div>
            <div className="text-xs text-muted-foreground">
              {fetchedEvents
                ? fetchedEvents.length
                : (review.data.objects ?? []).length}{" "}
              tracked objects
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {iconLabels.slice(0, 5).map((lbl, idx) => (
            <span key={`${lbl}-${idx}`}>
              {getIconForLabel(lbl, "size-4 text-primary dark:text-white")}
            </span>
          ))}
        </div>
      </div>

      {isActive && (
        <div className="mt-2 space-y-2">
          {!fetchedEvents ? (
            <ActivityIndicator />
          ) : (
            fetchedEvents.map((event) => {
              return (
                <EventCollapsible
                  key={event.id}
                  event={event}
                  effectiveTime={effectiveTime}
                  onSeek={onSeek}
                  onOpenUpload={onOpenUpload}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

type EventCollapsibleProps = {
  event: Event;
  effectiveTime?: number;
  onSeek: (ts: number) => void;
  onOpenUpload?: (e: Event) => void;
};
function EventCollapsible({
  event,
  effectiveTime,
  onSeek,
  onOpenUpload,
}: EventCollapsibleProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("views/events");
  const { data: config } = useSWR<FrigateConfig>("config");

  const { selectedObjectId, setSelectedObjectId } = useDetailStream();

  const formattedStart = config
    ? formatUnixTimestampToDateTime(event.start_time ?? 0, {
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

  const formattedEnd = config
    ? formatUnixTimestampToDateTime(event.end_time ?? 0, {
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

  // Clear selectedObjectId when effectiveTime has passed this event's end_time
  useEffect(() => {
    if (selectedObjectId === event.id && effectiveTime && event.end_time) {
      if (effectiveTime > event.end_time) {
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
    <Collapsible open={open} onOpenChange={(o) => setOpen(o)}>
      <div
        className={cn(
          "rounded-md bg-secondary p-2 outline outline-[3px] -outline-offset-[2.8px]",
          event.id == selectedObjectId
            ? "shadow-selected outline-selected"
            : "outline-transparent duration-500",
          event.id != selectedObjectId &&
            (effectiveTime ?? 0) >= (event.start_time ?? 0) &&
            (effectiveTime ?? 0) <= (event.end_time ?? event.start_time ?? 0) &&
            "bg-secondary-highlight/80 outline-[1px] -outline-offset-[0.8px] outline-primary/40",
        )}
      >
        <div className="flex w-full items-center justify-between">
          <div
            className="flex items-center gap-2 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(event.start_time ?? 0);
              if (event.id) setSelectedObjectId(event.id);
            }}
            role="button"
          >
            {getIconForLabel(
              event.label,
              "size-4 text-primary dark:text-white",
            )}
            <div className="flex items-end gap-2">
              <span>{getTranslatedLabel(event.label)}</span>
              <span className="text-xs text-secondary-foreground">
                {formattedStart ?? ""} - {formattedEnd ?? ""}
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-row justify-end">
            <EventMenu
              event={event}
              config={config}
              onOpenUpload={(e) => onOpenUpload?.(e)}
            />
          </div>

          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="rounded bg-muted px-2 py-1 text-xs"
                aria-label={t("activity.details")}
              >
                {open ? (
                  <LuChevronUp className="size-3" />
                ) : (
                  <LuChevronDown className="size-3" />
                )}
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="mt-2">
            <ObjectTimeline
              eventId={event.id}
              onSeek={(ts) => {
                onSeek(ts);
              }}
              effectiveTime={effectiveTime}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

type LifecycleItemProps = {
  event: ObjectLifecycleSequence;
  onSeek: (timestamp: number) => void;
  isActive?: boolean;
};

function LifecycleItem({ event, isActive }: LifecycleItemProps) {
  const { t } = useTranslation("views/events");
  const { data: config } = useSWR<FrigateConfig>("config");

  const formattedEventTimestamp = config
    ? formatUnixTimestampToDateTime(event.timestamp ?? 0, {
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

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-primary-variant",
        isActive ? "text-white" : "duration-500",
      )}
    >
      <div className="flex size-4 items-center justify-center">
        <LifecycleIcon lifecycleItem={event} className="size-3" />
      </div>
      <div className="flex w-full flex-row justify-between">
        <div>{getLifecycleItemDescription(event)}</div>
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
  onSeek: (ts: number) => void;
  effectiveTime?: number;
}) {
  const { data: timeline, isValidating } = useSWR<ObjectLifecycleSequence[]>([
    "timeline",
    {
      source_id: eventId,
    },
  ]);

  if ((!timeline || timeline.length === 0) && isValidating) {
    return <ActivityIndicator className="h-2 w-2" size={2} />;
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="py-2 text-sm text-muted-foreground">
        No timeline entries
      </div>
    );
  }

  return (
    <div className="mx-2 mt-4 space-y-2">
      {timeline.map((event, idx) => {
        const isActive =
          Math.abs((effectiveTime ?? 0) - (event.timestamp ?? 0)) <= 0.5;
        return (
          <div
            key={`${event.timestamp}-${event.source_id ?? idx}`}
            onClick={() => {
              onSeek(event.timestamp);
            }}
          >
            <LifecycleItem event={event} onSeek={onSeek} isActive={isActive} />
          </div>
        );
      })}
    </div>
  );
}
