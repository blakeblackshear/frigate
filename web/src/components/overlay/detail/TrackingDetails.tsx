import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Event } from "@/types/event";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import { TrackingDetailsSequence } from "@/types/timeline";
import Heading from "@/components/ui/heading";
import { FrigateConfig } from "@/types/frigateConfig";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { getIconForLabel } from "@/utils/iconUtil";
import { LuCircle, LuSettings } from "react-icons/lu";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnnotationSettingsPane } from "./AnnotationSettingsPane";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import HlsVideoPlayer from "@/components/player/HlsVideoPlayer";
import { baseUrl } from "@/api/baseUrl";
import { REVIEW_PADDING } from "@/types/review";
import { ASPECT_VERTICAL_LAYOUT, ASPECT_WIDE_LAYOUT } from "@/types/record";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { getLifecycleItemDescription } from "@/utils/lifecycleUtil";
import { useTranslation } from "react-i18next";
import { getTranslatedLabel } from "@/utils/i18n";
import { Badge } from "@/components/ui/badge";
import { HiDotsHorizontal } from "react-icons/hi";
import axios from "axios";
import { toast } from "sonner";
import { useDetailStream } from "@/context/detail-stream-context";
import { isDesktop } from "react-device-detect";

type TrackingDetailsProps = {
  className?: string;
  event: Event;
  fullscreen?: boolean;
  tabs?: React.ReactNode;
};

export function TrackingDetails({
  className,
  event,
  tabs,
}: TrackingDetailsProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { t } = useTranslation(["views/explore"]);
  const { setSelectedObjectIds, annotationOffset, setAnnotationOffset } =
    useDetailStream();
  const [currentTime, setCurrentTime] = useState(event.start_time ?? 0);

  const { data: eventSequence } = useSWR<TrackingDetailsSequence[]>([
    "timeline",
    {
      source_id: event.id,
    },
  ]);

  const { data: config } = useSWR<FrigateConfig>("config");

  // Calculate effective time (currentTime + annotation offset)
  const effectiveTime = useMemo(
    () => currentTime + annotationOffset / 1000,
    [currentTime, annotationOffset],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [_selectedZone, setSelectedZone] = useState("");
  const [_lifecycleZones, setLifecycleZones] = useState<string[]>([]);
  const [showControls, setShowControls] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [seekToTimestamp, setSeekToTimestamp] = useState<number | null>(null);

  const aspectRatio = useMemo(() => {
    if (!config) {
      return 16 / 9;
    }

    return (
      config.cameras[event.camera].detect.width /
      config.cameras[event.camera].detect.height
    );
  }, [config, event]);

  const label = event.sub_label
    ? event.sub_label
    : getTranslatedLabel(event.label);

  const getZoneColor = useCallback(
    (zoneName: string) => {
      const zoneColor =
        config?.cameras?.[event.camera]?.zones?.[zoneName]?.color;
      if (zoneColor) {
        const reversed = [...zoneColor].reverse();
        return reversed;
      }
    },
    [config, event],
  );

  // Set the selected object ID in the context so ObjectTrackOverlay can display it
  useEffect(() => {
    setSelectedObjectIds([event.id]);
  }, [event.id, setSelectedObjectIds]);

  const handleLifecycleClick = useCallback((item: TrackingDetailsSequence) => {
    const timestamp = item.timestamp ?? 0;
    setLifecycleZones(item.data.zones);
    setSelectedZone("");

    // Set the target timestamp to seek to
    setSeekToTimestamp(timestamp);
  }, []);

  const formattedStart = config
    ? formatUnixTimestampToDateTime(event.start_time ?? 0, {
        timezone: config.ui.timezone,
        date_format:
          config.ui.time_format == "24hour"
            ? t("time.formattedTimestamp.24hour", {
                ns: "common",
              })
            : t("time.formattedTimestamp.12hour", {
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
            ? t("time.formattedTimestamp.24hour", {
                ns: "common",
              })
            : t("time.formattedTimestamp.12hour", {
                ns: "common",
              }),
        time_style: "medium",
        date_style: "medium",
      })
    : "";

  useEffect(() => {
    if (!eventSequence || eventSequence.length === 0) return;
    setLifecycleZones(eventSequence[0]?.data.zones);
  }, [eventSequence]);

  // Handle seeking when seekToTimestamp is set
  useEffect(() => {
    if (seekToTimestamp === null || !videoRef.current) return;

    const relativeTime =
      seekToTimestamp -
      event.start_time +
      REVIEW_PADDING +
      annotationOffset / 1000;
    if (relativeTime >= 0) {
      videoRef.current.currentTime = relativeTime;
    }
    setSeekToTimestamp(null);
  }, [seekToTimestamp, event.start_time, annotationOffset]);

  // Check if current time is within the event's start/stop range
  const isWithinEventRange =
    effectiveTime !== undefined &&
    event.start_time !== undefined &&
    event.end_time !== undefined &&
    effectiveTime >= event.start_time &&
    effectiveTime <= event.end_time;

  // Calculate how far down the blue line should extend based on effectiveTime
  const calculateLineHeight = useCallback(() => {
    if (!eventSequence || eventSequence.length === 0 || !isWithinEventRange) {
      return 0;
    }

    const currentTime = effectiveTime ?? 0;

    // Find which events have been passed
    let lastPassedIndex = -1;
    for (let i = 0; i < eventSequence.length; i++) {
      if (currentTime >= (eventSequence[i].timestamp ?? 0)) {
        lastPassedIndex = i;
      } else {
        break;
      }
    }

    // No events passed yet
    if (lastPassedIndex < 0) return 0;

    // All events passed
    if (lastPassedIndex >= eventSequence.length - 1) return 100;

    // Calculate percentage based on item position, not time
    // Each item occupies an equal visual space regardless of time gaps
    const itemPercentage = 100 / (eventSequence.length - 1);

    // Find progress between current and next event for smooth transition
    const currentEvent = eventSequence[lastPassedIndex];
    const nextEvent = eventSequence[lastPassedIndex + 1];
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
  }, [eventSequence, effectiveTime, isWithinEventRange]);

  const blueLineHeight = calculateLineHeight();

  const videoSource = useMemo(() => {
    const startTime = event.start_time - REVIEW_PADDING;
    const endTime = (event.end_time ?? Date.now() / 1000) + REVIEW_PADDING;
    return {
      playlist: `${baseUrl}vod/${event.camera}/start/${startTime}/end/${endTime}/index.m3u8`,
      startPosition: 0,
    };
  }, [event]);

  // Determine camera aspect ratio category
  const cameraAspect = useMemo(() => {
    if (!aspectRatio) {
      return "normal";
    } else if (aspectRatio > ASPECT_WIDE_LAYOUT) {
      return "wide";
    } else if (aspectRatio < ASPECT_VERTICAL_LAYOUT) {
      return "tall";
    } else {
      return "normal";
    }
  }, [aspectRatio]);

  const handleSeekToTime = useCallback((timestamp: number, _play?: boolean) => {
    // Set the target timestamp to seek to
    setSeekToTimestamp(timestamp);
  }, []);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      const absoluteTime = time - REVIEW_PADDING + event.start_time;
      setCurrentTime(absoluteTime);
    },
    [event.start_time],
  );

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div
      className={cn(
        isDesktop
          ? "flex size-full gap-4 overflow-hidden"
          : "flex size-full flex-col gap-2",
        className,
      )}
    >
      <span tabIndex={0} className="sr-only" />

      <div
        className={cn(
          "relative flex items-center justify-center",
          cameraAspect === "wide"
            ? "w-full flex-1"
            : cameraAspect === "tall"
              ? "max-h-[50dvh] lg:max-h-[70dvh]"
              : isDesktop && "w-full flex-[3]",
        )}
        style={{ aspectRatio: aspectRatio }}
        ref={containerRef}
      >
        <HlsVideoPlayer
          videoRef={videoRef}
          containerRef={containerRef}
          visible={true}
          currentSource={videoSource}
          hotKeys={false}
          supportsFullscreen={false}
          fullscreen={false}
          frigateControls={true}
          onTimeUpdate={handleTimeUpdate}
          onSeekToTime={handleSeekToTime}
          isDetailMode={true}
          camera={event.camera}
          currentTimeOverride={currentTime}
        />
      </div>

      <div className={cn(isDesktop && "flex-[2] overflow-hidden")}>
        {isDesktop && tabs && <div className="mb-4">{tabs}</div>}
        <div
          className={cn(
            isDesktop && "scrollbar-container h-full overflow-y-auto",
          )}
        >
          <div className="mt-3 flex flex-row items-center justify-between">
            <Heading as="h4">{t("trackingDetails.title")}</Heading>

            <div className="flex flex-row gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showControls ? "select" : "default"}
                    className="size-7 p-1.5"
                    aria-label={t("trackingDetails.adjustAnnotationSettings")}
                  >
                    <LuSettings
                      className="size-5"
                      onClick={() => setShowControls(!showControls)}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>
                    {t("trackingDetails.adjustAnnotationSettings")}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </div>
          </div>
          <div className="flex flex-row items-center justify-between">
            <div className="mb-2 text-sm text-muted-foreground">
              {t("trackingDetails.scrollViewTips")}
            </div>
            <div className="min-w-20 text-right text-sm text-muted-foreground">
              {t("trackingDetails.count", {
                first: eventSequence?.length ?? 0,
                second: eventSequence?.length ?? 0,
              })}
            </div>
          </div>
          {config?.cameras[event.camera]?.onvif.autotracking
            .enabled_in_config && (
            <div className="-mt-2 mb-2 text-sm text-danger">
              {t("trackingDetails.autoTrackingTips")}
            </div>
          )}
          {showControls && (
            <AnnotationSettingsPane
              event={event}
              showZones={showZones}
              setShowZones={setShowZones}
              annotationOffset={annotationOffset}
              setAnnotationOffset={(value) => {
                if (typeof value === "function") {
                  const newValue = value(annotationOffset);
                  setAnnotationOffset(newValue);
                } else {
                  setAnnotationOffset(value);
                }
              }}
            />
          )}

          <div className="mt-4">
            <div
              className={cn(
                "rounded-md bg-secondary p-3 outline outline-[3px] -outline-offset-[2.8px] outline-transparent duration-500",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div
                  className="flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeekToTime(event.start_time ?? 0);
                  }}
                  role="button"
                >
                  <div
                    className={cn(
                      "relative ml-2 rounded-full bg-muted-foreground p-2",
                    )}
                  >
                    {getIconForLabel(
                      event.sub_label ? event.label + "-verified" : event.label,
                      "size-4 text-white",
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{label}</span>
                    <span className="text-secondary-foreground">
                      {formattedStart ?? ""} - {formattedEnd ?? ""}
                    </span>
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

              <div className="mt-2">
                {!eventSequence ? (
                  <ActivityIndicator className="size-2" size={2} />
                ) : eventSequence.length === 0 ? (
                  <div className="py-2 text-muted-foreground">
                    {t("detail.noObjectDetailData", { ns: "views/events" })}
                  </div>
                ) : (
                  <div className="-pb-2 relative mx-2">
                    <div className="absolute -top-2 bottom-8 left-4 z-0 w-0.5 -translate-x-1/2 bg-secondary-foreground" />
                    {isWithinEventRange && (
                      <div
                        className="absolute left-4 top-2 z-[5] max-h-[calc(100%-3rem)] w-0.5 -translate-x-1/2 bg-selected transition-all duration-300"
                        style={{ height: `${blueLineHeight}%` }}
                      />
                    )}
                    <div className="space-y-2">
                      {eventSequence.map((item, idx) => {
                        const isActive =
                          Math.abs(
                            (effectiveTime ?? 0) - (item.timestamp ?? 0),
                          ) <= 0.5;
                        const formattedEventTimestamp = config
                          ? formatUnixTimestampToDateTime(item.timestamp ?? 0, {
                              timezone: config.ui.timezone,
                              date_format:
                                config.ui.time_format == "24hour"
                                  ? t(
                                      "time.formattedTimestampHourMinuteSecond.24hour",
                                      { ns: "common" },
                                    )
                                  : t(
                                      "time.formattedTimestampHourMinuteSecond.12hour",
                                      { ns: "common" },
                                    ),
                              time_style: "medium",
                              date_style: "medium",
                            })
                          : "";

                        const ratio =
                          Array.isArray(item.data.box) &&
                          item.data.box.length >= 4
                            ? (
                                aspectRatio *
                                (item.data.box[2] / item.data.box[3])
                              ).toFixed(2)
                            : "N/A";
                        const areaPx =
                          Array.isArray(item.data.box) &&
                          item.data.box.length >= 4
                            ? Math.round(
                                (config.cameras[event.camera]?.detect?.width ??
                                  0) *
                                  (config.cameras[event.camera]?.detect
                                    ?.height ?? 0) *
                                  (item.data.box[2] * item.data.box[3]),
                              )
                            : undefined;
                        const areaPct =
                          Array.isArray(item.data.box) &&
                          item.data.box.length >= 4
                            ? (item.data.box[2] * item.data.box[3]).toFixed(4)
                            : undefined;

                        return (
                          <LifecycleIconRow
                            key={`${item.timestamp}-${item.source_id ?? ""}-${idx}`}
                            item={item}
                            isActive={isActive}
                            formattedEventTimestamp={formattedEventTimestamp}
                            ratio={ratio}
                            areaPx={areaPx}
                            areaPct={areaPct}
                            onClick={() => handleLifecycleClick(item)}
                            setSelectedZone={setSelectedZone}
                            getZoneColor={getZoneColor}
                            effectiveTime={effectiveTime}
                            isTimelineActive={isWithinEventRange}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type LifecycleIconRowProps = {
  item: TrackingDetailsSequence;
  isActive?: boolean;
  formattedEventTimestamp: string;
  ratio: string;
  areaPx?: number;
  areaPct?: string;
  onClick: () => void;
  setSelectedZone: (z: string) => void;
  getZoneColor: (zoneName: string) => number[] | undefined;
  effectiveTime?: number;
  isTimelineActive?: boolean;
};

function LifecycleIconRow({
  item,
  isActive,
  formattedEventTimestamp,
  ratio,
  areaPx,
  areaPct,
  onClick,
  setSelectedZone,
  getZoneColor,
  effectiveTime,
  isTimelineActive,
}: LifecycleIconRowProps) {
  const { t } = useTranslation(["views/explore", "components/player"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [isOpen, setIsOpen] = useState(false);

  const navigate = useNavigate();

  return (
    <div
      role="button"
      onClick={onClick}
      className={cn(
        "rounded-md p-2 text-sm text-primary-variant",
        isActive && "bg-secondary-highlight font-semibold text-primary",
        !isActive && "duration-500",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex size-4 items-center justify-center">
          <LuCircle
            className={cn(
              "relative z-10 ml-[1px] size-2.5 fill-secondary-foreground stroke-none",
              (isActive || (effectiveTime ?? 0) >= (item?.timestamp ?? 0)) &&
                isTimelineActive &&
                "fill-selected duration-300",
            )}
          />
        </div>

        <div className="ml-2 flex w-full min-w-0 flex-1">
          <div className="flex flex-col">
            <div className="text-md flex items-start break-words text-left">
              {getLifecycleItemDescription(item)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-secondary-foreground md:gap-5">
              <div className="flex items-center gap-1">
                <span className="text-primary-variant">
                  {t("trackingDetails.lifecycleItemDesc.header.ratio")}
                </span>
                <span className="font-medium text-primary">{ratio}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-primary-variant">
                  {t("trackingDetails.lifecycleItemDesc.header.area")}
                </span>
                {areaPx !== undefined && areaPct !== undefined ? (
                  <span className="font-medium text-primary">
                    {t("information.pixels", { ns: "common", area: areaPx })} ·{" "}
                    {areaPct}%
                  </span>
                ) : (
                  <span>N/A</span>
                )}
              </div>

              {item.data?.zones && item.data.zones.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {item.data.zones.map((zone, zidx) => {
                    const color = getZoneColor(zone)?.join(",") ?? "0,0,0";
                    return (
                      <Badge
                        key={`${zone}-${zidx}`}
                        variant="outline"
                        className="inline-flex cursor-pointer items-center gap-2"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedZone(zone);
                        }}
                        style={{
                          borderColor: `rgba(${color}, 0.6)`,
                          background: `rgba(${color}, 0.08)`,
                        }}
                      >
                        <span
                          className="size-1 rounded-full"
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            backgroundColor: `rgb(${color})`,
                          }}
                        />
                        <span className="smart-capitalize">
                          {zone.replaceAll("_", " ")}
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0 px-1 text-right text-xs text-primary-variant">
          <div className="flex flex-row items-center gap-3">
            <div className="whitespace-nowrap">{formattedEventTimestamp}</div>
            {(config?.plus?.enabled || item.data.box) && (
              <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger>
                  <div className="rounded p-1 pr-2" role="button">
                    <HiDotsHorizontal className="size-4 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent>
                    {config?.plus?.enabled && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={async () => {
                          const resp = await axios.post(
                            `/${item.camera}/plus/${item.timestamp}`,
                          );

                          if (resp && resp.status == 200) {
                            toast.success(
                              t("toast.success.submittedFrigatePlus", {
                                ns: "components/player",
                              }),
                              {
                                position: "top-center",
                              },
                            );
                          } else {
                            toast.success(
                              t("toast.error.submitFrigatePlusFailed", {
                                ns: "components/player",
                              }),
                              {
                                position: "top-center",
                              },
                            );
                          }
                        }}
                      >
                        {t("itemMenu.submitToPlus.label")}
                      </DropdownMenuItem>
                    )}
                    {item.data.box && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() => {
                          setIsOpen(false);
                          setTimeout(() => {
                            navigate(
                              `/settings?page=masksAndZones&camera=${item.camera}&object_mask=${item.data.box}`,
                            );
                          }, 0);
                        }}
                      >
                        {t("trackingDetails.createObjectMask")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
