import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isDesktop, isIOS, isMobile } from "react-device-detect";
import { FaArrowRight, FaCalendarAlt, FaCheckCircle } from "react-icons/fa";
import { MdOutlineRestartAlt, MdUndo } from "react-icons/md";

import { FrigateConfig } from "@/types/frigateConfig";
import { TimeRange } from "@/types/timeline";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectSeparator } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { TimezoneAwareCalendar } from "@/components/overlay/ReviewActivityCalendar";

import { useApiHost } from "@/api";
import { useResizeObserver } from "@/hooks/resize-observer";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getUTCOffset } from "@/utils/dateUtil";
import { cn } from "@/lib/utils";
import MotionSearchROICanvas from "./MotionSearchROICanvas";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

type MotionSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: FrigateConfig;
  cameras: string[];
  selectedCamera: string | null;
  onCameraSelect: (camera: string) => void;
  cameraLocked?: boolean;
  polygonPoints: number[][];
  setPolygonPoints: React.Dispatch<React.SetStateAction<number[][]>>;
  isDrawingROI: boolean;
  setIsDrawingROI: React.Dispatch<React.SetStateAction<boolean>>;
  parallelMode: boolean;
  setParallelMode: React.Dispatch<React.SetStateAction<boolean>>;
  threshold: number;
  setThreshold: React.Dispatch<React.SetStateAction<number>>;
  minArea: number;
  setMinArea: React.Dispatch<React.SetStateAction<number>>;
  frameSkip: number;
  setFrameSkip: React.Dispatch<React.SetStateAction<number>>;
  maxResults: number;
  setMaxResults: React.Dispatch<React.SetStateAction<number>>;
  searchRange?: TimeRange;
  setSearchRange: React.Dispatch<React.SetStateAction<TimeRange | undefined>>;
  defaultRange: TimeRange;
  isSearching: boolean;
  canStartSearch: boolean;
  onStartSearch: () => void;
  timezone?: string;
};

export default function MotionSearchDialog({
  open,
  onOpenChange,
  config,
  cameras,
  selectedCamera,
  onCameraSelect,
  cameraLocked = false,
  polygonPoints,
  setPolygonPoints,
  isDrawingROI,
  setIsDrawingROI,
  parallelMode,
  setParallelMode,
  threshold,
  setThreshold,
  minArea,
  setMinArea,
  frameSkip,
  setFrameSkip,
  maxResults,
  setMaxResults,
  searchRange,
  setSearchRange,
  defaultRange,
  isSearching,
  canStartSearch,
  onStartSearch,
  timezone,
}: MotionSearchDialogProps) {
  const { t } = useTranslation(["views/motionSearch", "common"]);
  const apiHost = useApiHost();
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);
  const [imageLoaded, setImageLoaded] = useState(false);

  const cameraConfig = useMemo(() => {
    if (!selectedCamera) return undefined;
    return config.cameras[selectedCamera];
  }, [config, selectedCamera]);

  const polygonClosed = useMemo(
    () => !isDrawingROI && polygonPoints.length >= 3,
    [isDrawingROI, polygonPoints.length],
  );

  const undoPolygonPoint = useCallback(() => {
    if (polygonPoints.length === 0 || isSearching) {
      return;
    }

    setPolygonPoints((prev) => prev.slice(0, -1));
    setIsDrawingROI(true);
  }, [isSearching, setIsDrawingROI, setPolygonPoints, polygonPoints.length]);

  const resetPolygon = useCallback(() => {
    if (polygonPoints.length === 0 || isSearching) {
      return;
    }

    setPolygonPoints([]);
    setIsDrawingROI(true);
  }, [isSearching, polygonPoints.length, setIsDrawingROI, setPolygonPoints]);

  const imageSize = useMemo(() => {
    if (!containerWidth || !containerHeight || !cameraConfig) {
      return { width: 0, height: 0 };
    }

    const cameraAspectRatio =
      cameraConfig.detect.width / cameraConfig.detect.height;
    const availableAspectRatio = containerWidth / containerHeight;

    if (availableAspectRatio >= cameraAspectRatio) {
      return {
        width: containerHeight * cameraAspectRatio,
        height: containerHeight,
      };
    }

    return {
      width: containerWidth,
      height: containerWidth / cameraAspectRatio,
    };
  }, [containerWidth, containerHeight, cameraConfig]);

  useEffect(() => {
    setImageLoaded(false);
  }, [selectedCamera]);

  const Overlay = isDesktop ? Dialog : Drawer;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <Overlay open={open} onOpenChange={onOpenChange}>
      <Content
        {...(isDesktop
          ? {
              onOpenAutoFocus: (event: Event) => event.preventDefault(),
            }
          : {})}
        className={cn(
          isDesktop
            ? "scrollbar-container max-h-[90dvh] overflow-y-auto sm:max-w-[75%]"
            : "flex max-h-[90dvh] flex-col overflow-hidden rounded-lg pb-4",
        )}
      >
        <div
          className={cn(
            !isDesktop &&
              "scrollbar-container flex min-h-0 w-full flex-col gap-4 overflow-y-auto overflow-x-hidden px-4",
          )}
        >
          <DialogHeader>
            <DialogTitle className="mt-4 md:mt-auto">
              {t("dialog.title")}
            </DialogTitle>
            <p className="my-1 text-sm text-muted-foreground">
              {t("description")}
            </p>
          </DialogHeader>
          <DialogDescription className="hidden" />
          <div
            className={cn(
              "flex gap-4",
              isDesktop ? "mt-4 flex-row" : "flex-col landscape:flex-row",
            )}
          >
            <div
              className={cn("flex flex-1 flex-col", !isDesktop && "min-w-0")}
            >
              {(!cameraLocked || !selectedCamera) && (
                <div className="flex items-end justify-between gap-2">
                  <div className="mt-2 md:min-w-64">
                    <div className="grid gap-2">
                      <Label htmlFor="motion-search-camera">
                        {t("dialog.cameraLabel")}
                      </Label>
                      <Select
                        value={selectedCamera ?? undefined}
                        onValueChange={(value) => onCameraSelect(value)}
                      >
                        <SelectTrigger id="motion-search-camera">
                          <SelectValue placeholder={t("selectCamera")} />
                        </SelectTrigger>
                        <SelectContent>
                          {cameras.map((camera) => (
                            <SelectItem
                              key={camera}
                              value={camera}
                              className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                            >
                              <CameraNameLabel camera={camera} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
                <div className="flex flex-col gap-2">
                  <TransformComponent
                    wrapperStyle={{
                      width: "100%",
                      height: isDesktop ? "100%" : "auto",
                    }}
                    contentStyle={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <div
                      ref={containerRef}
                      className="relative flex w-full items-center justify-center overflow-hidden rounded-lg border bg-secondary"
                      style={{ aspectRatio: "16 / 9" }}
                    >
                      {selectedCamera && cameraConfig && imageSize.width > 0 ? (
                        <div
                          className="relative"
                          style={{
                            width: imageSize.width,
                            height: imageSize.height,
                          }}
                        >
                          <img
                            alt={t("dialog.previewAlt", {
                              camera: selectedCamera,
                            })}
                            src={`${apiHost}api/${selectedCamera}/latest.jpg?h=500`}
                            className="h-full w-full object-contain"
                            onLoad={() => setImageLoaded(true)}
                          />
                          {!imageLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ActivityIndicator className="h-8 w-8" />
                            </div>
                          )}
                          <MotionSearchROICanvas
                            camera={selectedCamera}
                            width={cameraConfig.detect.width}
                            height={cameraConfig.detect.height}
                            polygonPoints={polygonPoints}
                            setPolygonPoints={setPolygonPoints}
                            isDrawing={isDrawingROI}
                            setIsDrawing={setIsDrawingROI}
                            isInteractive={true}
                          />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                          {t("selectCamera")}
                        </div>
                      )}
                    </div>
                  </TransformComponent>
                </div>
              </TransformWrapper>

              {selectedCamera && (
                <div className="my-2 flex w-full flex-row justify-between rounded-md bg-background_alt p-2 text-sm">
                  <div className="my-1 inline-flex items-center">
                    {t("polygonControls.points", {
                      count: polygonPoints.length,
                    })}
                    {polygonClosed && <FaCheckCircle className="ml-2 size-5" />}
                  </div>
                  <div className="flex flex-row justify-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          className="size-6 rounded-md p-1"
                          aria-label={t("polygonControls.undo")}
                          disabled={polygonPoints.length === 0 || isSearching}
                          onClick={undoPolygonPoint}
                        >
                          <MdUndo className="text-secondary-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("polygonControls.undo")}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          className="size-6 rounded-md p-1"
                          aria-label={t("polygonControls.reset")}
                          disabled={polygonPoints.length === 0 || isSearching}
                          onClick={resetPolygon}
                        >
                          <MdOutlineRestartAlt className="text-secondary-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("polygonControls.reset")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>

            <div
              className={cn(
                "flex w-full flex-col gap-4 space-y-4 lg:w-[340px]",
                isMobile && "landscape:w-[40%] landscape:flex-shrink-0",
              )}
            >
              <div className="grid gap-3">
                <h4 className="mb-4 font-medium leading-none">
                  {t("settings.title")}
                </h4>
                <div className="grid gap-4 space-y-2">
                  <div className="grid gap-2">
                    <Label htmlFor="threshold">{t("settings.threshold")}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="threshold"
                        min={1}
                        max={255}
                        step={1}
                        value={[threshold]}
                        onValueChange={([value]) => setThreshold(value)}
                      />
                      <span className="w-12 text-sm">{threshold}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.thresholdDesc")}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minArea">{t("settings.minArea")}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="minArea"
                        min={1}
                        max={100}
                        step={1}
                        value={[minArea]}
                        onValueChange={([value]) => setMinArea(value)}
                      />
                      <span className="w-12 text-sm">{minArea}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.minAreaDesc")}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="frameSkip">{t("settings.frameSkip")}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="frameSkip"
                        min={1}
                        max={60}
                        step={1}
                        value={[frameSkip]}
                        onValueChange={([value]) => setFrameSkip(value)}
                      />
                      <span className="w-12 text-sm">{frameSkip}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.frameSkipDesc")}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="parallelMode">
                        {t("settings.parallelMode")}
                      </Label>
                      <Switch
                        id="parallelMode"
                        checked={parallelMode}
                        onCheckedChange={setParallelMode}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.parallelModeDesc")}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxResults">
                      {t("settings.maxResults")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="maxResults"
                        min={1}
                        max={200}
                        step={1}
                        value={[maxResults]}
                        onValueChange={([value]) => setMaxResults(value)}
                      />
                      <span className="w-12 text-sm">{maxResults}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.maxResultsDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <SearchRangeSelector
                range={searchRange}
                setRange={setSearchRange}
                defaultRange={defaultRange}
                timeFormat={config.ui?.time_format}
                timezone={timezone}
              />

              <Button
                className="w-full"
                variant="select"
                onClick={onStartSearch}
                disabled={!canStartSearch || isSearching}
              >
                {t("startSearch")}
              </Button>
            </div>
          </div>
        </div>
      </Content>
    </Overlay>
  );
}

type SearchRangeSelectorProps = {
  range?: TimeRange;
  setRange: React.Dispatch<React.SetStateAction<TimeRange | undefined>>;
  defaultRange: TimeRange;
  timeFormat?: "browser" | "12hour" | "24hour";
  timezone?: string;
};

function SearchRangeSelector({
  range,
  setRange,
  defaultRange,
  timeFormat,
  timezone,
}: SearchRangeSelectorProps) {
  const { t } = useTranslation(["views/motionSearch", "common"]);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const timezoneOffset = useMemo(
    () =>
      timezone ? Math.round(getUTCOffset(new Date(), timezone)) : undefined,
    [timezone],
  );
  const localTimeOffset = useMemo(
    () =>
      Math.round(
        getUTCOffset(
          new Date(),
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ),
      ),
    [],
  );

  const startTime = useMemo(() => {
    let time = range?.after ?? defaultRange.after;

    if (timezoneOffset !== undefined) {
      time = time + (timezoneOffset - localTimeOffset) * 60;
    }

    return time;
  }, [range, defaultRange, timezoneOffset, localTimeOffset]);

  const endTime = useMemo(() => {
    let time = range?.before ?? defaultRange.before;

    if (timezoneOffset !== undefined) {
      time = time + (timezoneOffset - localTimeOffset) * 60;
    }

    return time;
  }, [range, defaultRange, timezoneOffset, localTimeOffset]);

  const formattedStart = useFormattedTimestamp(
    startTime,
    timeFormat === "24hour"
      ? t("time.formattedTimestamp.24hour", { ns: "common" })
      : t("time.formattedTimestamp.12hour", { ns: "common" }),
  );
  const formattedEnd = useFormattedTimestamp(
    endTime,
    timeFormat === "24hour"
      ? t("time.formattedTimestamp.24hour", { ns: "common" })
      : t("time.formattedTimestamp.12hour", { ns: "common" }),
  );

  const startClock = useMemo(() => {
    const date = new Date(startTime * 1000);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }, [startTime]);

  const endClock = useMemo(() => {
    const date = new Date(endTime * 1000);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }, [endTime]);

  return (
    <div className="grid gap-2">
      <Label>{t("timeRange.title")}</Label>
      <div className="flex items-center rounded-lg bg-secondary px-2 py-1 text-secondary-foreground">
        <FaCalendarAlt />
        <div className="flex flex-wrap items-center">
          <Popover
            open={startOpen}
            onOpenChange={(open) => {
              if (!open) {
                setStartOpen(false);
              }
            }}
            modal={false}
          >
            <PopoverTrigger asChild>
              <Button
                className="text-primary"
                aria-label={t("timeRange.start")}
                variant={startOpen ? "select" : "default"}
                size="sm"
                onClick={() => {
                  setStartOpen(true);
                  setEndOpen(false);
                }}
              >
                {formattedStart}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              disablePortal
              className="flex flex-col items-center"
            >
              <TimezoneAwareCalendar
                timezone={timezone}
                selectedDay={new Date(startTime * 1000)}
                onSelect={(day) => {
                  if (!day) {
                    return;
                  }

                  setRange({
                    before: endTime,
                    after: day.getTime() / 1000 + 1,
                  });
                }}
              />
              <SelectSeparator className="bg-secondary" />
              <input
                className="text-md mx-4 w-full border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                id="startTime"
                type="time"
                value={startClock}
                step={isIOS ? "60" : "1"}
                onChange={(e) => {
                  const clock = e.target.value;
                  const [hour, minute, second] = isIOS
                    ? [...clock.split(":"), "00"]
                    : clock.split(":");

                  const start = new Date(startTime * 1000);
                  start.setHours(
                    parseInt(hour),
                    parseInt(minute),
                    parseInt(second ?? 0),
                    0,
                  );
                  setRange({
                    before: endTime,
                    after: start.getTime() / 1000,
                  });
                }}
              />
            </PopoverContent>
          </Popover>
          <FaArrowRight className="size-4 text-primary" />
          <Popover
            open={endOpen}
            onOpenChange={(open) => {
              if (!open) {
                setEndOpen(false);
              }
            }}
            modal={false}
          >
            <PopoverTrigger asChild>
              <Button
                className="text-primary"
                aria-label={t("timeRange.end")}
                variant={endOpen ? "select" : "default"}
                size="sm"
                onClick={() => {
                  setEndOpen(true);
                  setStartOpen(false);
                }}
              >
                {formattedEnd}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              disablePortal
              className="flex flex-col items-center"
            >
              <TimezoneAwareCalendar
                timezone={timezone}
                selectedDay={new Date(endTime * 1000)}
                onSelect={(day) => {
                  if (!day) {
                    return;
                  }

                  setRange({
                    after: startTime,
                    before: day.getTime() / 1000,
                  });
                }}
              />
              <SelectSeparator className="bg-secondary" />
              <input
                className="text-md mx-4 w-full border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                id="endTime"
                type="time"
                value={endClock}
                step={isIOS ? "60" : "1"}
                onChange={(e) => {
                  const clock = e.target.value;
                  const [hour, minute, second] = isIOS
                    ? [...clock.split(":"), "00"]
                    : clock.split(":");

                  const end = new Date(endTime * 1000);
                  end.setHours(
                    parseInt(hour),
                    parseInt(minute),
                    parseInt(second ?? 0),
                    0,
                  );
                  setRange({
                    before: end.getTime() / 1000,
                    after: startTime,
                  });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
