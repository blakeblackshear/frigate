import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";
import { ExportMode } from "@/types/filter";
import { FaArrowDown } from "react-icons/fa";
import { LuAudioLines } from "react-icons/lu";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { TimeRange } from "@/types/timeline";
import useSWR from "swr";
import {
  BatchExportBody,
  BatchExportResponse,
  CameraActivity,
  ExportCase,
  StartExportResponse,
} from "@/types/export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop, isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import SaveExportOverlay from "./SaveExportOverlay";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";
import { GenericVideoPlayer } from "../player/GenericVideoPlayer";
import { useTranslation } from "react-i18next";
import { CustomTimeSelector } from "./CustomTimeSelector";
import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/use-is-admin";

const EXPORT_OPTIONS = [
  "1",
  "4",
  "8",
  "12",
  "24",
  "timeline",
  "custom",
] as const;
type ExportOption = (typeof EXPORT_OPTIONS)[number];
export type ExportTab = "export" | "multi";

type ExportDialogProps = {
  camera: string;
  latestTime: number;
  currentTime: number;
  range?: TimeRange;
  mode: ExportMode;
  showPreview: boolean;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
  setShowPreview: (showPreview: boolean) => void;
};

export default function ExportDialog({
  camera,
  latestTime,
  currentTime,
  range,
  mode,
  showPreview,
  setRange,
  setMode,
  setShowPreview,
}: ExportDialogProps) {
  const { t } = useTranslation(["components/dialog"]);
  const [name, setName] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>();
  const [singleNewCaseName, setSingleNewCaseName] = useState("");
  const [singleNewCaseDescription, setSingleNewCaseDescription] = useState("");
  const [activeTab, setActiveTab] = useState<ExportTab>("export");
  const [isStartingExport, setIsStartingExport] = useState(false);
  const previousModeRef = useRef<ExportMode>(mode);

  useEffect(() => {
    const previousMode = previousModeRef.current;

    if (mode === "select" && previousMode === "none") {
      setActiveTab("export");
    }

    if (mode === "select" && previousMode === "timeline_multi") {
      setActiveTab("multi");
    }

    if (mode === "none") {
      setActiveTab("export");
    }

    previousModeRef.current = mode;
  }, [mode]);

  const onStartExport = useCallback(async () => {
    if (isStartingExport) {
      return false;
    }

    if (!range) {
      toast.error(t("export.toast.error.noVaildTimeSelected"), {
        position: "top-center",
      });
      return false;
    }

    if (range.before < range.after) {
      toast.error(t("export.toast.error.endTimeMustAfterStartTime"), {
        position: "top-center",
      });
      return false;
    }

    setIsStartingExport(true);

    try {
      let exportCaseId: string | undefined = selectedCaseId;

      if (selectedCaseId === "new" && singleNewCaseName.trim().length > 0) {
        const caseResp = await axios.post("cases", {
          name: singleNewCaseName.trim(),
          description: singleNewCaseDescription.trim() || undefined,
        });
        exportCaseId = caseResp.data?.id;
      } else if (selectedCaseId === "new" || selectedCaseId === "none") {
        exportCaseId = undefined;
      }

      await axios.post<StartExportResponse>(
        `export/${camera}/start/${Math.round(range.after)}/end/${Math.round(range.before)}`,
        {
          source: "recordings",
          name,
          export_case_id: exportCaseId,
        },
      );

      toast.success(t("export.toast.queued"), {
        position: "top-center",
        action: (
          <a href="/export" target="_blank" rel="noopener noreferrer">
            <Button>{t("export.toast.view")}</Button>
          </a>
        ),
      });
      setName("");
      setSelectedCaseId(undefined);
      setSingleNewCaseName("");
      setSingleNewCaseDescription("");
      setRange(undefined);
      setMode("none");
      return true;
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.response?.data?.detail ||
        "Unknown error";
      toast.error(
        t("export.toast.error.failed", {
          error: errorMessage,
        }),
        { position: "top-center" },
      );
      return false;
    } finally {
      setIsStartingExport(false);
    }
  }, [
    camera,
    isStartingExport,
    name,
    range,
    selectedCaseId,
    singleNewCaseDescription,
    singleNewCaseName,
    setMode,
    setRange,
    t,
  ]);

  const handleCancel = useCallback(() => {
    setName("");
    setSelectedCaseId(undefined);
    setSingleNewCaseName("");
    setSingleNewCaseDescription("");
    setMode("none");
    setRange(undefined);
    setActiveTab("export");
  }, [setMode, setRange]);

  const Overlay = isDesktop ? Dialog : Drawer;
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <>
      <ExportPreviewDialog
        camera={camera}
        range={range}
        showPreview={showPreview}
        setShowPreview={setShowPreview}
      />
      <SaveExportOverlay
        className="pointer-events-none absolute left-1/2 top-8 z-50 -translate-x-1/2"
        show={mode == "timeline" || mode == "timeline_multi"}
        hidePreview={mode == "timeline_multi"}
        isSaving={isStartingExport}
        saveLabel={
          mode == "timeline_multi"
            ? t("export.fromTimeline.useThisRange")
            : undefined
        }
        onPreview={() => setShowPreview(true)}
        onSave={() => {
          if (mode == "timeline_multi") {
            setActiveTab("multi");
            setMode("select");
            return;
          }

          void onStartExport();
        }}
        onCancel={handleCancel}
      />
      <Overlay
        open={mode == "select"}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          }
        }}
      >
        {!isDesktop && (
          <Trigger asChild>
            <Button
              className="flex items-center gap-2"
              aria-label={t("menu.export", { ns: "common" })}
              size="sm"
              onClick={() => {
                const now = new Date(latestTime * 1000);
                now.setHours(now.getHours() - 1);
                setActiveTab("export");
                setRange({
                  before: latestTime,
                  after: now.getTime() / 1000,
                });
                setMode("select");
              }}
            >
              <FaArrowDown className="rounded-md bg-secondary-foreground fill-secondary p-1" />
            </Button>
          </Trigger>
        )}
        <Content
          className={
            isDesktop
              ? "sm:rounded-lg md:rounded-2xl"
              : "mx-4 rounded-lg px-4 pb-4 md:rounded-2xl"
          }
        >
          <ExportContent
            latestTime={latestTime}
            currentTime={currentTime}
            range={range}
            name={name}
            selectedCaseId={selectedCaseId}
            singleNewCaseName={singleNewCaseName}
            singleNewCaseDescription={singleNewCaseDescription}
            activeTab={activeTab}
            isStartingExport={isStartingExport}
            onStartExport={onStartExport}
            setActiveTab={setActiveTab}
            setName={setName}
            setSelectedCaseId={setSelectedCaseId}
            setSingleNewCaseName={setSingleNewCaseName}
            setSingleNewCaseDescription={setSingleNewCaseDescription}
            setRange={setRange}
            setMode={setMode}
            onCancel={handleCancel}
          />
        </Content>
      </Overlay>
    </>
  );
}

type ExportContentProps = {
  latestTime: number;
  currentTime: number;
  range?: TimeRange;
  name: string;
  selectedCaseId?: string;
  singleNewCaseName: string;
  singleNewCaseDescription: string;
  activeTab: ExportTab;
  isStartingExport: boolean;
  onStartExport: () => Promise<boolean>;
  setActiveTab: (tab: ExportTab) => void;
  setName: (name: string) => void;
  setSelectedCaseId: (caseId: string | undefined) => void;
  setSingleNewCaseName: (name: string) => void;
  setSingleNewCaseDescription: (description: string) => void;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
  onCancel: () => void;
};

export function ExportContent({
  latestTime,
  currentTime,
  range,
  name,
  selectedCaseId,
  singleNewCaseName,
  singleNewCaseDescription,
  activeTab,
  isStartingExport,
  onStartExport,
  setActiveTab,
  setName,
  setSelectedCaseId,
  setSingleNewCaseName,
  setSingleNewCaseDescription,
  setRange,
  setMode,
  onCancel,
}: ExportContentProps) {
  const { t } = useTranslation(["components/dialog"]);
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [selectedOption, setSelectedOption] = useState<ExportOption>("1");
  const { data: cases } = useSWR<ExportCase[]>(isAdmin ? "cases" : null);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [debouncedRange, setDebouncedRange] = useState<TimeRange | undefined>(
    range,
  );
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [batchCaseSelection, setBatchCaseSelection] = useState<string>(
    selectedCaseId || "none",
  );
  const [hasManualCameraSelection, setHasManualCameraSelection] =
    useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [isStartingBatchExport, setIsStartingBatchExport] = useState(false);
  const multiRangeKey = useMemo(() => {
    if (activeTab !== "multi" || !range) {
      return undefined;
    }

    return `${Math.round(range.after)}-${Math.round(range.before)}`;
  }, [activeTab, range]);

  useEffect(() => {
    if (activeTab !== "multi") {
      setDebouncedRange(undefined);
      return;
    }

    if (!range) {
      setDebouncedRange(undefined);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedRange(range);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, range]);

  useEffect(() => {
    if (activeTab !== "multi") {
      return;
    }

    if (selectedCaseId) {
      setBatchCaseSelection(selectedCaseId);
      return;
    }

    if ((cases?.length ?? 0) === 0) {
      setBatchCaseSelection("new");
      return;
    }

    setBatchCaseSelection("new");
  }, [activeTab, cases?.length, selectedCaseId]);

  useEffect(() => {
    setHasManualCameraSelection(false);
  }, [multiRangeKey]);

  useEffect(() => {
    if (activeTab !== "multi" || range) {
      return;
    }

    setRange({
      before: latestTime,
      after: latestTime - 3600,
    });
  }, [activeTab, latestTime, range, setRange]);

  const { data: events, isLoading: isEventsLoading } = useSWR<Event[]>(
    activeTab === "multi" && debouncedRange
      ? [
          "events",
          {
            after: Math.round(debouncedRange.after),
            before: Math.round(debouncedRange.before),
            limit: 500,
          },
        ]
      : null,
  );

  const cameraActivities = useMemo<CameraActivity[]>(() => {
    const allCameraIds = Object.keys(config?.cameras ?? {});
    const byCamera = new Map<string, Event[]>();

    events?.forEach((event) => {
      const bucket = byCamera.get(event.camera);
      if (bucket) {
        bucket.push(event);
      } else {
        byCamera.set(event.camera, [event]);
      }
    });

    const rangeStart = debouncedRange?.after ?? 0;
    const rangeEnd = debouncedRange?.before ?? 0;
    const rangeDuration = Math.max(1, rangeEnd - rangeStart);

    return allCameraIds.map((cameraId) => {
      const cameraEvents = byCamera.get(cameraId) ?? [];
      const segments = cameraEvents
        .map((event) => {
          // Event end_time is null for in-progress events; fall back to start.
          const eventEnd = event.end_time ?? event.start_time;
          const start = Math.max(
            0,
            Math.min(1, (event.start_time - rangeStart) / rangeDuration),
          );
          const end = Math.max(
            0,
            Math.min(1, (eventEnd - rangeStart) / rangeDuration),
          );
          return { start, end: Math.max(end, start) };
        })
        .sort((a, b) => a.start - b.start);

      return {
        camera: cameraId,
        count: cameraEvents.length,
        hasDetections: cameraEvents.length > 0,
        segments,
      };
    });
  }, [config?.cameras, debouncedRange, events]);

  useEffect(() => {
    if (
      activeTab !== "multi" ||
      !config ||
      isEventsLoading ||
      hasManualCameraSelection
    ) {
      return;
    }

    setSelectedCameraIds(
      cameraActivities
        .filter((activity) => activity.hasDetections)
        .map((activity) => activity.camera),
    );
  }, [
    activeTab,
    cameraActivities,
    config,
    hasManualCameraSelection,
    isEventsLoading,
  ]);

  const selectedCameraCount = selectedCameraIds.length;
  const canStartBatchExport =
    Boolean(range && range.before > range.after) &&
    selectedCameraCount > 0 &&
    !isStartingBatchExport &&
    (batchCaseSelection !== "new" || newCaseName.trim().length > 0) &&
    batchCaseSelection.length > 0;

  const onSelectTime = useCallback(
    (option: ExportOption) => {
      setSelectedOption(option);

      const now = new Date(latestTime * 1000);
      let start = 0;

      switch (option) {
        case "1":
          now.setHours(now.getHours() - 1);
          start = now.getTime() / 1000;
          break;
        case "4":
          now.setHours(now.getHours() - 4);
          start = now.getTime() / 1000;
          break;
        case "8":
          now.setHours(now.getHours() - 8);
          start = now.getTime() / 1000;
          break;
        case "12":
          now.setHours(now.getHours() - 12);
          start = now.getTime() / 1000;
          break;
        case "24":
          now.setHours(now.getHours() - 24);
          start = now.getTime() / 1000;
          break;
        case "custom":
          start = latestTime - 3600;
          break;
        default:
          start = latestTime - 3600;
      }

      setRange({
        before: latestTime,
        after: start,
      });
    },
    [latestTime, setRange],
  );

  const toggleCameraSelection = useCallback((cameraId: string) => {
    setHasManualCameraSelection(true);
    setSelectedCameraIds((previous) =>
      previous.includes(cameraId)
        ? previous.filter((selectedId) => selectedId !== cameraId)
        : [...previous, cameraId],
    );
  }, []);

  const startBatchExport = useCallback(async () => {
    if (isStartingBatchExport) {
      return;
    }

    if (!range) {
      toast.error(t("export.toast.error.noVaildTimeSelected"), {
        position: "top-center",
      });
      return;
    }

    if (range.before <= range.after) {
      toast.error(t("export.toast.error.endTimeMustAfterStartTime"), {
        position: "top-center",
      });
      return;
    }

    const payload: BatchExportBody = {
      items: selectedCameraIds.map((cameraId) => ({
        camera: cameraId,
        start_time: Math.round(range.after),
        end_time: Math.round(range.before),
        friendly_name: name
          ? `${name} - ${resolveCameraName(config, cameraId)}`
          : undefined,
      })),
    };

    if (isAdmin && batchCaseSelection !== "none") {
      if (batchCaseSelection === "new") {
        payload.new_case_name = newCaseName.trim();
        payload.new_case_description = newCaseDescription.trim() || undefined;
      } else {
        payload.export_case_id = batchCaseSelection;
      }
    }

    setIsStartingBatchExport(true);

    try {
      const response = await axios.post<BatchExportResponse>(
        "exports/batch",
        payload,
      );
      const results = response.data.results;
      const successfulResults = results.filter((result) => result.success);
      const failedResults = results.filter((result) => !result.success);
      const failedSummary = failedResults
        .map((result) => {
          const cameraName = resolveCameraName(config, result.camera);
          return result.error ? `${cameraName}: ${result.error}` : cameraName;
        })
        .join(", ");

      if (failedResults.length > 0 && successfulResults.length > 0) {
        toast.success(
          t("export.toast.batchQueuedPartial", {
            successful: successfulResults.length,
            total: results.length,
            failedCameras: failedResults
              .map((result) => resolveCameraName(config, result.camera))
              .join(", "),
          }),
          {
            position: "top-center",
            description: failedSummary,
          },
        );
      } else if (failedResults.length > 0) {
        toast.error(
          t("export.toast.batchQueueFailed", {
            total: results.length,
            failedCameras: failedResults
              .map((result) => resolveCameraName(config, result.camera))
              .join(", "),
          }),
          {
            position: "top-center",
            description: failedSummary,
          },
        );
      } else {
        toast.success(
          t("export.toast.batchQueuedSuccess", {
            count: successfulResults.length,
          }),
          { position: "top-center" },
        );
      }

      if (successfulResults.length > 0) {
        setName("");
        setSelectedCaseId(undefined);
        setBatchCaseSelection("new");
        setNewCaseName("");
        setNewCaseDescription("");
        setRange(undefined);
        setMode("none");
        setActiveTab("export");
        if (response.data.export_case_id) {
          navigate(`/export?caseId=${response.data.export_case_id}`);
        }
      }
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.response?.data?.detail ||
        "Unknown error";

      toast.error(
        t("export.toast.error.failed", {
          error: errorMessage,
        }),
        { position: "top-center" },
      );
    } finally {
      setIsStartingBatchExport(false);
    }
  }, [
    batchCaseSelection,
    config,
    isAdmin,
    isStartingBatchExport,
    name,
    newCaseDescription,
    newCaseName,
    range,
    selectedCameraIds,
    setActiveTab,
    setMode,
    setName,
    setRange,
    setSelectedCaseId,
    t,
    navigate,
  ]);

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        !isDesktop && "max-h-[80dvh] min-h-0",
      )}
    >
      {isDesktop && (
        <DialogHeader className="mb-4">
          <DialogTitle>{t("menu.export", { ns: "common" })}</DialogTitle>
        </DialogHeader>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ExportTab)}
        className={cn("w-full", !isDesktop && "flex min-h-0 flex-1 flex-col")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">{t("export.tabs.export")}</TabsTrigger>
          <TabsTrigger value="multi">
            {t("export.tabs.multiCamera")}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="export"
          className={cn(
            "mt-4 space-y-4",
            !isDesktop && "min-h-0 flex-1 overflow-y-auto pr-1",
          )}
        >
          <RadioGroup
            className={`flex flex-col gap-4 ${isDesktop ? "" : "mt-1"}`}
            onValueChange={(value) => onSelectTime(value as ExportOption)}
            value={selectedOption}
          >
            {EXPORT_OPTIONS.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <RadioGroupItem
                  className={
                    opt == selectedOption
                      ? "bg-selected from-selected/50 to-selected/90 text-selected"
                      : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                  }
                  id={opt}
                  value={opt}
                />
                <Label
                  className="cursor-pointer smart-capitalize"
                  htmlFor={opt}
                >
                  {isNaN(parseInt(opt))
                    ? opt == "timeline"
                      ? t("export.time.fromTimeline")
                      : t(`export.time.${opt}`)
                    : t("export.time.lastHour", {
                        count: parseInt(opt),
                      })}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedOption == "custom" && (
            <CustomTimeSelector
              latestTime={latestTime}
              range={range}
              setRange={setRange}
              startLabel={t("export.time.start.title")}
              endLabel={t("export.time.end.title")}
            />
          )}

          <Input
            className="text-md"
            type="search"
            placeholder={t("export.name.placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-sm text-secondary-foreground">
                {t("export.case.label")}
              </Label>
              <Select
                value={selectedCaseId || "none"}
                onValueChange={(value) =>
                  setSelectedCaseId(value === "none" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("export.case.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("label.none", { ns: "common" })}
                  </SelectItem>
                  {cases
                    ?.sort((a, b) => a.name.localeCompare(b.name))
                    .map((caseItem) => (
                      <SelectItem key={caseItem.id} value={caseItem.id}>
                        {caseItem.name}
                      </SelectItem>
                    ))}
                  <SelectSeparator />
                  <SelectItem value="new">
                    {t("export.case.newCaseOption")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedCaseId === "new" && (
                <div className="space-y-2 pt-1">
                  <Input
                    className="text-md"
                    placeholder={t("export.case.newCaseNamePlaceholder")}
                    value={singleNewCaseName}
                    onChange={(e) => setSingleNewCaseName(e.target.value)}
                  />
                  <Textarea
                    className="text-md"
                    placeholder={t("export.case.newCaseDescriptionPlaceholder")}
                    value={singleNewCaseDescription}
                    onChange={(e) =>
                      setSingleNewCaseDescription(e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="multi"
          className={cn(
            "mt-4 space-y-4",
            !isDesktop && "min-h-0 flex-1 overflow-y-auto pr-1",
          )}
        >
          <div className="space-y-2">
            <Label className="text-sm text-secondary-foreground">
              {t("export.multiCamera.timeRange")}
            </Label>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 [&>div]:!mx-0 [&>div]:!mt-0">
                <CustomTimeSelector
                  latestTime={latestTime}
                  range={range}
                  setRange={setRange}
                  startLabel={t("export.time.start.title")}
                  endLabel={t("export.time.end.title")}
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="size-9 shrink-0 p-0"
                    aria-label={t("export.multiCamera.selectFromTimeline")}
                    onClick={() => {
                      if (!range) {
                        setRange({
                          before: currentTime + 30,
                          after: currentTime - 30,
                        });
                      }

                      setActiveTab("multi");
                      setMode("timeline_multi");
                    }}
                  >
                    <LuAudioLines className="size-4 -rotate-90" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("export.multiCamera.selectFromTimeline")}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-secondary-foreground">
              {t("export.multiCamera.cameraSelection")}
            </Label>
            <div className="text-xs text-muted-foreground">
              {t("export.multiCamera.cameraSelectionHelp")}
            </div>
            <div
              className={cn(
                "scrollbar-container space-y-2",
                isDesktop && "max-h-64 overflow-y-auto pr-1",
              )}
            >
              {isEventsLoading && (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  {t("export.multiCamera.checkingActivity")}
                </div>
              )}
              {!isEventsLoading && cameraActivities.length === 0 && (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  {t("export.multiCamera.noCameras")}
                </div>
              )}
              {cameraActivities.map((activity) => {
                const isSelected = selectedCameraIds.includes(activity.camera);

                return (
                  <button
                    key={activity.camera}
                    type="button"
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "border-selected bg-selected/10 ring-1 ring-selected"
                        : "border-transparent bg-secondary/40 hover:bg-secondary/70",
                      !activity.hasDetections &&
                        !isSelected &&
                        "text-muted-foreground",
                    )}
                    onClick={() => toggleCameraSelection(activity.camera)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-primary">
                          {resolveCameraName(config, activity.camera)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t("export.multiCamera.detectionCount", {
                            count: activity.count,
                          })}
                        </span>
                      </div>
                      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        {activity.segments.map((segment, index) => {
                          const leftPct = segment.start * 100;
                          const widthPct = Math.max(
                            (segment.end - segment.start) * 100,
                            1,
                          );
                          return (
                            <div
                              key={index}
                              className="absolute top-0 h-full rounded-full bg-selected"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-secondary-foreground">
              {t("export.multiCamera.nameLabel")}
            </Label>
            <Input
              className="text-md"
              type="search"
              placeholder={t("export.multiCamera.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-sm text-secondary-foreground">
                {t("export.case.label")}
              </Label>
              <Select
                value={batchCaseSelection}
                onValueChange={(value) => setBatchCaseSelection(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("export.case.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("label.none", { ns: "common" })}
                  </SelectItem>
                  {cases
                    ?.sort((a, b) => a.name.localeCompare(b.name))
                    .map((caseItem) => (
                      <SelectItem key={caseItem.id} value={caseItem.id}>
                        {caseItem.name}
                      </SelectItem>
                    ))}
                  <SelectSeparator />
                  <SelectItem value="new">
                    {t("export.case.newCaseOption")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {batchCaseSelection === "new" && (
                <div className="space-y-2 pt-1">
                  <Input
                    className="text-md"
                    placeholder={t("export.case.newCaseNamePlaceholder")}
                    value={newCaseName}
                    onChange={(event) => setNewCaseName(event.target.value)}
                  />
                  <Textarea
                    className="text-md"
                    placeholder={t("export.case.newCaseDescriptionPlaceholder")}
                    value={newCaseDescription}
                    onChange={(event) =>
                      setNewCaseDescription(event.target.value)
                    }
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {isDesktop && <SelectSeparator className="my-4 bg-secondary" />}
      <DialogFooter
        className={isDesktop ? "" : "mt-3 flex flex-col-reverse gap-4"}
      >
        <div
          className={`cursor-pointer p-2 text-center ${isDesktop ? "" : "w-full"}`}
          onClick={onCancel}
        >
          {t("button.cancel", { ns: "common" })}
        </div>
        {activeTab === "export" ? (
          <Button
            className={isDesktop ? "" : "w-full"}
            aria-label={t("export.selectOrExport")}
            variant="select"
            size="sm"
            disabled={isStartingExport}
            onClick={async () => {
              if (selectedOption == "timeline") {
                setRange({ before: currentTime + 30, after: currentTime - 30 });
                setMode("timeline");
              } else {
                const didQueue = await onStartExport();
                if (didQueue) {
                  setSelectedOption("1");
                }
              }
            }}
          >
            {isStartingExport
              ? t("export.queueing")
              : selectedOption == "timeline"
                ? t("export.select")
                : t("export.export")}
          </Button>
        ) : (
          <Button
            className={isDesktop ? "" : "w-full"}
            aria-label={t("export.multiCamera.exportButton", {
              count: selectedCameraCount,
            })}
            variant="select"
            size="sm"
            disabled={!canStartBatchExport}
            onClick={() => void startBatchExport()}
          >
            {isStartingBatchExport
              ? t("export.multiCamera.queueingButton")
              : t("export.multiCamera.exportButton", {
                  count: selectedCameraCount,
                })}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

type ExportPreviewDialogProps = {
  camera: string;
  range?: TimeRange;
  showPreview: boolean;
  setShowPreview: (showPreview: boolean) => void;
};

export function ExportPreviewDialog({
  camera,
  range,
  showPreview,
  setShowPreview,
}: ExportPreviewDialogProps) {
  const { t } = useTranslation(["components/dialog"]);
  if (!range) {
    return null;
  }

  const source = `${baseUrl}vod/${camera}/start/${range.after}/end/${range.before}/index.m3u8`;

  return (
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogContent
        className={cn(
          "scrollbar-container overflow-y-auto",
          isDesktop &&
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
          isMobile && "px-4",
        )}
      >
        <DialogHeader>
          <DialogTitle>{t("export.fromTimeline.previewExport")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("export.fromTimeline.previewExport")}
          </DialogDescription>
        </DialogHeader>
        <GenericVideoPlayer source={source} />
      </DialogContent>
    </Dialog>
  );
}
