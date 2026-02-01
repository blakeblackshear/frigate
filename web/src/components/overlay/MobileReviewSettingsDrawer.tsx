import { useCallback, useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaArrowDown, FaCalendarAlt, FaCog, FaFilter } from "react-icons/fa";
import { TimeRange } from "@/types/timeline";
import { ExportContent, ExportPreviewDialog } from "./ExportDialog";
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
import axios from "axios";
import SaveExportOverlay from "./SaveExportOverlay";
import { isIOS, isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";

type DrawerMode = "none" | "select" | "export" | "calendar" | "filter";

const DRAWER_FEATURES = ["export", "calendar", "filter"] as const;
export type DrawerFeatures = (typeof DRAWER_FEATURES)[number];
const DEFAULT_DRAWER_FEATURES: DrawerFeatures[] = [
  "export",
  "calendar",
  "filter",
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
  onUpdateFilter,
  setRange,
  setMode,
  setShowExportPreview,
}: MobileReviewSettingsDrawerProps) {
  const { t } = useTranslation(["views/recording", "components/dialog"]);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("none");

  // exports

  const [name, setName] = useState("");
  const onStartExport = useCallback(() => {
    if (!range) {
      toast.error(t("toast.error.noValidTimeSelected"), {
        position: "top-center",
      });
      return;
    }

    if (range.before < range.after) {
      toast.error(t("toast.error.endTimeMustAfterStartTime"), {
        position: "top-center",
      });
      return;
    }

    axios
      .post(
        `export/${camera}/start/${Math.round(range.after)}/end/${Math.round(range.before)}`,
        {
          playback: "realtime",
          name,
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
          setName("");
          setRange(undefined);
          setMode("none");
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
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      });
  }, [camera, name, range, setRange, setName, setMode, t]);

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
              setDrawerMode("export");
              setMode("select");
            }}
          >
            <FaArrowDown className="rounded-md bg-secondary-foreground fill-secondary p-1" />
            {t("export")}
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
      </div>
    );
  } else if (drawerMode == "export") {
    content = (
      <ExportContent
        latestTime={latestTime}
        currentTime={currentTime}
        range={range}
        name={name}
        onStartExport={onStartExport}
        setName={setName}
        setRange={setRange}
        setMode={(mode) => {
          setMode(mode);

          if (mode == "timeline") {
            setDrawerMode("none");
          }
        }}
        onCancel={() => {
          setMode("none");
          setRange(undefined);
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
  }

  return (
    <>
      <SaveExportOverlay
        className="pointer-events-none absolute left-1/2 top-8 z-50 -translate-x-1/2"
        show={mode == "timeline"}
        onSave={() => onStartExport()}
        onCancel={() => setMode("none")}
        onPreview={() => setShowExportPreview(true)}
      />
      <ExportPreviewDialog
        camera={camera}
        range={range}
        showPreview={showExportPreview}
        setShowPreview={setShowExportPreview}
      />
      <Drawer
        modal={!(isIOS && drawerMode == "export")}
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
        <DrawerContent className="mx-1 flex max-h-[80dvh] flex-col items-center gap-2 overflow-hidden rounded-t-2xl px-4 pb-4">
          {content}
        </DrawerContent>
      </Drawer>
    </>
  );
}
