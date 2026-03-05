import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import axios from "axios";
import { isDesktop, isMobile } from "react-device-detect";
import Logo from "@/components/Logo";
import { FrigateConfig } from "@/types/frigateConfig";
import { TimeRange } from "@/types/timeline";
import { RecordingsSummary } from "@/types/review";
import { ExportMode } from "@/types/filter";
import {
  MotionSearchRequest,
  MotionSearchStartResponse,
  MotionSearchStatusResponse,
  MotionSearchResult,
  MotionSearchMetrics,
} from "@/types/motionSearch";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

import DynamicVideoPlayer from "@/components/player/dynamic/DynamicVideoPlayer";
import { DynamicVideoController } from "@/components/player/dynamic/DynamicVideoController";
import { DetailStreamProvider } from "@/context/detail-stream-context";
import MotionReviewTimeline from "@/components/timeline/MotionReviewTimeline";
import CalendarFilterButton from "@/components/filter/CalendarFilterButton";
import ExportDialog from "@/components/overlay/ExportDialog";
import SaveExportOverlay from "@/components/overlay/SaveExportOverlay";
import ReviewActivityCalendar from "@/components/overlay/ReviewActivityCalendar";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { SelectSeparator } from "@/components/ui/select";

import { useResizeObserver } from "@/hooks/resize-observer";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useTimelineZoom } from "@/hooks/use-timeline-zoom";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { useCameraPreviews } from "@/hooks/use-camera-previews";
import { getChunkedTimeDay } from "@/utils/timelineUtil";

import { MotionData, ZoomLevel } from "@/types/review";
import {
  ASPECT_VERTICAL_LAYOUT,
  ASPECT_WIDE_LAYOUT,
  Recording,
  RecordingSegment,
} from "@/types/record";
import { VideoResolutionType } from "@/types/live";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import MotionSearchROICanvas from "./MotionSearchROICanvas";
import MotionSearchDialog from "./MotionSearchDialog";
import { IoMdArrowRoundBack } from "react-icons/io";
import { FaArrowDown, FaCalendarAlt, FaCog, FaFire } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { LuSearch } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";

type MotionSearchViewProps = {
  config: FrigateConfig;
  cameras: string[];
  selectedCamera: string | null;
  onCameraSelect: (camera: string) => void;
  cameraLocked?: boolean;
  selectedDay: Date | undefined;
  onDaySelect: (day: Date | undefined) => void;
  timeRange: TimeRange;
  timezone: string | undefined;
  onBack?: () => void;
};

const DEFAULT_EXPORT_WINDOW_SECONDS = 60;

export default function MotionSearchView({
  config,
  cameras,
  selectedCamera,
  onCameraSelect,
  cameraLocked = false,
  selectedDay,
  onDaySelect,
  timeRange,
  timezone,
  onBack,
}: MotionSearchViewProps) {
  const { t } = useTranslation([
    "views/motionSearch",
    "common",
    "views/recording",
  ]);
  const navigate = useNavigate();

  const resultTimestampFormat = useMemo(
    () =>
      config.ui?.time_format === "24hour"
        ? t("time.formattedTimestamp.24hour", { ns: "common" })
        : t("time.formattedTimestamp.12hour", { ns: "common" }),
    [config.ui?.time_format, t],
  );

  // Refs
  const contentRef = useRef<HTMLDivElement | null>(null);
  const mainLayoutRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const mainControllerRef = useRef<DynamicVideoController | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const jobCameraRef = useRef<string | null>(null);

  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(true);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [mobileSettingsMode, setMobileSettingsMode] = useState<
    "actions" | "calendar"
  >("actions");

  // Recordings summary for calendar – defer until dialog is closed
  // so the preview image in the dialog loads without competing requests
  const { data: recordingsSummary } = useSWR<RecordingsSummary>(
    selectedCamera && !isSearchDialogOpen
      ? [
          "recordings/summary",
          {
            timezone: timezone,
            cameras: selectedCamera,
          },
        ]
      : null,
  );

  // Camera previews – defer until dialog is closed
  const allPreviews = useCameraPreviews(
    isSearchDialogOpen ? { after: 0, before: 0 } : timeRange,
    {
      camera: selectedCamera ?? undefined,
    },
  );

  // ROI state
  const [polygonPoints, setPolygonPoints] = useState<number[][]>([]);
  const [isDrawingROI, setIsDrawingROI] = useState(true);

  // Search settings
  const [parallelMode, setParallelMode] = useState(false);
  const [threshold, setThreshold] = useState(30);
  const [minArea, setMinArea] = useState(20);
  const [frameSkip, setFrameSkip] = useState(10);
  const [maxResults, setMaxResults] = useState(25);

  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobCamera, setJobCamera] = useState<string | null>(null);

  // Job polling with SWR
  const { data: jobStatus } = useSWR<MotionSearchStatusResponse>(
    jobId && jobCamera ? [`${jobCamera}/search/motion/${jobId}`] : null,
    { refreshInterval: 1000 },
  );

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MotionSearchResult[]>([]);
  const [showSegmentHeatmap, setShowSegmentHeatmap] = useState(false);
  const [searchMetrics, setSearchMetrics] =
    useState<MotionSearchMetrics | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchRange, setSearchRange] = useState<TimeRange | undefined>(
    undefined,
  );
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);

  // Export state
  const [exportMode, setExportMode] = useState<ExportMode>("none");
  const [exportRange, setExportRange] = useState<TimeRange>();
  const [showExportPreview, setShowExportPreview] = useState(false);

  // Timeline state
  const initialStartTime = timeRange.before - 60;
  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(initialStartTime);
  const [playerTime, setPlayerTime] = useState<number>(initialStartTime);
  const [playbackStart, setPlaybackStart] = useState(initialStartTime);

  const chunkedTimeRange = useMemo(
    () => getChunkedTimeDay(timeRange),
    [timeRange],
  );

  const [selectedRangeIdx, setSelectedRangeIdx] = useState(() => {
    const ranges = getChunkedTimeDay(timeRange);
    const index = ranges.findIndex(
      (chunk) =>
        chunk.after <= initialStartTime && chunk.before >= initialStartTime,
    );
    return index === -1 ? ranges.length - 1 : index;
  });

  const currentTimeRange = useMemo<TimeRange>(
    () =>
      chunkedTimeRange[selectedRangeIdx] ??
      chunkedTimeRange[chunkedTimeRange.length - 1],
    [selectedRangeIdx, chunkedTimeRange],
  );

  const clampExportTime = useCallback(
    (value: number) =>
      Math.min(timeRange.before, Math.max(timeRange.after, value)),
    [timeRange.after, timeRange.before],
  );

  const buildDefaultExportRange = useCallback(
    (anchorTime: number): TimeRange => {
      const halfWindow = DEFAULT_EXPORT_WINDOW_SECONDS / 2;
      let after = clampExportTime(anchorTime - halfWindow);
      let before = clampExportTime(anchorTime + halfWindow);

      if (before <= after) {
        before = clampExportTime(timeRange.before);
        after = clampExportTime(before - DEFAULT_EXPORT_WINDOW_SECONDS);
      }

      return { after, before };
    },
    [clampExportTime, timeRange.before],
  );

  const setExportStartTime = useCallback<
    React.Dispatch<React.SetStateAction<number>>
  >(
    (value) => {
      setExportRange((prev) => {
        const resolvedValue =
          typeof value === "function"
            ? value(prev?.after ?? currentTime)
            : value;
        const after = clampExportTime(resolvedValue);
        const before = Math.max(
          after,
          clampExportTime(
            prev?.before ?? after + DEFAULT_EXPORT_WINDOW_SECONDS,
          ),
        );
        return { after, before };
      });
    },
    [clampExportTime, currentTime],
  );

  const setExportEndTime = useCallback<
    React.Dispatch<React.SetStateAction<number>>
  >(
    (value) => {
      setExportRange((prev) => {
        const resolvedValue =
          typeof value === "function"
            ? value(prev?.before ?? currentTime)
            : value;
        const before = clampExportTime(resolvedValue);
        const after = Math.min(
          before,
          clampExportTime(
            prev?.after ?? before - DEFAULT_EXPORT_WINDOW_SECONDS,
          ),
        );
        return { after, before };
      });
    },
    [clampExportTime, currentTime],
  );

  useEffect(() => {
    if (exportMode !== "timeline" || exportRange) {
      return;
    }

    setExportRange(buildDefaultExportRange(currentTime));
  }, [exportMode, exportRange, buildDefaultExportRange, currentTime]);

  const handleExportPreview = useCallback(() => {
    if (!exportRange) {
      toast.error(
        t("export.toast.error.noVaildTimeSelected", {
          ns: "components/dialog",
        }),
        {
          position: "top-center",
        },
      );
      return;
    }

    setShowExportPreview(true);
  }, [exportRange, setShowExportPreview, t]);

  const handleExportCancel = useCallback(() => {
    setShowExportPreview(false);
    setExportRange(undefined);
    setExportMode("none");
  }, [setExportMode, setExportRange, setShowExportPreview]);

  const setExportRangeWithPause = useCallback(
    (range: TimeRange | undefined) => {
      setExportRange(range);

      if (range != undefined) {
        mainControllerRef.current?.pause();
      }
    },
    [setExportRange],
  );

  const openMobileExport = useCallback(() => {
    const now = new Date(timeRange.before * 1000);
    now.setHours(now.getHours() - 1);

    setExportRangeWithPause({
      before: timeRange.before,
      after: now.getTime() / 1000,
    });
    setExportMode("select");
    setIsMobileSettingsOpen(false);
    setMobileSettingsMode("actions");
  }, [setExportRangeWithPause, timeRange.before]);

  const handleExportSave = useCallback(() => {
    if (!exportRange || !selectedCamera) {
      toast.error(
        t("export.toast.error.noVaildTimeSelected", {
          ns: "components/dialog",
        }),
        {
          position: "top-center",
        },
      );
      return;
    }

    if (exportRange.before < exportRange.after) {
      toast.error(
        t("export.toast.error.endTimeMustAfterStartTime", {
          ns: "components/dialog",
        }),
        { position: "top-center" },
      );
      return;
    }

    axios
      .post(
        `export/${selectedCamera}/start/${Math.round(exportRange.after)}/end/${Math.round(exportRange.before)}`,
        {
          playback: "realtime",
        },
      )
      .then((response) => {
        if (response.status == 200) {
          toast.success(
            t("export.toast.success", { ns: "components/dialog" }),
            {
              position: "top-center",
              action: (
                <a href="/export" target="_blank" rel="noopener noreferrer">
                  <Button>
                    {t("export.toast.view", { ns: "components/dialog" })}
                  </Button>
                </a>
              ),
            },
          );
          setShowExportPreview(false);
          setExportRange(undefined);
          setExportMode("none");
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("export.toast.error.failed", {
            ns: "components/dialog",
            error: errorMessage,
          }),
          { position: "top-center" },
        );
      });
  }, [
    exportRange,
    selectedCamera,
    setExportMode,
    setExportRange,
    setShowExportPreview,
    t,
  ]);

  useEffect(() => {
    if (!searchRange) {
      setSearchRange(timeRange);
    }
  }, [searchRange, timeRange]);

  // Video player state
  const [fullResolution, setFullResolution] = useState<VideoResolutionType>({
    width: 0,
    height: 0,
  });

  // Fullscreen
  const { fullscreen, toggleFullscreen, supportsFullScreen } =
    useFullscreen(mainLayoutRef);

  // Timeline zoom settings
  const [zoomSettings, setZoomSettings] = useState({
    segmentDuration: 30,
    timestampSpread: 15,
  });

  const possibleZoomLevels: ZoomLevel[] = useMemo(
    () => [
      { segmentDuration: 30, timestampSpread: 15 },
      { segmentDuration: 15, timestampSpread: 5 },
      { segmentDuration: 5, timestampSpread: 1 },
    ],
    [],
  );

  const handleZoomChange = useCallback(
    (newZoomLevel: number) => {
      setZoomSettings(possibleZoomLevels[newZoomLevel]);
    },
    [possibleZoomLevels],
  );

  const currentZoomLevel = useMemo(
    () =>
      possibleZoomLevels.findIndex(
        (level) => level.segmentDuration === zoomSettings.segmentDuration,
      ),
    [possibleZoomLevels, zoomSettings.segmentDuration],
  );

  const { isZooming, zoomDirection } = useTimelineZoom({
    zoomSettings,
    zoomLevels: possibleZoomLevels,
    onZoomChange: handleZoomChange,
    timelineRef: timelineRef,
    timelineDuration: timeRange.after - timeRange.before,
  });

  // Motion data for timeline
  const { alignStartDateToTimeline, alignEndDateToTimeline } = useTimelineUtils(
    { segmentDuration: zoomSettings.segmentDuration },
  );

  const alignedAfter = alignStartDateToTimeline(timeRange.after);
  const alignedBefore = alignEndDateToTimeline(timeRange.before);

  const { data: motionData, isLoading: isMotionLoading } = useSWR<MotionData[]>(
    selectedCamera && !isSearchDialogOpen
      ? [
          "review/activity/motion",
          {
            before: alignedBefore,
            after: alignedAfter,
            scale: Math.round(zoomSettings.segmentDuration / 2),
            cameras: selectedCamera,
          },
        ]
      : null,
  );

  const { data: noRecordings } = useSWR<RecordingSegment[]>(
    selectedCamera && !isSearchDialogOpen
      ? [
          "recordings/unavailable",
          {
            before: alignedBefore,
            after: alignedAfter,
            scale: Math.round(zoomSettings.segmentDuration),
            cameras: selectedCamera,
          },
        ]
      : null,
  );

  const recordingParams = useMemo(
    () => ({
      before: currentTimeRange.before,
      after: currentTimeRange.after,
    }),
    [currentTimeRange],
  );

  const { data: playbackRecordings } = useSWR<Recording[]>(
    selectedCamera && !isSearchDialogOpen
      ? [`${selectedCamera}/recordings`, recordingParams]
      : null,
    { revalidateOnFocus: false },
  );

  const activeSegmentHeatmap = useMemo(() => {
    if (!showSegmentHeatmap || !playbackRecordings?.length) {
      return null;
    }

    const activeSegment = playbackRecordings.find(
      (recording) =>
        recording.start_time <= currentTime &&
        recording.end_time >= currentTime,
    );

    return activeSegment?.motion_heatmap ?? null;
  }, [currentTime, playbackRecordings, showSegmentHeatmap]);

  // Camera aspect ratio
  const getCameraAspect = useCallback(
    (cam: string) => {
      if (!config) return undefined;
      if (
        cam === selectedCamera &&
        fullResolution.width &&
        fullResolution.height
      ) {
        return fullResolution.width / fullResolution.height;
      }
      const camera = config.cameras[cam];
      if (!camera) return undefined;
      return camera.detect.width / camera.detect.height;
    },
    [config, fullResolution, selectedCamera],
  );

  const mainCameraAspect = useMemo(() => {
    if (!selectedCamera) return "normal";
    const aspectRatio = getCameraAspect(selectedCamera);
    if (!aspectRatio) return "normal";
    if (aspectRatio > ASPECT_WIDE_LAYOUT) return "wide";
    if (aspectRatio < ASPECT_VERTICAL_LAYOUT) return "tall";
    return "normal";
  }, [getCameraAspect, selectedCamera]);

  const grow = useMemo(() => {
    if (mainCameraAspect === "wide") return "w-full aspect-wide";
    if (mainCameraAspect === "tall") {
      return isDesktop
        ? "size-full aspect-tall flex flex-col justify-center"
        : "size-full";
    }
    return "w-full aspect-video";
  }, [mainCameraAspect]);

  // Container resize observer
  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(mainLayoutRef);

  const useHeightBased = useMemo(() => {
    if (!containerWidth || !containerHeight || !selectedCamera) return false;
    const cameraAspectRatio = getCameraAspect(selectedCamera);
    if (!cameraAspectRatio) return false;
    const availableAspectRatio = containerWidth / containerHeight;
    return availableAspectRatio >= cameraAspectRatio;
  }, [containerWidth, containerHeight, getCameraAspect, selectedCamera]);

  const onClipEnded = useCallback(() => {
    if (!mainControllerRef.current) {
      return;
    }

    if (selectedRangeIdx < chunkedTimeRange.length - 1) {
      setSelectedRangeIdx(selectedRangeIdx + 1);
    }
  }, [selectedRangeIdx, chunkedTimeRange]);

  const updateSelectedSegment = useCallback(
    (nextTime: number, updateStartTime: boolean) => {
      const index = chunkedTimeRange.findIndex(
        (segment) => segment.after <= nextTime && segment.before >= nextTime,
      );

      if (index != -1) {
        if (updateStartTime) {
          setPlaybackStart(nextTime);
        }

        setSelectedRangeIdx(index);
      }
    },
    [chunkedTimeRange],
  );

  // Handle scrubbing
  useEffect(() => {
    if (scrubbing || exportRange) {
      if (
        currentTime > currentTimeRange.before + 60 ||
        currentTime < currentTimeRange.after - 60
      ) {
        updateSelectedSegment(currentTime, false);
        return;
      }

      mainControllerRef.current?.scrubToTimestamp(currentTime);
    }
    // we only want to seek when current time updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentTime,
    scrubbing,
    timeRange,
    currentTimeRange,
    updateSelectedSegment,
  ]);

  useEffect(() => {
    if (pendingSeekTime != null) {
      return;
    }

    const nextTime = timeRange.before - 60;
    const index = chunkedTimeRange.findIndex(
      (segment) => segment.after <= nextTime && segment.before >= nextTime,
    );

    setCurrentTime(nextTime);
    setPlayerTime(nextTime);
    setPlaybackStart(nextTime);
    setSelectedRangeIdx(index === -1 ? chunkedTimeRange.length - 1 : index);
    mainControllerRef.current?.seekToTimestamp(nextTime, true);
  }, [pendingSeekTime, timeRange, chunkedTimeRange]);

  useEffect(() => {
    if (!scrubbing) {
      if (Math.abs(currentTime - playerTime) > 10) {
        if (
          currentTimeRange.after <= currentTime &&
          currentTimeRange.before >= currentTime
        ) {
          mainControllerRef.current?.seekToTimestamp(currentTime, true);
        } else {
          updateSelectedSegment(currentTime, true);
        }
      } else if (playerTime != currentTime) {
        mainControllerRef.current?.play();
      }
    }
    // we only want to seek when current time doesn't match the player update time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, scrubbing, playerTime]);

  // Manually seek to timestamp
  const manuallySetCurrentTime = useCallback(
    (time: number, play: boolean = false) => {
      if (!currentTimeRange) {
        return;
      }

      setCurrentTime(time);

      if (currentTimeRange.after <= time && currentTimeRange.before >= time) {
        mainControllerRef.current?.seekToTimestamp(time, play);
      } else {
        updateSelectedSegment(time, true);
      }
    },
    [currentTimeRange, updateSelectedSegment],
  );

  const canStartSearch = Boolean(
    selectedCamera &&
      searchRange &&
      searchRange.before >= searchRange.after &&
      polygonPoints.length >= 3 &&
      !isDrawingROI,
  );

  const cancelMotionSearchJob = useCallback(
    async (jobIdToCancel: string | null, cameraToCancel: string | null) => {
      if (!jobIdToCancel || !cameraToCancel) {
        return;
      }

      try {
        await axios.post(
          `${cameraToCancel}/search/motion/${jobIdToCancel}/cancel`,
        );
      } catch {
        // Best effort cancellation.
      }
    },
    [],
  );

  const cancelMotionSearchJobViaBeacon = useCallback(
    (jobIdToCancel: string | null, cameraToCancel: string | null) => {
      if (!jobIdToCancel || !cameraToCancel) {
        return;
      }

      const url = `${window.location.origin}/api/${cameraToCancel}/search/motion/${jobIdToCancel}/cancel`;

      const xhr = new XMLHttpRequest();
      try {
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("X-CSRF-TOKEN", "1");
        xhr.setRequestHeader("X-CACHE-BYPASS", "1");
        xhr.withCredentials = true;
        xhr.send("{}");
      } catch {
        // Best effort cancellation during unload.
      }
    },
    [],
  );

  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  useEffect(() => {
    jobCameraRef.current = jobCamera;
  }, [jobCamera]);

  useEffect(() => {
    return () => {
      cancelMotionSearchJobViaBeacon(jobIdRef.current, jobCameraRef.current);
      void cancelMotionSearchJob(jobIdRef.current, jobCameraRef.current);
    };
  }, [cancelMotionSearchJob, cancelMotionSearchJobViaBeacon]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cancelMotionSearchJobViaBeacon(jobIdRef.current, jobCameraRef.current);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [cancelMotionSearchJobViaBeacon]);

  const handleNewSearch = useCallback(() => {
    if (jobId && jobCamera) {
      void cancelMotionSearchJob(jobId, jobCamera);
      if (isSearching) {
        toast.message(t("searchCancelled"));
      }
    }
    setSearchResults([]);
    setSearchMetrics(null);
    setIsSearching(false);
    setJobId(null);
    setJobCamera(null);
    setHasSearched(false);
    setPendingSeekTime(null);
    setSearchRange(timeRange);
    setIsSearchDialogOpen(true);
  }, [cancelMotionSearchJob, isSearching, jobCamera, jobId, t, timeRange]);

  // Perform motion search
  const performSearch = useCallback(async () => {
    if (!selectedCamera) {
      toast.error(t("errors.noCamera"));
      return;
    }

    if (polygonPoints.length < 3) {
      toast.error(t("errors.polygonTooSmall"));
      return;
    }

    if (!searchRange) {
      toast.error(t("errors.noTimeRange"));
      return;
    }

    if (searchRange.before < searchRange.after) {
      toast.error(t("errors.invalidTimeRange"));
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setHasSearched(true);

    try {
      const request: MotionSearchRequest = {
        start_time: searchRange.after,
        end_time: searchRange.before,
        polygon_points: polygonPoints,
        parallel: parallelMode,
        threshold,
        min_area: minArea,
        frame_skip: frameSkip,
        max_results: maxResults,
      };

      const response = await axios.post<MotionSearchStartResponse>(
        `${selectedCamera}/search/motion`,
        request,
      );

      if (response.data.success) {
        setJobId(response.data.job_id);
        setJobCamera(selectedCamera);
        setIsSearchDialogOpen(false);
        toast.success(t("searchStarted"));
      } else {
        toast.error(
          t("errors.searchFailed", { message: response.data.message }),
        );
        setIsSearching(false);
      }
    } catch (error) {
      let errorMessage = t("errors.unknown");

      if (axios.isAxiosError<{ message?: string; detail?: string }>(error)) {
        const responseData = error.response?.data as
          | {
              message?: unknown;
              detail?: unknown;
              error?: unknown;
              errors?: unknown;
            }
          | string
          | undefined;

        if (typeof responseData === "string") {
          errorMessage = responseData;
        } else if (responseData) {
          const apiMessage =
            responseData.message ??
            responseData.detail ??
            responseData.error ??
            responseData.errors;

          if (Array.isArray(apiMessage)) {
            errorMessage = apiMessage.join(", ");
          } else if (typeof apiMessage === "string") {
            errorMessage = apiMessage;
          } else if (apiMessage) {
            errorMessage = JSON.stringify(apiMessage);
          } else {
            errorMessage = error.message || errorMessage;
          }
        } else {
          errorMessage = error.message || errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(t("errors.searchFailed", { message: errorMessage }));
      setIsSearching(false);
    }
  }, [
    selectedCamera,
    polygonPoints,
    searchRange,
    parallelMode,
    threshold,
    minArea,
    frameSkip,
    maxResults,
    t,
  ]);

  // Monitor job status and update UI when complete
  useEffect(() => {
    if (!jobStatus) {
      return;
    }

    if (jobStatus.status === "success") {
      setSearchResults(jobStatus.results ?? []);
      setSearchMetrics(jobStatus.metrics ?? null);
      setIsSearching(false);
      setJobId(null);
      setJobCamera(null);
      toast.success(
        t("changesFound", { count: jobStatus.results?.length ?? 0 }),
      );
    } else if (
      jobStatus.status === "queued" ||
      jobStatus.status === "running"
    ) {
      setSearchMetrics(jobStatus.metrics ?? null);
      // Stream partial results as they arrive
      if (jobStatus.results && jobStatus.results.length > 0) {
        setSearchResults(jobStatus.results);
      }
    } else if (jobStatus.status === "failed") {
      setIsSearching(false);
      setJobId(null);
      setJobCamera(null);
      toast.error(
        t("errors.searchFailed", {
          message: jobStatus.error_message || jobStatus.message,
        }),
      );
    } else if (jobStatus.status === "cancelled") {
      setIsSearching(false);
      setJobId(null);
      setJobCamera(null);
      toast.message(t("searchCancelled"));
    }
  }, [jobStatus, t]);

  // Handle result click
  const handleResultClick = useCallback(
    (result: MotionSearchResult) => {
      if (
        result.timestamp < timeRange.after ||
        result.timestamp > timeRange.before
      ) {
        setPendingSeekTime(result.timestamp);
        onDaySelect(new Date(result.timestamp * 1000));
        return;
      }

      manuallySetCurrentTime(result.timestamp, true);
    },
    [manuallySetCurrentTime, onDaySelect, timeRange],
  );

  useEffect(() => {
    if (pendingSeekTime == null) {
      return;
    }

    if (
      pendingSeekTime >= timeRange.after &&
      pendingSeekTime <= timeRange.before
    ) {
      manuallySetCurrentTime(pendingSeekTime, true);
      setPendingSeekTime(null);
    }
  }, [pendingSeekTime, timeRange, manuallySetCurrentTime]);

  if (!selectedCamera) {
    return (
      <div className="flex size-full items-center justify-center">
        <p className="text-muted-foreground">{t("selectCamera")}</p>
      </div>
    );
  }

  const timelinePanel = (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[30px] w-full bg-gradient-to-b from-secondary to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[30px] w-full bg-gradient-to-t from-secondary to-transparent" />

      <SaveExportOverlay
        className="pointer-events-none absolute inset-x-0 top-0 z-30"
        show={exportMode === "timeline" && Boolean(exportRange)}
        onPreview={handleExportPreview}
        onSave={handleExportSave}
        onCancel={handleExportCancel}
      />

      {!isMotionLoading ? (
        <MotionReviewTimeline
          timelineRef={timelineRef}
          segmentDuration={zoomSettings.segmentDuration}
          timestampSpread={zoomSettings.timestampSpread}
          timelineStart={timeRange.before}
          timelineEnd={timeRange.after}
          showHandlebar={true}
          handlebarTime={currentTime}
          setHandlebarTime={setCurrentTime}
          events={[]}
          motion_events={motionData ?? []}
          noRecordingRanges={noRecordings ?? []}
          contentRef={contentRef}
          onHandlebarDraggingChange={(dragging) => setScrubbing(dragging)}
          showExportHandles={exportMode === "timeline" && Boolean(exportRange)}
          exportStartTime={exportRange?.after}
          exportEndTime={exportRange?.before}
          setExportStartTime={setExportStartTime}
          setExportEndTime={setExportEndTime}
          isZooming={isZooming}
          zoomDirection={zoomDirection}
          onZoomChange={handleZoomChange}
          possibleZoomLevels={possibleZoomLevels}
          currentZoomLevel={currentZoomLevel}
        />
      ) : (
        <Skeleton className="size-full" />
      )}
    </>
  );

  const progressMetrics = jobStatus?.metrics ?? searchMetrics;
  const progressValue =
    progressMetrics && progressMetrics.segments_scanned > 0
      ? Math.min(
          100,
          (progressMetrics.segments_processed /
            progressMetrics.segments_scanned) *
            100,
        )
      : 0;

  const resultsPanel = (
    <>
      <div className="p-2">
        <h3 className="font-medium">{t("results")}</h3>
      </div>

      <ScrollArea className="flex-1">
        {isSearching && (
          <div className="flex flex-col gap-2 border-b p-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 text-wrap">
                <ActivityIndicator className="mr-2 size-4" />
                <div>{t("searching")}</div>
              </div>
              <Button
                variant="destructive"
                className="text-white"
                size="sm"
                onClick={() => {
                  void cancelMotionSearchJob(jobId, jobCamera);
                  setIsSearching(false);
                  setJobId(null);
                  setJobCamera(null);
                  toast.success(t("searchCancelled"));
                }}
              >
                {t("cancelSearch")}
              </Button>
            </div>
            <Progress className="h-1" value={progressValue} />
          </div>
        )}
        {searchMetrics && searchResults.length > 0 && (
          <div className="mx-2 rounded-lg border bg-secondary p-2">
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>{t("metrics.segmentsScanned")}</span>
                <span className="text-primary-variant">
                  {searchMetrics.segments_scanned}
                </span>
              </div>
              {searchMetrics.segments_processed > 0 && (
                <div className="flex justify-between font-medium">
                  <span>{t("metrics.segmentsProcessed")}</span>
                  <span className="text-primary-variant">
                    {searchMetrics.segments_processed}
                  </span>
                </div>
              )}
              {searchMetrics.metadata_inactive_segments > 0 && (
                <div className="flex justify-between">
                  <span>{t("metrics.segmentsSkippedInactive")}</span>
                  <span className="text-primary-variant">
                    {searchMetrics.metadata_inactive_segments}
                  </span>
                </div>
              )}
              {searchMetrics.heatmap_roi_skip_segments > 0 && (
                <div className="flex justify-between">
                  <span>{t("metrics.segmentsSkippedHeatmap")}</span>
                  <span className="text-primary-variant">
                    {searchMetrics.heatmap_roi_skip_segments}
                  </span>
                </div>
              )}
              {searchMetrics.fallback_full_range_segments > 0 && (
                <div className="flex justify-between">
                  <span>{t("metrics.fallbackFullRange")}</span>
                  <span className="text-primary-variant">
                    {searchMetrics.fallback_full_range_segments}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t("metrics.framesDecoded")}</span>
                <span className="text-primary-variant">
                  {searchMetrics.frames_decoded}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t("metrics.wallTime")}</span>
                <span className="text-primary-variant">
                  {t("metrics.seconds", {
                    seconds: searchMetrics.wall_time_seconds.toFixed(1),
                  })}
                </span>
              </div>
              {searchMetrics.segments_with_errors > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>{t("metrics.segmentErrors")}</span>
                  <span className="text-primary-variant">
                    {searchMetrics.segments_with_errors}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {searchResults.length === 0 && !isSearching ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {hasSearched ? t("noChangesFound") : t("noResultsYet")}
          </div>
        ) : searchResults.length > 0 ? (
          <div className="flex flex-col gap-1 p-2">
            {searchResults.map((result, index) => (
              <SearchResultItem
                key={index}
                result={result}
                timezone={timezone}
                timestampFormat={resultTimestampFormat}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>
        ) : null}
      </ScrollArea>
    </>
  );

  return (
    <DetailStreamProvider
      isDetailMode={false}
      currentTime={currentTime}
      camera={selectedCamera ?? ""}
    >
      <div ref={contentRef} className="flex size-full flex-col pt-2">
        <Toaster closeButton={true} position="top-center" />
        <MotionSearchDialog
          open={isSearchDialogOpen}
          onOpenChange={setIsSearchDialogOpen}
          config={config}
          cameras={cameras}
          selectedCamera={selectedCamera}
          onCameraSelect={onCameraSelect}
          cameraLocked={cameraLocked}
          polygonPoints={polygonPoints}
          setPolygonPoints={setPolygonPoints}
          isDrawingROI={isDrawingROI}
          setIsDrawingROI={setIsDrawingROI}
          parallelMode={parallelMode}
          setParallelMode={setParallelMode}
          threshold={threshold}
          setThreshold={setThreshold}
          minArea={minArea}
          setMinArea={setMinArea}
          frameSkip={frameSkip}
          setFrameSkip={setFrameSkip}
          maxResults={maxResults}
          setMaxResults={setMaxResults}
          searchRange={searchRange}
          setSearchRange={setSearchRange}
          defaultRange={timeRange}
          isSearching={isSearching}
          canStartSearch={canStartSearch}
          onStartSearch={performSearch}
          timezone={timezone}
        />

        {/* Header */}
        <div className="relative mb-2 flex h-11 w-full items-center justify-between px-2">
          {isMobile && (
            <Logo className="absolute inset-x-1/2 h-8 -translate-x-1/2" />
          )}
          {(cameraLocked || onBack) && (
            <div className="flex items-center gap-2">
              <Button
                className="flex items-center gap-2.5 rounded-lg"
                aria-label={t("label.back", { ns: "common" })}
                size="sm"
                onClick={() => (onBack ? onBack() : navigate(-1))}
              >
                <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                {isDesktop && (
                  <div className="text-primary">
                    {t("button.back", { ns: "common" })}
                  </div>
                )}
              </Button>
            </div>
          )}
          <div className="flex w-full items-center justify-end gap-2">
            <div className="hidden h-9 cursor-pointer items-center justify-start rounded-md bg-secondary p-2 text-sm hover:bg-secondary/80 md:flex">
              <Switch
                id="heatmap-toggle"
                checked={showSegmentHeatmap}
                onCheckedChange={setShowSegmentHeatmap}
              />
              <label
                htmlFor="heatmap-toggle"
                className="ml-2 cursor-pointer text-sm text-primary"
              >
                {t("motionHeatmapLabel")}
              </label>
            </div>
            <Button
              className="rounded-lg md:hidden"
              variant={showSegmentHeatmap ? "select" : "default"}
              size="sm"
              aria-label={t("motionHeatmapLabel")}
              onClick={() => setShowSegmentHeatmap((prev) => !prev)}
            >
              <FaFire className="size-4" />
            </Button>
            {isDesktop ? (
              <>
                <ExportDialog
                  camera={selectedCamera}
                  currentTime={currentTime}
                  latestTime={timeRange.before}
                  mode={exportMode}
                  range={exportRange}
                  showPreview={showExportPreview}
                  setRange={setExportRangeWithPause}
                  setMode={setExportMode}
                  setShowPreview={setShowExportPreview}
                />
                <CalendarFilterButton
                  recordingsSummary={recordingsSummary}
                  day={selectedDay}
                  updateSelectedDay={onDaySelect}
                />
              </>
            ) : (
              <Drawer
                open={isMobileSettingsOpen}
                onOpenChange={(open) => {
                  setIsMobileSettingsOpen(open);

                  if (!open) {
                    setMobileSettingsMode("actions");
                  }
                }}
              >
                <DrawerTrigger asChild>
                  <Button
                    className="rounded-lg"
                    size="sm"
                    aria-label={t("filters", { ns: "views/recording" })}
                    onClick={() => setMobileSettingsMode("actions")}
                  >
                    <FaCog className="size-5 text-secondary-foreground" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="mx-1 max-h-[75dvh] overflow-hidden rounded-t-2xl px-4 pb-4">
                  {mobileSettingsMode == "actions" ? (
                    <div className="flex w-full flex-col gap-2 p-4">
                      <Button
                        className="flex w-full items-center justify-center gap-2"
                        aria-label={t("menu.export", { ns: "common" })}
                        onClick={openMobileExport}
                      >
                        <FaArrowDown className="rounded-md bg-secondary-foreground fill-secondary p-1" />
                        {t("menu.export", { ns: "common" })}
                      </Button>
                      <Button
                        className="flex w-full items-center justify-center gap-2"
                        aria-label={t("calendar", { ns: "views/recording" })}
                        variant={selectedDay ? "select" : "default"}
                        onClick={() => setMobileSettingsMode("calendar")}
                      >
                        <FaCalendarAlt
                          className={
                            selectedDay
                              ? "text-selected-foreground"
                              : "text-secondary-foreground"
                          }
                        />
                        {t("calendar", { ns: "views/recording" })}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col">
                      <div className="relative h-8 w-full">
                        <div
                          className="absolute left-0 text-selected"
                          onClick={() => setMobileSettingsMode("actions")}
                        >
                          {t("button.back", { ns: "common" })}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 text-muted-foreground">
                          {t("calendar", { ns: "views/recording" })}
                        </div>
                      </div>
                      <div className="flex w-full flex-row justify-center">
                        <ReviewActivityCalendar
                          recordingsSummary={recordingsSummary}
                          selectedDay={selectedDay}
                          onSelect={(day) => {
                            onDaySelect(day);
                            setIsMobileSettingsOpen(false);
                            setMobileSettingsMode("actions");
                          }}
                        />
                      </div>
                      <SelectSeparator />
                      <div className="flex items-center justify-center p-2">
                        <Button
                          aria-label={t("button.reset", { ns: "common" })}
                          onClick={() => {
                            onDaySelect(undefined);
                            setIsMobileSettingsOpen(false);
                            setMobileSettingsMode("actions");
                          }}
                        >
                          {t("button.reset", { ns: "common" })}
                        </Button>
                      </div>
                    </div>
                  )}
                </DrawerContent>
              </Drawer>
            )}
            <Button
              variant="select"
              size="sm"
              aria-label={t("newSearch")}
              onClick={handleNewSearch}
            >
              {isDesktop ? t("newSearch") : <LuSearch className="size-5" />}
            </Button>
          </div>
        </div>

        {!isDesktop && (
          <div className="hidden">
            <ExportDialog
              camera={selectedCamera}
              currentTime={currentTime}
              latestTime={timeRange.before}
              mode={exportMode}
              range={exportRange}
              showPreview={showExportPreview}
              setRange={setExportRangeWithPause}
              setMode={setExportMode}
              setShowPreview={setShowExportPreview}
            />
          </div>
        )}

        {/* Main Content */}
        <div
          className={cn(
            "flex flex-1 overflow-hidden",
            isDesktop ? "flex-row" : "flex-col gap-2 landscape:flex-row",
          )}
        >
          {/* Video Player with ROI Canvas */}
          <div
            ref={mainLayoutRef}
            className={cn(
              "flex flex-col overflow-hidden",
              isDesktop
                ? mainCameraAspect === "tall"
                  ? "mr-2 h-full min-h-0 min-w-0 flex-1 items-center"
                  : "mr-2 h-full min-h-0 min-w-0 flex-1"
                : mainCameraAspect === "tall"
                  ? "flex-1 portrait:h-[40dvh] portrait:max-h-[40dvh] portrait:flex-shrink-0 portrait:flex-grow-0 portrait:basis-auto portrait:items-center portrait:justify-center"
                  : "flex-1 portrait:max-h-[40dvh] portrait:flex-shrink-0 portrait:flex-grow-0 portrait:basis-auto landscape:items-center landscape:justify-center",
            )}
          >
            <div
              className={cn(
                "relative flex max-h-full min-h-0 min-w-0 max-w-full items-center justify-center",
                isDesktop
                  ? mainCameraAspect === "tall" || useHeightBased
                    ? "h-full"
                    : "w-full"
                  : mainCameraAspect == "tall"
                    ? "aspect-tall h-full w-auto max-w-full flex-shrink-0 landscape:h-full"
                    : cn(
                        "flex-shrink-0 portrait:w-full landscape:h-full",
                        mainCameraAspect == "wide"
                          ? "aspect-wide"
                          : "aspect-video",
                      ),
              )}
              style={{
                aspectRatio: getCameraAspect(selectedCamera),
              }}
            >
              {/* Video Player */}
              <DynamicVideoPlayer
                className={grow}
                camera={selectedCamera}
                timeRange={currentTimeRange}
                cameraPreviews={allPreviews ?? []}
                startTimestamp={playbackStart}
                hotKeys={exportMode != "select"}
                fullscreen={fullscreen}
                onTimestampUpdate={(timestamp) => {
                  setPlayerTime(timestamp);
                  setCurrentTime(timestamp);
                }}
                onClipEnded={onClipEnded}
                onSeekToTime={manuallySetCurrentTime}
                onControllerReady={(controller) => {
                  mainControllerRef.current = controller;
                }}
                isScrubbing={scrubbing || exportMode == "timeline"}
                supportsFullscreen={supportsFullScreen}
                setFullResolution={setFullResolution}
                toggleFullscreen={toggleFullscreen}
                containerRef={mainLayoutRef}
                transformedOverlay={
                  <MotionSearchROICanvas
                    camera={selectedCamera}
                    width={config.cameras[selectedCamera]?.detect.width ?? 1920}
                    height={
                      config.cameras[selectedCamera]?.detect.height ?? 1080
                    }
                    polygonPoints={polygonPoints}
                    setPolygonPoints={setPolygonPoints}
                    isDrawing={isDrawingROI}
                    setIsDrawing={setIsDrawingROI}
                    isInteractive={false}
                    motionHeatmap={activeSegmentHeatmap}
                    showMotionHeatmap={showSegmentHeatmap}
                  />
                }
              />
            </div>
          </div>

          {isDesktop ? (
            <>
              <div className="relative w-[100px] flex-shrink-0 overflow-hidden">
                {timelinePanel}
              </div>

              <div className="flex w-64 flex-col border-l">{resultsPanel}</div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden landscape:flex-row">
              <div className="relative min-h-0 basis-1/2 overflow-hidden landscape:w-[100px] landscape:flex-shrink-0 landscape:basis-auto">
                {timelinePanel}
              </div>

              <div className="flex min-h-0 basis-1/2 flex-col border-t landscape:flex-1 landscape:border-l landscape:border-t-0">
                {resultsPanel}
              </div>
            </div>
          )}
        </div>
      </div>
    </DetailStreamProvider>
  );
}

type SearchResultItemProps = {
  result: MotionSearchResult;
  timezone: string | undefined;
  timestampFormat: string;
  onClick: () => void;
};

function SearchResultItem({
  result,
  timezone,
  timestampFormat,
  onClick,
}: SearchResultItemProps) {
  const { t } = useTranslation(["views/motionSearch"]);
  const formattedTime = useFormattedTimestamp(
    result.timestamp,
    timestampFormat,
    timezone,
  );

  return (
    <button
      className="flex w-full flex-col rounded-md p-2 text-left hover:bg-accent"
      onClick={onClick}
      title={t("jumpToTime")}
    >
      <span className="text-sm font-medium">{formattedTime}</span>
      <span className="text-xs text-muted-foreground">
        {t("changePercentage", {
          percentage: result.change_percentage.toFixed(1),
        })}
      </span>
    </button>
  );
}
