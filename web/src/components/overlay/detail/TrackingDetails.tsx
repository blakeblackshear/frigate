import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResizeObserver } from "@/hooks/resize-observer";
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
import {
  ASPECT_PORTRAIT_LAYOUT,
  ASPECT_WIDE_LAYOUT,
  Recording,
} from "@/types/record";
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
import { useIsAdmin } from "@/hooks/use-is-admin";
import { VideoResolutionType } from "@/types/live";

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
  const [isVideoLoading, setIsVideoLoading] = useState(true);
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

  useEffect(() => {
    setIsVideoLoading(true);
  }, [event.id]);

  const { data: eventSequence } = useSWR<TrackingDetailsSequence[]>(
    ["timeline", { source_id: event.id }],
    null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    },
  );

  const { data: config } = useSWR<FrigateConfig>("config");

  // Fetch recording segments for the event's time range to handle motion-only gaps
  const eventStartRecord = useMemo(
    () => (event.start_time ?? 0) + annotationOffset / 1000,
    [event.start_time, annotationOffset],
  );
  const eventEndRecord = useMemo(
    () => (event.end_time ?? Date.now() / 1000) + annotationOffset / 1000,
    [event.end_time, annotationOffset],
  );

  const { data: recordings } = useSWR<Recording[]>(
    event.camera
      ? [
          `${event.camera}/recordings`,
          {
            after: eventStartRecord - REVIEW_PADDING,
            before: eventEndRecord + REVIEW_PADDING,
          },
        ]
      : null,
    null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    },
  );

  // Convert a timeline timestamp to actual video player time, accounting for
  // motion-only recording gaps. Uses the same algorithm as DynamicVideoController.
  const timestampToVideoTime = useCallback(
    (timestamp: number): number => {
      if (!recordings || recordings.length === 0) {
        // Fallback to simple calculation if no recordings data
        return timestamp - (eventStartRecord - REVIEW_PADDING);
      }

      const videoStartTime = eventStartRecord - REVIEW_PADDING;

      // If timestamp is before video start, return 0
      if (timestamp < videoStartTime) return 0;

      // Check if timestamp is before the first recording or after the last
      if (
        timestamp < recordings[0].start_time ||
        timestamp > recordings[recordings.length - 1].end_time
      ) {
        // No recording available at this timestamp
        return 0;
      }

      // Calculate the inpoint offset - the HLS video may start partway through the first segment
      let inpointOffset = 0;
      if (
        videoStartTime > recordings[0].start_time &&
        videoStartTime < recordings[0].end_time
      ) {
        inpointOffset = videoStartTime - recordings[0].start_time;
      }

      let seekSeconds = 0;
      for (const segment of recordings) {
        // Skip segments that end before our timestamp
        if (segment.end_time <= timestamp) {
          // Add this segment's duration, but subtract inpoint offset from first segment
          if (segment === recordings[0]) {
            seekSeconds += segment.duration - inpointOffset;
          } else {
            seekSeconds += segment.duration;
          }
        } else if (segment.start_time <= timestamp) {
          // The timestamp is within this segment
          if (segment === recordings[0]) {
            // For the first segment, account for the inpoint offset
            seekSeconds +=
              timestamp - Math.max(segment.start_time, videoStartTime);
          } else {
            seekSeconds += timestamp - segment.start_time;
          }
          break;
        }
      }

      return seekSeconds;
    },
    [recordings, eventStartRecord],
  );

  // Convert video player time back to timeline timestamp, accounting for
  // motion-only recording gaps. Reverse of timestampToVideoTime.
  const videoTimeToTimestamp = useCallback(
    (playerTime: number): number => {
      if (!recordings || recordings.length === 0) {
        // Fallback to simple calculation if no recordings data
        const videoStartTime = eventStartRecord - REVIEW_PADDING;
        return playerTime + videoStartTime;
      }

      const videoStartTime = eventStartRecord - REVIEW_PADDING;

      // Calculate the inpoint offset - the video may start partway through the first segment
      let inpointOffset = 0;
      if (
        videoStartTime > recordings[0].start_time &&
        videoStartTime < recordings[0].end_time
      ) {
        inpointOffset = videoStartTime - recordings[0].start_time;
      }

      let timestamp = 0;
      let totalTime = 0;

      for (const segment of recordings) {
        const segmentDuration =
          segment === recordings[0]
            ? segment.duration - inpointOffset
            : segment.duration;

        if (totalTime + segmentDuration > playerTime) {
          // The player time is within this segment
          if (segment === recordings[0]) {
            // For the first segment, add the inpoint offset
            timestamp =
              Math.max(segment.start_time, videoStartTime) +
              (playerTime - totalTime);
          } else {
            timestamp = segment.start_time + (playerTime - totalTime);
          }
          break;
        } else {
          totalTime += segmentDuration;
        }
      }

      return timestamp;
    },
    [recordings, eventStartRecord],
  );

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
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [_selectedZone, setSelectedZone] = useState("");
  const [_lifecycleZones, setLifecycleZones] = useState<string[]>([]);
  const [seekToTimestamp, setSeekToTimestamp] = useState<number | null>(null);
  const [lineBottomOffsetPx, setLineBottomOffsetPx] = useState<number>(32);
  const [lineTopOffsetPx, setLineTopOffsetPx] = useState<number>(8);
  const [blueLineHeightPx, setBlueLineHeightPx] = useState<number>(0);

  const [timelineSize] = useResizeObserver(timelineContainerRef);

  const [fullResolution, setFullResolution] = useState<VideoResolutionType>({
    width: 0,
    height: 0,
  });

  const aspectRatio = useMemo(() => {
    if (!config) {
      return 16 / 9;
    }

    if (fullResolution.width && fullResolution.height) {
      return fullResolution.width / fullResolution.height;
    }

    return (
      config.cameras[event.camera].detect.width /
      config.cameras[event.camera].detect.height
    );
  }, [config, event, fullResolution]);

  const label = event.sub_label
    ? event.sub_label
    : getTranslatedLabel(event.label, event.data.type);

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

      // For video mode: convert to video-relative time (accounting for motion-only gaps)
      const relativeTime = timestampToVideoTime(targetTimeRecord);

      if (videoRef.current) {
        videoRef.current.currentTime = relativeTime;
      }
    },
    [annotationOffset, displaySource, timestampToVideoTime],
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

  const formattedEnd =
    config && event.end_time != null
      ? formatUnixTimestampToDateTime(event.end_time, {
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
    // Convert to video position (accounting for motion-only recording gaps)
    if (!videoRef.current) return;
    const relativeTime = timestampToVideoTime(seekToTimestamp);
    if (relativeTime >= 0) {
      videoRef.current.currentTime = relativeTime;
    }
    setSeekToTimestamp(null);
  }, [seekToTimestamp, displaySource, timestampToVideoTime]);

  const isWithinEventRange = useMemo(() => {
    if (effectiveTime === undefined || event.start_time === undefined) {
      return false;
    }
    // If an event has not ended yet, fall back to last timestamp in eventSequence
    let eventEnd = event.end_time;
    if (eventEnd == null && eventSequence && eventSequence.length > 0) {
      const last = eventSequence[eventSequence.length - 1];
      if (last && last.timestamp !== undefined) {
        eventEnd = last.timestamp;
      }
    }

    if (eventEnd == null) {
      return false;
    }
    return effectiveTime >= event.start_time && effectiveTime <= eventEnd;
  }, [effectiveTime, event.start_time, event.end_time, eventSequence]);

  // Dynamically compute pixel offsets so the timeline line starts at the
  // first row midpoint and ends at the last row midpoint. For accuracy,
  // measure the center Y of each lifecycle row and interpolate the current
  // effective time into a pixel position; then set the blue line height
  // so it reaches the center dot at the same time the dot becomes active.
  useEffect(() => {
    if (!timelineContainerRef.current || !eventSequence) return;

    const containerRect = timelineContainerRef.current.getBoundingClientRect();
    const validRefs = rowRefs.current.filter((r) => r !== null);
    if (validRefs.length === 0) return;

    const centers = validRefs.map((n) => {
      const r = n.getBoundingClientRect();
      return r.top + r.height / 2 - containerRect.top;
    });

    const topOffset = Math.max(0, centers[0]);
    const bottomOffset = Math.max(
      0,
      containerRect.height - centers[centers.length - 1],
    );

    setLineTopOffsetPx(Math.round(topOffset));
    setLineBottomOffsetPx(Math.round(bottomOffset));

    const eff = effectiveTime ?? 0;
    const timestamps = eventSequence.map((s) => s.timestamp ?? 0);

    let pixelPos = centers[0];
    if (eff <= timestamps[0]) {
      pixelPos = centers[0];
    } else if (eff >= timestamps[timestamps.length - 1]) {
      pixelPos = centers[centers.length - 1];
    } else {
      for (let i = 0; i < timestamps.length - 1; i++) {
        const t1 = timestamps[i];
        const t2 = timestamps[i + 1];
        if (eff >= t1 && eff <= t2) {
          const ratio = t2 > t1 ? (eff - t1) / (t2 - t1) : 0;
          pixelPos = centers[i] + ratio * (centers[i + 1] - centers[i]);
          break;
        }
      }
    }

    const bluePx = Math.round(Math.max(0, pixelPos - topOffset));
    setBlueLineHeightPx(bluePx);
  }, [eventSequence, timelineSize.width, timelineSize.height, effectiveTime]);

  const videoSource = useMemo(() => {
    // event.start_time and event.end_time are in DETECT stream time
    // Convert to record stream time, then create video clip with padding
    const eventStartRecord = event.start_time + annotationOffset / 1000;
    const eventEndRecord =
      (event.end_time ?? Date.now() / 1000) + annotationOffset / 1000;
    const startTime = eventStartRecord - REVIEW_PADDING;
    const endTime = eventEndRecord + REVIEW_PADDING;
    const playlist = `${baseUrl}vod/clip/${event.camera}/start/${startTime}/end/${endTime}/index.m3u8`;

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
    } else if (aspectRatio < ASPECT_PORTRAIT_LAYOUT) {
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
      // Convert video player time back to timeline timestamp
      // accounting for motion-only recording gaps
      const absoluteTime = videoTimeToTimestamp(time);

      setCurrentTime(absoluteTime);
    },
    [videoTimeToTimestamp],
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

  const onUploadFrameToPlus = useCallback(() => {
    return axios.post(`/${event.camera}/plus/${currentTime}`);
  }, [event.camera, currentTime]);

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
          "flex items-start justify-center",
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
            <>
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
                onUploadFrame={onUploadFrameToPlus}
                onPlaying={() => setIsVideoLoading(false)}
                setFullResolution={setFullResolution}
                isDetailMode={true}
                camera={event.camera}
                currentTimeOverride={currentTime}
              />
              {isVideoLoading && (
                <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </>
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
          isDesktop && "justify-start overflow-hidden",
          aspectRatio > 1 && aspectRatio < ASPECT_PORTRAIT_LAYOUT
            ? "lg:basis-3/5"
            : "lg:basis-2/5",
        )}
      >
        {isDesktop && tabs && (
          <div className="mb-2 flex items-center justify-between">
            <div className="flex-1">{tabs}</div>
          </div>
        )}
        <div
          className={cn(
            isDesktop && "scrollbar-container max-h-[70vh] overflow-y-auto",
          )}
        >
          {config?.cameras[event.camera]?.onvif.autotracking
            .enabled_in_config && (
            <div className="mb-4 ml-3 text-sm text-danger">
              {t("trackingDetails.autoTrackingTips")}
            </div>
          )}

          <div className={cn("rounded-md bg-background_alt px-0 py-3 md:px-2")}>
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
                    event.data.type,
                    "size-4 text-white",
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="capitalize">{label}</span>
                  <div className="md:text-md flex items-center text-xs text-secondary-foreground">
                    {formattedStart ?? ""}
                    {event.end_time != null ? (
                      <> - {formattedEnd}</>
                    ) : (
                      <div className="inline-block">
                        <ActivityIndicator className="ml-3 size-4" />
                      </div>
                    )}
                  </div>
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
                <div className="-pb-2 relative mx-0" ref={timelineContainerRef}>
                  <div
                    className="absolute -top-2 left-6 z-0 w-0.5 -translate-x-1/2 bg-secondary-foreground"
                    style={{ bottom: lineBottomOffsetPx }}
                  />
                  {isWithinEventRange && (
                    <div
                      className="absolute left-6 z-[5] w-0.5 -translate-x-1/2 bg-selected transition-all duration-300"
                      style={{
                        top: `${lineTopOffsetPx}px`,
                        height: `${blueLineHeightPx}px`,
                      }}
                    />
                  )}
                  <div className="space-y-2">
                    {eventSequence.map((item, idx) => {
                      return (
                        <div
                          key={`${item.timestamp}-${item.source_id ?? ""}-${idx}`}
                          ref={(el) => {
                            rowRefs.current[idx] = el;
                          }}
                        >
                          <LifecycleIconRow
                            item={item}
                            event={event}
                            onClick={() => handleLifecycleClick(item)}
                            setSelectedZone={setSelectedZone}
                            getZoneColor={getZoneColor}
                            effectiveTime={effectiveTime}
                            isTimelineActive={isWithinEventRange}
                          />
                        </div>
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
  );
}

type LifecycleIconRowProps = {
  item: TrackingDetailsSequence;
  event: Event;
  onClick: () => void;
  setSelectedZone: (z: string) => void;
  getZoneColor: (zoneName: string) => number[] | undefined;
  effectiveTime?: number;
  isTimelineActive?: boolean;
};

function LifecycleIconRow({
  item,
  event,
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
  const isAdmin = useIsAdmin();

  const aspectRatio = useMemo(() => {
    if (!config) {
      return 16 / 9;
    }

    return (
      config.cameras[event.camera].detect.width /
      config.cameras[event.camera].detect.height
    );
  }, [config, event]);

  const isActive = useMemo(
    () => Math.abs((effectiveTime ?? 0) - (item.timestamp ?? 0)) <= 0.5,
    [effectiveTime, item.timestamp],
  );

  const formattedEventTimestamp = useMemo(
    () =>
      config
        ? formatUnixTimestampToDateTime(item.timestamp ?? 0, {
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
        : "",
    [config, item.timestamp, t],
  );

  const ratio = useMemo(
    () =>
      Array.isArray(item.data.box) && item.data.box.length >= 4
        ? (aspectRatio * (item.data.box[2] / item.data.box[3])).toFixed(2)
        : "N/A",
    [aspectRatio, item.data.box],
  );

  const areaPx = useMemo(
    () =>
      Array.isArray(item.data.box) && item.data.box.length >= 4
        ? Math.round(
            (config?.cameras[event.camera]?.detect?.width ?? 0) *
              (config?.cameras[event.camera]?.detect?.height ?? 0) *
              (item.data.box[2] * item.data.box[3]),
          )
        : undefined,
    [config, event.camera, item.data.box],
  );

  const attributeAreaPx = useMemo(
    () =>
      Array.isArray(item.data.attribute_box) &&
      item.data.attribute_box.length >= 4
        ? Math.round(
            (config?.cameras[event.camera]?.detect?.width ?? 0) *
              (config?.cameras[event.camera]?.detect?.height ?? 0) *
              (item.data.attribute_box[2] * item.data.attribute_box[3]),
          )
        : undefined,
    [config, event.camera, item.data.attribute_box],
  );

  const attributeAreaPct = useMemo(
    () =>
      Array.isArray(item.data.attribute_box) &&
      item.data.attribute_box.length >= 4
        ? (
            item.data.attribute_box[2] *
            item.data.attribute_box[3] *
            100
          ).toFixed(2)
        : undefined,
    [item.data.attribute_box],
  );

  const areaPct = useMemo(
    () =>
      Array.isArray(item.data.box) && item.data.box.length >= 4
        ? (item.data.box[2] * item.data.box[3] * 100).toFixed(2)
        : undefined,
    [item.data.box],
  );

  const score = useMemo(() => {
    if (item.data.score !== undefined) {
      return (item.data.score * 100).toFixed(0) + "%";
    }
    return "N/A";
  }, [item.data.score]);

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
            {/* Only show Score/Ratio/Area for object events, not for audio (heard) or manual API (external) events */}
            {item.class_type !== "heard" && item.class_type !== "external" && (
              <div className="my-2 ml-2 flex flex-col flex-wrap items-start gap-1.5 text-xs text-secondary-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="text-primary-variant">
                    {t("trackingDetails.lifecycleItemDesc.header.score")}
                  </span>
                  <span className="font-medium text-primary">{score}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-primary-variant">
                    {t("trackingDetails.lifecycleItemDesc.header.ratio")}
                  </span>
                  <span className="font-medium text-primary">{ratio}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-primary-variant">
                    {t("trackingDetails.lifecycleItemDesc.header.area")}{" "}
                    {attributeAreaPx !== undefined &&
                      attributeAreaPct !== undefined && (
                        <span className="text-primary-variant">
                          ({getTranslatedLabel(item.data.label)})
                        </span>
                      )}
                  </span>
                  {areaPx !== undefined && areaPct !== undefined ? (
                    <span className="font-medium text-primary">
                      {t("information.pixels", { ns: "common", area: areaPx })}{" "}
                      · {areaPct}%
                    </span>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
                {attributeAreaPx !== undefined &&
                  attributeAreaPct !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary-variant">
                        {t("trackingDetails.lifecycleItemDesc.header.area")} (
                        {getTranslatedLabel(item.data.attribute)})
                      </span>
                      <span className="font-medium text-primary">
                        {t("information.pixels", {
                          ns: "common",
                          area: attributeAreaPx,
                        })}{" "}
                        · {attributeAreaPct}%
                      </span>
                    </div>
                  )}
              </div>
            )}

            {item.data?.zones && item.data.zones.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
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
                      <span
                        className={cn(
                          item.data?.zones_friendly_names?.[zidx] === zone &&
                            "smart-capitalize",
                        )}
                      >
                        {item.data?.zones_friendly_names?.[zidx]}
                      </span>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="ml-3 flex-shrink-0 px-1 text-right text-xs text-primary-variant">
          <div className="flex flex-row items-center gap-3">
            <div className="whitespace-nowrap">{formattedEventTimestamp}</div>
            {isAdmin && config?.plus?.enabled && item.data.box && (
              <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger>
                  <div className="rounded p-1 pr-2" role="button">
                    <HiDotsHorizontal className="size-4 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent>
                    {isAdmin && config?.plus?.enabled && (
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
