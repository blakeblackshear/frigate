import { useCallback, useState } from "react";
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
import axios from "axios";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { TimeRange } from "@/types/timeline";
import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { isDesktop, isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import SaveExportOverlay from "./SaveExportOverlay";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";
import { GenericVideoPlayer } from "../player/GenericVideoPlayer";
import { useTranslation } from "react-i18next";
import { ExportCase } from "@/types/export";
import { CustomTimeSelector } from "./CustomTimeSelector";
import useRecordingPlaybackSource from "@/hooks/use-recording-playback-source";

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
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(
    undefined,
  );

  const onStartExport = useCallback(() => {
    if (!range) {
      toast.error(t("export.toast.error.noVaildTimeSelected"), {
        position: "top-center",
      });
      return;
    }

    if (range.before < range.after) {
      toast.error(t("export.toast.error.endTimeMustAfterStartTime"), {
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
          export_case_id: selectedCaseId || undefined,
        },
      )
      .then((response) => {
        if (response.status == 200) {
          toast.success(t("export.toast.success"), {
            position: "top-center",
            action: (
              <a href="/export" target="_blank" rel="noopener noreferrer">
                <Button>{t("export.toast.view")}</Button>
              </a>
            ),
          });
          setName("");
          setSelectedCaseId(undefined);
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
            error: errorMessage,
          }),
          { position: "top-center" },
        );
      });
  }, [camera, name, range, selectedCaseId, setRange, setName, setMode, t]);

  const handleCancel = useCallback(() => {
    setName("");
    setSelectedCaseId(undefined);
    setMode("none");
    setRange(undefined);
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
        show={mode == "timeline"}
        onPreview={() => setShowPreview(true)}
        onSave={() => onStartExport()}
        onCancel={handleCancel}
      />
      <Overlay
        open={mode == "select"}
        onOpenChange={(open) => {
          if (!open) {
            setMode("none");
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
                let start = 0;
                now.setHours(now.getHours() - 1);
                start = now.getTime() / 1000;
                setRange({
                  before: latestTime,
                  after: start,
                });
                setMode("select");
              }}
            >
              <FaArrowDown className="rounded-md bg-secondary-foreground fill-secondary p-1" />
              {isDesktop && (
                <div className="text-primary">
                  {t("menu.export", { ns: "common" })}
                </div>
              )}
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
            onStartExport={onStartExport}
            setName={setName}
            setSelectedCaseId={setSelectedCaseId}
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
  onStartExport: () => void;
  setName: (name: string) => void;
  setSelectedCaseId: (caseId: string | undefined) => void;
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
  onStartExport,
  setName,
  setSelectedCaseId,
  setRange,
  setMode,
  onCancel,
}: ExportContentProps) {
  const { t } = useTranslation(["components/dialog"]);
  const [selectedOption, setSelectedOption] = useState<ExportOption>("1");
  const { data: cases } = useSWR<ExportCase[]>("cases");

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
      }

      setRange({
        before: latestTime,
        after: start,
      });
    },
    [latestTime, setRange],
  );

  return (
    <div className="w-full">
      {isDesktop && (
        <>
          <DialogHeader>
            <DialogTitle>{t("menu.export", { ns: "common" })}</DialogTitle>
          </DialogHeader>
          <SelectSeparator className="my-4 bg-secondary" />
        </>
      )}
      <RadioGroup
        className={`flex flex-col gap-4 ${isDesktop ? "" : "mt-4"}`}
        onValueChange={(value) => onSelectTime(value as ExportOption)}
      >
        {EXPORT_OPTIONS.map((opt) => {
          return (
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
              <Label className="cursor-pointer smart-capitalize" htmlFor={opt}>
                {isNaN(parseInt(opt))
                  ? opt == "timeline"
                    ? t("export.time.fromTimeline")
                    : t("export.time." + opt)
                  : t("export.time.lastHour", {
                      count: parseInt(opt),
                    })}
              </Label>
            </div>
          );
        })}
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
        className="text-md my-6"
        type="search"
        placeholder={t("export.name.placeholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="my-4">
        <Label className="text-sm text-secondary-foreground">
          {t("export.case.label", { defaultValue: "Case (optional)" })}
        </Label>
        <Select
          value={selectedCaseId || "none"}
          onValueChange={(value) =>
            setSelectedCaseId(value === "none" ? undefined : value)
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue
              placeholder={t("export.case.placeholder", {
                defaultValue: "Select a case (optional)",
              })}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="none"
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              {t("label.none", { ns: "common" })}
            </SelectItem>
            {cases
              ?.sort((a, b) => a.name.localeCompare(b.name))
              .map((caseItem) => (
                <SelectItem
                  key={caseItem.id}
                  value={caseItem.id}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  {caseItem.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
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
        <Button
          className={isDesktop ? "" : "w-full"}
          aria-label={t("export.selectOrExport")}
          variant="select"
          size="sm"
          onClick={() => {
            if (selectedOption == "timeline") {
              setRange({ before: currentTime + 30, after: currentTime - 30 });
              setMode("timeline");
            } else {
              onStartExport();
              setSelectedOption("1");
              setMode("none");
            }
          }}
        >
          {selectedOption == "timeline"
            ? t("export.select")
            : t("export.export")}
        </Button>
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
  const vodPath = range
    ? `/vod/${camera}/start/${range.after}/end/${range.before}/index.m3u8`
    : `/vod/${camera}/start/0/end/0/index.m3u8`;
  const playbackSource = useRecordingPlaybackSource({
    camera,
    after: range?.after ?? 0,
    before: range?.before ?? 0,
    vodPath,
    enabled: !!range,
  });

  if (!range) {
    return null;
  }

  const source = playbackSource ?? `${baseUrl}${vodPath}`;

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
