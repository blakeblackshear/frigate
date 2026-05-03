import { useCallback, useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaArrowDown, FaCalendarAlt, FaCog, FaFilter } from "react-icons/fa";
import { LuBug, LuShare2 } from "react-icons/lu";
import { TimeRange } from "@/types/timeline";
import { ExportContent, ExportPreviewDialog, ExportTab } from "./ExportDialog";
import {
  DebugReplayContent,
  SaveDebugReplayOverlay,
} from "./DebugReplayDialog";
import { ExportMode, GeneralFilter } from "@/types/filter";
import ReviewActivityCalendar from "./ReviewActivityCalendar";
import { SelectSeparator } from "../ui/select";
import {
  RecordingsSummary,
  ReviewFilter,
  ReviewSeverity,
  ReviewSummary,
} from "@/types/review";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { GeneralFilterContent } from "../filter/ReviewFilterGroup";
import { toast } from "sonner";
import axios, { AxiosError } from "axios";
import SaveExportOverlay from "./SaveExportOverlay";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { StartExportResponse } from "@/types/export";
import { ShareTimestampContent } from "./ShareTimestampDialog";

type DrawerMode =
  | "none"
  | "select"
  | "export"
  | "calendar"
  | "filter"
  | "debug-replay"
  | "share-timestamp";

const DRAWER_FEATURES = [
  "export",
  "calendar",
  "filter",
  "debug-replay",
  "share-timestamp",
] as const;
export type DrawerFeatures = (typeof DRAWER_FEATURES)[number];
const DEFAULT_DRAWER_FEATURES: DrawerFeatures[] = [
  "export",
  "calendar",
  "filter",
  "debug-replay",
  "share-timestamp",
];

type MobileReviewSettingsDrawerProps = {
  features?: DrawerFeatures[];
  camera: string;
  filter?: ReviewFilter;
  currentSeverity?: ReviewSeverity;
  latestTime: number;
  currentTime: number;
  range?: TimeRange;
  mode: ExportMode;
  showExportPreview: boolean;
  reviewSummary?: ReviewSummary;
  recordingsSummary?: RecordingsSummary;
  allLabels: string[];
  allZones: string[];
  debugReplayMode?: ExportMode;
  debugReplayRange?: TimeRange;
  setDebugReplayMode?: (mode: ExportMode) => void;
  setDebugReplayRange?: (range: TimeRange | undefined) => void;
  onShareTimestamp?: (timestamp: number) => void;
  onUpdateFilter: (filter: ReviewFilter) => void;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
  setShowExportPreview: (showPreview: boolean) => void;
};
export default function MobileReviewSettingsDrawer({
  features = DEFAULT_DRAWER_FEATURES,
  camera,
  filter,
  currentSeverity,
  latestTime,
  currentTime,
  range,
  mode,
  showExportPreview,
  reviewSummary,
  recordingsSummary,
  allLabels,
  allZones,
  debugReplayMode = "none",
  debugReplayRange,
  setDebugReplayMode = () => {},
  setDebugReplayRange = () => {},
  onShareTimestamp = () => {},
  onUpdateFilter,
  setRange,
  setMode,
  setShowExportPreview,
}: MobileReviewSettingsDrawerProps) {
  const { t } = useTranslation([
    "views/recording",
    "components/dialog",
    "views/replay",
    "common",
  ]);
  const navigate = useNavigate();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("none");
  const [exportTab, setExportTab] = useState<ExportTab>("export");
  const [selectedReplayOption, setSelectedReplayOption] = useState<
    "1" | "5" | "custom" | "timeline"
  >("1");
  const [isDebugReplayStarting, setIsDebugReplayStarting] = useState(false);
  const [selectedShareOption, setSelectedShareOption] = useState<
    "current" | "custom"
  >("current");
  const [shareTimestampAtOpen, setShareTimestampAtOpen] = useState(
    Math.floor(currentTime),
  );
  const [customShareTimestamp, setCustomShareTimestamp] = useState(
    Math.floor(currentTime),
  );

  // exports

  const [name, setName] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(
    undefined,
  );
  const [singleNewCaseName, setSingleNewCaseName] = useState("");
  const [singleNewCaseDescription, setSingleNewCaseDescription] = useState("");
  const [isStartingExport, setIsStartingExport] = useState(false);
  const onStartExport = useCallback(async () => {
    if (isStartingExport) {
      return false;
    }

    if (!range) {
      toast.error(
        t("export.toast.error.noVaildTimeSelected", {
          ns: "components/dialog",
        }),
        {
          position: "top-center",
        },
      );
      return false;
    }

    if (range.before < range.after) {
      toast.error(
        t("export.toast.error.endTimeMustAfterStartTime", {
          ns: "components/dialog",
        }),
        {
          position: "top-center",
        },
      );
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

      toast.success(t("export.toast.queued", { ns: "components/dialog" }), {
        position: "top-center",
        action: (
          <a href="/export" target="_blank" rel="noopener noreferrer">
            <Button>
              {t("export.toast.view", { ns: "components/dialog" })}
            </Button>
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
          ns: "components/dialog",
          error: errorMessage,
        }),
        {
          position: "top-center",
        },
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
    setRange,
    setMode,
    t,
  ]);

  const onStartDebugReplay = useCallback(async () => {
    if (
      !debugReplayRange ||
      debugReplayRange.before <= debugReplayRange.after
    ) {
      toast.error(
        t("dialog.toast.error", {
          error: "End time must be after start time",
          ns: "views/replay",
        }),
        { position: "top-center" },
      );
      return;
    }

    setIsDebugReplayStarting(true);

    try {
      const response = await axios.post("debug_replay/start", {
        camera: camera,
        start_time: debugReplayRange.after,
        end_time: debugReplayRange.before,
      });

      if (response.status === 202 || response.status === 200) {
        setDebugReplayMode("none");
        setDebugReplayRange(undefined);
        setDrawerMode("none");
        navigate("/replay");
      }
    } catch (error) {
      const axiosError = error as AxiosError<{
        message?: string;
        detail?: string;
      }>;
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.detail ||
        "Unknown error";

      if (axiosError.response?.status === 409) {
        toast.error(t("dialog.toast.alreadyActive", { ns: "views/replay" }), {
          position: "top-center",
        });
      } else {
        toast.error(
          t("dialog.toast.error", {
            error: errorMessage,
            ns: "views/replay",
          }),
          {
            position: "top-center",
          },
        );
      }
    } finally {
      setIsDebugReplayStarting(false);
    }
  }, [
    camera,
    debugReplayRange,
    navigate,
    setDebugReplayMode,
    setDebugReplayRange,
    t,
  ]);

  // filters

  const [currentFilter, setCurrentFilter] = useState<GeneralFilter>({
    labels: filter?.labels,
    zones: filter?.zones,
    showAll: filter?.showAll,
    ...filter,
  });

  if (!isMobile) {
    return;
  }

  let content;
  if (drawerMode == "select") {
    content = (
      <div className="flex w-full flex-col gap-2 p-4">
        {features.includes("export") && (
          <Button
            className="flex w-full items-center justify-center gap-2"
            aria-label={t("export")}
            onClick={() => {
              setExportTab("export");
              setDrawerMode("export");
              setMode("select");
            }}
          >
            <FaArrowDown className="rounded-md bg-secondary-foreground fill-secondary p-1" />
            {t("export")}
          </Button>
        )}
        {features.includes("share-timestamp") && (
          <Button
            className="flex w-full items-center justify-center gap-2"
            aria-label={t("recording.shareTimestamp.label", {
              ns: "components/dialog",
            })}
            onClick={() => {
              const initialTimestamp = Math.floor(currentTime);

              setShareTimestampAtOpen(initialTimestamp);
              setCustomShareTimestamp(initialTimestamp);
              setSelectedShareOption("current");
              setDrawerMode("share-timestamp");
            }}
          >
            <LuShare2 className="size-5 rounded-md bg-secondary-foreground stroke-secondary p-1" />
            {t("recording.shareTimestamp.label", {
              ns: "components/dialog",
            })}
          </Button>
        )}
        {features.includes("calendar") && (
          <Button
            className="flex w-full items-center justify-center gap-2"
            aria-label={t("calendar")}
            variant={filter?.after ? "select" : "default"}
            onClick={() => setDrawerMode("calendar")}
          >
            <FaCalendarAlt
              className={`${filter?.after ? "text-selected-foreground" : "text-secondary-foreground"}`}
            />
            {t("calendar")}
          </Button>
        )}
        {features.includes("filter") && (
          <Button
            className="flex w-full items-center justify-center gap-2"
            aria-label={t("filter")}
            variant={filter?.labels || filter?.zones ? "select" : "default"}
            onClick={() => setDrawerMode("filter")}
          >
            <FaFilter
              className={`${filter?.labels || filter?.zones ? "text-selected-foreground" : "text-secondary-foreground"}`}
            />
            {t("filter")}
          </Button>
        )}
        {features.includes("debug-replay") && (
          <Button
            className="flex w-full items-center justify-center gap-2"
            aria-label={t("title", { ns: "views/replay" })}
            onClick={() => {
              setDebugReplayRange({
                after: latestTime - 60,
                before: latestTime,
              });
              setSelectedReplayOption("1");
              setDrawerMode("debug-replay");
              setDebugReplayMode("select");
            }}
          >
            <LuBug className="size-5 rounded-md bg-secondary-foreground fill-secondary stroke-secondary p-1" />
            {t("title", { ns: "views/replay" })}
          </Button>
        )}
      </div>
    );
  } else if (drawerMode == "export") {
    content = (
      <ExportContent
        latestTime={latestTime}
        currentTime={currentTime}
        range={range}
        name={name}
        selectedCaseId={selectedCaseId}
        singleNewCaseName={singleNewCaseName}
        singleNewCaseDescription={singleNewCaseDescription}
        activeTab={exportTab}
        isStartingExport={isStartingExport}
        onStartExport={onStartExport}
        setActiveTab={setExportTab}
        setName={setName}
        setSelectedCaseId={setSelectedCaseId}
        setSingleNewCaseName={setSingleNewCaseName}
        setSingleNewCaseDescription={setSingleNewCaseDescription}
        setRange={setRange}
        setMode={(mode) => {
          setMode(mode);

          if (mode == "timeline" || mode == "timeline_multi") {
            setDrawerMode("none");
          }
        }}
        onCancel={() => {
          setMode("none");
          setRange(undefined);
          setSelectedCaseId(undefined);
          setSingleNewCaseName("");
          setSingleNewCaseDescription("");
          setExportTab("export");
          setDrawerMode("select");
        }}
      />
    );
  } else if (drawerMode == "calendar") {
    content = (
      <div className="flex w-full flex-col">
        <div className="relative h-8 w-full">
          <div
            className="absolute left-0 text-selected"
            onClick={() => setDrawerMode("select")}
          >
            {t("button.back", { ns: "common" })}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-muted-foreground">
            {t("calendar")}
          </div>
        </div>
        <div className="flex w-full flex-row justify-center">
          <ReviewActivityCalendar
            reviewSummary={reviewSummary}
            recordingsSummary={recordingsSummary}
            selectedDay={
              filter?.after == undefined
                ? undefined
                : new Date(filter.after * 1000)
            }
            onSelect={(day) => {
              onUpdateFilter({
                ...filter,
                after: day == undefined ? undefined : day.getTime() / 1000,
                before:
                  day == undefined ? undefined : getEndOfDayTimestamp(day),
              });
            }}
          />
        </div>
        <SelectSeparator />
        <div className="flex items-center justify-center p-2">
          <Button
            aria-label={t("button.reset", { ns: "common" })}
            onClick={() => {
              onUpdateFilter({
                ...filter,
                after: undefined,
                before: undefined,
              });
            }}
          >
            {t("button.reset", { ns: "common" })}
          </Button>
        </div>
      </div>
    );
  } else if (drawerMode == "filter") {
    content = (
      <div className="scrollbar-container flex h-auto w-full flex-col overflow-y-auto overflow-x-hidden">
        <div className="relative mb-2 h-8 w-full">
          <div
            className="absolute left-0 text-selected"
            onClick={() => setDrawerMode("select")}
          >
            {t("button.back", { ns: "common" })}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-muted-foreground">
            {t("filter")}
          </div>
        </div>
        <GeneralFilterContent
          allLabels={allLabels}
          selectedLabels={filter?.labels}
          currentSeverity={currentSeverity}
          allZones={allZones}
          filter={currentFilter}
          selectedZones={filter?.zones}
          onUpdateFilter={setCurrentFilter}
          onApply={() => {
            if (currentFilter !== filter) {
              onUpdateFilter(currentFilter);
            }
          }}
          onReset={() => {
            const resetFilter: GeneralFilter = {};
            setCurrentFilter(resetFilter);
            onUpdateFilter(resetFilter);
          }}
          onClose={() => setDrawerMode("select")}
        />
      </div>
    );
  } else if (drawerMode == "debug-replay") {
    const handleTimeOptionChange = (
      option: "1" | "5" | "custom" | "timeline",
    ) => {
      setSelectedReplayOption(option);

      if (option === "custom" || option === "timeline") {
        return;
      }

      const minutes = parseInt(option, 10);
      const end = latestTime;
      setDebugReplayRange({ after: end - minutes * 60, before: end });
    };

    content = (
      <DebugReplayContent
        currentTime={currentTime}
        latestTime={latestTime}
        range={debugReplayRange}
        selectedOption={selectedReplayOption}
        isStarting={isDebugReplayStarting}
        onSelectedOptionChange={handleTimeOptionChange}
        onStart={onStartDebugReplay}
        onCancel={() => {
          setDebugReplayMode("none");
          setDebugReplayRange(undefined);
          setDrawerMode("select");
        }}
        setRange={setDebugReplayRange}
        setMode={(mode) => {
          setDebugReplayMode(mode);

          if (mode == "timeline") {
            setDrawerMode("none");
          }
        }}
      />
    );
  } else if (drawerMode == "share-timestamp") {
    content = (
      <div className="w-full">
        <div className="relative h-8 w-full">
          <div className="absolute left-1/2 -translate-x-1/2 text-muted-foreground">
            {t("recording.shareTimestamp.title", { ns: "components/dialog" })}
          </div>
        </div>
        <ShareTimestampContent
          currentTime={shareTimestampAtOpen}
          selectedOption={selectedShareOption}
          setSelectedOption={setSelectedShareOption}
          customTimestamp={customShareTimestamp}
          setCustomTimestamp={setCustomShareTimestamp}
          onShareTimestamp={(timestamp) => {
            onShareTimestamp(timestamp);
            setDrawerMode("none");
          }}
          onCancel={() => setDrawerMode("select")}
        />
      </div>
    );
  }

  return (
    <>
      <SaveExportOverlay
        className="pointer-events-none absolute left-1/2 top-8 z-50 -translate-x-1/2"
        show={mode == "timeline" || mode == "timeline_multi"}
        hidePreview={mode == "timeline_multi"}
        isSaving={isStartingExport}
        saveLabel={
          mode == "timeline_multi"
            ? t("export.fromTimeline.useThisRange", { ns: "components/dialog" })
            : undefined
        }
        onSave={() => {
          if (mode == "timeline_multi") {
            setExportTab("multi");
            setDrawerMode("export");
            setMode("select");
            return;
          }

          void onStartExport();
        }}
        onCancel={() => {
          setExportTab("export");
          setRange(undefined);
          setMode("none");
        }}
        onPreview={() => setShowExportPreview(true)}
      />
      <SaveDebugReplayOverlay
        className="pointer-events-none absolute left-1/2 top-8 z-50 -translate-x-1/2"
        show={debugReplayRange != undefined && debugReplayMode == "timeline"}
        isStarting={isDebugReplayStarting}
        onSave={onStartDebugReplay}
        onCancel={() => {
          setDebugReplayMode("none");
          setDebugReplayRange(undefined);
        }}
      />
      <ExportPreviewDialog
        camera={camera}
        range={range}
        showPreview={showExportPreview}
        setShowPreview={setShowExportPreview}
      />
      <Drawer
        open={drawerMode != "none"}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerMode("none");
          }
        }}
      >
        <DrawerTrigger asChild>
          <Button
            className="rounded-lg smart-capitalize"
            aria-label={t("filters")}
            variant={
              filter?.labels || filter?.after || filter?.zones
                ? "select"
                : "default"
            }
            size="sm"
            onClick={() => setDrawerMode("select")}
          >
            <FaCog
              className={`${filter?.labels || filter?.after || filter?.zones ? "text-selected-foreground" : "text-secondary-foreground"}`}
            />
          </Button>
        </DrawerTrigger>
        <DrawerContent
          className={`mx-1 flex max-h-[80dvh] flex-col items-center gap-2 rounded-t-2xl px-4 pb-4 ${drawerMode == "export" || drawerMode == "debug-replay" ? "overflow-visible" : "overflow-hidden"}`}
        >
          {content}
        </DrawerContent>
      </Drawer>
    </>
  );
}
