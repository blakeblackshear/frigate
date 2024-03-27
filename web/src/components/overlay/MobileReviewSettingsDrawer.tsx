import { useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaArrowDown, FaCalendarAlt, FaCog, FaFilter } from "react-icons/fa";
import { TimeRange } from "@/types/timeline";
import { ExportContent } from "./ExportDialog";
import { ExportMode } from "@/types/filter";
import ReviewActivityCalendar from "./ReviewActivityCalendar";
import { SelectSeparator } from "../ui/select";
import { ReviewFilter } from "@/types/review";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { GeneralFilterContent } from "../filter/ReviewFilterGroup";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

const ATTRIBUTES = ["amazon", "face", "fedex", "license_plate", "ups"];
type DrawerMode = "none" | "select" | "export" | "calendar" | "filter";

type MobileReviewSettingsDrawerProps = {
  camera: string;
  filter?: ReviewFilter;
  latestTime: number;
  currentTime: number;
  range?: TimeRange;
  mode: ExportMode;
  onUpdateFilter: (filter: ReviewFilter | undefined) => void;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
};
export default function MobileReviewSettingsDrawer({
  camera,
  filter,
  latestTime,
  currentTime,
  range,
  mode,
  onUpdateFilter,
  setRange,
  setMode,
}: MobileReviewSettingsDrawerProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("none");

  const allLabels = useMemo<string[]>(() => {
    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    const cameras = filter?.cameras || Object.keys(config.cameras);

    cameras.forEach((camera) => {
      const cameraConfig = config.cameras[camera];
      cameraConfig.objects.track.forEach((label) => {
        if (!ATTRIBUTES.includes(label)) {
          labels.add(label);
        }
      });

      if (cameraConfig.audio.enabled_in_config) {
        cameraConfig.audio.listen.forEach((label) => {
          labels.add(label);
        });
      }
    });

    return [...labels].sort();
  }, [config, filter]);
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    filter?.labels,
  );

  let content;
  if (drawerMode == "select") {
    content = (
      <div className="w-full p-4 flex flex-col gap-2">
        <Button
          className="w-full flex justify-center items-center gap-2"
          onClick={() => setDrawerMode("export")}
        >
          <FaArrowDown className="p-1 fill-secondary bg-muted-foreground rounded-md" />
          Export
        </Button>
        <Button
          className="w-full flex justify-center items-center gap-2"
          onClick={() => setDrawerMode("calendar")}
        >
          <FaCalendarAlt className="fill-muted-foreground" />
          Calendar
        </Button>
        <Button
          className="w-full flex justify-center items-center gap-2"
          onClick={() => setDrawerMode("filter")}
        >
          <FaFilter className="fill-muted-foreground" />
          Filter
        </Button>
      </div>
    );
  } else if (drawerMode == "export") {
    content = (
      <ExportContent
        camera={camera}
        latestTime={latestTime}
        currentTime={currentTime}
        range={range}
        mode={mode}
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
            variant="secondary"
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
      <div className="w-full flex flex-col">
        <div className="w-full h-8 relative">
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
          showReviewed={0}
          reviewed={0}
          setCurrentLabels={setCurrentLabels}
          updateLabelFilter={(newLabels) =>
            onUpdateFilter({ ...filter, labels: newLabels })
          }
          setShowReviewed={() => {}}
          setReviewed={() => {}}
          onClose={() => setDrawerMode("select")}
        />
      </div>
    );
  }

  return (
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
          size="sm"
          variant="secondary"
          onClick={() => setDrawerMode("select")}
        >
          <FaCog className="text-muted-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[75dvh] overflow-hidden flex flex-col items-center gap-2 px-4 pb-4 mx-4 rounded-2xl">
        {content}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * <MobileTimelineDrawer
              selected={timelineType ?? "timeline"}
              onSelect={setTimelineType}
            />
 */
