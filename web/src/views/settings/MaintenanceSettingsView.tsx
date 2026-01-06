import Heading from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
import { useJobStatus } from "@/api/ws";
import { Switch } from "@/components/ui/switch";
import { LuCheck, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { MediaSyncStats } from "@/types/ws";

export default function MaintenanceSettingsView() {
  const { t } = useTranslation("views/settings");
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([
    "all",
  ]);
  const [dryRun, setDryRun] = useState(true);
  const [force, setForce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MEDIA_TYPES = [
    { id: "event_snapshots", label: t("maintenance.sync.event_snapshots") },
    { id: "event_thumbnails", label: t("maintenance.sync.event_thumbnails") },
    { id: "review_thumbnails", label: t("maintenance.sync.review_thumbnails") },
    { id: "previews", label: t("maintenance.sync.previews") },
    { id: "exports", label: t("maintenance.sync.exports") },
    { id: "recordings", label: t("maintenance.sync.recordings") },
  ];

  // Subscribe to media sync status via WebSocket
  const { payload: currentJob } = useJobStatus("media_sync");

  const isJobRunning = Boolean(
    currentJob &&
      (currentJob.status === "queued" || currentJob.status === "running"),
  );

  const handleMediaTypeChange = useCallback((id: string, checked: boolean) => {
    setSelectedMediaTypes((prev) => {
      if (id === "all") {
        return checked ? ["all"] : [];
      }

      let next = prev.filter((t) => t !== "all");
      if (checked) {
        next.push(id);
      } else {
        next = next.filter((t) => t !== id);
      }
      return next.length === 0 ? ["all"] : next;
    });
  }, []);

  const handleStartSync = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        "/media/sync",
        {
          dry_run: dryRun,
          media_types: selectedMediaTypes,
          force: force,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 202) {
        toast.success(t("maintenance.sync.started"), {
          position: "top-center",
          closeButton: true,
        });
      } else if (response.status === 409) {
        toast.error(t("maintenance.sync.alreadyRunning"), {
          position: "top-center",
          closeButton: true,
        });
      }
    } catch {
      toast.error(t("maintenance.sync.error"), {
        position: "top-center",
        closeButton: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMediaTypes, dryRun, force, t]);

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto px-2 md:order-none">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-1">
              <Heading as="h4" className="mb-2">
                {t("maintenance.sync.title")}
              </Heading>

              <div className="max-w-6xl">
                <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
                  <p>{t("maintenance.sync.desc")}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Media Types Selection */}
                <div>
                  <Label className="mb-2 flex flex-row items-center text-base">
                    {t("maintenance.sync.mediaTypes")}
                  </Label>
                  <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="all-media"
                        className="cursor-pointer font-medium"
                      >
                        {t("maintenance.sync.allMedia")}
                      </Label>
                      <Switch
                        id="all-media"
                        checked={selectedMediaTypes.includes("all")}
                        onCheckedChange={(checked) =>
                          handleMediaTypeChange("all", checked)
                        }
                        disabled={isJobRunning}
                      />
                    </div>
                    <div className="ml-4 space-y-2">
                      {MEDIA_TYPES.map((type) => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between"
                        >
                          <Label htmlFor={type.id} className="cursor-pointer">
                            {type.label}
                          </Label>
                          <Switch
                            id={type.id}
                            checked={
                              selectedMediaTypes.includes("all") ||
                              selectedMediaTypes.includes(type.id)
                            }
                            onCheckedChange={(checked) =>
                              handleMediaTypeChange(type.id, checked)
                            }
                            disabled={
                              isJobRunning || selectedMediaTypes.includes("all")
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <div className="flex flex-row items-center">
                      <Switch
                        id="dry-run"
                        className="mr-3"
                        checked={dryRun}
                        onCheckedChange={setDryRun}
                        disabled={isJobRunning}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="dry-run" className="cursor-pointer">
                          {t("maintenance.sync.dryRun")}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {dryRun
                            ? t("maintenance.sync.dryRunEnabled")
                            : t("maintenance.sync.dryRunDisabled")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex flex-row items-center">
                      <Switch
                        id="force"
                        className="mr-3"
                        checked={force}
                        onCheckedChange={setForce}
                        disabled={isJobRunning}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="force" className="cursor-pointer">
                          {t("maintenance.sync.force")}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t("maintenance.sync.forceDesc")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex w-full flex-row items-center gap-2 pt-2 md:w-[50%]">
                  <Button
                    onClick={handleStartSync}
                    disabled={isJobRunning || isSubmitting}
                    className="flex flex-1"
                    variant={"select"}
                  >
                    {(isSubmitting || isJobRunning) && (
                      <ActivityIndicator className="mr-2 size-6" />
                    )}
                    {isJobRunning
                      ? t("maintenance.sync.running")
                      : t("maintenance.sync.start")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="col-span-1">
              <div className="mt-4 gap-2 space-y-3 md:mt-8">
                <Separator className="my-2 flex bg-secondary md:hidden" />
                <div className="flex flex-row items-center justify-between rounded-lg bg-card p-3 md:mr-2">
                  <Heading as="h4" className="my-2">
                    {t("maintenance.sync.currentStatus")}
                  </Heading>
                  <div
                    className={cn(
                      "flex flex-row items-center gap-2",
                      currentJob?.status === "success" && "text-green-500",
                      currentJob?.status === "failed" && "text-destructive",
                    )}
                  >
                    {currentJob?.status === "success" && (
                      <LuCheck className="size-5" />
                    )}
                    {currentJob?.status === "failed" && (
                      <LuX className="size-5" />
                    )}
                    {(currentJob?.status === "running" ||
                      currentJob?.status === "queued") && (
                      <ActivityIndicator className="size-5" />
                    )}
                    {t(
                      `maintenance.sync.status.${currentJob?.status ?? "notRunning"}`,
                    )}
                  </div>
                </div>

                {/* Current Job Status */}
                <div className="space-y-2 text-sm">
                  {currentJob?.start_time && (
                    <div className="flex gap-1">
                      <span className="text-muted-foreground">
                        {t("maintenance.sync.startTime")}:
                      </span>
                      <span className="font-mono">
                        {formatUnixTimestampToDateTime(
                          currentJob?.start_time ?? "-",
                        )}
                      </span>
                    </div>
                  )}
                  {currentJob?.end_time && (
                    <div className="flex gap-1">
                      <span className="text-muted-foreground">
                        {t("maintenance.sync.endTime")}:
                      </span>
                      <span className="font-mono">
                        {formatUnixTimestampToDateTime(currentJob?.end_time)}
                      </span>
                    </div>
                  )}
                  {currentJob?.results && (
                    <div className="mt-2 space-y-2 md:mr-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("maintenance.sync.results")}
                      </p>
                      <div className="rounded-md border border-secondary">
                        {/* Individual media type results */}
                        <div className="divide-y divide-secondary">
                          {Object.entries(currentJob.results)
                            .filter(([key]) => key !== "totals")
                            .map(([mediaType, stats]) => {
                              const mediaStats = stats as MediaSyncStats;
                              return (
                                <div key={mediaType} className="p-3 pb-3">
                                  <p className="mb-1 font-medium capitalize">
                                    {t(`maintenance.sync.${mediaType}`)}
                                  </p>
                                  <div className="ml-2 space-y-0.5">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        {t(
                                          "maintenance.sync.resultsFields.filesChecked",
                                        )}
                                      </span>
                                      <span>{mediaStats.files_checked}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        {t(
                                          "maintenance.sync.resultsFields.orphansFound",
                                        )}
                                      </span>
                                      <span
                                        className={
                                          mediaStats.orphans_found > 0
                                            ? "text-yellow-500"
                                            : ""
                                        }
                                      >
                                        {mediaStats.orphans_found}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        {t(
                                          "maintenance.sync.resultsFields.orphansDeleted",
                                        )}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-muted-foreground",
                                          mediaStats.orphans_deleted > 0 &&
                                            "text-success",
                                          mediaStats.orphans_deleted === 0 &&
                                            mediaStats.aborted &&
                                            "text-destructive",
                                        )}
                                      >
                                        {mediaStats.orphans_deleted}
                                      </span>
                                    </div>
                                    {mediaStats.aborted && (
                                      <div className="flex items-center gap-2 text-destructive">
                                        <LuX className="size-4" />

                                        {t(
                                          "maintenance.sync.resultsFields.aborted",
                                        )}
                                      </div>
                                    )}
                                    {mediaStats.error && (
                                      <div className="text-destructive">
                                        {t(
                                          "maintenance.sync.resultsFields.error",
                                        )}
                                        {": "}
                                        {mediaStats.error}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        {/* Totals */}
                        {currentJob.results.totals && (
                          <div className="border-t border-secondary bg-background_alt p-3">
                            <p className="mb-1 font-medium">
                              {t("maintenance.sync.resultsFields.totals")}
                            </p>
                            <div className="ml-2 space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t(
                                    "maintenance.sync.resultsFields.filesChecked",
                                  )}
                                </span>
                                <span className="font-medium">
                                  {currentJob.results.totals.files_checked}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t(
                                    "maintenance.sync.resultsFields.orphansFound",
                                  )}
                                </span>
                                <span
                                  className={
                                    currentJob.results.totals.orphans_found > 0
                                      ? "font-medium text-yellow-500"
                                      : "font-medium"
                                  }
                                >
                                  {currentJob.results.totals.orphans_found}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t(
                                    "maintenance.sync.resultsFields.orphansDeleted",
                                  )}
                                </span>
                                <span
                                  className={cn(
                                    "text-medium",
                                    currentJob.results.totals.orphans_deleted >
                                      0
                                      ? "text-success"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {currentJob.results.totals.orphans_deleted}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {currentJob?.error_message && (
                    <div className="text-destructive">
                      <p className="text-muted-foreground">
                        {t("maintenance.sync.errorLabel")}
                      </p>
                      <p>{currentJob?.error_message}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
