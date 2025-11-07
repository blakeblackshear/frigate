import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Event } from "@/types/event";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { TrackingDetailsSequence } from "@/types/timeline";
import { FrigateConfig } from "@/types/frigateConfig";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { getIconForLabel } from "@/utils/iconUtil";
import { LuCircle, LuFolderX } from "react-icons/lu";
import { cn } from "@/lib/utils";
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
import { resolveZoneName } from "@/hooks/use-zone-friendly-name";
import { Badge } from "@/components/ui/badge";
import { HiDotsHorizontal } from "react-icons/hi";
import axios from "axios";
import { toast } from "sonner";
import { useDetailStream } from "@/context/detail-stream-context";
import { isDesktop, isIOS, isMobileOnly, isSafari } from "react-device-detect";
import { useApiHost } from "@/api";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import ObjectTrackOverlay from "../ObjectTrackOverlay";

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
  const apiHost = useApiHost();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [displaySource, _setDisplaySource] = useState<"video" | "image">(
    "video",
  );
  const { setSelectedObjectIds, annotationOffset } = useDetailStream();

  // manualOverride holds a record-stream timestamp explicitly chosen by the
  // user (eg, clicking a lifecycle row). When null we display `currentTime`.
  const [manualOverride, setManualOverride] = useState<number | null>(null);

  // event.start_time is detect time, convert to record, then subtract padding
  const [currentTime, setCurrentTime] = useState(
    (event.start_time ?? 0) + annotationOffset / 1000 - REVIEW_PADDING,
  );

  const { data: eventSequence } = useSWR<TrackingDetailsSequence[]>([
    "timeline",
    {
      source_id: event.id,
    },
  ]);

  const { data: config } = useSWR<FrigateConfig>("config");

  eventSequence?.map((event) => {
    event.data.zones_friendly_names = event.data?.zones?.map((zone) => {
      return resolveZoneName(config, zone);
    });
  });

  // Use manualOverride (set when seeking in image mode) if present so
  // lifecycle rows and overlays follow image-mode seeks. Otherwise fall
  // back to currentTime used for video mode.
  const effectiveTime = useMemo(() => {
    const displayedRecordTime = manualOverride ?? currentTime;
    return displayedRecordTime - annotationOffset / 1000;
  }, [manualOverride, currentTime, annotationOffset]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [_selectedZone, setSelectedZone] = useState("");
  const [_lifecycleZones, setLifecycleZones] = useState<string[]>([]);
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

  const handleLifecycleClick = useCallback(
    (item: TrackingDetailsSequence) => {
      if (!videoRef.current && !imgRef.current) return;

      // Convert lifecycle timestamp (detect stream) to record stream time
      const targetTimeRecord = item.timestamp + annotationOffset / 1000;

      if (displaySource === "image") {
        // For image mode: set a manual override timestamp and update
        // currentTime so overlays render correctly.
        setManualOverride(targetTimeRecord);
        setCurrentTime(targetTimeRecord);
        return;
      }

      // For video mode: convert to video-relative time and seek player
      const eventStartRecord =
        (event.start_time ?? 0) + annotationOffset / 1000;
      const videoStartTime = eventStartRecord - REVIEW_PADDING;
      const relativeTime = targetTimeRecord - videoStartTime;

      if (videoRef.current) {
        videoRef.current.currentTime = relativeTime;
      }
    },
    [event.start_time, annotationOffset, displaySource],
  );

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

  useEffect(() => {
    if (seekToTimestamp === null) return;

    if (displaySource === "image") {
      // For image mode, set the manual override so the snapshot updates to
      // the exact record timestamp.
      setManualOverride(seekToTimestamp);
      setSeekToTimestamp(null);
      return;
    }

    // seekToTimestamp is a record stream timestamp
    // event.start_time is detect stream time, convert to record
    // The video clip starts at (eventStartRecord - REVIEW_PADDING)
    if (!videoRef.current) return;
    const eventStartRecord = event.start_time + annotationOffset / 1000;
    const videoStartTime = eventStartRecord - REVIEW_PADDING;
    const relativeTime = seekToTimestamp - videoStartTime;
    if (relativeTime >= 0) {
      videoRef.current.currentTime = relativeTime;
    }
    setSeekToTimestamp(null);
  }, [
    seekToTimestamp,
    event.start_time,
    annotationOffset,
    apiHost,
    event.camera,
    displaySource,
  ]);

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
    // event.start_time and event.end_time are in DETECT stream time
    // Convert to record stream time, then create video clip with padding
    const eventStartRecord = event.start_time + annotationOffset / 1000;
    const eventEndRecord =
      (event.end_time ?? Date.now() / 1000) + annotationOffset / 1000;
    const startTime = eventStartRecord - REVIEW_PADDING;
    const endTime = eventEndRecord + REVIEW_PADDING;
    const playlist = `${baseUrl}vod/${event.camera}/start/${startTime}/end/${endTime}/index.m3u8`;

    return {
      playlist,
      startPosition: 0,
    };
  }, [event, annotationOffset]);

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
      // event.start_time is detect stream time, convert to record
      const eventStartRecord = event.start_time + annotationOffset / 1000;
      const videoStartTime = eventStartRecord - REVIEW_PADDING;
      const absoluteTime = time + videoStartTime;

      setCurrentTime(absoluteTime);
    },
    [event.start_time, annotationOffset],
  );

  const [src, setSrc] = useState(
    `${apiHost}api/${event.camera}/recordings/${currentTime + REVIEW_PADDING}/snapshot.jpg?height=500`,
  );
  const [hasError, setHasError] = useState(false);

  // Derive the record timestamp to display: manualOverride if present,
  // otherwise use currentTime.
  const displayedRecordTime = manualOverride ?? currentTime;

  useEffect(() => {
    if (displayedRecordTime) {
      const newSrc = `${apiHost}api/${event.camera}/recordings/${displayedRecordTime}/snapshot.jpg?height=500`;
      setSrc(newSrc);
    }
    setImgLoaded(false);
    setHasError(false);

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedRecordTime]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div
      className={cn(
        isDesktop
          ? "flex size-full justify-evenly gap-4 overflow-hidden"
          : "flex flex-col gap-2",
        !isDesktop && cameraAspect === "tall" && "size-full",
        className,
      )}
    >
      <span tabIndex={0} className="sr-only" />

      <div
        className={cn(
          "flex items-center justify-center",
          isDesktop && "overflow-hidden",
          cameraAspect === "tall" ? "max-h-[50dvh] lg:max-h-[70dvh]" : "w-full",
          cameraAspect === "tall" && isMobileOnly && "w-full",
          cameraAspect !== "tall" && isDesktop && "flex-[3]",
        )}
        style={{ aspectRatio: aspectRatio }}
        ref={containerRef}
      >
        <div
          className={cn(
            "relative",
            cameraAspect === "tall" ? "h-full" : "w-full",
          )}
        >
          {displaySource == "video" && (
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
          )}
          {displaySource == "image" && (
            <>
              <ImageLoadingIndicator
                className="absolute inset-0"
                imgLoaded={imgLoaded}
              />
              {hasError && (
                <div className="relative aspect-video">
                  <div className="flex flex-col items-center justify-center p-20 text-center">
                    <LuFolderX className="size-16" />
                    {t("objectLifecycle.noImageFound")}
                  </div>
                </div>
              )}
              <div
                className={cn("relative", imgLoaded ? "visible" : "invisible")}
              >
                <div className="absolute z-50 size-full">
                  <ObjectTrackOverlay
                    key={`overlay-${displayedRecordTime}`}
                    camera={event.camera}
                    showBoundingBoxes={true}
                    currentTime={displayedRecordTime}
                    videoWidth={imgRef?.current?.naturalWidth ?? 0}
                    videoHeight={imgRef?.current?.naturalHeight ?? 0}
                    className="absolute inset-0 z-10"
                    onSeekToTime={handleSeekToTime}
                  />
                </div>
                <img
                  key={event.id}
                  ref={imgRef}
                  className={cn(
                    "max-h-[50dvh] max-w-full select-none rounded-lg object-contain",
                  )}
                  loading={isSafari ? "eager" : "lazy"}
                  style={
                    isIOS
                      ? {
                          WebkitUserSelect: "none",
                          WebkitTouchCallout: "none",
                        }
                      : undefined
                  }
                  draggable={false}
                  src={src}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setHasError(true)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          isDesktop && "justify-between overflow-hidden md:basis-2/5",
        )}
      >
        {isDesktop && tabs && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex-1">{tabs}</div>
          </div>
        )}
        <div
          className={cn(
            isDesktop && "scrollbar-container h-full overflow-y-auto",
          )}
        >
          {config?.cameras[event.camera]?.onvif.autotracking
            .enabled_in_config && (
            <div className="mb-2 ml-3 text-sm text-danger">
              {t("trackingDetails.autoTrackingTips")}
            </div>
          )}

          <div className="mt-4">
            <div
              className={cn("rounded-md bg-background_alt px-0 py-3 md:px-2")}
            >
              <div className="flex w-full items-center justify-between">
                <div
                  className="flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    // event.start_time is detect time, convert to record
                    handleSeekToTime(
                      (event.start_time ?? 0) + annotationOffset / 1000,
                    );
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
                    <span className="md:text-md text-xs text-secondary-foreground">
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
                  <div className="-pb-2 relative mx-0">
                    <div className="absolute -top-2 bottom-8 left-6 z-0 w-0.5 -translate-x-1/2 bg-secondary-foreground" />
                    {isWithinEventRange && (
                      <div
                        className="absolute left-6 top-2 z-[5] max-h-[calc(100%-3rem)] w-0.5 -translate-x-1/2 bg-selected transition-all duration-300"
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
        "rounded-md p-2 pr-0 text-sm text-primary-variant",
        isActive && "bg-secondary-highlight font-semibold text-primary",
        !isActive && "duration-500",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative ml-2 flex size-4 items-center justify-center">
          <LuCircle
            className={cn(
              "relative z-10 size-2.5 fill-secondary-foreground stroke-none",
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
                          {item.data?.zones_friendly_names?.[zidx] ??
                            zone.replaceAll("_", " ")}
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
