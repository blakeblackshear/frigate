import { useCallback, useState } from "react";
import { baseUrl } from "@/api/baseUrl";
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
import axios from "axios";
import { toast } from "sonner";
import { isDesktop } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SelectSeparator } from "../ui/select";
import ActivityIndicator from "../indicators/activity-indicator";
import { LuBug, LuPlay, LuTriangleAlert, LuX } from "react-icons/lu";
import useSWR from "swr";
import { ExportMode } from "@/types/filter";
import { TimeRange } from "@/types/timeline";
import { DebugReplayStatus } from "@/types/replay";
import { cn } from "@/lib/utils";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { Alert, AlertDescription } from "../ui/alert";
import { CustomTimeSelector } from "./CustomTimeSelector";

const REPLAY_TIME_OPTIONS = ["1", "5", "timeline", "custom"] as const;
type ReplayTimeOption = (typeof REPLAY_TIME_OPTIONS)[number];

type DebugReplayContentProps = {
  currentTime: number;
  latestTime: number;
  range?: TimeRange;
  selectedOption: ReplayTimeOption;
  isStarting: boolean;
  onSelectedOptionChange: (option: ReplayTimeOption) => void;
  onStart: () => void;
  onCancel: () => void;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
};

export function DebugReplayContent({
  currentTime,
  latestTime,
  range,
  selectedOption,
  isStarting,
  onSelectedOptionChange,
  onStart,
  onCancel,
  setRange,
  setMode,
}: DebugReplayContentProps) {
  const { t } = useTranslation(["views/replay"]);

  // Only one replay session can run at a time, so check on open rather than
  // letting the user configure a range only to hit a 409 on start
  const { data: replayStatus, mutate: refreshReplayStatus } =
    useSWR<DebugReplayStatus>("debug_replay/status");
  const replayActive = replayStatus?.active ?? false;
  const activeSourceCamera = useCameraFriendlyName(
    replayStatus?.source_camera ?? undefined,
  );
  const [isStopping, setIsStopping] = useState(false);

  const handleStopActive = useCallback(() => {
    setIsStopping(true);

    axios
      .post("debug_replay/stop")
      .catch((error) => {
        // 400 means no session is active, e.g. startup failed and the
        // server already cleaned it up, so there is nothing to stop
        if (error.response?.status === 400) {
          return;
        }

        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("dialog.toast.stopError", { error: errorMessage }), {
          position: "top-center",
        });
      })
      // refresh on failure too, otherwise a session that ended on its own
      // leaves the banner up and Start disabled until the dialog reopens
      .then(() => refreshReplayStatus())
      .finally(() => {
        setIsStopping(false);
      });
  }, [refreshReplayStatus, t]);

  return (
    <div className="w-full">
      {isDesktop && (
        <>
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          <SelectSeparator className="my-4 bg-secondary" />
        </>
      )}

      {replayActive && (
        <Alert
          variant="warning"
          className="mt-4 flex items-start gap-2 [&>svg+div]:translate-y-0 [&>svg]:static [&>svg~*]:pl-0"
        >
          <LuTriangleAlert className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AlertDescription>
              {t("dialog.activeSession.description", {
                camera: activeSourceCamera,
              })}
            </AlertDescription>
            <Button
              className="flex shrink-0 items-center gap-2 self-start sm:self-auto"
              variant="destructive"
              size="sm"
              disabled={isStopping}
              onClick={handleStopActive}
            >
              {isStopping && <ActivityIndicator className="size-4" />}
              {isStopping
                ? t("dialog.activeSession.stopping")
                : t("dialog.activeSession.stop")}
            </Button>
          </div>
        </Alert>
      )}

      {/* Time range */}
      <div className="mt-4 flex flex-col gap-2">
        <RadioGroup
          className="mt-2 flex flex-col gap-4"
          value={selectedOption}
          onValueChange={(value) =>
            onSelectedOptionChange(value as ReplayTimeOption)
          }
        >
          {REPLAY_TIME_OPTIONS.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem
                className={
                  opt === selectedOption
                    ? "bg-selected from-selected/50 to-selected/90 text-selected"
                    : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                }
                id={`replay-${opt}`}
                value={opt}
              />
              <Label className="cursor-pointer" htmlFor={`replay-${opt}`}>
                {opt === "custom"
                  ? t("dialog.preset.custom")
                  : opt === "timeline"
                    ? t("dialog.preset.timeline")
                    : t(`dialog.preset.${opt}m`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Custom time inputs */}
      {selectedOption === "custom" && (
        <CustomTimeSelector
          latestTime={latestTime}
          range={range}
          setRange={setRange}
          startLabel={t("dialog.startLabel")}
          endLabel={t("dialog.endLabel")}
        />
      )}

      {isDesktop && <SelectSeparator className="my-4 bg-secondary" />}

      <DialogFooter className="mt-3 sm:mt-0">
        <Button
          aria-label={t("button.cancel", { ns: "common" })}
          onClick={onCancel}
        >
          {t("button.cancel", { ns: "common" })}
        </Button>
        <Button
          variant="select"
          disabled={isStarting || isStopping || replayActive}
          onClick={() => {
            if (selectedOption === "timeline") {
              setRange({
                after: currentTime - 30,
                before: currentTime + 30,
              });
              setMode("timeline");
            } else {
              onStart();
            }
          }}
        >
          {isStarting ? <ActivityIndicator className="mr-2" /> : null}
          {isStarting
            ? t("dialog.starting")
            : selectedOption === "timeline"
              ? t("dialog.selectFromTimeline")
              : t("dialog.startButton")}
        </Button>
      </DialogFooter>
    </div>
  );
}

type DebugReplayDialogProps = {
  camera: string;
  currentTime: number;
  latestTime: number;
  range?: TimeRange;
  mode: ExportMode;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
};

export default function DebugReplayDialog({
  camera,
  currentTime,
  latestTime,
  range,
  mode,
  setRange,
  setMode,
}: DebugReplayDialogProps) {
  const { t } = useTranslation(["views/replay"]);
  const navigate = useNavigate();

  const [selectedOption, setSelectedOption] = useState<ReplayTimeOption>("1");
  const [isStarting, setIsStarting] = useState(false);

  const handleTimeOptionChange = useCallback(
    (option: ReplayTimeOption) => {
      setSelectedOption(option);

      if (option === "custom" || option === "timeline") {
        return;
      }

      const minutes = parseInt(option, 10);
      const end = latestTime;
      setRange({ after: end - minutes * 60, before: end });
    },
    [latestTime, setRange],
  );

  const handleStart = useCallback(() => {
    if (!range || range.before <= range.after) {
      toast.error(
        t("dialog.toast.error", { error: "End time must be after start time" }),
        { position: "top-center" },
      );
      return;
    }

    setIsStarting(true);

    axios
      .post("debug_replay/start", {
        camera: camera,
        start_time: range.after,
        end_time: range.before,
      })
      .then((response) => {
        if (response.status === 202 || response.status === 200) {
          setMode("none");
          setRange(undefined);
          navigate("/replay");
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";

        if (error.response?.status === 404) {
          toast.error(t("dialog.toast.noRecordings"), {
            position: "top-center",
          });
        } else if (error.response?.status === 409) {
          toast.error(t("dialog.toast.alreadyActive"), {
            position: "top-center",
            closeButton: true,
            dismissible: false,
            action: (
              <a
                href={`${baseUrl}replay`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>{t("dialog.toast.goToReplay")}</Button>
              </a>
            ),
          });
        } else {
          toast.error(t("dialog.toast.error", { error: errorMessage }), {
            position: "top-center",
          });
        }
      })
      .finally(() => {
        setIsStarting(false);
      });
  }, [camera, range, navigate, setMode, setRange, t]);

  const handleCancel = useCallback(() => {
    setMode("none");
    setRange(undefined);
  }, [setMode, setRange]);

  const Overlay = isDesktop ? Dialog : Drawer;
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <>
      <SaveDebugReplayOverlay
        className="pointer-events-none absolute left-1/2 top-8 z-50 -translate-x-1/2"
        show={mode == "timeline"}
        isStarting={isStarting}
        onSave={handleStart}
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
              aria-label={t("title")}
              size="sm"
              onClick={() => {
                const end = latestTime;
                setRange({ after: end - 60, before: end });
                setSelectedOption("1");
                setMode("select");
              }}
            >
              <LuBug className="size-5 rounded-md bg-secondary-foreground fill-secondary stroke-secondary p-1" />
              {isDesktop && <div className="text-primary">{t("title")}</div>}
            </Button>
          </Trigger>
        )}
        <Content
          className={
            isDesktop
              ? "max-h-[90dvh] w-auto max-w-2xl overflow-visible sm:rounded-lg md:rounded-2xl"
              : "max-h-[75dvh] overflow-y-auto rounded-lg px-4 pb-4 md:rounded-2xl"
          }
        >
          <DebugReplayContent
            currentTime={currentTime}
            latestTime={latestTime}
            range={range}
            selectedOption={selectedOption}
            isStarting={isStarting}
            onSelectedOptionChange={handleTimeOptionChange}
            onStart={handleStart}
            onCancel={handleCancel}
            setRange={setRange}
            setMode={setMode}
          />
        </Content>
      </Overlay>
    </>
  );
}

type SaveDebugReplayOverlayProps = {
  className: string;
  show: boolean;
  isStarting: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function SaveDebugReplayOverlay({
  className,
  show,
  isStarting,
  onSave,
  onCancel,
}: SaveDebugReplayOverlayProps) {
  const { t } = useTranslation(["views/replay"]);

  return (
    <div className={className}>
      <div
        className={cn(
          "pointer-events-auto flex items-center justify-center gap-2 rounded-lg px-2",
          show ? "duration-500 animate-in slide-in-from-top" : "invisible",
          "mx-auto mt-5 text-center",
        )}
      >
        <Button
          className="flex items-center gap-1 text-primary"
          aria-label={t("button.cancel", { ns: "common" })}
          size="sm"
          disabled={isStarting}
          onClick={onCancel}
        >
          <LuX />
          {t("button.cancel", { ns: "common" })}
        </Button>
        <Button
          className="flex items-center gap-1"
          aria-label={t("dialog.startButton")}
          variant="select"
          size="sm"
          disabled={isStarting}
          onClick={onSave}
        >
          {isStarting ? <ActivityIndicator className="size-4" /> : <LuPlay />}
          {isStarting ? t("dialog.starting") : t("dialog.startButton")}
        </Button>
      </div>
    </div>
  );
}
