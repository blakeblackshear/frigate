import { useCallback, useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaArrowDown, FaCalendarAlt, FaCog, FaFilter } from "react-icons/fa";
import { TimeRange } from "@/types/timeline";
import { ExportContent } from "./ExportDialog";
import { ExportMode } from "@/types/filter";
import ReviewActivityCalendar from "./ReviewActivityCalendar";
import { SelectSeparator } from "../ui/select";
import { ReviewFilter, ReviewSeverity, ReviewSummary } from "@/types/review";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { GeneralFilterContent } from "../filter/ReviewFilterGroup";
import { toast } from "sonner";
import axios from "axios";
import SaveExportOverlay from "./SaveExportOverlay";
import { isMobile } from "react-device-detect";

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
  reviewSummary?: ReviewSummary;
  allLabels: string[];
  onUpdateFilter: (filter: ReviewFilter) => void;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
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
  reviewSummary,
  allLabels,
  onUpdateFilter,
  setRange,
  setMode,
}: MobileReviewSettingsDrawerProps) {
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("none");

  // exports

  const [name, setName] = useState("");
  const onStartExport = useCallback(() => {
    if (!range) {
      toast.error("No valid time range selected", { position: "top-center" });
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
            "Successfully started export. View the file in the /exports folder.",
            { position: "top-center" },
          );
          setName("");
          setRange(undefined);
          setMode("none");
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(
            `Failed to start export: ${error.response.data.message}`,
            { position: "top-center" },
          );
        } else {
          toast.error(`Failed to start export: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [camera, name, range, setRange, setName, setMode]);

  // filters

  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    filter?.labels,
  );

  if (!isMobile) {
    return;
  }

  let content;
  if (drawerMode == "select") {
    content = (
      <div className="w-full p-4 flex flex-col gap-2">
        {features.includes("export") && (
          <Button
            className="w-full flex justify-center items-center gap-2"
            onClick={() => {
              setDrawerMode("export");
              setMode("select");
            }}
          >
            <FaArrowDown className="p-1 fill-secondary bg-secondary-foreground rounded-md" />
            Export
          </Button>
        )}
        {features.includes("calendar") && (
          <Button
            className="w-full flex justify-center items-center gap-2"
            variant={filter?.after ? "select" : "default"}
            onClick={() => setDrawerMode("calendar")}
          >
            <FaCalendarAlt
              className={`${filter?.after ? "text-selected-foreground" : "text-secondary-foreground"}`}
            />
            Calendar
          </Button>
        )}
        {features.includes("filter") && (
          <Button
            className="w-full flex justify-center items-center gap-2"
            variant={filter?.labels ? "select" : "default"}
            onClick={() => setDrawerMode("filter")}
          >
            <FaFilter
              className={`${filter?.labels ? "text-selected-foreground" : "text-secondary-foreground"}`}
            />
            Filter
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
      <div className="w-full flex flex-col">
        <div className="w-full h-8 relative">
          <div
            className="absolute left-0 text-selected"
            onClick={() => setDrawerMode("select")}
          >
            Back
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-muted-foreground">
            Calendar
          </div>
        </div>
        <ReviewActivityCalendar
          reviewSummary={reviewSummary}
          selectedDay={
            filter?.after == undefined
              ? undefined
              : new Date(filter.after * 1000)
          }
          onSelect={(day) => {
            onUpdateFilter({
              ...filter,
              after: day == undefined ? undefined : day.getTime() / 1000,
              before: day == undefined ? undefined : getEndOfDayTimestamp(day),
            });
          }}
        />
        <SelectSeparator />
        <div className="p-2 flex justify-center items-center">
          <Button
            onClick={() => {
              onUpdateFilter({
                ...filter,
                after: undefined,
                before: undefined,
              });
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  } else if (drawerMode == "filter") {
    content = (
      <div className="w-full h-auto overflow-y-auto flex flex-col">
        <div className="w-full h-8 mb-2 relative">
          <div
            className="absolute left-0 text-selected"
            onClick={() => setDrawerMode("select")}
          >
            Back
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-muted-foreground">
            Filter
          </div>
        </div>
        <GeneralFilterContent
          allLabels={allLabels}
          selectedLabels={filter?.labels}
          currentLabels={currentLabels}
          currentSeverity={currentSeverity}
          showAll={filter?.showAll == true}
          setShowAll={(showAll) => {
            onUpdateFilter({ ...filter, showAll });
          }}
          setCurrentLabels={setCurrentLabels}
          updateLabelFilter={(newLabels) =>
            onUpdateFilter({ ...filter, labels: newLabels })
          }
          onClose={() => setDrawerMode("select")}
        />
      </div>
    );
  }

  return (
    <>
      <SaveExportOverlay
        className="absolute top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        show={mode == "timeline"}
        onSave={() => onStartExport()}
        onCancel={() => setMode("none")}
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
            className="rounded-lg capitalize"
            variant={filter?.labels || filter?.after ? "select" : "default"}
            size="sm"
            onClick={() => setDrawerMode("select")}
          >
            <FaCog
              className={`${filter?.labels || filter?.after ? "text-selected-foreground" : "text-secondary-foreground"}`}
            />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[80dvh] overflow-hidden flex flex-col items-center gap-2 px-4 pb-4 mx-1 rounded-t-2xl">
          {content}
        </DrawerContent>
      </Drawer>
    </>
  );
}
